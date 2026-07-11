'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ScoreRing } from '@/components/ScoreRing';
import { Plus, Info, History, ScanLine, Flame, MessagesSquare, Trophy } from 'lucide-react';

const SAMPLE = {
  score: 82,
  target: 95,
  targetRole: 'Senior Product Manager',
  matched: ['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing'],
  missing: ['Stakeholder mgmt', 'OKRs'],
  date: '11 Jul 2026',
};

const SAMPLE_RECENT = [
  { score: 88, role: 'Software Engineer — React/TypeScript role at a Series B fintech startup', date: '9 Jul', best: true },
  { score: 76, role: 'Data Analyst — growth team, requires Python and dbt experience', date: '6 Jul', best: false },
  { score: 91, role: 'Marketing Manager — D2C brand, SEO and campaign strategy focus', date: '2 Jul', best: false },
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
          <span className="text-sm text-[var(--muted)] flex items-center gap-1.5"><History size={14} /> Full history</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14 relative">
        <p className="text-sm text-[var(--muted)] mb-2">Good evening, Anurag</p>
        <div className="flex items-end gap-4 mb-3">
          <span className="text-7xl font-bold tracking-tighter tabular-nums leading-none">{SAMPLE.score}</span>
          <span className="text-sm font-semibold mb-2 text-[var(--good)]">↑ 6</span>
        </div>
        <p className="text-lg text-[var(--ink)]/80 mb-1">{SAMPLE.target - SAMPLE.score} points from your target for {SAMPLE.targetRole}.</p>
        <p className="text-sm text-[var(--muted)] mb-6">Your resume match, out of 100.</p>

        <div className="card rounded-2xl p-5 mb-8">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-2">{SAMPLE.targetRole}</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold">{SAMPLE.score}</span>
            <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--accent)] bar-grow" style={{ width: `${(SAMPLE.score / SAMPLE.target) * 100}%` }} />
            </div>
            <span className="text-sm text-[var(--muted)]">{SAMPLE.target}</span>
          </div>
          <p className="text-xs text-[var(--muted)]">{SAMPLE.target - SAMPLE.score} points to go</p>
        </div>

        <div className="flex items-center gap-3 mb-10 flex-wrap">
          <div className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
            <ScanLine size={15} /> Tailor resume
          </div>
          <div className="card inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium">
            <MessagesSquare size={15} /> Practice interview
          </div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--warn-bg)] text-[var(--warn)] text-xs font-semibold">
            <Flame size={13} /> 4-day streak
          </span>
        </div>

        <div className="rounded-2xl p-7 mb-6 bg-[var(--ink)] text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Let&apos;s strengthen this first</p>
            <span className="text-[11px] text-white/50">~2 min</span>
          </div>
          <p className="text-sm text-white/90 mb-1">This role listed these directly — they&apos;re what gets you past the first filter.</p>
          <p className="text-xs text-white/50 mb-5">Add them, then run a new check to see where you stand.</p>
          <div className="space-y-2.5 mb-5">
            {SAMPLE.missing.map((kw) => (
              <div key={kw} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <span className="w-5 h-5 rounded-full border border-white/30 shrink-0" />
                <span className="text-sm text-white/90">{kw}</span>
              </div>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">Fix it now →</span>
        </div>

        <div className="card rounded-2xl p-6 mb-6">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">What we&apos;re tracking for you</p>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-2xl font-bold tabular-nums">{SAMPLE.score}</p>
              <p className="text-xs text-[var(--muted)] mt-1">Resume match</p>
            </div>
            <div className="opacity-50">
              <p className="text-sm font-medium">Coming soon</p>
              <p className="text-xs text-[var(--muted)] mt-1">LinkedIn</p>
            </div>
            <div className="opacity-50">
              <p className="text-sm font-medium">Coming soon</p>
              <p className="text-xs text-[var(--muted)] mt-1">Portfolio</p>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-soft)] leading-relaxed">We&apos;re building LinkedIn and portfolio review next, so you can see your whole application, not just your resume.</p>
        </div>

        <div className="card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">You&apos;re building momentum</p>
              <p className="text-sm text-[var(--ink)]/80">4 days in a row. Keep it going tomorrow.</p>
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
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Skills recruiters consistently expect</p>
          <p className="text-sm text-[var(--muted)] mb-4">Missing across more than one check.</p>
          <div className="flex flex-wrap gap-2">
            {[['Stakeholder mgmt', 3], ['OKRs', 2], ['Kubernetes', 2]].map(([kw, count]) => (
              <span key={kw as string} className="px-3 py-1.5 bg-[var(--bad-bg)] border border-[var(--bad)]/15 text-[var(--bad)] text-xs rounded-full font-medium">
                {kw} <span className="text-[var(--bad)]/60">×{count}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="card rounded-2xl p-7 mb-8">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-5">Where you stand right now</p>
          <div className="flex items-start gap-6 flex-wrap mb-5">
            <ScoreRing score={SAMPLE.score} size={92} />
            <div className="flex-1 min-w-[200px] space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE.matched.map((k) => <span key={k} className="px-2 py-0.5 bg-[var(--good-bg)] text-[var(--good)] text-[11px] rounded-full font-medium">{k}</span>)}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE.missing.map((k) => <span key={k} className="px-2 py-0.5 bg-[var(--bad-bg)] text-[var(--bad)] text-[11px] rounded-full font-medium">{k}</span>)}
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)]">{SAMPLE.date}</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Your progress</h2>
          <span className="text-xs text-[var(--muted-soft)]">View all</span>
        </div>

        <div className="space-y-2.5 mb-8">
          {SAMPLE_RECENT.map((s, i) => {
            const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
            return (
              <div key={i} className="card card-hover-lift rounded-xl p-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-xs" style={{ background: color }}>{s.score}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-[var(--ink)] line-clamp-1">{s.role}</p>
                    {s.best && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-ink)] shrink-0"><Trophy size={11} /> Best</span>}
                  </div>
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
