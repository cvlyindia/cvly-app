'use client';

import { Sparkles } from 'lucide-react';

const TAB_LABELS: Record<string, string> = {
  rewrite: 'your rewritten resume',
  cover: 'your cover letter',
  interview: 'your 100 interview questions',
};

export function SignInPromptModal({ tab, onClose, onContinue }: { tab: string; onClose: () => void; onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[var(--ink)]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card rounded-2xl w-full max-w-sm p-7 bg-white text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-4">
          <Sparkles size={20} className="text-[var(--accent-ink)]" />
        </div>
        <h2 className="text-lg font-semibold mb-1.5">You&apos;ve seen the problem — now let&apos;s fix it</h2>
        <p className="text-sm text-[var(--muted)] mb-6">
          Getting {TAB_LABELS[tab] ?? 'this'} takes a free account — still no card, just somewhere to keep your results. Takes about 10 seconds.
        </p>
        <button onClick={onContinue} className="btn-accent w-full py-3 rounded-full text-sm font-semibold mb-2.5">
          Sign in free to continue
        </button>
        <button onClick={onClose} className="w-full text-center text-xs text-[var(--muted)] hover:text-[var(--ink)] transition py-1">
          Not now
        </button>
      </div>
    </div>
  );
}
