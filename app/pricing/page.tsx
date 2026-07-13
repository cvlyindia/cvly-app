'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ArrowRight, Loader2, Sparkles, Building2, Zap } from 'lucide-react';

const FREE_FEATURES = [
  'ATS match score',
  'Keyword gap analysis',
  'AI resume rewrite',
  'Cover letter generator',
  '100 interview questions',
  'Dashboard, history & goal tracking',
  'Application tracker (Kanban board)',
  'LinkedIn profile review',
  'Portfolio review',
];

const PRO_FEATURES = [
  'Everything in Free',
  '100 credits every day — 10x the free plan',
  'Priority processing (in development)',
];

const ENTERPRISE_FEATURES = [
  'Everything in Pro, for your whole team',
  '1,000 pooled credits every day',
  'Team seats & centralized billing (in development)',
  'Usage insights across your team (in development)',
  'Dedicated onboarding support',
];

const PRICING = {
  pro: { monthly: 99, yearly: 999 },
  enterprise: { monthly: 999, yearly: 9999 },
};

const TOPUPS = [
  { credits: 20, price: 49 },
  { credits: 60, price: 129 },
  { credits: 150, price: 299 },
];

function yearlySavings(monthly: number, yearly: number) {
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

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
          className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
        />
      )}
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
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
  const proPrice = billing === 'monthly' ? PRICING.pro.monthly : Math.round(PRICING.pro.yearly / 12);
  const entPrice = billing === 'monthly' ? PRICING.enterprise.monthly : Math.round(PRICING.enterprise.yearly / 12);
  const proSavings = yearlySavings(PRICING.pro.monthly, PRICING.pro.yearly);

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
          <p className="text-[var(--muted)] max-w-md mx-auto">Free comes with daily credits so it stays fair for everyone. Upgrade any time for more.</p>
        </div>

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
                    Save {proSavings}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {/* Free */}
          <div className="card rounded-2xl p-6 fade-up fade-up-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold">Individual</p>
              <span className="text-[10px] font-bold text-white bg-[var(--good)] px-2 py-0.5 rounded-full">ACTIVE NOW</span>
            </div>
            <p className="text-3xl font-bold tracking-tight mb-1">₹0</p>
            <p className="text-xs text-[var(--muted)] mb-6">10 credits every day, no card</p>
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
              {billing === 'yearly' ? `Billed ₹${PRICING.pro.yearly} yearly` : 'Billed monthly, cancel anytime'}
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
              <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--line)] px-2 py-0.5 rounded-full">COMING SOON</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <p className="text-3xl font-bold tracking-tight text-[var(--muted)]">₹{entPrice}</p>
              <p className="text-sm text-[var(--muted)]">/mo</p>
            </div>
            <p className="text-xs text-[var(--muted)] mb-6">
              {billing === 'yearly' ? `Billed ₹${PRICING.enterprise.yearly} yearly` : 'For placement cells, agencies, teams'}
            </p>
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

        {/* Credit top-ups */}
        <div className="card rounded-2xl p-6 mb-14 fade-up">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-[var(--accent-ink)]" />
            <p className="font-semibold text-sm">Need more credits without upgrading?</p>
          </div>
          <p className="text-xs text-[var(--muted)] mb-5">Top-up packs, on any plan. Coming soon alongside Pro.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {TOPUPS.map((t) => (
              <div key={t.credits} className="rounded-xl border border-[var(--line)] p-4 text-center opacity-60">
                <p className="text-xl font-bold tracking-tight">{t.credits}</p>
                <p className="text-xs text-[var(--muted)] mb-2">credits</p>
                <p className="text-sm font-semibold">₹{t.price}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--muted-soft)] mt-4">1 credit = a score, rewrite, or cover letter. Interview prep (100 questions) uses 3 credits — it&apos;s a bigger request.</p>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto fade-up">
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Why credits, if Free is free?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Every check runs on real AI, and that has a real cost on our side. Credits keep the free tier generous and fair — 10 a day covers trying it properly — without it being abused by scripts or bulk scraping.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">What happens when I run out?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">You&apos;ll see exactly when your credits reset, and you can top up or upgrade any time — nothing is ever charged without you choosing to.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">Are these final prices?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Pro and Enterprise pricing shown here are our current targets, not locked in. Waitlist members get advance notice before anything goes live.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1.5">What does &quot;in development&quot; mean?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed">Exactly that — not built yet. We won&apos;t bill anyone for a feature before it&apos;s real. Everything else on this page (credits, the tracker, everything in the Free tier) is live today.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
