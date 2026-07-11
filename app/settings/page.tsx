'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/DashboardShell';
import { PLAN_LIMITS } from '@/lib/credits';
import { Loader2, Zap, Mail, Trash2, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<{ remaining: number; plan: string; resetAt: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setEmail(data.user.email ?? '');
      setCheckingAuth(false);
      fetch('/api/credits')
        .then((res) => res.json())
        .then((d) => {
          if (d.loggedIn) setCredits({ remaining: d.remaining, plan: d.plan, resetAt: d.resetAt });
        });
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  return (
    <DashboardShell activePage="settings" pageTitle="Settings" userEmail={email} credits={credits} onSignOut={handleSignOut}>
      <div className="max-w-xl space-y-6">
        {/* Account */}
        <div className="card rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">Account</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] flex items-center justify-center">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-sm font-medium">{email}</p>
              <p className="text-xs text-[var(--muted)]">Signed in with magic link — no password to manage</p>
            </div>
          </div>
        </div>

        {/* Plan & credits */}
        <div className="card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Plan &amp; credits</p>
            <Link href="/pricing" className="text-xs font-semibold text-[var(--accent-ink)] hover:underline">View plans</Link>
          </div>
          {credits ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold capitalize flex items-center gap-1.5">
                  <Zap size={14} className="text-[var(--accent-ink)]" /> {credits.plan} plan
                </span>
                <span className="text-sm text-[var(--muted)] tabular-nums">{credits.remaining} / {PLAN_LIMITS[credits.plan] ?? 5} credits</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--line)] overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                  style={{ width: `${Math.min(100, (credits.remaining / (PLAN_LIMITS[credits.plan] ?? 5)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--muted)]">Resets {new Date(credits.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          )}
        </div>

        {/* Data & privacy */}
        <div className="card rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">Data &amp; privacy</p>
          <div className="space-y-3">
            <Link href="/history" className="flex items-center justify-between text-sm text-[var(--ink)]/85 hover:text-[var(--ink)] transition">
              <span className="flex items-center gap-2.5"><Trash2 size={15} className="text-[var(--muted)]" /> Delete individual checks</span>
              <span className="text-xs text-[var(--muted)]">Go to History →</span>
            </Link>
            <Link href="/privacy" className="flex items-center justify-between text-sm text-[var(--ink)]/85 hover:text-[var(--ink)] transition">
              <span className="flex items-center gap-2.5"><ExternalLink size={15} className="text-[var(--muted)]" /> Privacy policy</span>
            </Link>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl p-6 border border-[var(--bad)]/20 bg-[var(--bad-bg)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bad)] mb-2">Account deletion</p>
          <p className="text-sm text-[var(--ink)]/75 mb-4 leading-relaxed">
            We don&apos;t have self-serve account deletion built yet. Email us and we&apos;ll remove your account and everything tied to it, by hand, within a few days.
          </p>
          <button onClick={handleSignOut} className="text-sm font-semibold text-[var(--bad)] hover:underline">
            Sign out of this device
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
