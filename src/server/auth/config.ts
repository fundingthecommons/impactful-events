import type React from "react";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import PostmarkProvider from "next-auth/providers/postmark";
import { render } from "@react-email/render";
import { z } from "zod";

import { db } from "~/server/db";
import { verifyPassword } from "~/utils/password";
import { sendEmail } from "~/lib/email";
import { MagicLinkTemplate } from "~/server/email/templates/magicLink";
import { acceptPendingInvitations } from "./acceptInvitations";
import { getFullName } from "~/utils/userDisplay";

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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log(
          "[AUTH] Authorize function called with credentials for:",
          credentials?.email,
        );

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

        console.log(
          "[AUTH] User found:",
          user
            ? {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                surname: user.surname,
                hasPassword: !!user.password,
              }
            : "No user found",
        );

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
          name: getFullName(user),
          role: user.role ?? undefined,
        };

        console.log(
          "[AUTH] Authentication successful, returning user:",
          userForAuth,
        );
        return userForAuth;
      },
    }),
    DiscordProvider,
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      // Using default scopes (openid, email, profile) to avoid Google verification requirements.
      // To enable Google Contacts sync and Gmail import, uncomment the authorization block below
      // and complete Google's verification process (sensitive/restricted scope review).
      // authorization: {
      //   params: {
      //     prompt: "consent",
      //     access_type: "offline",
      //     response_type: "code",
      //     scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/gmail.readonly",
      //   },
      // },
    }),
    PostmarkProvider({
      from: process.env.ADMIN_EMAIL ?? "noreply@fundingthecommons.io",
      apiKey: process.env.POSTMARK_SERVER_TOKEN,
      async sendVerificationRequest({ identifier: to, url, expires }) {
        const expirationMinutes = Math.round(
          (expires.getTime() - Date.now()) / (1000 * 60),
        );

        const html = await render(
          MagicLinkTemplate({
            signInUrl: url,
            expirationMinutes,
          }) as React.ReactElement,
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
    signIn: "/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
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
    async signIn({ user, account, profile, email }) {
      // Update firstName/surname from OAuth provider profile if available
      if (account?.provider === "google" && profile && user.id) {
        const googleProfile = profile as {
          given_name?: string;
          family_name?: string;
        };
        if (googleProfile.given_name ?? googleProfile.family_name) {
          await db.user
            .update({
              where: { id: user.id },
              data: {
                firstName:
                  googleProfile.given_name ?? user.name?.split(" ")[0] ?? null,
                surname:
                  googleProfile.family_name ??
                  user.name?.split(" ").slice(1).join(" ") ??
                  null,
                name: user.name, // Keep name field for compatibility
              },
            })
            .catch(() => {
              // Ignore errors if user doesn't exist yet (will be created by adapter)
            });
        }
      } else if (account?.provider === "discord" && user.name && user.id) {
        // Parse Discord username into firstName/surname
        const nameParts = user.name.split(" ");
        const firstName = nameParts[0] ?? user.name;
        const surname = nameParts.slice(1).join(" ") || "";
        await db.user
          .update({
            where: { id: user.id },
            data: {
              firstName,
              surname,
              name: user.name, // Keep name field for compatibility
            },
          })
          .catch(() => {
            // Ignore errors if user doesn't exist yet (will be created by adapter)
          });
      }

      // Universal invitation acceptance for ALL sign-in methods
      if (user.id && user.email) {
        try {
          // SECURITY: OAuth providers (Google/Discord) prove the user controls
          // this email, and a magic-link (Postmark, type "email") sign-in
          // proves it by the click itself; the credentials provider does not.
          // Auth.js runs this callback TWICE for the email provider: once at
          // the sign-in REQUEST, before any link is clicked, with
          // `email: { verificationRequest: true }` (@auth/core 0.41.3,
          // lib/actions/signin/send-token.js: callbacks.signIn({ user,
          // account, email: { verificationRequest: true } })), and again after
          // the click with no `email` param (lib/actions/callback/index.js:
          // handleAuthorized({ user, account })). Only the second call proves
          // anything: anyone can type an invitee's address into the sign-in
          // form, and `account.type === "email"` alone promoted that address's
          // existing (e.g. attacker-pre-registered) account before the link
          // was ever opened. Global admin/staff grants are refused on an
          // unverified email (see acceptPendingInvitations).
          //
          // OAuth is proof only when the provider itself says the address is
          // verified: Google sends `email_verified`, Discord sends `verified`,
          // and both can be false (a Discord account may carry any unverified
          // address). `profile` here is the raw provider profile.
          const oauthProfile = (profile ?? {}) as {
            email_verified?: boolean;
            verified?: boolean;
          };
          const emailVerified =
            (account?.provider === "google" &&
              oauthProfile.email_verified === true) ||
            (account?.provider === "discord" &&
              oauthProfile.verified === true) ||
            (account?.type === "email" && !email?.verificationRequest);

          if (emailVerified) {
            // SECURITY: account pre-hijack defence. Credentials sign-up does
            // no verification, so an attacker can register the invitee's
            // address with a password of their own before the invitation
            // exists. When the real owner later proves control of the address
            // (clicked magic link, verified OAuth), that proof must take
            // ownership of the row: stamp emailVerified and drop any password
            // set while the address was unverified, otherwise the global role
            // granted below would land on an account the attacker still
            // controls. The legitimate owner can set a new password via the
            // emailed reset flow. Looked up by email because for a brand-new
            // OAuth user `user.id` is the provider id and no row exists yet.
            const existingRow = await db.user.findUnique({
              where: { email: user.email },
              select: { id: true, emailVerified: true, password: true },
            });
            if (existingRow && !existingRow.emailVerified) {
              await db.user.update({
                where: { id: existingRow.id },
                data: {
                  emailVerified: new Date(),
                  ...(existingRow.password ? { password: null } : {}),
                },
              });
              if (existingRow.password) {
                console.warn(
                  `[AUTH] Verified sign-in for ${user.email} took ownership of a pre-registered unverified credentials account; its password was cleared.`,
                );
              }
            }
          }

          const invitationResult = await acceptPendingInvitations(
            user.email,
            user.id,
            { emailVerified },
          );
          if (invitationResult.accepted > 0) {
            console.log(
              `[AUTH] Accepted ${invitationResult.accepted} invitation(s) for ${user.email}:`,
              invitationResult.roles,
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
        // Fetch latest role from DB (invitation acceptance may have updated it)
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? user.role;
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
} satisfies NextAuthConfig;
