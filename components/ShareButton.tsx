'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { XIcon, LinkedinIcon } from '@/components/SocialIcons';

export function ShareButton({ score }: { score: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = `I scored ${score}/100 on my resume match with Cvly. Free ATS check, no card — see yours at cvly.in`;
  const url = 'https://cvly.in';

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // User cancelled the native share sheet — not an error, just do nothing
      }
      return;
    }
    setOpen((o) => !o);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${text} ${url}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)] transition"
      >
        <Share2 size={13} /> Share
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 card rounded-lg overflow-hidden z-20 shadow-lg">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.5 6.5A7.9 7.9 0 0 0 12 4.2a7.95 7.95 0 0 0-6.9 11.9L4 20l4-1.05A7.95 7.95 0 0 0 12 20a7.95 7.95 0 0 0 5.5-13.5z" /></svg>
              WhatsApp
            </a>
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] transition"
            >
              <XIcon size={13} /> X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] transition"
            >
              <LinkedinIcon size={13} /> LinkedIn
            </a>
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] transition text-left"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
