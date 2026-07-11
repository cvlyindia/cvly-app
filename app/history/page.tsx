'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Scan = {
  id: string;
  score: number;
  summary: string;
  job_description: string;
  created_at: string;
};

export default function HistoryPage() {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setScans(data.scans);
      });
  }, []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--line)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="cvly" width={28} height={28} className="rounded-md" />
            <span className="font-display text-lg font-semibold text-[var(--ink)]">cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">← Back to tool</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-display text-2xl font-semibold mb-6">Your scan history</h1>

        {error === 'Not logged in' && (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-[var(--muted)] mb-4">Sign in to see your saved scans.</p>
            <Link href="/login" className="inline-block px-5 py-2.5 rounded-full bg-[var(--orange)] text-black text-sm font-semibold">
              Sign in
            </Link>
          </div>
        )}

        {scans && scans.length === 0 && (
          <p className="text-[var(--muted)] text-sm">No scans yet — go score a resume to see it here.</p>
        )}

        {scans && scans.length > 0 && (
          <div className="space-y-3">
            {scans.map((s) => {
              const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
              return (
                <div key={s.id} className="glass rounded-xl p-5 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-display font-semibold text-white shrink-0"
                    style={{ background: color }}
                  >
                    {s.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--ink)] line-clamp-1">{s.job_description.slice(0, 90)}...</p>
                    <p className="text-xs text-[var(--muted)] font-mono mt-1">
                      {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
