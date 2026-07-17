'use client';

import { useState } from 'react';
import { Loader2, Check, Sparkles } from 'lucide-react';
import { UpgradePromptModal } from '@/components/UpgradePromptModal';

type ReviewType = 'linkedin' | 'portfolio';

interface ReviewResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

const COPY: Record<ReviewType, { title: string; placeholder: string; endpoint: string; fieldName: string; label: string }> = {
  linkedin: {
    title: 'LinkedIn profile review',
    placeholder: 'Paste your headline, About section, and a couple of experience entries here…',
    endpoint: '/api/linkedin-review',
    fieldName: 'profileText',
    label: 'Your LinkedIn profile text',
  },
  portfolio: {
    title: 'Portfolio review',
    placeholder: 'Paste your project descriptions, case studies, or work samples here…',
    endpoint: '/api/portfolio-review',
    fieldName: 'portfolioText',
    label: 'Your portfolio content',
  },
};

export function CareerReviewModal({ type, onClose, onSaved }: { type: ReviewType; onClose: () => void; onSaved?: () => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [needsPro, setNeedsPro] = useState(false);
  const copy = COPY[type];

  async function handleSubmit() {
    if (text.trim().length < 50) {
      setError('Paste a bit more — at least a few sentences to review.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [copy.fieldName]: text }),
      });
      const data = await res.json();
      if (data.error === 'requires_pro') {
        setNeedsPro(true);
        return;
      }
      if (data.error === 'out_of_credits') {
        throw new Error(`You're out of credits on the ${data.plan} plan. They reset ${new Date(data.resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`);
      }
      if (data.error) throw new Error(data.error);
      setResult(data);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (needsPro) {
    return <UpgradePromptModal onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card rounded-none sm:rounded-2xl w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto overscroll-contain bg-white">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
          <span className="text-sm font-semibold">{copy.title}</span>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-[var(--surface)] hover:bg-[var(--line)] flex items-center justify-center transition">
            <span className="text-lg leading-none text-[var(--muted)]">×</span>
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <>
              <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">{copy.label}</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={copy.placeholder}
                className="w-full h-56 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none placeholder:text-[var(--muted-soft)] transition mb-4"
              />
              {error && <div className="mb-4 p-3 rounded-lg bg-[var(--bad-bg)] text-[var(--bad)] text-sm">{error}</div>}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-accent w-full py-3 rounded-full text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Reviewing…</> : 'Get my review'}
              </button>
              <p className="text-[11px] text-[var(--muted-soft)] text-center mt-3">Uses 1 credit</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-xl shrink-0" style={{ background: result.score >= 75 ? 'var(--good)' : result.score >= 50 ? 'var(--warn)' : 'var(--bad)' }}>
                  {result.score}
                </div>
                <p className="text-sm text-[var(--ink)]/85 leading-relaxed">{result.summary}</p>
              </div>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--good)] mb-2">What&apos;s working</p>
                <ul className="space-y-1.5">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-[var(--ink)]/80 flex gap-2"><Check size={14} className="text-[var(--good)] shrink-0 mt-0.5" /> {s}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)] mb-2">What to fix</p>
                <ul className="space-y-1.5">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-[var(--ink)]/80 flex gap-2">
                      <span className="font-mono text-[var(--accent-ink)] text-xs shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={onClose} className="btn-accent w-full py-3 rounded-full text-sm font-semibold mt-5 flex items-center justify-center gap-2">
                <Sparkles size={15} /> Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
