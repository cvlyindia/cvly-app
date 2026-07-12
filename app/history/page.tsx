'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Search, ChevronDown, Trophy, Loader2, Copy } from 'lucide-react';
import { ScoreRing } from '@/components/ScoreRing';
import { DashboardShell } from '@/components/DashboardShell';
import { createClient } from '@/lib/supabase/client';

type InterviewCategory = { category: string; questions: { question: string; starHint: string }[] };

type Scan = {
  id: string;
  score: number;
  summary: string;
  job_description: string;
  created_at: string;
  matched_keywords: string[] | null;
  missing_keywords: string[] | null;
  improvements: string[] | null;
  rewritten_resume: string | null;
  cover_letter: string | null;
  interview_questions: InterviewCategory[] | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<{ remaining: number; plan: string } | null>(null);
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    });
  }

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
          if (d.loggedIn) setCredits({ remaining: d.remaining, plan: d.plan });
        });
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/scans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.deleted) {
        setScans((prev) => prev?.filter((s) => s.id !== id) ?? null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const narrative = useMemo(() => {
    if (!scans || scans.length === 0) return null;
    const scores = scans.map((s) => s.score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const chronological = [...scans].reverse();
    const first = chronological[0].score;
    const latest = chronological[chronological.length - 1].score;
    const delta = latest - first;

    let runningBest = -1;
    const personalBestIds = new Set<string>();
    for (const s of chronological) {
      if (s.score > runningBest) {
        personalBestIds.add(s.id);
        runningBest = s.score;
      }
    }

    return { total: scans.length, avg, delta, personalBestIds };
  }, [scans]);

  const filtered = useMemo(() => {
    if (!scans) return [];
    if (!search.trim()) return scans;
    return scans.filter((s) => s.job_description.toLowerCase().includes(search.toLowerCase()));
  }, [scans, search]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  return (
    <DashboardShell activePage="history" pageTitle="History" userEmail={email} credits={credits} onSignOut={handleSignOut}>
      {narrative ? (
        <p className="text-sm text-[var(--muted)] mb-8">
          {narrative.total} check{narrative.total === 1 ? '' : 's'} so far, averaging {narrative.avg}.{' '}
          {narrative.delta > 0
            ? `You're up ${narrative.delta} points since your first one.`
            : narrative.delta < 0
            ? `Your most recent is ${Math.abs(narrative.delta)} points below your first — worth a fresh rewrite.`
            : 'Run a few more to see your trend.'}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)] mb-8">Delete any check you don&apos;t want to keep — it&apos;s removed immediately, for good.</p>
      )}

      {scans === null ? (
        <div className="flex justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : scans.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">Nothing here yet — check a resume to see it show up.</p>
      ) : (
        <>
          {scans.length > 3 && (
            <div className="relative mb-5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-soft)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by role or job description…"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-8">No checks match &quot;{search}&quot;.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((s) => {
                const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
                const isBest = narrative?.personalBestIds.has(s.id);
                const isExpanded = expandedId === s.id;
                return (
                  <div key={s.id} className="card rounded-2xl overflow-hidden">
                    <div className="p-5 flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-sm"
                        style={{ background: color }}
                      >
                        {s.score}
                      </div>
                      <button onClick={() => setExpandedId(isExpanded ? null : s.id)} className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[var(--ink)] line-clamp-1">{s.job_description.slice(0, 80)}...</p>
                          {isBest && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-ink)] shrink-0">
                              <Trophy size={11} /> Best
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-1">
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface)] transition shrink-0"
                        aria-label="Expand"
                      >
                        <ChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--bad)] hover:bg-[var(--bad-bg)] transition disabled:opacity-40 shrink-0"
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-[var(--line)]">
                        <div className="flex items-start gap-6 flex-wrap mt-4 mb-4">
                          <ScoreRing score={s.score} size={80} />
                          <p className="text-sm text-[var(--ink)]/80 leading-relaxed flex-1 min-w-[200px] pt-2">{s.summary}</p>
                        </div>
                        {(s.matched_keywords?.length ?? 0) > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--good)] mb-2">What you had</p>
                            <div className="flex flex-wrap gap-1.5">
                              {s.matched_keywords!.map((k) => (
                                <span key={k} className="px-2 py-0.5 bg-[var(--good-bg)] text-[var(--good)] text-[11px] rounded-full font-medium">{k}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(s.missing_keywords?.length ?? 0) > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--bad)] mb-2">What was missing</p>
                            <div className="flex flex-wrap gap-1.5">
                              {s.missing_keywords!.map((k) => (
                                <span key={k} className="px-2 py-0.5 bg-[var(--bad-bg)] text-[var(--bad)] text-[11px] rounded-full font-medium">{k}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(s.improvements?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)] mb-2">What to fix</p>
                            <ul className="space-y-1.5">
                              {s.improvements!.map((imp, i) => (
                                <li key={i} className="text-xs text-[var(--ink)]/75 flex gap-2">
                                  <span className="text-[var(--accent-ink)] font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span> {imp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(s.rewritten_resume || s.cover_letter || s.interview_questions) && (
                          <div className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
                            {s.rewritten_resume && (
                              <button onClick={() => copyToClipboard(s.rewritten_resume!, `${s.id}-rewrite`)} className="w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--line)] transition">
                                <span className="font-medium">Rewritten resume saved</span>
                                <span className="text-[var(--accent-ink)] flex items-center gap-1"><Copy size={11} /> {copiedKey === `${s.id}-rewrite` ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                            {s.cover_letter && (
                              <button onClick={() => copyToClipboard(s.cover_letter!, `${s.id}-cover`)} className="w-full flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--line)] transition">
                                <span className="font-medium">Cover letter saved</span>
                                <span className="text-[var(--accent-ink)] flex items-center gap-1"><Copy size={11} /> {copiedKey === `${s.id}-cover` ? 'Copied' : 'Copy'}</span>
                              </button>
                            )}
                            {s.interview_questions && (
                              <div className="text-xs px-3 py-2 rounded-lg bg-[var(--surface)]">
                                <span className="font-medium">
                                  {s.interview_questions.reduce((sum, c) => sum + c.questions.length, 0)} interview questions saved
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
