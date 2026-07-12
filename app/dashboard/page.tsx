'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ScoreRing } from '@/components/ScoreRing';
import { DashboardShell } from '@/components/DashboardShell';
import { NewCheckButton } from '@/components/NewCheckButton';
import { CareerReviewModal } from '@/components/CareerReviewModal';
import { ArrowRight, Plus, Loader2, ScanLine, Flame, Pencil, Trophy, MessagesSquare, Upload, Target, Zap } from 'lucide-react';
import { PLAN_LIMITS } from '@/lib/credits';

type Scan = {
  id: string;
  score: number;
  summary: string;
  job_description: string;
  created_at: string;
  missing_keywords: string[] | null;
  matched_keywords: string[] | null;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function useCountUp(target: number, active: boolean, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState({ role: '', score: '90' });
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());
  const [credits, setCredits] = useState<{ remaining: number; plan: string; resetAt: string } | null>(null);
  const [reviewModal, setReviewModal] = useState<'linkedin' | 'portfolio' | null>(null);
  const [linkedinReview, setLinkedinReview] = useState<{ score: number } | null>(null);
  const [portfolioReview, setPortfolioReview] = useState<{ score: number } | null>(null);

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
      fetch('/api/credits')
        .then((res) => res.json())
        .then((d) => {
          if (d.loggedIn) setCredits({ remaining: d.remaining, plan: d.plan, resetAt: d.resetAt });
        });
      fetch('/api/career-reviews')
        .then((res) => res.json())
        .then((d) => {
          if (d.linkedin) setLinkedinReview(d.linkedin);
          if (d.portfolio) setPortfolioReview(d.portfolio);
        })
        .catch(() => {});
    });

    const savedRole = localStorage.getItem('cvly_target_role');
    const savedScore = localStorage.getItem('cvly_target_score');
    const id = setTimeout(() => {
      if (savedRole) setTargetRole(savedRole);
      if (savedScore) setTargetScore(parseInt(savedScore, 10));
    }, 0);
    return () => clearTimeout(id);
  }, [router]);

  function saveGoal() {
    localStorage.setItem('cvly_target_role', goalInput.role);
    localStorage.setItem('cvly_target_score', goalInput.score);
    setTargetRole(goalInput.role);
    setTargetScore(parseInt(goalInput.score, 10));
    setEditingGoal(false);
  }

  const stats = useMemo(() => {
    if (!scans || scans.length === 0) return null;
    const scores = scans.map((s) => s.score);
    const best = Math.max(...scores);
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

    let streak = 0;
    const cursor = new Date(today);
    const hasToday = dayCounts.has(today.toISOString().slice(0, 10));
    if (!hasToday) cursor.setDate(cursor.getDate() - 1);
    while (dayCounts.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Real personal-best detection: chronological order, is each scan the highest seen so far?
    const chronological = [...scans].reverse();
    let runningBest = -1;
    const personalBestIds = new Set<string>();
    for (const s of chronological) {
      if (s.score > runningBest) {
        personalBestIds.add(s.id);
        runningBest = s.score;
      }
    }

    return { best, delta, topMissing, heatmap, streak, personalBestIds };
  }, [scans]);

  const latest = scans && scans.length > 0 ? scans[0] : null;
  const animatedScore = useCountUp(latest?.score ?? 0, !!latest, 900);

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  const rest = scans && scans.length > 1 ? scans.slice(1, 6) : [];
  const firstName = email.split('@')[0];

  const missionKeywords = latest?.missing_keywords?.slice(0, 4) ?? [];
  const allTasksDone = missionKeywords.length > 0 && missionKeywords.every((k) => doneTasks.has(k));

  const line = !latest
    ? null
    : targetScore && latest.score >= targetScore
    ? `You've hit your target of ${targetScore}. Time to set a new one.`
    : targetScore
    ? `${targetScore - latest.score} points from your target${targetRole ? ` for ${targetRole}` : ''}.`
    : stats && stats.delta > 0
    ? `Up ${stats.delta} points since your last check. You're building momentum.`
    : stats && stats.delta < 0
    ? `Down ${Math.abs(stats.delta)} — worth a rewrite before you send this one out.`
    : latest.score >= 75
    ? 'Strong shape on your latest check.'
    : 'A few gaps to close, and you\'ll be there.';

  function toggleTask(kw: string) {
    setDoneTasks((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  function refreshScans() {
    fetch('/api/history')
      .then((res) => res.json())
      .then((d) => setScans(d.scans ?? []));
  }

  return (
    <DashboardShell activePage="dashboard" pageTitle="Dashboard" userEmail={email} credits={credits} onCreditsChange={(updater) => setCredits((c) => (c ? { ...c, ...updater(c) } : c))} onScanSaved={refreshScans} onSignOut={handleSignOut}>
      <div className="relative">
      <div className="float-slow absolute top-20 right-[6%] w-40 h-40 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-30 pointer-events-none" />

      <div className="relative">
        {scans === null ? (
          <div className="flex justify-center py-20">
            <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
          </div>
        ) : !latest || !stats ? (
          <div>
            <p className="text-sm text-[var(--muted)] mb-2">{greeting()}{firstName ? `, ${firstName}` : ''}. You&apos;re in.</p>
            <h2 className="text-4xl font-semibold tracking-tight mb-4 max-w-lg">Let&apos;s see where your resume stands.</h2>
            <p className="text-[var(--muted)] mb-10 max-w-md">Paste a resume and a role you&apos;re going for. Here&apos;s what happens next:</p>

            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
                { icon: Upload, step: '01', title: 'You paste it', desc: 'Your resume and the job description. A few seconds.' },
                { icon: Target, step: '02', title: 'We show your score', desc: 'What matches, what\'s missing, out of 100.' },
                { icon: MessagesSquare, step: '03', title: 'You get ready', desc: 'A sharper resume, a cover letter, 100 interview questions.' },
              ].map((s) => (
                <div key={s.step} className="card rounded-xl p-5">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center mb-3">
                    <s.icon size={16} className="text-[var(--accent-ink)]" />
                  </div>
                  <p className="text-[10px] font-mono text-[var(--accent-ink)] mb-1">STEP {s.step}</p>
                  <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            <NewCheckButton className="btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold">
              Let&apos;s go <ArrowRight size={16} />
            </NewCheckButton>
          </div>
        ) : (
          <>
            {/* Hero: coach framing, real goal progress instead of decorative sparkline */}
            <p className="text-sm text-[var(--muted)] mb-2">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
            <div className="flex items-end gap-4 mb-3">
              <span className="text-7xl font-bold tracking-tighter tabular-nums leading-none">{animatedScore}</span>
              {stats.delta !== 0 && (
                <span className={`text-sm font-semibold mb-2 ${stats.delta > 0 ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                  {stats.delta > 0 ? '↑' : '↓'} {Math.abs(stats.delta)}
                </span>
              )}
            </div>
            <p className="text-lg text-[var(--ink)]/80 mb-1">{line}</p>
            <p className="text-sm text-[var(--muted)] mb-6">Your resume match, out of 100.</p>

            {/* Career goal — real, user-set, not fabricated */}
            {editingGoal ? (
              <div className="card rounded-2xl p-5 mb-8">
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-3">Set your target</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <input
                    value={goalInput.role}
                    onChange={(e) => setGoalInput((g) => ({ ...g, role: e.target.value }))}
                    placeholder="Target role, e.g. Senior PM"
                    className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  />
                  <input
                    value={goalInput.score}
                    onChange={(e) => setGoalInput((g) => ({ ...g, score: e.target.value.replace(/\D/g, '') }))}
                    placeholder="Target score"
                    className="w-28 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveGoal} className="btn-accent px-4 py-2 rounded-full text-xs font-semibold">Save</button>
                  <button onClick={() => setEditingGoal(false)} className="px-4 py-2 rounded-full text-xs font-medium text-[var(--muted)]">Cancel</button>
                </div>
              </div>
            ) : targetScore ? (
              <div className="card rounded-2xl p-5 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">{targetRole || 'Your target'}</p>
                  <button onClick={() => { setGoalInput({ role: targetRole, score: String(targetScore) }); setEditingGoal(true); }} aria-label="Edit target" className="text-[var(--muted-soft)] hover:text-[var(--ink)]">
                    <Pencil size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold">{latest.score}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div
                      key={latest.score}
                      className="h-full rounded-full bg-[var(--accent)] bar-grow"
                      style={{ width: `${Math.min(100, (latest.score / targetScore) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-[var(--muted)]">{targetScore}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">{Math.max(0, targetScore - latest.score)} points to go</p>
              </div>
            ) : (
              <button
                onClick={() => { setGoalInput({ role: '', score: '90' }); setEditingGoal(true); }}
                className="card card-hover-lift rounded-2xl p-5 mb-8 flex items-center gap-3 text-left w-full"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                  <Trophy size={16} className="text-[var(--accent-ink)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Set a target score</p>
                  <p className="text-xs text-[var(--muted)]">Track your progress toward a specific role</p>
                </div>
              </button>
            )}

            {/* Credits & plan */}
            {credits && (
              <div className="card rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-[var(--accent-ink)]" />
                    <p className="text-sm font-semibold capitalize">{credits.plan} plan</p>
                  </div>
                  {credits.plan === 'free' && (
                    <Link href="/pricing" className="text-xs font-semibold text-[var(--accent-ink)] hover:underline">Upgrade</Link>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-sm font-semibold tabular-nums">{credits.remaining}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--line)] overflow-hidden">
                    <div
                      key={credits.remaining}
                      className="h-full rounded-full bg-[var(--accent)] bar-grow"
                      style={{ width: `${Math.min(100, (credits.remaining / (PLAN_LIMITS[credits.plan] ?? 5)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-[var(--muted)] tabular-nums">{PLAN_LIMITS[credits.plan] ?? 5}</span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  Credits left this month · resets {new Date(credits.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            )}

            {/* Next actions */}
            <div className="flex items-center gap-3 mb-10 flex-wrap">
              <NewCheckButton className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
                <ScanLine size={15} /> Tailor resume
              </NewCheckButton>
              <NewCheckButton className="card card-hover-lift inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium">
                <MessagesSquare size={15} /> Practice interview
              </NewCheckButton>
              {stats.streak >= 2 && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--warn-bg)] text-[var(--warn)] text-xs font-semibold">
                  <Flame size={13} /> {stats.streak}-day streak
                </span>
              )}
            </div>

            {/* Today's Mission — biggest card, real data, no fabricated point-estimate */}
            {missionKeywords.length > 0 && (
              <div className="rounded-2xl p-7 mb-6 bg-[var(--ink)] text-white">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Let&apos;s strengthen this first</p>
                  <span className="text-[11px] text-white/50">~2 min</span>
                </div>
                <p className="text-sm text-white/90 mb-1">This role listed these directly — they&apos;re what gets you past the first filter.</p>
                <p className="text-xs text-white/50 mb-5">Add them, then run a new check to see where you stand.</p>
                <div className="space-y-2.5 mb-5">
                  {missionKeywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => toggleTask(kw)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition text-left"
                    >
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${doneTasks.has(kw) ? 'bg-[var(--accent)] border-[var(--accent)] scale-110' : 'border-white/30'}`}>
                        {doneTasks.has(kw) && <span className="text-[10px] task-check-pop">✓</span>}
                      </span>
                      <span className={`text-sm transition-colors ${doneTasks.has(kw) ? 'text-white/50 line-through' : 'text-white/90'}`}>{kw}</span>
                    </button>
                  ))}
                </div>
                {allTasksDone ? (
                  <p className="text-sm font-semibold text-[var(--accent)] fade-up">That&apos;s the mission done. Run a new check to see it move.</p>
                ) : (
                  <NewCheckButton className="inline-flex items-center gap-1.5 text-sm font-semibold text-white hover:gap-2.5 transition-all">
                    Fix it now <ArrowRight size={14} />
                  </NewCheckButton>
                )}
              </div>
            )}

            {/* Career signals — real resume score, plus LinkedIn/Portfolio review */}
            <div className="card rounded-2xl p-6 mb-6">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-4">What we&apos;re tracking for you</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-2xl font-bold tabular-nums">{latest.score}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">Resume match</p>
                </div>
                <button onClick={() => setReviewModal('linkedin')} className="text-left hover:opacity-70 transition">
                  {linkedinReview ? (
                    <p className="text-2xl font-bold tabular-nums">{linkedinReview.score}</p>
                  ) : (
                    <p className="text-sm font-medium text-[var(--accent-ink)]">Review now</p>
                  )}
                  <p className="text-xs text-[var(--muted)] mt-1">LinkedIn</p>
                </button>
                <button onClick={() => setReviewModal('portfolio')} className="text-left hover:opacity-70 transition">
                  {portfolioReview ? (
                    <p className="text-2xl font-bold tabular-nums">{portfolioReview.score}</p>
                  ) : (
                    <p className="text-sm font-medium text-[var(--accent-ink)]">Review now</p>
                  )}
                  <p className="text-xs text-[var(--muted)] mt-1">Portfolio</p>
                </button>
              </div>
              <p className="text-xs text-[var(--muted-soft)] leading-relaxed">Paste your profile or portfolio content — no login or scraping, just like the resume check.</p>
            </div>

            {reviewModal && (
              <CareerReviewModal
                type={reviewModal}
                onClose={() => setReviewModal(null)}
                onSaved={() => {
                  fetch('/api/career-reviews').then((res) => res.json()).then((d) => {
                    setLinkedinReview(d.linkedin);
                    setPortfolioReview(d.portfolio);
                  });
                  setCredits((c) => (c ? { ...c, remaining: Math.max(0, c.remaining - 1) } : c));
                }}
              />
            )}

            {/* Consistency — coaching framing */}
            <div className="card rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">You&apos;re building momentum</p>
                  <p className="text-sm text-[var(--ink)]/80">
                    {stats.streak > 0 ? `${stats.streak} day${stats.streak === 1 ? '' : 's'} in a row. Keep it going tomorrow.` : 'Check in regularly to build a streak.'}
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

            {/* Skills recruiters keep expecting */}
            {stats.topMissing.length > 0 && (
              <div className="card rounded-2xl p-6 mb-6">
                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Skills recruiters consistently expect</p>
                <p className="text-sm text-[var(--muted)] mb-4">Missing across more than one check.</p>
                <div className="flex flex-wrap gap-2">
                  {stats.topMissing.map(([kw, count]) => (
                    <span key={kw} className="px-3 py-1.5 bg-[var(--bad-bg)] border border-[var(--bad)]/15 text-[var(--bad)] text-xs rounded-full font-medium">
                      {kw} <span className="text-[var(--bad)]/60">×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Latest check — scannable, not prose */}
            <div className="card rounded-2xl p-7 mb-8">
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-5">Where you stand right now</p>
              <div className="flex items-start gap-6 flex-wrap mb-5">
                <ScoreRing score={latest.score} size={92} />
                <div className="flex-1 min-w-[200px] space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(latest.matched_keywords ?? []).slice(0, 4).map((k) => (
                      <span key={k} className="px-2 py-0.5 bg-[var(--good-bg)] text-[var(--good)] text-[11px] rounded-full font-medium">{k}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(latest.missing_keywords ?? []).slice(0, 4).map((k) => (
                      <span key={k} className="px-2 py-0.5 bg-[var(--bad-bg)] text-[var(--bad)] text-[11px] rounded-full font-medium">{k}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Your progress</h2>
              <Link href="/history" className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition">View all</Link>
            </div>

            {rest.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-8">Nothing else yet — this was your first one.</p>
            ) : (
              <div className="space-y-2.5 mb-8">
                {rest.map((s) => {
                  const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
                  const isBest = stats.personalBestIds.has(s.id);
                  return (
                    <div key={s.id} className="card card-hover-lift rounded-xl p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-xs" style={{ background: color }}>
                        {s.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[var(--ink)] line-clamp-1">{s.job_description.slice(0, 70)}...</p>
                          {isBest && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-ink)] shrink-0">
                              <Trophy size={11} /> Best
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <NewCheckButton className="card card-hover-lift rounded-2xl p-5 flex items-center justify-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition">
              <Plus size={16} /> Run another check
            </NewCheckButton>
          </>
        )}
      </div>
      </div>
    </DashboardShell>
  );
}
