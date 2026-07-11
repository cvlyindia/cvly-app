'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type ScoreResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
};

type InterviewQuestion = { question: string; starHint: string };

function StampRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'var(--good)' : score >= 50 ? 'var(--warn)' : 'var(--bad)';
  const label = score >= 75 ? 'Strong match' : score >= 50 ? 'Needs work' : 'Weak match';

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <svg width="140" height="140" viewBox="0 0 140 140" className="stamp-ring -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--paper-line)" strokeWidth="3" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <circle cx="70" cy="70" r={radius - 10} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="2 4" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-semibold" style={{ color }}>{score}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)] mt-0.5">/ 100</span>
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wider mt-3" style={{ color }}>{label}</span>
    </div>
  );
}

const FEATURES = [
  { title: 'ATS match score', desc: 'Instant 0-100 score showing exactly how well your resume matches a job description, the way applicant tracking software reads it.' },
  { title: 'Keyword gap analysis', desc: 'See precisely which keywords from the job description are missing from your resume — and which ones you already nailed.' },
  { title: 'AI resume rewrite', desc: 'A tailored rewrite optimized for this specific job, keeping every fact truthful — no invented experience, just sharper framing.' },
  { title: 'Cover letter, in one click', desc: 'A specific, non-generic cover letter written from your real resume and the actual job post — not a fill-in-the-blank template.' },
  { title: 'STAR interview prep', desc: 'Likely interview questions for this exact role, each with a hint on how to structure your answer using your real experience.' },
  { title: 'Free while in beta', desc: 'No credit card, no signup wall. Try the full tool before we ever ask you to pay for anything.' },
];

