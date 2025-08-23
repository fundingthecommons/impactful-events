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
            name: true,
            password: true,
            role: true,
          },
        });

        console.log("[AUTH] User found:", user ? { id: user.id, email: user.email, name: user.name, hasPassword: !!user.password } : "No user found");

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
          name: user.name,
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
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Removed sensitive scopes to avoid Google verification requirements
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
          // Commented out sensitive scopes that require Google verification:
          // scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly",
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
    async signIn({ user: _user, account: _account, profile: _profile }) {
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
