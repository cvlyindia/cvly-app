'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { digest: error.digest, boundary: 'global-error' } });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>
            Something went wrong on our end.
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px', maxWidth: '380px' }}>
            This has been reported automatically. Try again, or head back to the homepage.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={reset}
              style={{
                padding: '10px 20px',
                borderRadius: '999px',
                background: '#E85D2C',
                color: 'white',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberate: this boundary
                renders when the whole app (including the root layout) has crashed, so it needs a plain
                full-page reload, not client-side routing that depends on the same app working */}
            <a
              href="/"
              style={{
                padding: '10px 20px',
                borderRadius: '999px',
                border: '1px solid #e5e7eb',
                color: 'inherit',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
