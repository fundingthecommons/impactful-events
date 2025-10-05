import { z } from "zod";
import { google, type gmail_v1 } from "googleapis";
import { type PrismaClient } from "@prisma/client";
import { Client as NotionClient } from "@notionhq/client";
import { Api } from "telegram";

// Type definitions for Telegram API responses
interface TelegramUser {
  _: string;
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  bot?: boolean;
  contact?: boolean;
}

interface TelegramContactsResult {
  users?: TelegramUser[];
}

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

type Context = {
  db: PrismaClient;
  session: {
    user: {
      id: string;
    };
  };
};

async function getGoogleAuthClient(ctx: Context) {
  // 1. Get user's Google access token from session
  const account = await ctx.db.account.findFirst({
    where: {
      userId: ctx.session.user.id,
      provider: "google",
    },
  });

  if (!account?.access_token || !account.refresh_token) {
    throw new Error("No Google account connected or refresh token missing.");
  }

  // 2. Set up Google API client with credentials and refresh token handling
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  // Listen for token refresh events and update the database
  oauth2Client.on('tokens', (tokens) => {
    void (async () => {
      console.log('Google token refreshed.');
      const updateData: { access_token?: string, expires_at?: number, refresh_token?: string } = {};

      if (tokens.access_token) {
        updateData.access_token = tokens.access_token;
      }
      if (tokens.expiry_date) {
        // expires_at from google is in ms, convert to seconds for db
        updateData.expires_at = Math.floor(tokens.expiry_date / 1000);
      }
      if (tokens.refresh_token) {
        // A new refresh token is sometimes issued
        updateData.refresh_token = tokens.refresh_token;
      }

      await ctx.db.account.update({
        where: {
          provider_providerAccountId: {
            provider: 'google',
            providerAccountId: account.providerAccountId,
          }
        },
        data: updateData,
      });
    })();
  });

  return oauth2Client;
}

async function upsertContact(db: PrismaClient, contact: { 
  email?: string; 
  firstName?: string; 
  lastName?: string; 
  phone?: string;
  telegram?: string;
}) {
  const { email, firstName = "", lastName = "", phone, telegram } = contact;
  
  // For Telegram contacts, we might not have email, so use phone as fallback identifier
  const identifier = email ?? phone;
  if (!identifier) {
    return;
  }

  let sponsor = null;
  if (email) {
    const domain = email.substring(email.lastIndexOf("@") + 1);
    sponsor = await db.sponsor.upsert({
      where: { name: domain },
      update: {},
      create: { name: domain },
    });
  }

  if (email) {
    await db.contact.upsert({
      where: { email },
      update: { firstName, lastName, phone, telegram, sponsorId: sponsor?.id },
      create: { email, firstName, lastName, phone, telegram, sponsorId: sponsor?.id },
    });
  } else if (phone) {
    // Handle phone-only contacts (like from Telegram)
    const existingContact = await db.contact.findFirst({
      where: { phone },
    });
    
    if (existingContact) {
      await db.contact.update({
        where: { id: existingContact.id },
        data: { firstName, lastName, telegram },
      });
    } else {
      // Create a placeholder email for phone-only contacts
      const placeholderEmail = `${phone.replace(/\D/g, '')}@telegram.placeholder`;
      await db.contact.create({
        data: { 
          email: placeholderEmail, 
          firstName, 
          lastName, 
          phone, 
          telegram,
          sponsorId: null 
        },
      });
    }
  }
}

