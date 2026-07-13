'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { GoogleIcon, LinkedinIcon } from '@/components/SocialIcons';

const RESEND_COOLDOWN_SECONDS = 60; // matches Supabase's own default per-email OTP cooldown

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'linkedin_oidc' | null>(null);

  const next = searchParams.get('next');

  async function handleOAuth(provider: 'google' | 'linkedin_oidc') {
    setError('');
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
    // On success, Supabase redirects the browser away immediately — no further action needed here.
  }

  async function sendMagicLink() {
    if (cooldown > 0 || loading || !email) return;
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sendMagicLink();
  }

  return (
    <>
      {sent ? (
        <div className="card rounded-2xl p-7 text-center">
          <p className="font-semibold mb-2">Check your email</p>
          <p className="text-sm text-[var(--muted)] mb-4">We sent a link to {email}. Click it to sign in — no password needed.</p>
          {cooldown > 0 ? (
            <p className="text-xs text-[var(--muted-soft)]">Didn&apos;t get it? You can resend in {cooldown}s</p>
          ) : (
            <button
              onClick={sendMagicLink}
              disabled={loading}
              className="text-xs font-medium text-[var(--accent-ink)] hover:underline disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Resend link'}
            </button>
          )}
        </div>
      ) : (
        <div className="card rounded-2xl p-7">
          <div className="space-y-2.5 mb-5">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-full border border-[var(--line)] text-sm font-medium hover:bg-[var(--surface)] transition disabled:opacity-50"
            >
              {oauthLoading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon size={17} />}
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('linkedin_oidc')}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-full border border-[var(--line)] text-sm font-medium hover:bg-[var(--surface)] transition disabled:opacity-50"
            >
              {oauthLoading === 'linkedin_oidc' ? <Loader2 size={16} className="animate-spin" /> : <LinkedinIcon size={17} className="text-[#0A66C2]" />}
              Continue with LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="text-xs text-[var(--muted-soft)]">or</span>
            <div className="flex-1 h-px bg-[var(--line)]" />
          </div>

          <form onSubmit={handleLogin}>
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">Sign in to save your results</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
            />
            {error && <p className="text-xs text-[var(--bad)] mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="btn-accent w-full py-3 rounded-full font-medium text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send login link'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 justify-center mb-10 group">
          <Image src="/logo.png" alt="Cvly" width={30} height={30} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight group-hover:text-[var(--accent-ink)] transition">Cvly</span>
        </Link>
        <Suspense fallback={<div className="card rounded-2xl p-7 flex justify-center"><Loader2 size={18} className="animate-spin text-[var(--muted)]" /></div>}>
          <LoginForm />
        </Suspense>
        <Link href="/" className="block text-center text-xs text-[var(--muted-soft)] hover:text-[var(--muted)] transition mt-5">
          ← Back to home
        </Link>
        <p className="text-center text-[11px] text-[var(--muted-soft)] mt-6 leading-relaxed">
          By continuing, you agree to Cvly&apos;s{' '}
          <Link href="/terms" className="underline hover:text-[var(--muted)] transition">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="underline hover:text-[var(--muted)] transition">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
