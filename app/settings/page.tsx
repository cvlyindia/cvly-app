'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/DashboardShell';
import { PLAN_LIMITS } from '@/lib/credits';
import { Loader2, Zap, Mail, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { friendlyErrorMessage, safeParseJson } from '@/lib/friendlyError';

export default function SettingsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [provider, setProvider] = useState('email');
  const [credits, setCredits] = useState<{ remaining: number; plan: string; resetAt: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'confirming' | 'deleting' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setEmail(data.user.email ?? '');
      setProvider(data.user.app_metadata?.provider ?? 'email');
      setCheckingAuth(false);
      fetch('/api/credits')
        .then((res) => res.json())
        .then((d) => {
          if (d.loggedIn) setCredits({ remaining: d.remaining, plan: d.plan, resetAt: d.resetAt });
        });
    });
  }, [router]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Those two passwords don\'t match.');
      return;
    }
    setPasswordStatus('saving');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message);
      setPasswordStatus('error');
    } else {
      setPasswordStatus('saved');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  async function handleDeleteAccount() {
    setDeleteStatus('deleting');
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: deleteConfirmText }),
      });
      const data = await safeParseJson(res);
      if (!data || data.error) {
        throw new Error((data?.error as string) || `request failed with status ${res.status}`);
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/');
    } catch (err) {
      setDeleteError(friendlyErrorMessage(err));
      setDeleteStatus('error');
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  return (
    <DashboardShell activePage="settings" pageTitle="Settings" userEmail={email} credits={credits} onCreditsChange={(updater) => setCredits((c) => (c ? { ...c, ...updater(c) } : c))} onSignOut={handleSignOut}>
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
              <p className="text-xs text-[var(--muted)]">
                {provider === 'google' ? 'Signed in with Google' : provider === 'linkedin_oidc' ? 'Signed in with LinkedIn' : 'Signed in with magic link'}
              </p>
            </div>
          </div>
        </div>

        {/* Backup password — a fallback if email delivery or your sign-in provider is ever unavailable */}
        <div className="card rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Backup password</p>
          <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
            Optional — but if the magic-link email or {provider === 'google' ? 'Google' : provider === 'linkedin_oidc' ? 'LinkedIn' : 'your sign-in method'} is ever unavailable, a password gets you back in without waiting on either.
          </p>
          <form onSubmit={handleSetPassword} className="space-y-2.5">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              className="w-full p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
            />
            {passwordError && <p className="text-xs text-[var(--bad)]">{passwordError}</p>}
            {passwordStatus === 'saved' && <p className="text-xs text-[var(--good)]">Password set — you can now sign in with {email} and this password anytime.</p>}
            <button
              type="submit"
              disabled={passwordStatus === 'saving' || !newPassword || !confirmPassword}
              className="px-4 py-2 rounded-full bg-[var(--ink)] text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {passwordStatus === 'saving' && <Loader2 size={12} className="animate-spin" />}
              Set password
            </button>
          </form>
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

          {deleteStatus === 'idle' ? (
            <>
              <p className="text-sm text-[var(--ink)]/75 mb-4 leading-relaxed">
                Deletes your account and everything tied to it — scans, tracker, reviews, saved plan — right away. This can&apos;t be undone.
              </p>
              <button onClick={() => setDeleteStatus('confirming')} className="text-sm font-semibold text-[var(--bad)] hover:underline">
                Delete my account
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--ink)]/75 mb-1 leading-relaxed flex items-start gap-2">
                <AlertTriangle size={15} className="text-[var(--bad)] shrink-0 mt-0.5" />
                This permanently deletes your account and everything tied to it. Type your email (<span className="font-mono">{email}</span>) to confirm.
              </p>
              <input
                type="email"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={email}
                className="w-full mt-3 px-3.5 py-2.5 rounded-lg border border-[var(--bad)]/30 bg-white text-sm outline-none focus:border-[var(--bad)]"
              />
              {deleteError && <p className="text-xs text-[var(--bad)] mt-2">{deleteError}</p>}
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText.trim().toLowerCase() !== email.toLowerCase() || deleteStatus === 'deleting'}
                  className="text-sm font-semibold text-white bg-[var(--bad)] px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {deleteStatus === 'deleting' ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Permanently delete'}
                </button>
                <button onClick={() => { setDeleteStatus('idle'); setDeleteConfirmText(''); setDeleteError(''); }} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">
                  Cancel
                </button>
              </div>
            </>
          )}

          <button onClick={handleSignOut} className="text-sm font-semibold text-[var(--bad)] hover:underline mt-4 block">
            Sign out of this device
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
