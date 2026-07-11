'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        <p className="text-sm text-[var(--muted)] mb-8">Delete any check you don&apos;t want to keep — it&apos;s removed immediately, for good.</p>

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
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--bad)] hover:bg-[var(--bad-bg)] transition disabled:opacity-40 shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
