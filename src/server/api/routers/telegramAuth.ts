import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TelegramClient, sessions, Api } from "telegram";
import bigInt from "big-integer";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  encryptTelegramCredentials, 
  decryptTelegramCredentials,
  getSessionExpiration,
  isSessionExpired,
  hashForAudit,
  type TelegramCredentials 
} from "~/server/utils/encryption";
import { checkTelegramAuthRateLimit } from "~/server/utils/telegramCleanup";

// Note: Auth sessions now stored in database for persistence across server restarts
// Clean up expired auth sessions every 5 minutes
import { db } from "~/server/db";

// Database cleanup function using global db instance
const cleanupExpiredSessions = async () => {
  const now = new Date();
  try {
    // Safety check to ensure model exists
    if (!db?.telegramAuthSession) {
      console.warn("TelegramAuthSession model not available for cleanup");
      return;
    }
    
    await db.telegramAuthSession.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
  } catch (error) {
    console.error("Failed to cleanup expired Telegram auth sessions:", error);
  }
};

// Clean up expired auth sessions every 5 minutes, with initial delay
setTimeout(() => {
  void cleanupExpiredSessions();
  setInterval(() => void cleanupExpiredSessions(), 5 * 60 * 1000);
}, 30000); // 30 second initial delay to ensure db is ready
interface TelegramClientInterface {
  connect: () => Promise<void>;
  start: (options: {
    phoneNumber: () => Promise<string>;
    password: () => Promise<string>;
    phoneCode: () => Promise<string>;
    onError: (err: unknown) => void;
  }) => Promise<void>;
  sendCode: (apiCredentials: {apiId: number, apiHash: string}, phoneNumber: string, forceSMS?: boolean) => Promise<{phoneCodeHash: string, isCodeViaApp: boolean}>;
  invoke: (method: unknown) => Promise<unknown>;
  session: { save: () => string };
  disconnect: () => Promise<void>;
}

