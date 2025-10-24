/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const config = {};

// Make sure adding Sentry options is the last code to run before exporting
export default withSentryConfig(config, {
  org: "funding-the-commons",
  project: "ftc-platform",

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: false, // Can be used to suppress logs

  sourcemaps: {
    disable: true, // Disable source map uploads
  },
  disableLogger: true,
});
