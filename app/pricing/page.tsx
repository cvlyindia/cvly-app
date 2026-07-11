'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';

const FREE_FEATURES = [
  'ATS match score',
  'Keyword gap analysis',
  'AI resume rewrite',
  'Cover letter generator',
  '100 interview questions',
  'Dashboard, history & goal tracking',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Application tracker (Kanban board)',
  'LinkedIn profile review',
  'Portfolio review',
  'Priority processing',
];

export default function PricingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'joined' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleJoinWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus('joined');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={30} height={28} className="rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">← Back</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12 fade-up">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Simple pricing</h1>
          <p className="text-[var(--muted)] max-w-md mx-auto">Everything is free right now, while we&apos;re building. Here&apos;s what&apos;s free today, and what we&apos;re planning next.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {/* Free tier — real, active */}
          <div className="card rounded-2xl p-7 fade-up fade-up-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-lg">Free</p>
              <span className="text-[10px] font-bold text-white bg-[var(--good)] px-2 py-0.5 rounded-full">ACTIVE NOW</span>
            </div>
            <p className="text-3xl font-bold tracking-tight mb-1">₹0</p>
            <p className="text-xs text-[var(--muted)] mb-6">No card, no time limit, while we&apos;re in beta</p>
            <div className="space-y-2.5 mb-7">
              {FREE_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--good)] shrink-0" />
                  <p className="text-sm text-[var(--ink)]/85">{f}</p>
                </div>
              ))}
            </div>
            <Link href="/#tool" className="btn-accent w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold">
              Start free <ArrowRight size={15} />
            </Link>
          </div>

          {/* Pro tier — honest coming-soon, no fake buy button */}
          <div className="rounded-2xl p-7 border border-[var(--line)] bg-[var(--surface)] fade-up fade-up-2">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-lg">Pro</p>
              <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--line)] px-2 py-0.5 rounded-full">COMING SOON</span>
            </div>
            <p className="text-3xl font-bold tracking-tight mb-1 text-[var(--muted)]">TBD</p>
            <p className="text-xs text-[var(--muted)] mb-6">We haven&apos;t finalized pricing — early joiners get advance notice and a fair price</p>
            <div className="space-y-2.5 mb-7">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--muted-soft)] shrink-0" />
                  <p className="text-sm text-[var(--muted)]">{f}</p>
                </div>
              ))}
            </div>

            {status === 'joined' ? (
              <div className="flex items-center gap-2 justify-center py-3 text-sm font-semibold text-[var(--good)]">
                <Sparkles size={15} /> You&apos;re on the list
              </div>
            ) : (
              <form onSubmit={handleJoinWaitlist} className="space-y-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] transition"
                />
                {status === 'error' && <p className="text-xs text-[var(--bad)]">{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-[var(--line)] text-sm font-semibold hover:bg-white transition disabled:opacity-50"
                >
                  {status === 'loading' ? <><Loader2 size={14} className="animate-spin" /> Joining…</> : 'Notify me when it\'s ready'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6 fade-up fade-up-3">
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Will Free stay free?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">The core of Cvly — scoring, rewriting, cover letters, interview prep — stays free. Pro will add extras on top, not take away what&apos;s already free.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">What happens to my account when Pro launches?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Nothing changes automatically. If you&apos;re on the waitlist, you&apos;ll hear from us first, with a fair price, before anything is billed.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