const FAQS = [
  { q: 'Is this really free?', a: 'Yes — during beta, every feature (scoring, rewrite, cover letter, interview prep) is free to use, no card required.' },
  { q: 'Does cvly store my resume?', a: 'Your resume text is sent only to generate your results. We are not persisting resume content to a database in this beta version.' },
  { q: 'What file types can I upload?', a: 'PDF, DOCX, and plain text. You can also just paste your resume text directly if you prefer.' },
  { q: 'Will the rewrite invent fake experience?', a: 'No. The AI is instructed to only rephrase and reframe your real experience for ATS keyword match — it will not fabricate companies, titles, or dates.' },
  { q: 'How is this different from just using ChatGPT?', a: 'cvly is purpose-built for this one job: paste resume + JD, get a structured score, gap analysis, rewrite, cover letter, and interview prep in one flow — no prompt-writing needed.' },
];

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [result, setResult] = useState<ScoreResult | null>(null);
  const [activeTab, setActiveTab] = useState<'score' | 'rewrite' | 'cover' | 'interview'>('score');
  const [rewritten, setRewritten] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/extract-text', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResumeText(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read file');
    }
  }

  async function handleScore() {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Please add both your resume and the job description.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setActiveTab('score');

      // Save to history if logged in (silently no-ops if not)
      fetch('/api/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, ...data }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleTabAction(tab: 'rewrite' | 'cover' | 'interview') {
    setActiveTab(tab);
    if (tab === 'rewrite' && rewritten) return;
    if (tab === 'cover' && coverLetter) return;
    if (tab === 'interview' && questions.length) return;

    setTabLoading(true);
    setError('');
    try {
      const endpoint = tab === 'rewrite' ? '/api/rewrite' : tab === 'cover' ? '/api/cover-letter' : '/api/interview-prep';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (tab === 'rewrite') setRewritten(data.rewritten);
      if (tab === 'cover') setCoverLetter(data.letter);
      if (tab === 'interview') setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setTabLoading(false);
    }
  }

  const tabs: { key: 'score' | 'rewrite' | 'cover' | 'interview'; label: string; num: string }[] = [
    { key: 'score', label: 'Score', num: '01' },
    { key: 'rewrite', label: 'Rewrite', num: '02' },
    { key: 'cover', label: 'Cover letter', num: '03' },
    { key: 'interview', label: 'Interview prep', num: '04' },
  ];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--paper-line)] sticky top-0 bg-[var(--paper)]/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="cvly" width={32} height={32} className="rounded-md" />
            <span className="font-display text-xl font-semibold tracking-tight text-[var(--ink)]">cvly</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#faq" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">FAQ</a>
            {user ? (
              <>
                <Link href="/history" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">History</Link>
                <button onClick={handleLogout} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Sign out</button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-full bg-[var(--charcoal)] text-white text-sm font-medium hover:bg-black transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-14 text-center">
        <p className="fade-up font-mono text-xs uppercase tracking-[0.2em] text-[var(--orange-deep)] mb-4">ATS resume review · Free while in beta</p>
        <h1 className="fade-up fade-up-1 font-display text-4xl md:text-6xl font-semibold text-[var(--ink)] mb-5 leading-[1.1]">
          Know if your resume<br /><span className="italic text-[var(--orange)]">passes the bots.</span>
        </h1>
        <p className="fade-up fade-up-2 text-[var(--muted)] max-w-lg mx-auto text-base md:text-lg mb-8">
          Paste your resume and a job description. Get your match score, missing keywords, a tailored rewrite, cover letter, and interview prep — in under 10 seconds.
        </p>
        <a
          href="#tool"
          className="fade-up fade-up-3 inline-block px-8 py-3.5 rounded-full bg-[var(--orange)] text-white font-semibold text-sm hover:bg-[var(--orange-deep)] transition shadow-[0_4px_14px_rgba(245,130,31,0.35)]"
        >
          Score my resume, free →
        </a>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-14 border-t border-[var(--paper-line)]">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: '01', t: 'Paste both', d: 'Drop in your resume (upload or paste) and the job description you\'re applying to.' },
            { n: '02', t: 'Get your score', d: 'See your ATS match score, matched keywords, and exactly what\'s missing.' },
            { n: '03', t: 'Fix it instantly', d: 'One click for a tailored rewrite, cover letter, and interview prep — all from the same input.' },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <span className="font-mono text-xs text-[var(--orange)]">{s.n}</span>
              <h3 className="font-display text-lg font-semibold mt-2 mb-2">{s.t}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-14 border-t border-[var(--paper-line)]">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">Everything you need to get shortlisted</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-[var(--paper-line)] p-5 hover:shadow-[0_4px_16px_rgba(30,30,34,0.06)] transition">
              <h3 className="font-semibold text-[var(--ink)] mb-2 text-[15px]">{f.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tool */}
      <section id="tool" className="max-w-4xl mx-auto px-6 py-16 border-t border-[var(--paper-line)] scroll-mt-16">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-center mb-2">Try it now</h2>
        <p className="text-center text-[var(--muted)] text-sm mb-10">No signup. No card. Just paste and go.</p>

        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-[var(--paper-line)] p-6 shadow-[0_1px_3px_rgba(30,30,34,0.04)]">
            <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] block mb-4">01 — Your resume</label>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--orange-mist)] text-sm font-medium text-[var(--orange-deep)] cursor-pointer hover:bg-[#FCE2C4] transition mb-3">
              Upload PDF / DOCX
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {fileName && <span className="block text-xs text-[var(--muted)] mb-2 font-mono">{fileName}</span>}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="...or paste your resume text here"
              className="w-full h-44 p-3 rounded-lg border border-[var(--paper-line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-transparent resize-none placeholder:text-[var(--muted)]"
            />
          </div>

          <div className="bg-white rounded-xl border border-[var(--paper-line)] p-6 shadow-[0_1px_3px_rgba(30,30,34,0.04)]">
            <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] block mb-4">02 — Job description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here"
              className="w-full h-[172px] mt-[42px] p-3 rounded-lg border border-[var(--paper-line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-transparent resize-none placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-[var(--bad-bg)] border border-[var(--bad)]/20 text-[var(--bad)] text-sm font-mono">{error}</div>
        )}

        <div className="flex justify-center mb-12">
          <button
            onClick={handleScore}
            disabled={loading}
            className="px-8 py-3.5 rounded-full bg-[var(--orange)] text-white font-semibold text-sm hover:bg-[var(--orange-deep)] transition disabled:opacity-40 shadow-[0_4px_14px_rgba(245,130,31,0.3)]"
          >
            {loading ? 'Scoring…' : 'Score my resume →'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl border border-[var(--paper-line)] overflow-hidden shadow-[0_1px_3px_rgba(30,30,34,0.04)]">
            <div className="flex border-b border-[var(--paper-line)] paper-texture overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => (tab.key === 'score' ? setActiveTab('score') : handleTabAction(tab.key as 'rewrite' | 'cover' | 'interview'))}
                  className={`flex-1 min-w-[110px] py-4 text-sm font-medium transition flex flex-col items-center gap-1 ${
                    activeTab === tab.key ? 'text-[var(--orange-deep)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                  style={activeTab === tab.key ? { boxShadow: 'inset 0 -2px 0 var(--orange)' } : undefined}
                >
                  <span className="font-mono text-[10px] tracking-wider">{tab.num}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'score' && (
                <div>
                  <div className="flex items-start gap-8 mb-8 flex-wrap">
                    <StampRing score={result.score} />
                    <p className="text-[var(--ink)] flex-1 min-w-[220px] pt-2 leading-relaxed">{result.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--good)] mb-3">✓ Matched keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedKeywords.map((kw, i) => (
                          <span key={i} className="font-mono px-2.5 py-1 bg-[var(--good-bg)] text-[var(--good)] text-xs rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--bad)] mb-3">✗ Missing keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords.map((kw, i) => (
                          <span key={i} className="font-mono px-2.5 py-1 bg-[var(--bad-bg)] text-[var(--bad)] text-xs rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] mb-3">How to improve</h3>
                  <ul className="space-y-2.5">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="text-sm text-[var(--ink)]/80 flex gap-3 leading-relaxed">
                        <span className="text-[var(--orange)] font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span> {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'rewrite' && (
                <div>
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm font-mono">Rewriting your resume…</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-[var(--ink)]/85 font-sans leading-relaxed">{rewritten}</pre>
                  )}
                </div>
              )}

              {activeTab === 'cover' && (
                <div>
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm font-mono">Writing your cover letter…</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-[var(--ink)]/85 font-sans leading-relaxed">{coverLetter}</pre>
                  )}
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-3">
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm font-mono">Preparing interview questions…</p>
                  ) : (
                    questions.map((q, i) => (
                      <div key={i} className="p-4 rounded-lg bg-[var(--paper)] border border-[var(--paper-line)]">
                        <p className="font-medium text-[var(--ink)] mb-1.5 flex gap-2">
                          <span className="font-mono text-[var(--orange)] text-xs shrink-0 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                          {q.question}
                        </p>
                        <p className="text-sm text-[var(--muted)] pl-6">{q.starHint}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--paper-line)] scroll-mt-16">
        <h2 className="font-display text-2xl font-semibold text-center mb-10">Frequently asked</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              open={openFaq === i}
              onToggle={(e) => setOpenFaq((e.target as HTMLDetailsElement).open ? i : null)}
              className="bg-white rounded-xl border border-[var(--paper-line)] px-5 py-4"
            >
              <summary className="flex items-center justify-between cursor-pointer font-medium text-[var(--ink)] text-[15px]">
                {f.q}
                <span className="font-mono text-[var(--orange)] text-lg">{openFaq === i ? '−' : '+'}</span>
              </summary>
              <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--paper-line)] py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="cvly" width={24} height={24} className="rounded" />
            <span className="font-display font-semibold text-[var(--ink)]">cvly</span>
          </div>
          <p className="text-xs text-[var(--muted)] font-mono">Built in Faridabad, India · cvly.in</p>
        </div>
      </footer>
    </main>
  );
}
