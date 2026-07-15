import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // pdf-parse (v2) bundles pdfjs-dist internally, which uses dynamic worker-file
  // resolution that Next.js's bundler can't statically analyze correctly. Marking it
  // external tells Next.js to load it from node_modules at runtime instead of trying
  // to bundle it — this is pdf-parse's own documented fix for Next.js/Vercel.
  serverExternalPackages: ["pdf-parse"],
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
