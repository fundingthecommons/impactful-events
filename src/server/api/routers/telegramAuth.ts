import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TelegramClient } from "telegram";
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

// Temporary storage for ongoing authentication sessions
// In production, consider using Redis or database temp storage
const authSessions = new Map<string, {
  client: unknown;
  phoneCodeHash?: string;
  expiresAt: number;
}>();

// Clean up expired auth sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of authSessions.entries()) {
    if (session.expiresAt < now) {
      authSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000);

interface TelegramClientInterface {
  start: (options: {
    phoneNumber: () => Promise<string>;
    password: () => Promise<string>;
    phoneCode: () => Promise<string>;
    onError: (err: unknown) => void;
  }) => Promise<void>;
  sendCode: (phone: string) => Promise<{ phoneCodeHash: string }>;
  signIn: (phone: string, phoneCode: string, phoneCodeHash: string) => Promise<void>;
  checkPassword: (password: string) => Promise<void>;
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
    // Check rate limiting
    const rateLimit = checkTelegramAuthRateLimit(ctx.session.user.id);
    if (!rateLimit.allowed) {
      const resetTimeMinutes = Math.ceil((rateLimit.resetTime - Date.now()) / (1000 * 60));
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many authentication attempts. Please try again in ${resetTimeMinutes} minutes.`,
      });
    }

    const apiId = process.env.TELEGRAM_API_ID;
    if (!apiId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Telegram API credentials not configured on server",
      });
    }

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
    
    // Store session info for 10 minutes
    authSessions.set(sessionId, {
      client: null,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    console.log(`Started Telegram auth for user ${hashForAudit(ctx.session.user.id)} (${rateLimit.remainingAttempts} attempts remaining)`);

    return { sessionId };
  }),

  // Send phone verification code
  sendPhoneCode: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      phoneNumber: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = authSessions.get(input.sessionId);
      if (!session || session.expiresAt < Date.now()) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Authentication session expired. Please start over.",
        });
      }

      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;
      
      if (!apiId || !apiHash) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Telegram API credentials not configured",
        });
      }

      try {
        const client = new TelegramClient("", parseInt(apiId), apiHash, {}) as unknown as TelegramClientInterface;

        // Send verification code
        const result = await client.sendCode(input.phoneNumber);
        
        // Update session with client and code hash
        authSessions.set(input.sessionId, {
          client,
          phoneCodeHash: result.phoneCodeHash,
          expiresAt: session.expiresAt,
        });

        console.log(`Sent verification code to ${hashForAudit(input.phoneNumber)} for user ${hashForAudit(ctx.session.user.id)}`);

        return { success: true };
      } catch (error) {
        console.error("Failed to send phone code:", error);
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
      const session = authSessions.get(input.sessionId);
      if (!session || session.expiresAt < Date.now() || !session.client || !session.phoneCodeHash) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Authentication session expired or invalid. Please start over.",
        });
      }

      const apiHash = process.env.TELEGRAM_API_HASH;
      if (!apiHash) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Telegram API hash not configured",
        });
      }

      try {
        const client = session.client as TelegramClientInterface;

        // Sign in with phone code
        await client.signIn(input.phoneNumber, input.phoneCode, session.phoneCodeHash);

        // Handle 2FA if password provided
        if (input.password) {
          await client.checkPassword(input.password);
        }

        // Get session string
        const sessionString = client.session.save();

        // Encrypt credentials
        const credentials: TelegramCredentials = {
          sessionString,
          apiHash,
        };

        const encrypted = encryptTelegramCredentials(credentials, ctx.session.user.id);

        // Store in database
        await ctx.db.telegramAuth.upsert({
          where: { userId: ctx.session.user.id },
          update: {
            encryptedSession: encrypted.encryptedSession,
            encryptedApiHash: encrypted.encryptedApiHash,
            salt: encrypted.salt,
            iv: encrypted.iv,
            expiresAt: getSessionExpiration(),
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            userId: ctx.session.user.id,
            encryptedSession: encrypted.encryptedSession,
            encryptedApiHash: encrypted.encryptedApiHash,
            salt: encrypted.salt,
            iv: encrypted.iv,
            expiresAt: getSessionExpiration(),
            isActive: true,
          },
        });

        // Clean up auth session
        await client.disconnect();
        authSessions.delete(input.sessionId);

        console.log(`Successfully authenticated Telegram for user ${hashForAudit(ctx.session.user.id)}`);

        return { success: true };
      } catch (error) {
        console.error("Telegram authentication failed:", error);
        
        // Clean up on failure
        authSessions.delete(input.sessionId);
        
        if (error instanceof Error && error.message.includes("SESSION_PASSWORD_NEEDED")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Two-factor authentication password required",
          });
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
        encryptedSession: auth.encryptedSession,
        encryptedApiHash: auth.encryptedApiHash,
        salt: auth.salt,
        iv: auth.iv,
      }, ctx.session.user.id);

      return credentials;
    } catch (error) {
      console.error("Failed to decrypt Telegram credentials:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to decrypt stored credentials",
      });
    }
  }),
});