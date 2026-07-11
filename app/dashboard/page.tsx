'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ScoreRing } from '@/components/ScoreRing';
import { ArrowRight, Plus, Loader2, History, ScanLine, Flame } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

type Scan = {
  id: string;
  score: number;
  summary: string;
  job_description: string;
  created_at: string;
  missing_keywords: string[] | null;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [scans, setScans] = useState<Scan[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setEmail(data.user.email ?? '');
      setCheckingAuth(false);
      fetch('/api/history')
        .then((res) => res.json())
        .then((d) => setScans(d.scans ?? []));
    });
  }, [router]);

  const stats = useMemo(() => {
    if (!scans || scans.length === 0) return null;
    const scores = scans.map((s) => s.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);
    const trendData = [...scans].reverse().map((s, i) => ({ i, score: s.score }));
    const delta = scans.length >= 2 ? scans[0].score - scans[1].score : 0;

    const keywordCounts = new Map<string, number>();
    for (const s of scans) {
      for (const kw of s.missing_keywords ?? []) {
        keywordCounts.set(kw, (keywordCounts.get(kw) ?? 0) + 1);
      }
    }
    const topMissing = [...keywordCounts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const dayCounts = new Map<string, number>();
    for (const s of scans) {
      const key = new Date(s.created_at).toISOString().slice(0, 10);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
    const today = new Date();
    const heatmap: { date: string; count: number }[] = [];
    for (let i = 55; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      heatmap.push({ date: key, count: dayCounts.get(key) ?? 0 });
    }

    // Real consecutive-day streak (today or yesterday must be included to count as active)
    let streak = 0;
    const cursor = new Date(today);
    const hasToday = dayCounts.has(today.toISOString().slice(0, 10));
    if (!hasToday) cursor.setDate(cursor.getDate() - 1);
    while (dayCounts.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { total: scans.length, avg, best, trendData, delta, topMissing, heatmap, streak };
  }, [scans]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  const latest = scans && scans.length > 0 ? scans[0] : null;
  const rest = scans && scans.length > 1 ? scans.slice(1, 6) : [];
  const firstName = email.split('@')[0];

  const line = !latest
    ? null
    : stats && stats.delta > 0
    ? `Up ${stats.delta} points since your last check. Keep going.`
    : stats && stats.delta < 0
    ? `Down ${Math.abs(stats.delta)} points from your last check — worth a rewrite before you apply.`
    : latest.score >= 75
    ? 'Strong shape on your latest check.'
    : latest.score >= 50
    ? 'Getting there — a few gaps to close.'
    : 'Room to grow — start with a rewrite.';

  const missionKeywords = latest?.missing_keywords?.slice(0, 4) ?? [];

  return (
    <main className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="float-slow absolute top-20 right-[6%] w-40 h-40 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-30 pointer-events-none" />

      <header className="border-b border-[var(--line)] relative">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={30} height={28} className="rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <Link href="/history" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition flex items-center gap-1.5">
            <History size={14} /> Full history
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14 relative">
        {scans === null ? (
          <div className="flex justify-center py-20">
            <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
          </div>
        ) : !latest || !stats ? (
          <div>
            <p className="text-sm text-[var(--muted)] mb-2">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
            <h1 className="text-4xl font-semibold tracking-tight mb-4 max-w-lg">Let&apos;s see where your resume stands.</h1>
            <p className="text-[var(--muted)] mb-8 max-w-md">Paste a resume and a role — your first score, rewrite, and interview prep take about 10 seconds.</p>
            <Link href="/#tool" className="btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold">
              Run your first check <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            {/* Hero moment */}
            <p className="text-sm text-[var(--muted)] mb-2">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
            <div className="flex items-end justify-between flex-wrap gap-6 mb-3">
              <div className="flex items-end gap-4">
                <span className="text-7xl font-bold tracking-tighter tabular-nums leading-none">{latest.score}</span>
                {stats.delta !== 0 && (
                  <span className={`text-sm font-semibold mb-2 ${stats.delta > 0 ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                    {stats.delta > 0 ? '↑' : '↓'} {Math.abs(stats.delta)}
                  </span>
                )}
              </div>
              {stats.trendData.length >= 2 && (
                <div className="w-32 h-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trendData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis domain={[0, 100]} hide />
                      <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} fill="url(#sparkGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <p className="text-lg text-[var(--ink)]/80 mb-1">{line}</p>
            <p className="text-sm text-[var(--muted)] mb-8">Your resume match, out of 100.</p>

            <div className="flex items-center gap-3 mb-10 flex-wrap">
              <Link href="/#tool" className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
                <ScanLine size={15} /> Continue improving
              </Link>
              {stats.streak >= 2 && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--warn-bg)] text-[var(--warn)] text-xs font-semibold">
                  <Flame size={13} /> {stats.streak}-day streak
                </span>
              )}
            </div>

            {/* Today's mission — built from real missing keywords, no fabricated numbers */}
            {missionKeywords.length > 0 && (
              <div className="rounded-2xl p-6 mb-6 bg-[var(--ink)] text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-3">Worth fixing next</p>
                <p className="text-sm text-white/90 mb-4">Your latest check is missing these — adding them could strengthen your match.</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {missionKeywords.map((kw) => (
                    <span key={kw} className="px-3 py-1.5 bg-white/10 border border-white/15 text-white text-xs rounded-full font-medium">{kw}</span>
                  ))}
                </div>
                <Link href="/#tool" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:gap-2.5 transition-all">
                  Fix this now <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Consistency */}
            <div className="card rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Consistency</p>
                  <p className="text-sm text-[var(--ink)]/80">
                    {stats.streak > 0 ? `${stats.streak} day${stats.streak === 1 ? '' : 's'} in a row` : 'Last 8 weeks of activity'}
                  </p>
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
                {stats.heatmap.map((d) => {
                  const bg = d.count === 0 ? 'var(--line)' : `rgba(232,93,44,${0.25 + Math.min(d.count, 3) * 0.25})`;
                  return <div key={d.date} title={`${d.date}: ${d.count} check${d.count === 1 ? '' : 's'}`} className="w-3 h-3 rounded-[2px]" style={{ background: bg }} />;
                })}
              </div>
            </div>

            {/* Insights */}
            {stats.topMissing.length > 0 && (
              <div className="card rounded-2xl p-6 mb-6">
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Keeps coming up</p>
                <p className="text-sm text-[var(--muted)] mb-4">Shows up as missing across more than one check.</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topMissing.map(([kw, count]) => (
                    <span key={kw} className="px-3 py-1.5 bg-[var(--bad-bg)] border border-[var(--bad)]/15 text-[var(--bad)] text-xs rounded-full font-medium">
                      {kw} <span className="text-[var(--bad)]/60">×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Your latest check, full detail */}
            <div className="card rounded-2xl p-7 mb-8">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-5">Your latest check</p>
              <div className="flex items-start gap-6 flex-wrap">
                <ScoreRing score={latest.score} size={104} />
                <div className="flex-1 min-w-[220px]">
                  <p className="text-sm text-[var(--ink)]/85 leading-relaxed mb-3">{latest.summary}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Your recent checks</h2>
              <Link href="/history" className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition">View all</Link>
            </div>

            {rest.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-8">Nothing else yet — this was your first one.</p>
            ) : (
              <div className="space-y-2.5 mb-8">
                {rest.map((s) => {
                  const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
                  return (
                    <div key={s.id} className="card card-hover-lift rounded-xl p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-xs" style={{ background: color }}>
                        {s.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--ink)] line-clamp-1">{s.job_description.slice(0, 80)}...</p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Link href="/#tool" className="card card-hover-lift rounded-2xl p-5 flex items-center justify-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition">
              <Plus size={16} /> Run another check
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
