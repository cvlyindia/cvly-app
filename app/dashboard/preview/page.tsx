'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ScoreRing } from '@/components/ScoreRing';
import { Plus, Info, History, ScanLine, Flame, ArrowRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const SAMPLE_LATEST = {
  score: 82,
  summary: 'Strong match for this Senior Product Manager role — your roadmapping and SQL experience line up well, but a couple of stakeholder-management keywords are missing.',
  date: '11 Jul 2026',
  missing: ['Stakeholder mgmt', 'OKRs'],
};

const SAMPLE_RECENT = [
  { score: 88, role: 'Software Engineer — React/TypeScript role at a Series B fintech startup', date: '9 Jul' },
  { score: 76, role: 'Data Analyst — growth team, requires Python and dbt experience', date: '6 Jul' },
  { score: 91, role: 'Marketing Manager — D2C brand, SEO and campaign strategy focus', date: '2 Jul' },
];

const SAMPLE_TREND = [
  { i: 0, score: 68 }, { i: 1, score: 74 }, { i: 2, score: 71 },
  { i: 3, score: 79 }, { i: 4, score: 76 }, { i: 5, score: 88 }, { i: 6, score: 82 },
];

const SAMPLE_HEATMAP: number[] = Array.from({ length: 56 }, (_, i) => {
  const seed = (i * 37 + 11) % 10;
  if (seed < 5) return 0;
  if (seed < 7) return 1;
  if (seed < 9) return 2;
  return 3;
});

export default function DashboardPreviewPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="float-slow absolute top-20 right-[6%] w-40 h-40 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-30 pointer-events-none" />

      <div className="bg-[var(--accent-soft)] border-b border-[var(--accent)]/15 relative">
        <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center gap-2 text-xs text-[var(--accent-ink)]">
          <Info size={13} />
          Preview mode — sample data, no login needed.
        </div>
      </div>

      <header className="border-b border-[var(--line)] relative">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={30} height={28} className="rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <span className="text-sm text-[var(--muted)] flex items-center gap-1.5">
            <History size={14} /> Full history
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14 relative">
        <p className="text-sm text-[var(--muted)] mb-2">Good evening, Anurag</p>
        <div className="flex items-end justify-between flex-wrap gap-6 mb-3">
          <div className="flex items-end gap-4">
            <span className="text-7xl font-bold tracking-tighter tabular-nums leading-none">{SAMPLE_LATEST.score}</span>
            <span className="text-sm font-semibold mb-2 text-[var(--good)]">↑ 6</span>
          </div>
          <div className="w-32 h-14">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SAMPLE_TREND} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sparkGradPreview" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} fill="url(#sparkGradPreview)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-lg text-[var(--ink)]/80 mb-1">Up 6 points since your last check. Keep going.</p>
        <p className="text-sm text-[var(--muted)] mb-8">Your resume match, out of 100.</p>

        <div className="flex items-center gap-3 mb-10 flex-wrap">
          <div className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
            <ScanLine size={15} /> Continue improving
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--warn-bg)] text-[var(--warn)] text-xs font-semibold">
            <Flame size={13} /> 4-day streak
          </span>
        </div>

        <div className="rounded-2xl p-6 mb-6 bg-[var(--ink)] text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-3">Worth fixing next</p>
          <p className="text-sm text-white/90 mb-4">Your latest check is missing these — adding them could strengthen your match.</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {SAMPLE_LATEST.missing.map((kw) => (
              <span key={kw} className="px-3 py-1.5 bg-white/10 border border-white/15 text-white text-xs rounded-full font-medium">{kw}</span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
            Fix this now <ArrowRight size={14} />
          </span>
        </div>

        <div className="card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Consistency</p>
              <p className="text-sm text-[var(--ink)]/80">4 days in a row</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-soft)]">
              <span>Less</span>
              {[0, 1, 2, 3].map((lvl) => (
                <span key={lvl} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: lvl === 0 ? 'var(--line)' : `rgba(232,93,44,${0.25 + lvl * 0.25})` }} />
              ))}
              <span>More</span>
            </div>
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1" style={{ width: 'fit-content' }}>
            {SAMPLE_HEATMAP.map((count, i) => {
              const bg = count === 0 ? 'var(--line)' : `rgba(232,93,44,${0.25 + Math.min(count, 3) * 0.25})`;
              return <div key={i} className="w-3 h-3 rounded-[2px]" style={{ background: bg }} />;
            })}
          </div>
        </div>

        <div className="card rounded-2xl p-6 mb-6">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Keeps coming up</p>
          <p className="text-sm text-[var(--muted)] mb-4">Shows up as missing across more than one check.</p>
          <div className="flex flex-wrap gap-2">
            {[['Stakeholder mgmt', 3], ['OKRs', 2], ['Kubernetes', 2]].map(([kw, count]) => (
              <span key={kw as string} className="px-3 py-1.5 bg-[var(--bad-bg)] border border-[var(--bad)]/15 text-[var(--bad)] text-xs rounded-full font-medium">
                {kw} <span className="text-[var(--bad)]/60">×{count}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="card rounded-2xl p-7 mb-8">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-5">Your latest check</p>
          <div className="flex items-start gap-6 flex-wrap">
            <ScoreRing score={SAMPLE_LATEST.score} size={104} />
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm text-[var(--ink)]/85 leading-relaxed mb-3">{SAMPLE_LATEST.summary}</p>
              <p className="text-xs text-[var(--muted)]">{SAMPLE_LATEST.date}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Your recent checks</h2>
          <span className="text-xs text-[var(--muted-soft)]">View all</span>
        </div>

        <div className="space-y-2.5 mb-8">
          {SAMPLE_RECENT.map((s, i) => {
            const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
            return (
              <div key={i} className="card card-hover-lift rounded-xl p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-xs" style={{ background: color }}>
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