export const telegramAuthRouter = createTRPCRouter({
  // Get current authentication status
  getAuthStatus: protectedProcedure.query(async ({ ctx }) => {
    const auth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
      select: {
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!auth) {
      return { isAuthenticated: false };
    }

    const expired = isSessionExpired(auth.expiresAt);
    if (expired) {
      // Mark as inactive if expired
      await ctx.db.telegramAuth.update({
        where: { userId: ctx.session.user.id },
        data: { isActive: false },
      });
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: auth.isActive,
      expiresAt: auth.expiresAt,
      createdAt: auth.createdAt,
      updatedAt: auth.updatedAt,
    };
  }),

  // Start the authentication process
  startAuth: protectedProcedure.mutation(async ({ ctx }) => {
    // Debug context
    console.log('Context debug:', {
      hasDb: !!ctx.db,
      hasSession: !!ctx.session,
      userId: ctx.session?.user?.id,
      dbType: typeof ctx.db
    });
    
    // Check rate limiting
    const rateLimit = checkTelegramAuthRateLimit(ctx.session.user.id);
    if (!rateLimit.allowed) {
      const resetTimeMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (1000 * 60));
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many authentication attempts. Please try again in ${resetTimeMinutes} minutes.`,
      });
    }

    // No longer need global API credentials - users provide their own

    // Check if user already has active auth
    const existingAuth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (existingAuth && existingAuth.isActive && !isSessionExpired(existingAuth.expiresAt)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "You already have an active Telegram authentication",
      });
    }

    // Generate session ID for this auth process
    const sessionId = `${ctx.session.user.id}_${Date.now()}`;
    
    // Store session info in database for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await ctx.db.telegramAuthSession.create({
      data: {
        sessionId,
        userId: ctx.session.user.id,
        expiresAt,
      },
    });

    console.log(`Started Telegram auth for user ${hashForAudit(ctx.session.user.id)} (${rateLimit.remainingAttempts} attempts remaining)`);

    return { sessionId };
  }),

  // Send phone verification code
  sendPhoneCode: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      phoneNumber: z.string().min(1),
      apiId: z.string().min(1),
      apiHash: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.telegramAuthSession.findUnique({
        where: { sessionId: input.sessionId },
      });
      
      if (!session || session.expiresAt < new Date()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Authentication session expired. Please start over.",
        });
      }

      // Validate user-provided credentials
      const apiId = input.apiId.trim();
      const apiHash = input.apiHash.trim();
      
      // Validate API ID (should be numeric and reasonable length)
      const apiIdNum = parseInt(apiId);
      if (isNaN(apiIdNum) || apiIdNum <= 0 || apiId.length < 5 || apiId.length > 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid API ID format. Should be a 5-10 digit number from my.telegram.org",
        });
      }
      
      // Validate API Hash (should be 32 character alphanumeric)
      if (!/^[a-f0-9]{32}$/i.test(apiHash)) {
        throw new TRPCError({
          code: "BAD_REQUEST", 
          message: "Invalid API Hash format. Should be a 32-character hex string from my.telegram.org",
        });
      }
      
      // Validate phone number format (should start with +)
      const phoneNumber = input.phoneNumber.trim();
      if (!phoneNumber.startsWith('+') || phoneNumber.length < 10 || phoneNumber.length > 16) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid phone number format. Must include country code (e.g., +1234567890)",
        });
      }

      // Debug logging (with masked credentials for security)
      console.log(`Sending Telegram code - API ID: ${apiId}, API Hash: ${apiHash.substring(0, 8)}..., Phone: ${phoneNumber.substring(0, 4)}...`);

      try {
        const client = new TelegramClient(new sessions.StringSession(""), apiIdNum, apiHash, {}) as unknown as TelegramClientInterface;

        // Connect to Telegram
        await client.connect();
        console.log(`Connected to Telegram successfully`);

        // Send verification code
        console.log(`Calling sendCode with apiId: ${apiIdNum}, phoneNumber: ${phoneNumber}`);
        const result = await client.sendCode({
          apiId: apiIdNum,
          apiHash: apiHash,
        }, phoneNumber);
        
        console.log(`SendCode result:`, { 
          hasPhoneCodeHash: !!result.phoneCodeHash, 
          isCodeViaApp: result.isCodeViaApp 
        });
        
        // Get client session string to store in database
        const clientSessionString = client.session.save();
        
        // Update session with phone code hash and client session
        await ctx.db.telegramAuthSession.update({
          where: { sessionId: input.sessionId },
          data: {
            phoneCodeHash: result.phoneCodeHash,
            apiId: input.apiId,
            apiHash: input.apiHash,
            clientData: clientSessionString,
          },
        });
        
        // Disconnect the temporary client - we'll recreate it later
        await client.disconnect();

        console.log(`Sent verification code to ${hashForAudit(input.phoneNumber)} for user ${hashForAudit(ctx.session.user.id)}`);

        return { success: true };
      } catch (error) {
        console.error("Failed to send phone code:", error);
        
        // Clean up session on error
        try {
          await ctx.db.telegramAuthSession.delete({
            where: { sessionId: input.sessionId },
          });
        } catch (cleanupError) {
          console.error("Error during session cleanup:", cleanupError);
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send verification code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  // Verify code and complete authentication
  verifyAndStore: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      phoneNumber: z.string(),
      phoneCode: z.string(),
      password: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.telegramAuthSession.findUnique({
        where: { sessionId: input.sessionId },
      });
      
      // Debug logging
      console.log(`Verifying session ${input.sessionId}:`, {
        exists: !!session,
        expired: session ? session.expiresAt < new Date() : 'N/A',
        hasClientData: session ? !!session.clientData : 'N/A',
        hasPhoneCodeHash: session ? !!session.phoneCodeHash : 'N/A',
        hasApiId: session ? !!session.apiId : 'N/A',
        hasApiHash: session ? !!session.apiHash : 'N/A',
        timeToExpiry: session ? Math.round((session.expiresAt.getTime() - Date.now()) / 1000) : 'N/A'
      });
      
      if (!session || session.expiresAt < new Date() || !session.clientData || !session.phoneCodeHash || !session.apiId || !session.apiHash) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Authentication session expired or invalid. Please start over.",
        });
      }

      try {
        // Recreate client from stored session data
        const client = new TelegramClient(
          new sessions.StringSession(session.clientData), 
          parseInt(session.apiId), 
          session.apiHash, 
          {}
        ) as unknown as TelegramClientInterface;
        
        // Connect to Telegram
        await client.connect();

        // Sign in with phone code using low-level API
        await client.invoke(new Api.auth.SignIn({
          phoneNumber: input.phoneNumber,
          phoneCodeHash: session.phoneCodeHash,
          phoneCode: input.phoneCode
        }));

        // 2FA is handled automatically by detecting SESSION_PASSWORD_NEEDED error
        // The password will be handled in the catch block if needed

        // Get session string
        const sessionString = client.session.save();

        // Encrypt credentials
        const credentials: TelegramCredentials = {
          apiId: session.apiId,
          apiHash: session.apiHash,
          sessionString,
        };

        const encrypted = encryptTelegramCredentials(credentials, ctx.session.user.id);

        // Store in database
        await ctx.db.telegramAuth.upsert({
          where: { userId: ctx.session.user.id },
          update: {
            encryptedApiId: encrypted.encryptedApiId,
            encryptedApiHash: encrypted.encryptedApiHash,
            encryptedSession: encrypted.encryptedSession,
            salt: encrypted.salt,
            iv: encrypted.iv,
            expiresAt: getSessionExpiration(),
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            userId: ctx.session.user.id,
            encryptedApiId: encrypted.encryptedApiId,
            encryptedApiHash: encrypted.encryptedApiHash,
            encryptedSession: encrypted.encryptedSession,
            salt: encrypted.salt,
            iv: encrypted.iv,
            expiresAt: getSessionExpiration(),
            isActive: true,
          },
        });

        // Clean up auth session
        await client.disconnect();
        await ctx.db.telegramAuthSession.delete({
          where: { sessionId: input.sessionId },
        });

        console.log(`Successfully authenticated Telegram for user ${hashForAudit(ctx.session.user.id)}`);

        return { success: true };
      } catch (error) {
        console.error("Telegram authentication failed:", error);
        
        // Clean up on failure
        try {
          await ctx.db.telegramAuthSession.delete({
            where: { sessionId: input.sessionId },
          });
        } catch (cleanupError) {
          console.error("Error during session cleanup:", cleanupError);
        }
        
        if (error instanceof Error && error.message.includes("SESSION_PASSWORD_NEEDED")) {
          // If 2FA password was provided, try to authenticate with it
          if (input.password) {
            try {
              // For proper SRP implementation, we'd need account.getPassword first
              // For now, we'll provide a clear error message about 2FA complexity
              throw new TRPCError({
                code: "NOT_IMPLEMENTED",
                message: "2FA authentication requires SRP protocol implementation. Please contact support.",
              });
            } catch (passwordError) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: `2FA authentication failed: ${passwordError instanceof Error ? passwordError.message : 'Invalid password'}`,
              });
            }
          } else {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Two-factor authentication password required",
            });
          }
        }
        
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Authentication failed: ${error instanceof Error ? error.message : 'Invalid verification code'}`,
        });
      }
    }),

  // Remove stored authentication
  deleteAuth: protectedProcedure.mutation(async ({ ctx }) => {
    const deleted = await ctx.db.telegramAuth.delete({
      where: { userId: ctx.session.user.id },
    }).catch(() => null);

    if (deleted) {
      console.log(`Deleted Telegram auth for user ${hashForAudit(ctx.session.user.id)}`);
    }

    return { success: true };
  }),

  // Get decrypted credentials (for server-side use only)
  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const auth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!auth || !auth.isActive || isSessionExpired(auth.expiresAt)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active Telegram authentication found",
      });
    }

    try {
      const credentials = decryptTelegramCredentials({
        encryptedApiId: auth.encryptedApiId,
        encryptedApiHash: auth.encryptedApiHash,
        encryptedSession: auth.encryptedSession,
        salt: auth.salt,
        iv: auth.iv,
      }, ctx.session.user.id);

      return credentials;
    } catch (error) {
      console.error("Failed to decrypt Telegram credentials:", error instanceof Error ? error.message : String(error));
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to decrypt stored credentials",
      });
    }
  }),

  // Send bulk messages to multiple contacts
  sendBulkMessage: protectedProcedure
    .input(z.object({
      contactIds: z.array(z.string()).min(1).max(50), // Limit to 50 recipients
      message: z.string().min(1).max(4096), // Telegram message limit
    }))
    .mutation(async ({ ctx, input }) => {
      // Check user has active Telegram authentication
      const auth = await ctx.db.telegramAuth.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!auth || !auth.isActive || isSessionExpired(auth.expiresAt)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No active Telegram authentication found. Please set up Telegram authentication first.",
        });
      }

      // Get contacts with Telegram usernames
      const contacts = await ctx.db.contact.findMany({
        where: {
          id: { in: input.contactIds },
          telegram: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          telegram: true,
        },
      });

      if (contacts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No contacts found with Telegram usernames",
        });
      }

      let successCount = 0;
      let failureCount = 0;
      const results: Array<{contactId: string, success: boolean, error?: string}> = [];

      try {
        // Decrypt user's credentials
        const credentials = decryptTelegramCredentials({
          encryptedApiId: auth.encryptedApiId,
          encryptedApiHash: auth.encryptedApiHash,
          encryptedSession: auth.encryptedSession,
          salt: auth.salt,
          iv: auth.iv,
        }, ctx.session.user.id);

        const client = new TelegramClient(
          new sessions.StringSession(credentials.sessionString),
          parseInt(credentials.apiId),
          credentials.apiHash,
          {}
        );

        // Connect to Telegram
        await client.start({
          phoneNumber: async () => {
            throw new Error("Session expired. Please set up Telegram authentication again.");
          },
          password: async () => {
            throw new Error("Session expired. Please set up Telegram authentication again.");
          },
          phoneCode: async () => {
            throw new Error("Session expired. Please set up Telegram authentication again.");
          },
          onError: (err) => console.log(err),
        });

        // Send messages to each contact with delay to respect rate limits
        for (const contact of contacts) {
          try {
            // Resolve username to get peer
            const result = await client.invoke(new Api.contacts.ResolveUsername({
              username: contact.telegram!,
            }));

            if (result.users && result.users.length > 0) {
              const user = result.users[0];
              
              // Send message
              await client.invoke(new Api.messages.SendMessage({
                peer: user,
                message: input.message,
                randomId: bigInt(Math.floor(Math.random() * 1000000000)),
              }));

              successCount++;
              results.push({ contactId: contact.id, success: true });
              
              console.log(`Message sent to @${contact.telegram} (${contact.firstName} ${contact.lastName})`);
            } else {
              throw new Error("User not found");
            }
            
            // Rate limiting: wait 3 seconds between messages (20 messages per minute max)
            if (contacts.indexOf(contact) < contacts.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
          } catch (error) {
            failureCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.push({ contactId: contact.id, success: false, error: errorMessage });
            
            console.error(`Failed to send message to @${contact.telegram}:`, errorMessage);
          }
        }

        await client.disconnect();
        
        console.log(`Bulk message completed: ${successCount} successful, ${failureCount} failed for user ${hashForAudit(ctx.session.user.id)}`);

        return {
          successCount,
          failureCount,
          results,
        };

      } catch (error) {
        console.error("Bulk message failed:", error);
        
        // If session is invalid, mark as inactive
        if (error instanceof Error && 
            (error.message.includes("SESSION_REVOKED") || 
             error.message.includes("AUTH_KEY_INVALID") ||
             error.message.includes("SESSION_EXPIRED"))) {
          await ctx.db.telegramAuth.update({
            where: { userId: ctx.session.user.id },
            data: { isActive: false },
          });
          throw new TRPCError({
            code: "UNAUTHORIZED", 
            message: "Your Telegram session has expired. Please set up Telegram authentication again.",
          });
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to send messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});