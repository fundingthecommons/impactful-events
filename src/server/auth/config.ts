import type React from "react";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import PostmarkProvider from "next-auth/providers/postmark";
import { render } from "@react-email/render";
import { z } from "zod";

import { db } from "~/server/db";
import { verifyPassword } from "~/utils/password";
import { sendEmail } from "~/lib/email";
import { MagicLinkTemplate } from "~/server/email/templates/magicLink";
import { acceptPendingInvitations } from "./acceptInvitations";
import { verifySiweMessage, findOrCreateUserByWallet } from "./siwe";

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
      walletAddress?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    walletAddress?: string;
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

        const { email: rawEmail, password } = result.data;
        const email = rawEmail.toLowerCase().trim();
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
    // SIWE (Sign-In with Ethereum) provider for WAAP wallet authentication
    CredentialsProvider({
      id: "siwe",
      name: "SIWE",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
        email: { label: "Email", type: "text" },
        csrfToken: { label: "CSRF Token", type: "text" },
      },
      async authorize(credentials) {
        const siweSchema = z.object({
          message: z.string().min(1),
          signature: z.string().min(1),
          email: z.string().email().optional().or(z.literal("")),
          csrfToken: z.string().min(1),
        });

        const result = siweSchema.safeParse(credentials);
        if (!result.success) {
          console.log("[AUTH:SIWE] Credentials validation failed:", result.error);
          return null;
        }

        const { message, signature, email, csrfToken } = result.data;

        try {
          // Determine expected domain from environment
          const nextAuthUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";
          const expectedDomain = new URL(nextAuthUrl).host;

          // Verify SIWE message signature, nonce, and domain
          const verification = await verifySiweMessage(
            message,
            signature,
            csrfToken,
            expectedDomain,
          );

          console.log("[AUTH:SIWE] Signature verified for address:", verification.address);

          // Find or create user by wallet address
          const user = await findOrCreateUserByWallet(
            verification.address,
            verification.chainId,
            email ?? undefined,
          );

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role ?? undefined,
          };
        } catch (error) {
          console.error("[AUTH:SIWE] Verification failed:", error);
          return null;
        }
      },
    }),
    PostmarkProvider({
      from: process.env.ADMIN_EMAIL ?? "noreply@fundingthecommons.io",
      apiKey: process.env.POSTMARK_SERVER_TOKEN,
      async sendVerificationRequest({ identifier: to, url, expires }) {
        const expirationMinutes = Math.round(
          (expires.getTime() - Date.now()) / (1000 * 60)
        );

        const html = await render(
          MagicLinkTemplate({ signInUrl: url, expirationMinutes }) as React.ReactElement
        );

        await sendEmail({
          to,
          subject: "Sign in to Funding the Commons",
          htmlContent: html,
          textContent: `Sign in to Funding the Commons:\n\n${url}\n\nThis link expires in ${expirationMinutes} minutes.`,
        });
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  // Account linking will be handled by the signIn callback
  pages: {
    signIn: '/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
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
    async signIn({ user }) {
      // Universal invitation acceptance for ALL sign-in methods
      if (user.id && user.email) {
        try {
          const invitationResult = await acceptPendingInvitations(user.email, user.id);
          if (invitationResult.accepted > 0) {
            console.log(
              `[AUTH] Accepted ${invitationResult.accepted} invitation(s) for ${user.email}:`,
              invitationResult.roles
            );
          }
        } catch (error) {
          // Log but never block sign-in
          console.error("[AUTH] Invitation acceptance failed:", error);
        }
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        // Fetch latest role and primary wallet from DB
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            walletAddresses: {
              where: { isPrimary: true },
              take: 1,
              select: { address: true },
            },
          },
        });
        token.role = dbUser?.role ?? user.role;
        token.walletAddress = dbUser?.walletAddresses[0]?.address;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as string | undefined,
        walletAddress: token.walletAddress as string | undefined,
      },
    }),
  },
} satisfies NextAuthConfig;
