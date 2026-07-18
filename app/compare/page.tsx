'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/DashboardShell';
import { createClient } from '@/lib/supabase/client';
import { diffResumes, type ResumeDiff } from '@/lib/resumeDiff';
import type { StructuredResume } from '@/lib/ai';

interface ScanSummary {
  id: string;
  job_description: string;
  created_at: string;
  rewritten_resume: StructuredResume;
}

function bulletClass(status: 'shared' | 'onlyA' | 'onlyB', side: 'a' | 'b'): string {
  if (status === 'shared') return 'text-[var(--ink)]/70';
  if ((status === 'onlyA' && side === 'a') || (status === 'onlyB' && side === 'b')) {
    return 'text-[var(--ink)] bg-[var(--accent-soft)]/40 -mx-1.5 px-1.5 rounded';
  }
  return 'hidden'; // an onlyA bullet has nothing to show on the B side, and vice versa
}

function CompareContent() {
  const params = useSearchParams();
  const idA = params.get('a');
  const idB = params.get('b');
  const [scanA, setScanA] = useState<ScanSummary | null>(null);
  const [scanB, setScanB] = useState<ScanSummary | null>(null);
  const [diff, setDiff] = useState<ResumeDiff | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!idA || !idB) return; // handled as a direct render-time condition below, not here
    Promise.all([
      fetch(`/api/scans/${idA}`).then((r) => r.json()),
      fetch(`/api/scans/${idB}`).then((r) => r.json()),
    ])
      .then(([dataA, dataB]) => {
        if (dataA.error || dataB.error || !dataA.scan?.rewritten_resume || !dataB.scan?.rewritten_resume) {
          setError('Couldn\'t load both rewrites — one may have been deleted, or a rewrite was never generated for it.');
          return;
        }
        setScanA(dataA.scan);
        setScanB(dataB.scan);
        setDiff(diffResumes(dataA.scan.rewritten_resume, dataB.scan.rewritten_resume));
      })
      .catch(() => setError('Something went wrong loading these two versions.'));
  }, [idA, idB]);

  if (!idA || !idB) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--muted)] mb-4">Two scans need to be selected to compare.</p>
        <Link href="/history" className="text-sm text-[var(--accent-ink)] hover:underline">Back to History</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[var(--muted)] mb-4">{error}</p>
        <Link href="/history" className="text-sm text-[var(--accent-ink)] hover:underline">Back to History</Link>
      </div>
    );
  }

  if (!scanA || !scanB || !diff) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/history" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition mb-6">
        <ArrowLeft size={15} /> Back to History
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Comparing two rewrites</h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Highlighted lines are unique to that version — everything else appeared in both.
      </p>

      {diff.summaryChanged && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="card rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Summary — Version A</p>
            <p className="text-sm bg-[var(--accent-soft)]/40 -mx-1 px-1 rounded">{scanA.rewritten_resume.summary}</p>
          </div>
          <div className="card rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Summary — Version B</p>
            <p className="text-sm bg-[var(--accent-soft)]/40 -mx-1 px-1 rounded">{scanB.rewritten_resume.summary}</p>
          </div>
        </div>
      )}

      <div className="space-y-6 mb-8">
        {diff.experience.map((entry) => (
          <div key={entry.company} className="grid grid-cols-2 gap-6">
            <div className="card rounded-xl p-4">
              <p className="text-sm font-semibold mb-0.5">{entry.company}</p>
              <p className="text-xs text-[var(--muted)] mb-3">{entry.titleA ?? 'Not in this version'}</p>
              {entry.titleA && (
                <ul className="space-y-1.5 text-sm">
                  {entry.bullets.filter((b) => b.status !== 'onlyB').map((b, i) => (
                    <li key={i} className={bulletClass(b.status, 'a')}>• {b.text}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card rounded-xl p-4">
              <p className="text-sm font-semibold mb-0.5">{entry.company}</p>
              <p className="text-xs text-[var(--muted)] mb-3">{entry.titleB ?? 'Not in this version'}</p>
              {entry.titleB && (
                <ul className="space-y-1.5 text-sm">
                  {entry.bullets.filter((b) => b.status !== 'onlyA').map((b, i) => (
                    <li key={i} className={bulletClass(b.status, 'b')}>• {b.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {(diff.skillsOnlyA.length > 0 || diff.skillsOnlyB.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          <div className="card rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Skills only in A</p>
            <p className="text-sm">{diff.skillsOnlyA.length ? diff.skillsOnlyA.join(', ') : '—'}</p>
          </div>
          <div className="card rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Skills only in B</p>
            <p className="text-sm">{diff.skillsOnlyB.length ? diff.skillsOnlyB.join(', ') : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<{ remaining: number; plan: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setEmail(data.user.email ?? '');
      setCheckingAuth(false);
      fetch('/api/credits')
        .then((res) => res.json())
        .then((d) => {
          if (d.loggedIn) setCredits({ remaining: d.remaining, plan: d.plan });
        });
    });
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <DashboardShell activePage="history" pageTitle="Compare versions" userEmail={email} credits={credits} onCreditsChange={setCredits} onSignOut={handleSignOut}>
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 size={20} className="animate-spin text-[var(--muted)]" /></div>}>
        <CompareContent />
      </Suspense>
    </DashboardShell>
  );
}
