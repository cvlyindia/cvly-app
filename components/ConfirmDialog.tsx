'use client';

import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[var(--ink)]/40" onClick={onCancel} />
      <div className="panel-pop relative card rounded-2xl p-6 w-full max-w-sm bg-white">
        <div className="w-10 h-10 rounded-full bg-[var(--bad-bg)] flex items-center justify-center mb-4">
          <AlertTriangle size={18} className="text-[var(--bad)]" />
        </div>
        <h2 className="text-base font-semibold mb-1.5">{title}</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">{message}</p>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full border border-[var(--line)] text-sm font-medium hover:bg-[var(--surface)] transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-full bg-[var(--bad)] text-white text-sm font-medium hover:opacity-90 transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
