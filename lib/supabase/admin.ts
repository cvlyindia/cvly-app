import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * This is intentionally separate from lib/supabase/server.ts (the normal
 * cookie-based client every other route uses). This one has admin-level
 * database access and must only ever be created inside server-only code
 * (Server Components, Route Handlers) — never imported by anything with
 * 'use client' at the top, and the key itself must never be a
 * NEXT_PUBLIC_ variable or it would ship to every visitor's browser.
 *
 * The 'server-only' import above is a build-time guard: if this file is
 * ever accidentally imported into client-bundled code, the build fails
 * instead of silently shipping the service role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
