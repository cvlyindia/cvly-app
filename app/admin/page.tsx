import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/adminAuth';
import { TestSentryButton } from '@/components/TestSentryButton';

function countRecentSignups(users: { created_at: string }[], windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return users.filter((u) => new Date(u.created_at).getTime() > cutoff).length;
}

export default async function AdminPage() {
  // Server-side auth check FIRST — this runs before any admin data is ever
  // fetched, so an unauthorized visitor never causes a single sensitive
  // query to run, let alone see the result. This is not a client-side
  // UI toggle; someone without a valid session or the right email is
  // redirected before this function does anything else.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect('/login');
  }

  const admin = createAdminClient();

  // Cvly is early-stage — a single page of up to 1000 users comfortably
  // covers current scale. This will need real pagination once past that,
  // noted here rather than silently truncating without explanation.
  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = usersData?.users ?? [];

  const { data: scans, error: scansError } = await admin
    .from('scans')
    .select('id, user_id, score, created_at')
    .order('created_at', { ascending: false });

  const { data: credits } = await admin.from('user_credits').select('user_id, plan, credits_remaining');

  const scanCountByUser = new Map<string, number>();
  for (const s of scans ?? []) {
    scanCountByUser.set(s.user_id, (scanCountByUser.get(s.user_id) ?? 0) + 1);
  }
  const planByUser = new Map<string, string>();
  for (const c of credits ?? []) {
    planByUser.set(c.user_id, c.plan);
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const signupsLast24h = countRecentSignups(users, dayMs);
  const signupsLast7d = countRecentSignups(users, 7 * dayMs);

  const sortedUsers = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentScans = (scans ?? []).slice(0, 50);
  const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cvly" width={28} height={26} className="rounded-md" />
            <span className="font-bold text-lg">Admin</span>
          </div>
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">
            ← Back to Dashboard
          </Link>
        </div>

        {(usersError || scansError) && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--bad-bg)] text-[var(--bad)] text-sm">
            {usersError && <p>Users error: {usersError.message}</p>}
            {scansError && <p>Scans error: {scansError.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="card rounded-2xl p-5">
            <p className="text-2xl font-bold tabular-nums">{users.length}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Total users</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-2xl font-bold tabular-nums">{signupsLast24h}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Signups, 24h</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-2xl font-bold tabular-nums">{signupsLast7d}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Signups, 7d</p>
          </div>
          <div className="card rounded-2xl p-5">
            <p className="text-2xl font-bold tabular-nums">{scans?.length ?? 0}</p>
            <p className="text-xs text-[var(--muted)] mt-1">Total scans</p>
          </div>
        </div>

        <TestSentryButton />

        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">All users</h2>
        <div className="card rounded-2xl overflow-hidden mb-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--muted)] uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
                <th className="px-4 py-3 font-medium text-right">Scans</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{u.app_metadata?.provider ?? 'email'}</td>
                  <td className="px-4 py-3 text-[var(--muted)] capitalize">{planByUser.get(u.id) ?? 'free'}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{scanCountByUser.get(u.id) ?? 0}</td>
                </tr>
              ))}
              {sortedUsers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">Recent scans</h2>
        <div className="card rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs text-[var(--muted)] uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((s) => (
                <tr key={s.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-4 py-3">{emailByUserId.get(s.user_id) ?? 'Unknown'}</td>
                  <td className="px-4 py-3 tabular-nums">{s.score}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{new Date(s.created_at).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {recentScans.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)]">No scans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
