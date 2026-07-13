'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MessageCircle, X, Send, ArrowRight } from 'lucide-react';
import { PRESET_QUESTIONS } from '@/lib/chatbotFacts';

const SUPPORT_EMAIL = 'support@cvly.in';

type Message = { role: 'bot' | 'user'; text: string };

const GREETING: Message = {
  role: 'bot',
  text: "Hi! I'm Cvly's help assistant. Tap a question below, or type your own.",
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--muted-soft)]" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--muted-soft)]" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[var(--muted-soft)]" />
    </div>
  );
}

export function ChatbotButton() {
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A single, gentle pulse a few seconds after page load — draws the eye once
    // without nagging. Never repeats, never fires again once someone's opened it.
    const id = setTimeout(() => setShowPulse(true), 2500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  function toggleOpen() {
    setOpen((o) => !o);
    setHasOpenedOnce(true);
    setShowPulse(false);
  }

  function askPreset(q: string, a: string) {
    setMessages((prev) => [...prev, { role: 'user', text: q }, { role: 'bot', text: a }]);
    setShowPresets(false);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setShowPresets(false);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: 'bot', text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: err instanceof Error ? err.message : "Something went wrong — try the email option below instead." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={toggleOpen}
        aria-label={open ? 'Close chat' : 'Open chat with Cvly assistant'}
        className={`fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[var(--accent)] shadow-lg flex items-center justify-center hover:scale-105 transition-transform text-white ${
          showPulse && !hasOpenedOnce ? 'launcher-pulse' : ''
        }`}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && (
          <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[var(--good)] border-2 border-white" />
        )}
      </button>

      {open && (
        <div className="panel-pop fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-96 h-[70vh] sm:h-[520px] max-h-[calc(100vh-9rem)] card rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white origin-bottom-right">
          <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--surface)] flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-white border border-[var(--line)] flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="" width={22} height={20} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--good)] border-2 border-[var(--surface)]" />
            </div>
            <div>
              <p className="text-sm font-semibold">Cvly Assistant</p>
              <p className="text-xs text-[var(--muted)]">Usually answers in seconds</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`msg-in flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--accent)] text-white rounded-br-md'
                      : 'bg-[var(--surface)] text-[var(--ink)] rounded-bl-md shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="msg-in flex justify-start">
                <div className="bg-[var(--surface)] px-3.5 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {showPresets && (
              <div className="space-y-1.5 pt-1">
                {PRESET_QUESTIONS.map((p) => (
                  <button
                    key={p.q}
                    onClick={() => askPreset(p.q, p.a)}
                    className="w-full flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]/20 transition group"
                  >
                    {p.q}
                    <ArrowRight size={12} className="text-[var(--muted-soft)] group-hover:text-[var(--accent-ink)] group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                ))}
              </div>
            )}

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Question about Cvly')}`}
              className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--good)] hover:bg-[var(--good-bg)] transition"
            >
              Email a real person: {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="p-3 border-t border-[var(--line)] flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Ask anything about Cvly…"
              maxLength={500}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40 transition shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
