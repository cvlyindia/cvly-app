'use client';

import { Zap, ArrowRight } from 'lucide-react';

export function OutOfCreditsModal({ plan, resetAt, onClose }: { plan: string; resetAt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[var(--ink)]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card rounded-2xl w-full max-w-sm p-7 bg-white">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-4">
            <Zap size={20} className="text-[var(--accent-ink)]" />
          </div>
          <h2 className="text-lg font-semibold mb-1.5">You&apos;re out of credits</h2>
          <p className="text-sm text-[var(--muted)]">
            Your <span className="capitalize">{plan}</span> plan resets {new Date(resetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — or get more right now.
          </p>
        </div>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-center justify-between p-3.5 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-soft)]/30">
            <div>
              <p className="text-sm font-semibold">Pro</p>
              <p className="text-xs text-[var(--muted)]">100 credits every day</p>
            </div>
            <p className="text-sm font-bold">₹99<span className="text-xs font-normal text-[var(--muted)]">/mo</span></p>
          </div>
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--line)]">
            <div>
              <p className="text-sm font-semibold">Enterprise</p>
              <p className="text-xs text-[var(--muted)]">1,000 credits every day</p>
            </div>
            <p className="text-sm font-bold">₹999<span className="text-xs font-normal text-[var(--muted)]">/mo</span></p>
          </div>
        </div>

        <a href="/pricing" className="btn-accent w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold mb-2.5">
          View plans <ArrowRight size={15} />
        </a>
        <button onClick={onClose} className="w-full text-center text-xs text-[var(--muted)] hover:text-[var(--ink)] transition py-1">
          Maybe later
        </button>
      </div>
    </div>
  );
}
