import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Silences noisy build-time Sentry CLI logs — flip to true when actively
  // debugging a source-map-upload issue.
  silent: true,
  // Without a real org/project/authToken configured (none exist yet — see
  // the setup notes), the Sentry build plugin skips itself gracefully rather
  // than failing the build.
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring-tunnel",
});
