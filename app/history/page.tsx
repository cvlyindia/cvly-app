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
        <h1 className="text-2xl font-semibold tracking-tight mb-8">Your history</h1>

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
          <div className="space-y-3">
            {scans.map((s) => {
              const color = s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)';
              return (
                <div key={s.id} className="card rounded-2xl p-5 flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-sm"
                    style={{ background: color }}
                  >
                    {s.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--ink)] line-clamp-1">{s.job_description.slice(0, 90)}...</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
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
