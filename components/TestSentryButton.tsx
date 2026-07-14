'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export function TestSentryButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function trigger() {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/test-sentry', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setMessage(data.message);
      setStatus('sent');
    } catch {
      setMessage('Could not reach the test endpoint — check you\'re signed in as an admin.');
      setStatus('error');
    }
  }

  return (
    <div className="card rounded-2xl p-5 mb-10">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-[var(--accent-ink)]" />
        <p className="text-sm font-semibold">Verify Sentry is actually working</p>
      </div>
      <p className="text-xs text-[var(--muted)] mb-3">
        Sends one deliberate test error through the real error-reporting pipeline. Check your Sentry
        dashboard afterward — it should show up within a minute or two, clearly labeled as a test.
      </p>
      <button
        onClick={trigger}
        disabled={status === 'loading'}
        className="px-4 py-2 rounded-full border border-[var(--line)] text-xs font-medium hover:bg-[var(--surface)] transition disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        {status === 'loading' && <Loader2 size={12} className="animate-spin" />}
        Send test error
      </button>
      {message && (
        <p className={`text-xs mt-2 ${status === 'error' ? 'text-[var(--bad)]' : 'text-[var(--good)]'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
