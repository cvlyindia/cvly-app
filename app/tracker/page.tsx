'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardShell } from '@/components/DashboardShell';
import { Plus, Loader2, Trash2, ExternalLink, X } from 'lucide-react';

type Status = 'saved' | 'applied' | 'interview' | 'offer';

type Job = {
  id: string;
  company: string;
  role: string;
  job_url: string | null;
  status: Status;
  notes: string | null;
  created_at: string;
};

const COLUMNS: { key: Status; label: string }[] = [
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
];

export default function TrackerPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState<{ remaining: number; plan: string } | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: '', role: '', jobUrl: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setEmail(data.user.email ?? '');
      setCheckingAuth(false);
      fetch('/api/tracker')
        .then((res) => res.json())
        .then((d) => setJobs(d.jobs ?? []));
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) {
      setError('Company and role are both required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setJobs((prev) => [data.job, ...(prev ?? [])]);
      setForm({ company: '', role: '', jobUrl: '', notes: '' });
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this job');
    } finally {
      setSaving(false);
    }
  }

  async function moveJob(id: string, status: Status) {
    setJobs((prev) => prev?.map((j) => (j.id === id ? { ...j, status } : j)) ?? null);
    fetch(`/api/tracker/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  async function deleteJob(id: string) {
    setJobs((prev) => prev?.filter((j) => j.id !== id) ?? null);
    fetch(`/api/tracker/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  return (
    <DashboardShell activePage="tracker" pageTitle="Tracker" userEmail={email} credits={credits} onCreditsChange={setCredits} onSignOut={handleSignOut}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-sm text-[var(--muted)]">
          {jobs === null ? 'Loading…' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} tracked`}
        </p>
        <button onClick={() => setShowAdd(true)} className="btn-accent inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold">
          <Plus size={15} /> Add a job
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[var(--ink)]/40" onClick={() => setShowAdd(false)} />
          <div className="relative card rounded-2xl w-full max-w-md p-6 bg-white">
            <div className="flex items-center justify-between mb-5">
              <p className="font-semibold">Add a job</p>
              <button onClick={() => setShowAdd(false)} aria-label="Close" className="w-8 h-8 rounded-full hover:bg-[var(--surface)] flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Company"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Role"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
              <input
                value={form.jobUrl}
                onChange={(e) => setForm((f) => ({ ...f, jobUrl: e.target.value }))}
                placeholder="Job link (optional)"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="w-full h-20 px-3.5 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              />
              {error && <p className="text-xs text-[var(--bad)]">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="btn-accent w-full py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save job'}
              </button>
            </form>
          </div>
        </div>
      )}

      {jobs === null ? (
        <div className="flex justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[var(--muted)]" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center">
          <p className="font-semibold mb-2">Nothing tracked yet</p>
          <p className="text-sm text-[var(--muted)] mb-6">Add the roles you&apos;re applying to, and move them across stages as things progress.</p>
          <button onClick={() => setShowAdd(true)} className="btn-accent inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold">
            <Plus size={15} /> Add your first job
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colJobs = jobs.filter((j) => j.status === col.key);
            return (
              <div key={col.key}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">
                  {col.label} <span className="font-normal text-[var(--muted-soft)]">{colJobs.length}</span>
                </p>
                <div className="space-y-2.5">
                  {colJobs.map((job) => (
                    <div key={job.id} className="card rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold leading-snug">{job.role}</p>
                        <button onClick={() => deleteJob(job.id)} aria-label="Remove" className="text-[var(--muted-soft)] hover:text-[var(--bad)] shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-xs text-[var(--muted)] mb-2">{job.company}</p>
                      {job.job_url && (
                        <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-ink)] hover:underline mb-2">
                          <ExternalLink size={10} /> View posting
                        </a>
                      )}
                      {job.notes && <p className="text-xs text-[var(--muted)] mb-3 leading-relaxed">{job.notes}</p>}
                      <select
                        value={job.status}
                        onChange={(e) => moveJob(job.id, e.target.value as Status)}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>Move to {c.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {colJobs.length === 0 && (
                    <p className="text-xs text-[var(--muted-soft)] italic py-4 text-center">Nothing here</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
