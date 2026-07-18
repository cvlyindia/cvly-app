'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileScan, Link2, Briefcase, MessagesSquare, ArrowRight } from 'lucide-react';
import { ScoreRing } from '@/components/ScoreRing';

interface ReadinessData {
  overall: number | null;
  components: {
    resumeMatch: number | null;
    linkedinStrength: number | null;
    portfolioQuality: number | null;
    interviewCompletion: number | null;
  };
}

const ROWS: { key: keyof ReadinessData['components']; label: string; icon: typeof FileScan; cta: string; href: string }[] = [
  { key: 'resumeMatch', label: 'Resume match', icon: FileScan, cta: 'Run a scan', href: '/' },
  { key: 'linkedinStrength', label: 'LinkedIn strength', icon: Link2, cta: 'Review LinkedIn', href: '/dashboard' },
  { key: 'portfolioQuality', label: 'Portfolio quality', icon: Briefcase, cta: 'Review portfolio', href: '/dashboard' },
  { key: 'interviewCompletion', label: 'Interview prep', icon: MessagesSquare, cta: 'Start prepping', href: '/' },
];

export function ReadinessScoreCard() {
  const [data, setData] = useState<ReadinessData | null>(null);

  useEffect(() => {
    fetch('/api/readiness-score')
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  // Nobody has any data at all yet — a plain empty state pointing at the first
  // real action, rather than a confusing "0 out of 100" that isn't really true.
  if (data.overall === null) {
    return (
      <div className="card rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold mb-1">Your readiness score</p>
        <p className="text-xs text-[var(--muted)] mb-4">One number combining your resume match, LinkedIn, portfolio, and interview prep — run your first scan to start building it.</p>
        <Link href="/" className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
          Check my resume <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center gap-5 mb-5">
        <ScoreRing score={data.overall} size={72} />
        <div>
          <p className="text-sm font-semibold">Your readiness score</p>
          <p className="text-xs text-[var(--muted)]">Resume match, LinkedIn, portfolio, and interview prep — combined.</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {ROWS.map((row) => {
          const value = data.components[row.key];
          const Icon = row.icon;
          return (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[var(--ink)]/80">
                <Icon size={14} className="text-[var(--muted)]" /> {row.label}
              </span>
              {value !== null ? (
                <span className="font-semibold tabular-nums">{value}{row.key === 'interviewCompletion' ? '%' : '/100'}</span>
              ) : (
                <Link href={row.href} className="text-xs text-[var(--accent-ink)] hover:underline">
                  {row.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
