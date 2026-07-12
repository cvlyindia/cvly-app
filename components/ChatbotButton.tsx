'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { PRESET_QUESTIONS } from '@/lib/chatbotFacts';

const WHATSAPP_NUMBER = '919818086846'; // confirm/replace with the real support number

type Message = { role: 'bot' | 'user'; text: string };

const GREETING: Message = {
  role: 'bot',
  text: "Hi! I'm Cvly's help assistant. Tap a question below, or type your own.",
};

export function ChatbotButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

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
        { role: 'bot', text: err instanceof Error ? err.message : "Something went wrong — try the WhatsApp option below instead." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open chat with Cvly assistant'}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[var(--accent)] shadow-lg flex items-center justify-center hover:scale-105 transition-transform text-white"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-96 h-[70vh] sm:h-[520px] max-h-[calc(100vh-9rem)] card rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--surface)]">
            <p className="text-sm font-semibold">Cvly Assistant</p>
            <p className="text-xs text-[var(--muted)]">Usually answers in seconds</p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--accent)] text-white rounded-br-md'
                      : 'bg-[var(--surface)] text-[var(--ink)] rounded-bl-md'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--surface)] px-3.5 py-2.5 rounded-2xl rounded-bl-md">
                  <Loader2 size={14} className="animate-spin text-[var(--muted)]" />
                </div>
              </div>
            )}

            {showPresets && (
              <div className="space-y-1.5 pt-1">
                {PRESET_QUESTIONS.map((p) => (
                  <button
                    key={p.q}
                    onClick={() => askPreset(p.q, p.a)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface)] transition"
                  >
                    {p.q}
                  </button>
                ))}
              </div>
            )}

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi! I have a question about Cvly.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl border border-[var(--line)] text-xs font-medium text-[var(--good)] hover:bg-[var(--good-bg)] transition"
            >
              Talk to a real person on WhatsApp →
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
