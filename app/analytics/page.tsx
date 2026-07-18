'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, TrendingUp, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardShell } from '@/components/DashboardShell';
import { createClient } from '@/lib/supabase/client';

interface AnalyticsData {
  scoreHistory: { date: string; score: number }[];
  funnel: { saved: number; applied: number; interview: number; offer: number };
}

const FUNNEL_STAGES: { key: keyof AnalyticsData['funnel']; label: string }[] = [
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<{ remaining: number; plan: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [needsPro, setNeedsPro] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setEmail(user.email ?? '');
      setCheckingAuth(false);

      fetch('/api/credits')
        .then((res) => res.json())
        .then((d) => {
          if (d.loggedIn) setCredits({ remaining: d.remaining, plan: d.plan });
        });

      fetch('/api/analytics')
        .then((res) => res.json())
        .then((d) => {
          if (d.error === 'requires_pro') {
            setNeedsPro(true);
            return;
          }
          setData(d);
        });
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <DashboardShell activePage="analytics" pageTitle="Analytics" userEmail={email} credits={credits} onCreditsChange={setCredits} onSignOut={handleSignOut}>
      {needsPro ? (
        <div className="text-center py-16 max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--grad-prism)' }}>
            <Lock size={20} className="text-white" />
          </div>
          <p className="text-base font-semibold mb-1.5">Analytics is a Pro feature</p>
          <p className="text-sm text-[var(--muted)] mb-6">
            Track your score improving over time and see your real application conversion — saved to applied to interview to offer.
          </p>
          <Link href="/pricing" className="btn-accent inline-block px-6 py-2.5 rounded-full text-sm font-semibold">
            Upgrade to Pro
          </Link>
        </div>
      ) : !data ? (
        <div className="flex justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="card rounded-2xl p-6">
            <p className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-[var(--muted)]" /> Score history
            </p>
            {data.scoreHistory.length < 2 ? (
              <p className="text-sm text-[var(--muted)]">Run a couple more scans to start seeing a real trend here.</p>
            ) : (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={data.scoreHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                    <Tooltip
                      labelFormatter={(d) => new Date(d as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      formatter={(value) => [value, 'Score']}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card rounded-2xl p-6">
            <p className="text-sm font-semibold mb-5">Application funnel</p>
            {data.funnel.saved === 0 ? (
              <p className="text-sm text-[var(--muted)]">Save a job to the Tracker to start seeing your funnel here.</p>
            ) : (
              <div className="space-y-3">
                {FUNNEL_STAGES.map((stage, i) => {
                  const count = data.funnel[stage.key];
                  const prevCount = i === 0 ? count : data.funnel[FUNNEL_STAGES[i - 1].key];
                  const pct = data.funnel.saved > 0 ? Math.round((count / data.funnel.saved) * 100) : 0;
                  const conversionFromPrev = i > 0 && prevCount > 0 ? Math.round((count / prevCount) * 100) : null;
                  return (
                    <div key={stage.key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[var(--ink)]/80">{stage.label}</span>
                        <span className="tabular-nums">
                          {count} {conversionFromPrev !== null && <span className="text-xs text-[var(--muted)]">({conversionFromPrev}% of {FUNNEL_STAGES[i - 1].label.toLowerCase()})</span>}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--grad-prism)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
