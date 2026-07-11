'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ScoreRing } from '@/components/ScoreRing';
import { ArrowRight, Plus, Loader2, TrendingUp, Target, Sparkles } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';

type Scan = {
  id: string;
  score: number;
  summary: string;
  job_description: string;
  created_at: string;
};

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
    return { total: scans.length, avg, best, trendData, delta };
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

  return (
    <main className="min-h-screen bg-[var(--bg)] relative overflow-hidden">
      <div className="float-slow absolute top-20 right-[6%] w-40 h-40 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-40 pointer-events-none" />
      <div className="float-slower absolute top-[420px] left-[2%] w-32 h-32 rounded-full bg-[var(--good-bg)] blur-3xl opacity-30 pointer-events-none" />

      <header className="border-b border-[var(--line)] relative">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={30} height={28} className="rounded-md" />
            <span className="text-[18px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">New scan</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14 relative">
        <div className="fade-up flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <Sparkles size={16} className="text-[var(--accent)]" />
        </div>
        <p className="fade-up fade-up-1 text-[var(--muted)] text-sm mb-10">
          {scans === null ? 'Loading your results…' : latest ? 'Here\'s where things stand.' : 'Run your first check to get started.'}
        </p>

        {scans === null ? (
          <div className="card rounded-2xl p-10 flex justify-center">
            <Loader2 size={18} className="animate-spin text-[var(--muted)]" />
          </div>
        ) : !latest || !stats ? (
          <div className="card rounded-2xl p-10 text-center">
            <p className="font-semibold mb-2">No results yet</p>
            <p className="text-sm text-[var(--muted)] mb-6 max-w-sm mx-auto">
              Paste a resume and a role on the homepage to get your first score, rewrite, and interview prep.
            </p>
            <Link href="/#tool" className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium">
              Run your first check <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total checks', value: stats.total, icon: Target },
                { label: 'Average score', value: stats.avg, icon: TrendingUp },
                { label: 'Best score', value: stats.best, icon: Sparkles },
              ].map((s, i) => (
                <div key={s.label} className="card rounded-xl p-4 fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <s.icon size={14} className="text-[var(--accent)] mb-2" />
                  <p className="text-2xl font-bold tracking-tight tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Trend chart */}
            {stats.trendData.length >= 2 && (
              <div className="card rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Score trend</p>
                  {stats.delta !== 0 && (
                    <span className={`text-xs font-semibold ${stats.delta > 0 ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                      {stats.delta > 0 ? '+' : ''}{stats.delta} vs previous
                    </span>
                  )}
                </div>
                <div className="h-32 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        contentStyle={{ background: 'white', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12 }}
                        labelFormatter={() => ''}
                        formatter={(value) => [`${value}/100`, 'Score']}
                      />
                      <Area type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2.5} fill="url(#scoreGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Most recent */}
            <div className="card rounded-2xl p-7 mb-8">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-5">Most recent</p>
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
              <h2 className="text-sm font-semibold">Recent activity</h2>
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
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-xs"
                        style={{ background: color }}
                      >
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

            <Link
              href="/#tool"
              className="card card-hover-lift rounded-2xl p-5 flex items-center justify-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <Plus size={16} /> Run another check
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
