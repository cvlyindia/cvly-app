'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Loader2, Sparkles, Building2 } from 'lucide-react';

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

const ENTERPRISE_FEATURES = [
  'Everything in Pro, for your whole team',
  'Team seats & centralized billing',
  'Usage insights across your team',
  'Dedicated onboarding support',
  'Custom integrations, on request',
];

const MONTHLY_PRICE = 99;
const YEARLY_PRICE = 999;
const YEARLY_MONTHLY_EQUIVALENT = Math.round(YEARLY_PRICE / 12);
const YEARLY_SAVINGS_PCT = Math.round((1 - YEARLY_PRICE / (MONTHLY_PRICE * 12)) * 100);

function WaitlistForm({ plan }: { plan: 'pro' | 'enterprise' }) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'joined' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan, company: plan === 'enterprise' ? company : undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus('joined');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'joined') {
    return (
      <div className="flex items-center gap-2 justify-center py-3 text-sm font-semibold text-[var(--good)]">
        <Sparkles size={15} /> {plan === 'enterprise' ? "We'll be in touch" : "You're on the list"}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {plan === 'enterprise' && (
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name (optional)"
          className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] transition"
        />
      )}
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
        {status === 'loading' ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : plan === 'enterprise' ? 'Talk to us' : "Notify me when it's ready"}
      </button>
    </form>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const proPrice = billing === 'monthly' ? MONTHLY_PRICE : YEARLY_MONTHLY_EQUIVALENT;

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={30} height={28} className="rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">← Back</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-8 fade-up">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Simple pricing</h1>
          <p className="text-[var(--muted)] max-w-md mx-auto">Everything is free right now, while we&apos;re building. Here&apos;s what&apos;s free today, and what&apos;s coming next.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10 fade-up fade-up-1">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--surface)] border border-[var(--line)]">
            {(['monthly', 'yearly'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                  billing === b ? 'bg-white shadow-sm text-[var(--ink)]' : 'text-[var(--muted)]'
                }`}
              >
                {b === 'monthly' ? 'Monthly' : 'Yearly'}
                {b === 'yearly' && (
                  <span className="text-[10px] font-bold text-white bg-[var(--good)] px-1.5 py-0.5 rounded-full">
                    Save {YEARLY_SAVINGS_PCT}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-14">
          {/* Free */}
          <div className="card rounded-2xl p-6 fade-up fade-up-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold">Individual</p>
              <span className="text-[10px] font-bold text-white bg-[var(--good)] px-2 py-0.5 rounded-full">ACTIVE NOW</span>
            </div>
            <p className="text-3xl font-bold tracking-tight mb-1">₹0</p>
            <p className="text-xs text-[var(--muted)] mb-6">No card, while we&apos;re in beta</p>
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

          {/* Pro */}
          <div className="rounded-2xl p-6 border-2 border-[var(--accent)] bg-white relative fade-up fade-up-2">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold">Pro</p>
              <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--line)] px-2 py-0.5 rounded-full">COMING SOON</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <p className="text-3xl font-bold tracking-tight">₹{proPrice}</p>
              <p className="text-sm text-[var(--muted)]">/mo</p>
            </div>
            <p className="text-xs text-[var(--muted)] mb-6">
              {billing === 'yearly' ? `Billed ₹${YEARLY_PRICE} yearly` : 'Billed monthly, cancel anytime'}
            </p>
            <div className="space-y-2.5 mb-7">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--accent-ink)] shrink-0" />
                  <p className="text-sm text-[var(--ink)]/85">{f}</p>
                </div>
              ))}
            </div>
            <WaitlistForm plan="pro" />
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl p-6 border border-[var(--line)] bg-[var(--surface)] fade-up fade-up-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold flex items-center gap-1.5"><Building2 size={15} /> Enterprise</p>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-1 text-[var(--muted)]">Let&apos;s talk</p>
            <p className="text-xs text-[var(--muted)] mb-6">For placement cells, agencies, and teams</p>
            <div className="space-y-2.5 mb-7">
              {ENTERPRISE_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-[var(--muted-soft)] shrink-0" />
                  <p className="text-sm text-[var(--muted)]">{f}</p>
                </div>
              ))}
            </div>
            <WaitlistForm plan="enterprise" />
          </div>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto fade-up">
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Will Free stay free?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">The core of Cvly — scoring, rewriting, cover letters, interview prep — stays free. Pro and Enterprise add extras on top, not take away what&apos;s already free.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">What happens to my account when Pro launches?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Nothing changes automatically. If you&apos;re on the waitlist, you&apos;ll hear from us first, with a fair price, before anything is billed.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Are these final prices?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Pro&apos;s ₹{MONTHLY_PRICE}/month is our current target, not locked in yet. Waitlist members get advance notice of anything before it&apos;s live.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
