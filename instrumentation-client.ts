import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No DSN configured yet = this becomes a safe no-op, not an error. Set
  // NEXT_PUBLIC_SENTRY_DSN in Vercel once a real Sentry project exists.
  environment: process.env.NODE_ENV,
  // Lower in production to control event volume/cost — 100% in dev is fine
  // since local traffic is low, but a live site under any real load would
  // generate far more traces than needed at 1.0.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  // Session replay is a real, ongoing cost line in Sentry's pricing and isn't
  // needed to solve the actual problem here (invisible server-side failures)
  // — deliberately left off rather than turned on by default.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
