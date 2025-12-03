import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { db } from "~/server/db";
import { verifyPassword } from "~/utils/password";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}


/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[AUTH] Authorize function called with credentials for:", credentials?.email);
        
        const credentialsSchema = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        });

        const result = credentialsSchema.safeParse(credentials);

        if (!result.success) {
          console.log("[AUTH] Credentials validation failed:", result.error);
          return null;
        }

        const { email, password } = result.data;
        console.log("[AUTH] Looking up user with email:", email);

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            surname: true,
            name: true,
            password: true,
            role: true,
          },
        });

        console.log("[AUTH] User found:", user ? { id: user.id, email: user.email, firstName: user.firstName, surname: user.surname, hasPassword: !!user.password } : "No user found");

        if (!user?.password) {
          console.log("[AUTH] User not found or no password set");
          return null;
        }

        console.log("[AUTH] Verifying password...");
        const passwordValid = await verifyPassword(password, user.password);
        console.log("[AUTH] Password verification result:", passwordValid);

        if (!passwordValid) {
          console.log("[AUTH] Password verification failed");
          return null;
        }

        const userForAuth = {
          id: user.id,
          email: user.email,
          name: (`${user.firstName ?? ''} ${user.surname ?? ''}`.trim() || user.name) ?? null,
          role: user.role ?? undefined,
        };

        console.log("[AUTH] Authentication successful, returning user:", userForAuth);
        return userForAuth;
      },
    }),
    DiscordProvider,
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Include contacts and Gmail scopes for Google Contacts sync and Gmail import functionality
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  // Account linking will be handled by the signIn callback
  pages: {
    signIn: '/signin', // Custom sign-in page
    error: '/auth/error', // Custom error page
  },
  session: {
    strategy: "jwt", // Use JWT for credentials provider
  },
  cookies: {
    sessionToken: {
      name: `ftc-t3.sessionToken`,
    },
    callbackUrl: {
      name: `ftc-t3.callbackUrl`,
    },
    csrfToken: {
      name: `ftc-t3.csrfToken`,
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Update firstName/surname from OAuth provider profile if available
      if (account?.provider === "google" && profile && user.id) {
        const googleProfile = profile as { given_name?: string; family_name?: string };
        if (googleProfile.given_name ?? googleProfile.family_name) {
          await db.user.update({
            where: { id: user.id },
            data: {
              firstName: googleProfile.given_name ?? user.name?.split(' ')[0] ?? null,
              surname: googleProfile.family_name ?? user.name?.split(' ').slice(1).join(' ') ?? null,
              name: user.name, // Keep name field for compatibility
            },
          }).catch(() => {
            // Ignore errors if user doesn't exist yet (will be created by adapter)
          });
        }
      } else if (account?.provider === "discord" && user.name && user.id) {
        // Parse Discord username into firstName/surname
        const nameParts = user.name.split(' ');
        const firstName = nameParts[0] ?? user.name;
        const surname = nameParts.slice(1).join(' ') || '';
        await db.user.update({
          where: { id: user.id },
          data: {
            firstName,
            surname,
            name: user.name, // Keep name field for compatibility
          },
        }).catch(() => {
          // Ignore errors if user doesn't exist yet (will be created by adapter)
        });
      }

      // Always allow sign in - NextAuth will handle account linking with the adapter
      return true;
    },
    jwt: ({ token, user }) => {
      // When user logs in, add user data to token
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as string | undefined,
      },
    }),
  },
} satisfies NextAuthConfig;;
