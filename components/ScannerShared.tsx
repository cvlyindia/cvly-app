'use client';

import { useState } from 'react';
import { Loader2, Download, ChevronDown, Copy } from 'lucide-react';
import { downloadTxt, downloadPdf, downloadDocx, type ExportBlock } from '@/lib/export';
import { downloadResumeDocx, downloadResumePdf, structuredResumeToPlainText } from '@/lib/resumeTemplate';
import type { StructuredResume } from '@/lib/ai';

export function SkeletonLines({ label, sublabel }: { label: string; sublabel?: string }) {
  const widths = ['92%', '78%', '85%', '60%', '90%', '70%'];
  return (
    <div>
      <p className="text-[var(--muted)] text-sm flex items-center gap-2 mb-5"><Loader2 size={14} className="animate-spin" /> {label}</p>
      <div className="space-y-3">
        {widths.map((w, i) => (
          <div key={i} className="h-3.5 rounded-md skeleton" style={{ width: w }} />
        ))}
      </div>
      {sublabel && <p className="text-xs text-[var(--muted-soft)] mt-4">{sublabel}</p>}
    </div>
  );
}

export function DownloadBar({ blocks, baseFilename, copyText, copied, onCopy, resumeData }: { blocks: ExportBlock[]; baseFilename: string; copyText: string; copied: boolean; onCopy: (text: string) => void; resumeData?: StructuredResume }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFormat(format: 'txt' | 'pdf' | 'docx') {
    setOpen(false);
    setBusy(true);
    try {
      if (resumeData) {
        if (format === 'txt') {
          const blob = new Blob([structuredResumeToPlainText(resumeData)], { type: 'text/plain;charset=utf-8' });
          const { saveAs } = await import('file-saver');
          saveAs(blob, `${baseFilename}.txt`);
        } else if (format === 'pdf') downloadResumePdf(`${baseFilename}.pdf`, resumeData);
        else await downloadResumeDocx(`${baseFilename}.docx`, resumeData);
      } else if (format === 'txt') downloadTxt(`${baseFilename}.txt`, blocks);
      else if (format === 'pdf') downloadPdf(`${baseFilename}.pdf`, blocks);
      else await downloadDocx(`${baseFilename}.docx`, blocks);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mb-6 relative">
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)] transition disabled:opacity-50"
        >
          <Download size={13} /> {busy ? 'Preparing…' : 'Download'} <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1.5 w-36 card rounded-lg overflow-hidden z-20 shadow-lg">
              {[
                { key: 'pdf', label: 'PDF document' },
                { key: 'docx', label: 'Word (.docx)' },
                { key: 'txt', label: 'Plain text' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleFormat(f.key as 'txt' | 'pdf' | 'docx')}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] transition"
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => onCopy(copyText)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)] transition"
      >
        <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
