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
    TEST_EMAIL_OVERRIDE: z.string().email().default("james@fundingthecommons.io"),
    MASTRA_API_KEY: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
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
    MASTRA_API_KEY: process.env.MASTRA_API_KEY,
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
