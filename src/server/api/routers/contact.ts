import { z } from "zod";
import { google, type gmail_v1 } from "googleapis";
import { type PrismaClient } from "@prisma/client";
import { Client as NotionClient } from "@notionhq/client";

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

async function upsertContact(db: PrismaClient, contact: { email: string; firstName?: string; lastName?: string; }) {
  const { email, firstName = "", lastName = "" } = contact;
  if (!email) {
    return;
  }

  const domain = email.substring(email.lastIndexOf("@") + 1);

  const sponsor = await db.sponsor.upsert({
    where: { name: domain },
    update: {},
    create: { name: domain },
  });

  await db.contact.upsert({
    where: { email },
    update: { firstName, lastName, sponsorId: sponsor.id },
    create: { email, firstName, lastName, sponsorId: sponsor.id },
  });
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
      const properties = (page as any).properties;
      const email = properties?.Email?.email || properties?.Email?.rich_text?.[0]?.plain_text;
      const firstName = properties?.FirstName?.title?.[0]?.plain_text || properties?.FirstName?.rich_text?.[0]?.plain_text;
      const lastName = properties?.LastName?.rich_text?.[0]?.plain_text || properties?.LastName?.title?.[1]?.plain_text;
      if (email) {
        await upsertContact(ctx.db, { email, firstName, lastName });
        count++;
      }
    }
    return { count };
  }),
});
