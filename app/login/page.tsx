'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.png" alt="cvly" width={32} height={32} className="rounded-md" />
          <span className="font-display text-xl font-semibold text-[var(--ink)]">cvly</span>
        </div>

        {sent ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="font-medium text-[var(--ink)] mb-2">Check your email</p>
            <p className="text-sm text-[var(--muted)]">We sent a login link to {email}. Click it to sign in — no password needed.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="glass rounded-xl p-6">
            <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] block mb-3">Sign in to save your results</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 rounded-lg border border-[var(--line)] text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--orange)]"
            />
            {error && <p className="text-xs text-[var(--bad)] mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[var(--orange)] text-black font-semibold text-sm hover:bg-[var(--orange-deep)] transition disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send login link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
