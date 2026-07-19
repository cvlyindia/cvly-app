'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Flame } from 'lucide-react';
import { safeParseJson } from '@/lib/friendlyError';

interface Question { question: string; starHint: string; suggestedAnswer: string }
interface Category { category: string; questions: Question[] }
interface ScanLike {
  id: string;
  created_at: string;
  interview_questions: Category[] | null;
  practiced_questions: string[] | null;
}

/** Same question for the whole day, a different one tomorrow — the
 * deterministic seed is what makes this a daily ritual instead of a random
 * shuffle button. Local date, not UTC: "today" should flip at the user's
 * midnight, not at 5:30 AM IST. */
function daySeed(): number {
  const now = new Date();
  return now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate();
}

export function DailyPracticeCard({ scans }: { scans: ScanLike[] }) {
  const [showHint, setShowHint] = useState(false);
  const [justPracticed, setJustPracticed] = useState(false);
  const [saving, setSaving] = useState(false);

  const pick = useMemo(() => {
    const scan = scans.find((s) => s.interview_questions && s.interview_questions.length > 0);
    if (!scan) return null;
    const flat = scan.interview_questions!.flatMap((c) => c.questions.map((q) => ({ ...q, category: c.category })));
    if (flat.length === 0) return null;
    const q = flat[daySeed() % flat.length];
    return { scan, q, practiced: (scan.practiced_questions ?? []).includes(q.question) };
  }, [scans]);

  if (!pick) return null; // no interview prep generated yet — nothing to practice, no fake card

  const done = pick.practiced || justPracticed;

  async function markPracticed() {
    if (!pick || done || saving) return;
    setSaving(true);
    try {
      const next = Array.from(new Set([...(pick.scan.practiced_questions ?? []), pick.q.question]));
      const res = await fetch(`/api/scans/${pick.scan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practicedQuestions: next }),
      });
      const data = await safeParseJson(res);
      if (data && !data.error) setJustPracticed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] flex items-center gap-1.5">
          <Flame size={13} className="text-[var(--accent)]" /> Today&apos;s practice question
        </p>
        <span className="text-[10px] text-[var(--muted-soft)]">{pick.q.category}</span>
      </div>

      {done ? (
        <div className="flex items-start gap-3">
          <span className="w-7 h-7 rounded-full bg-[var(--good-bg)] flex items-center justify-center shrink-0 mt-0.5">
            <Check size={14} className="text-[var(--good)]" />
          </span>
          <div>
            <p className="text-sm font-medium mb-0.5">Practiced — nice work.</p>
            <p className="text-xs text-[var(--muted)]">A new question lands here tomorrow. Answering one out loud every day compounds fast.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[15px] font-medium leading-relaxed mb-4">{pick.q.question}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={markPracticed} disabled={saving} className="btn-accent px-4 py-2 rounded-full text-xs font-semibold disabled:opacity-50">
              I practiced this out loud
            </button>
            <button onClick={() => setShowHint((h) => !h)} className="inline-flex items-center gap-1 text-xs text-[var(--accent-ink)] hover:underline">
              STAR hint <ChevronDown size={12} className={`transition-transform ${showHint ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {showHint && (
            <p className="text-xs text-[var(--muted)] leading-relaxed mt-3 pl-3 border-l-2 border-[var(--accent-soft)]">{pick.q.starHint}</p>
          )}
        </>
      )}
    </div>
  );
}
