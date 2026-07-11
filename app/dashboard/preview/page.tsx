'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ScoreRing } from '@/components/ScoreRing';
import { Plus, Info } from 'lucide-react';

const SAMPLE_LATEST = {
  score: 82,
  summary: 'Strong match for this Senior Product Manager role — your roadmapping and SQL experience line up well, but a couple of stakeholder-management keywords are missing.',
  date: '11 Jul 2026',
};

const SAMPLE_RECENT = [
  { score: 88, role: 'Software Engineer — React/TypeScript role at a Series B fintech startup', date: '9 Jul' },
  { score: 76, role: 'Data Analyst — growth team, requires Python and dbt experience', date: '6 Jul' },
  { score: 91, role: 'Marketing Manager — D2C brand, SEO and campaign strategy focus', date: '2 Jul' },
];

export default function DashboardPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="bg-[var(--accent-soft)] border-b border-[var(--accent)]/15">
        <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center gap-2 text-xs text-[var(--accent-ink)]">
          <Info size={13} />
          Preview mode — sample data, no login needed. This is what the real Dashboard looks like once you have scans saved.
        </div>
      </div>

      <header className="border-b border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={30} height={28} className="rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">New scan</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back, Anurag</h1>
        <p className="text-[var(--muted)] text-sm mb-10">Here&apos;s where things stand.</p>

        <div className="card rounded-2xl p-7 mb-8">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-5">Most recent</p>
          <div className="flex items-start gap-6 flex-wrap">
            <ScoreRing score={SAMPLE_LATEST.score} size={104} />
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm text-[var(--ink)]/85 leading-relaxed mb-3">{SAMPLE_LATEST.summary}</p>
              <p className="text-xs text-[var(--muted)]">{SAMPLE_LATEST.date}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <span className="text-xs text-[var(--muted-soft)]">View all</span>
        </div>

        <div className="space-y-2.5 mb-8">
          {SAMPLE_RECENT.map((s, i) => {
            const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
            return (
              <div key={i} className="card rounded-xl p-4 flex items-center gap-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-xs"
                  style={{ background: color }}
                >
                  {s.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--ink)] line-clamp-1">{s.role}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{s.date}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card card-hover-lift rounded-2xl p-5 flex items-center justify-center gap-2 text-sm font-medium text-[var(--muted)]">
          <Plus size={16} /> Run another check
        </div>
      </div>
    </main>
  );
}
