'use client';

import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';

export function ListenButton({ text, label = 'Listen' }: { text: string; label?: string }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggle() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // stop anything already playing elsewhere on the page
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)] transition"
    >
      {speaking ? <Square size={12} className="fill-current" /> : <Volume2 size={13} />}
      {speaking ? 'Stop' : label}
    </button>
  );
}
