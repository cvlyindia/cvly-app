'use client';

import { Bookmark } from 'lucide-react';
import { stashPendingScan } from '@/lib/pendingScan';
import type { ScoreResult } from '@/lib/ai';

export function SaveResultPrompt({
  resumeText,
  jobDescription,
  result,
}: {
  resumeText: string;
  jobDescription: string;
  result: ScoreResult;
}) {
  function handleSaveClick() {
    stashPendingScan({
      resumeText,
      jobDescription,
      score: result.score,
      matchedKeywords: result.matchedKeywords,
      missingKeywords: result.missingKeywords,
      summary: result.summary,
      improvements: result.improvements,
    });
    window.location.href = '/login?next=/dashboard';
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/25 mb-8">
      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
        <Bookmark size={15} className="text-[var(--accent-ink)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">This result disappears when you close this tab.</p>
        <p className="text-xs text-[var(--muted)] mt-0.5">Sign in to save it, track your score over time, and pick up where you left off — 10 seconds, no password.</p>
      </div>
      <button
        onClick={handleSaveClick}
        className="shrink-0 px-4 py-2 rounded-full bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition"
      >
        Save this
      </button>
    </div>
  );
}
