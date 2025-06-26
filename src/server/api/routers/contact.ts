import { z } from "zod";
import { google } from "googleapis";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const contactRouter = createTRPCRouter({
  getContacts: publicProcedure.query(async ({ ctx }) => {
    const contacts = await ctx.db.contact.findMany();
    console.log(contacts);

    return contacts ?? null;
  }),

  importGoogleContacts: protectedProcedure.mutation(async ({ ctx }) => {
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
    oauth2Client.on('tokens', async (tokens) => {
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
    });

    const people = google.people({ version: "v1", auth: oauth2Client });

    // 3. Fetch contacts (connections)
    const res = await people.people.connections.list({
      resourceName: "people/me",
      personFields: "names,emailAddresses",
      pageSize: 1000,
    });

    const contacts = res.data.connections || [];

    // 4. Insert contacts and sponsors into your DB
    for (const person of contacts) {
      const email = person.emailAddresses?.[0]?.value;
      const firstName = person.names?.[0]?.givenName || "";
      const lastName = person.names?.[0]?.familyName || "";

      if (email) {
        // Extract domain from email to use as sponsor name
        const domain = email.substring(email.lastIndexOf("@") + 1);
        
        // Find or create a sponsor based on the domain
        const sponsor = await ctx.db.sponsor.upsert({
            where: { name: domain },
            update: {},
            create: { name: domain },
        });

        // Now create or update the contact and link it to the sponsor
        await ctx.db.contact.upsert({
          where: { email },
          update: { firstName, lastName, sponsorId: sponsor.id },
          create: { email, firstName, lastName, sponsorId: sponsor.id },
        });
      }
    }

    return { count: contacts.length };
  }),
});