export const contactRouter = createTRPCRouter({
  getContacts: publicProcedure.query(async ({ ctx }) => {
    const contacts = await ctx.db.contact.findMany({
      include: {
        sponsor: true,
      },
    });
    console.log(contacts);

    return contacts ?? null;
  }),

  assignContactToSponsor: publicProcedure
    .input(z.object({ 
      contactId: z.string(),
      sponsorId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.update({
        where: { id: input.contactId },
        data: { sponsorId: input.sponsorId },
        include: {
          sponsor: true,
        },
      });
      return contact;
    }),

  removeContactFromSponsor: publicProcedure
    .input(z.object({ 
      contactId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.update({
        where: { id: input.contactId },
        data: { sponsorId: null },
        include: {
          sponsor: true,
        },
      });
      return contact;
    }),

  importGoogleContacts: protectedProcedure.mutation(async ({ ctx }) => {
    const oauth2Client = await getGoogleAuthClient(ctx);
    const people = google.people({ version: "v1", auth: oauth2Client });

    const res = await people.people.connections.list({
      resourceName: "people/me",
      personFields: "names,emailAddresses",
      pageSize: 1000,
    });

    const connections = res.data.connections ?? [];

    for (const person of connections) {
      const email = person.emailAddresses?.[0]?.value;
      if (email) {
        await upsertContact(ctx.db, {
          email,
          firstName: person.names?.[0]?.givenName ?? "",
          lastName: person.names?.[0]?.familyName ?? "",
        });
      }
    }

    return { count: connections.length };
  }),

  importGoogleContactsFromEmails: protectedProcedure.mutation(async ({ ctx }) => {
    const oauth2Client = await getGoogleAuthClient(ctx);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const emails = new Set<string>();
    let nextPageToken: string | undefined | null = undefined;
    const emailRegex = /[\w._%+-]+@[\w.-]+\.[\w]{2,}/gi;

    do {
      const res: { data: gmail_v1.Schema$ListMessagesResponse } =
        await gmail.users.messages.list({
          userId: "me",
          pageToken: nextPageToken ?? undefined,
          maxResults: 500, // 500 is the max
        });

      const messages = res.data.messages ?? [];

      for (const message of messages) {
        if (message.id) {
          const msg = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'METADATA',
            metadataHeaders: ['To', 'From', 'Cc', 'Bcc'],
          });

          const headers = msg.data.payload?.headers;
          if (headers) {
            const emailHeaders = headers.filter(h =>
              ['To', 'From', 'Cc', 'Bcc'].includes(h.name ?? '')
            );

            for (const header of emailHeaders) {
              if (header.value) {
                const foundEmails = header.value.match(emailRegex);
                if (foundEmails) {
                  foundEmails.forEach(e => emails.add(e.toLowerCase()));
                }
              }
            }
          }
        }
      }

      nextPageToken = res.data.nextPageToken;
    } while (nextPageToken);

    for (const email of emails) {
      await upsertContact(ctx.db, { email });
    }

    return { count: emails.size };
  }),

  importNotionContacts: protectedProcedure.mutation(async ({ ctx }) => {
    const notionToken = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_CONTACTS_DATABASE_ID;
    if (!notionToken || !databaseId) {
      throw new Error("Notion integration token or database ID not set in environment variables.");
    }
    const notion = new NotionClient({ auth: notionToken });
    // Query the Notion database for contacts
    const response = await notion.databases.query({
      database_id: databaseId,
    });
    let count = 0;
    for (const page of response.results) {
      // Extract fields from the Notion page properties
      // Adjust these property names to match your Notion database
      const properties = (page as { properties?: Record<string, unknown> }).properties;
      const email = (properties?.Email as { email?: string; rich_text?: Array<{ plain_text?: string }> })?.email ?? (properties?.Email as { rich_text?: Array<{ plain_text?: string }> })?.rich_text?.[0]?.plain_text;
      const firstName = (properties?.FirstName as { title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> })?.title?.[0]?.plain_text ?? (properties?.FirstName as { rich_text?: Array<{ plain_text?: string }> })?.rich_text?.[0]?.plain_text;
      const lastName = (properties?.LastName as { rich_text?: Array<{ plain_text?: string }>; title?: Array<{ plain_text?: string }> })?.rich_text?.[0]?.plain_text ?? (properties?.LastName as { title?: Array<{ plain_text?: string }> })?.title?.[1]?.plain_text;
      if (email) {
        await upsertContact(ctx.db, { email, firstName, lastName });
        count++;
      }
    }
    return { count };
  }),

  importTelegramContacts: protectedProcedure.mutation(async ({ ctx }) => {
    // Get the user's stored Telegram credentials
    const userAuth = await ctx.db.telegramAuth.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!userAuth?.isActive) {
      throw new Error("Please set up Telegram authentication first. Go to the Telegram section and click 'Set Up Telegram'.");
    }

    // Check if session is expired
    if (new Date() > userAuth.expiresAt) {
      await ctx.db.telegramAuth.update({
        where: { userId: ctx.session.user.id },
        data: { isActive: false },
      });
      throw new Error("Your Telegram authentication has expired. Please set up Telegram authentication again.");
    }

    const apiId = process.env.TELEGRAM_API_ID;
    if (!apiId) {
      throw new Error("Telegram API credentials not configured on server. Please contact an administrator.");
    }

    try {
      // Import decryption functions
      const { decryptTelegramCredentials } = await import("~/server/utils/encryption");
      
      // Decrypt user's credentials
      const credentials = decryptTelegramCredentials({
        encryptedSession: userAuth.encryptedSession,
        encryptedApiHash: userAuth.encryptedApiHash,
        salt: userAuth.salt,
        iv: userAuth.iv,
      }, ctx.session.user.id);

      const client = new (Api as unknown as new (options: {
        apiId: number;
        apiHash: string;
        stringSession: string;
      }) => {
        start: (options: {
          phoneNumber: () => Promise<string>;
          password: () => Promise<string>;
          phoneCode: () => Promise<string>;
          onError: (err: unknown) => void;
        }) => Promise<void>;
        invoke: (method: {
          _: string;
          hash: bigint;
        }) => Promise<unknown>;
        disconnect: () => Promise<void>;
      })({
        apiId: parseInt(apiId),
        apiHash: credentials.apiHash,
        stringSession: credentials.sessionString,
      });

      // Start client with existing session
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

      // Get all contacts from Telegram
      const result = await client.invoke({
        _: "contacts.getContacts",
        hash: BigInt(0),
      }) as TelegramContactsResult;

      let count = 0;
      if (result.users && Array.isArray(result.users)) {
        for (const user of result.users) {
          if (user._ === 'user' && !user.bot && user.contact) {
            const firstName = user.first_name ?? "";
            const lastName = user.last_name ?? "";
            const phone = user.phone ? `+${user.phone}` : undefined;
            const telegram = user.username ?? `user_${user.id}`;

            if (phone ?? telegram) {
              await upsertContact(ctx.db, {
                firstName,
                lastName,
                phone,
                telegram,
              });
              count++;
            }
          }
        }
      }

      await client.disconnect();
      
      // Log successful import (with hashed user ID for privacy)
      const { hashForAudit } = await import("~/server/utils/encryption");
      console.log(`Successfully imported ${count} Telegram contacts for user ${hashForAudit(ctx.session.user.id)}`);
      
      return { count };
    } catch (error) {
      console.error("Telegram import failed:", error);
      
      // If session is invalid, mark as inactive
      if (error instanceof Error && 
          (error.message.includes("SESSION_REVOKED") || 
           error.message.includes("AUTH_KEY_INVALID") ||
           error.message.includes("SESSION_EXPIRED"))) {
        await ctx.db.telegramAuth.update({
          where: { userId: ctx.session.user.id },
          data: { isActive: false },
        });
        throw new Error("Your Telegram session has expired or been revoked. Please set up Telegram authentication again.");
      }
      
      throw new Error(`Failed to import Telegram contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }),
});
