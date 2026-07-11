'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

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
    <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--bg)]">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-10">
          <Image src="/logo.png" alt="Cvly" width={30} height={30} className="rounded-lg" />
          <span className="text-lg font-semibold tracking-tight">Cvly</span>
        </div>

        {sent ? (
          <div className="card rounded-2xl p-7 text-center">
            <p className="font-semibold mb-2">Check your email</p>
            <p className="text-sm text-[var(--muted)]">We sent a link to {email}. Click it to sign in — no password needed.</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="card rounded-2xl p-7">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">Sign in to save your results</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm mb-3 focus:outline-none focus:border-[var(--ink)] transition"
            />
            {error && <p className="text-xs text-[var(--bad)] mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3 rounded-full font-medium text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : 'Send login link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
