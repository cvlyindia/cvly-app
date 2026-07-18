'use client';

import { useState } from 'react';
import { Briefcase, Check, Loader2 } from 'lucide-react';
import { friendlyErrorMessage, safeParseJson } from '@/lib/friendlyError';

export function SaveToTrackerButton({ scanId }: { scanId: string | null }) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!scanId) return null; // nothing to link to yet — the scan hasn't saved

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--good)]">
        <Check size={13} /> Saved to Tracker
      </span>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition border border-[var(--line)] px-3 py-1.5 rounded-full"
      >
        <Briefcase size={13} /> Save to Tracker
      </button>
    );
  }

  async function handleSave() {
    if (!company.trim() || !role.trim()) {
      setError('Company and role are both needed.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), role: role.trim(), scanId }),
      });
      const data = await safeParseJson(res);
      if (!data || data.error) throw new Error((data?.error as string) || `request failed with status ${res.status}`);
      setSaved(true);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center gap-2">
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className="w-32 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-white text-xs outline-none focus:border-[var(--accent)]"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className="w-32 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-white text-xs outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-accent px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition">
          Cancel
        </button>
      </div>
      {error && <p className="text-[10px] text-[var(--bad)]">{error}</p>}
    </div>
  );
}
