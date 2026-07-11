'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Search, ChevronDown, Trophy } from 'lucide-react';
import { ScoreRing } from '@/components/ScoreRing';

type Scan = {
  id: string;
  score: number;
  summary: string;
  job_description: string;
  created_at: string;
  matched_keywords: string[] | null;
  missing_keywords: string[] | null;
  improvements: string[] | null;
};

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setScans(data.scans);
      });
  }, []);

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

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={26} height={26} className="rounded-lg" />
            <span className="font-semibold tracking-tight">Cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">← Back</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Your history</h1>

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

        {error === 'Not logged in' && (
          <div className="card rounded-2xl p-7 text-center">
            <p className="text-[var(--muted)] mb-4">Sign in to see your saved results.</p>
            <Link href="/login" className="btn-accent inline-block px-5 py-2.5 rounded-full text-sm font-medium">
              Sign in
            </Link>
          </div>
        )}

        {scans && scans.length === 0 && (
          <p className="text-[var(--muted)] text-sm">Nothing here yet — check a resume to see it show up.</p>
        )}

        {scans && scans.length > 0 && (
          <>
            {scans.length > 3 && (
              <div className="relative mb-5">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-soft)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by role or job description…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] transition"
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
