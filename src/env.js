import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NOTION_TOKEN: z.string(),
    NOTION_CONTACTS_DATABASE_ID: z.string(),
    NOTION_EVENTS_DATABASE_ID: z.string(),
    POSTMARK_SERVER_TOKEN: z.string(),
    POSTMARK_SANDBOX_TOKEN: z.string().optional(),
    EMAIL_MODE: z.enum(["development", "staging", "production"]).default("development"),
    TEST_EMAIL_OVERRIDE: z.string().email(),
    ADMIN_EMAIL: z.string().email(),
    MASTRA_API_KEY: z.string(),
    OPENAI_API_KEY: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHANNEL_ID: z.string().optional(),
    TELEGRAM_PRAISE_TOPIC_ID: z.string().optional(),
    TELEGRAM_ASKOFFER_TOPIC_ID: z.string().optional(),
    TELEGRAM_UPDATES_TOPIC_ID: z.string().optional(),
    ATPROTO_PDS_URL: z.string().url().optional().default("https://bsky.social"),
    ATPROTO_ENCRYPTION_KEY: z.string().min(32).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NOTION_TOKEN: process.env.NOTION_TOKEN,
    NOTION_CONTACTS_DATABASE_ID: process.env.NOTION_CONTACTS_DATABASE_ID,
    NOTION_EVENTS_DATABASE_ID: process.env.NOTION_EVENTS_DATABASE_ID,
    POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN,
    POSTMARK_SANDBOX_TOKEN: process.env.POSTMARK_SANDBOX_TOKEN,
    EMAIL_MODE: process.env.EMAIL_MODE,
    TEST_EMAIL_OVERRIDE: process.env.TEST_EMAIL_OVERRIDE,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    MASTRA_API_KEY: process.env.MASTRA_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    TELEGRAM_PRAISE_TOPIC_ID: process.env.TELEGRAM_PRAISE_TOPIC_ID,
    TELEGRAM_ASKOFFER_TOPIC_ID: process.env.TELEGRAM_ASKOFFER_TOPIC_ID,
    TELEGRAM_UPDATES_TOPIC_ID: process.env.TELEGRAM_UPDATES_TOPIC_ID,
    ATPROTO_PDS_URL: process.env.ATPROTO_PDS_URL,
    ATPROTO_ENCRYPTION_KEY: process.env.ATPROTO_ENCRYPTION_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
