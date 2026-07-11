'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  Target, KeyRound, PenLine, Mail, MessagesSquare, ShieldCheck,
  Upload, Check, Download, Copy, ChevronDown, ArrowRight, Loader2,
} from 'lucide-react';

type ScoreResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
};

type InterviewQuestion = { question: string; starHint: string };
type InterviewCategory = { category: string; questions: InterviewQuestion[] };

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ScoreRing({ score, size = 128 }: { score: number; size?: number }) {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'var(--good)' : score >= 50 ? 'var(--warn)' : 'var(--bad)';
  const label = score >= 75 ? 'Strong fit' : score >= 50 ? 'Getting there' : 'Needs work';
  const c = size / 2;

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={c} cy={c} r={radius} fill="none" stroke="var(--line)" strokeWidth="2.5" />
        <circle
          cx={c} cy={c} r={radius} fill="none"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold tracking-tight" style={{ color, fontSize: size * 0.26 }}>{score}</span>
        <span className="font-mono text-[9px] tracking-widest text-[var(--muted-soft)]">/100</span>
      </div>
      <span className="text-[11px] font-medium mt-2" style={{ color }}>{label}</span>
    </div>
  );
}

const FEATURES = [
  { icon: Target, title: 'Know where you stand', desc: 'A clear score showing how closely your resume matches this role — before you hit submit.' },
  { icon: KeyRound, title: 'See exactly what\'s missing', desc: 'The specific terms this role is looking for that your resume doesn\'t say yet.' },
  { icon: PenLine, title: 'Fix it in one click', desc: 'A sharper version of your resume for this role. Your real experience, better framed — nothing invented.' },
  { icon: Mail, title: 'Write in your voice', desc: 'A cover letter that reads like you wrote it, because it\'s built from your actual background.' },
  { icon: MessagesSquare, title: 'Walk in prepared', desc: '100 likely interview questions for this exact role, each with a hint for structuring your answer.' },
  { icon: ShieldCheck, title: 'Nothing to lose', desc: 'Every tool here is free while we\'re building. No card, no catch.' },
];

const FAQS = [
  { q: 'Is this actually free?', a: 'Yes. While we\'re in beta, every tool here — scoring, rewriting, cover letters, interview prep — is free. No card on file.' },
  { q: 'What happens to my resume?', a: 'Your resume is used only to generate your results. If you sign in, your results save to your private history. If you don\'t, nothing is stored.' },
  { q: 'What can I upload?', a: 'PDF, DOCX, or plain text — or just paste your resume directly.' },
  { q: 'Will it make things up?', a: 'No. Rewrites and cover letters only reframe what\'s actually on your resume. Nothing is invented — no fake numbers, no fake companies.' },
  { q: 'Why not just use ChatGPT?', a: 'You can. This just skips the prompt-writing — paste your resume and the role once, and get a score, a rewrite, a letter, and 100 questions to prepare with, in one place.' },
];

const COMPARISON = [
  { name: 'Cvly', price: 'Free', scoring: true, rewrite: true, cover: true, interview: true, highlight: true },
  { name: 'Jobscan', price: '$49.95/mo', scoring: true, rewrite: false, cover: false, interview: false },
  { name: 'Teal', price: '$9/week', scoring: true, rewrite: true, cover: true, interview: false },
  { name: 'Rezi', price: '$29/mo', scoring: true, rewrite: true, cover: false, interview: false },
  { name: 'Enhancv', price: '$17.99/mo', scoring: true, rewrite: true, cover: true, interview: false },
];

function DownloadBar({ content, filename, copied, onCopy }: { content: string; filename: string; copied: boolean; onCopy: (text: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <button
        onClick={() => downloadText(filename, content)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)] transition"
      >
        <Download size={13} /> Download
      </button>
      <button
        onClick={() => onCopy(content)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)] transition"
      >
        <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

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
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openCategory, setOpenCategory] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Could not read that file');
    }
  }

  async function handleScore() {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError('Add both your resume and the role you\'re applying to.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    setRewritten('');
    setCoverLetter('');
    setCategories([]);
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

      fetch('/api/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, ...data }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTabAction(tab: 'rewrite' | 'cover' | 'interview') {
    setActiveTab(tab);
    if (tab === 'rewrite' && rewritten) return;
    if (tab === 'cover' && coverLetter) return;
    if (tab === 'interview' && categories.length) return;

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
      if (tab === 'interview') setCategories(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setTabLoading(false);
    }
  }

  function copyContent(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  function scoreReport(): string {
    if (!result) return '';
    return [
      'CVLY — RESULTS',
      '===============',
      '',
      `Score: ${result.score}/100`,
      '',
      result.summary,
      '',
      'WHAT YOU HAVE:',
      ...result.matchedKeywords.map((k) => `  ${k}`),
      '',
      'WHAT\'S MISSING:',
      ...result.missingKeywords.map((k) => `  ${k}`),
      '',
      'WHAT TO FIX:',
      ...result.improvements.map((imp, i) => `  ${i + 1}. ${imp}`),
      '',
      'cvly.in',
    ].join('\n');
  }

  function interviewReport(): string {
    return [
      'CVLY — 100 INTERVIEW QUESTIONS',
      '===============================',
      '',
      ...categories.flatMap((cat) => [
        cat.category.toUpperCase(),
        '',
        ...cat.questions.flatMap((q, i) => [`${i + 1}. ${q.question}`, `   ${q.starHint}`, '']),
        '',
      ]),
      'cvly.in',
    ].join('\n');
  }

  const totalQuestions = categories.reduce((sum, c) => sum + c.questions.length, 0);

  const tabs: { key: 'score' | 'rewrite' | 'cover' | 'interview'; label: string }[] = [
    { key: 'score', label: 'Your score' },
    { key: 'rewrite', label: 'Rewrite' },
    { key: 'cover', label: 'Cover letter' },
    { key: 'interview', label: 'Interview prep' },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="border-b border-[var(--line)] sticky top-0 bg-[var(--bg)]/85 backdrop-blur-md z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cvly" width={28} height={28} className="rounded-lg" />
            <span className="text-[19px] font-bold tracking-[-0.01em] leading-none pt-0.5">Cvly</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#compare" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Compare</a>
            <a href="#faq" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">FAQ</a>
            {user ? (
              <>
                <Link href="/history" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">History</Link>
                <button onClick={handleLogout} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Sign out</button>
              </>
            ) : (
              <Link href="/login" className="text-sm font-medium text-[var(--ink)] hover:text-[var(--muted)] transition">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        <div>
          <h1 className="fade-up text-[2.75rem] md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] mb-7">
            Walk into every interview<br />already prepared.
          </h1>
          <p className="fade-up fade-up-1 text-[var(--muted)] text-lg leading-relaxed mb-10 max-w-md">
            See exactly what&apos;s standing between you and a shortlist — then fix it, write your cover letter, and prepare for the interview. One paste. Ten seconds.
          </p>
          <a
            href="#tool"
            className="fade-up fade-up-2 btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm"
          >
            See where you stand <ArrowRight size={16} />
          </a>
          <div className="fade-up fade-up-2 flex items-center gap-5 mt-8 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[var(--good)]" /> No card</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[var(--good)]" /> No signup wall</span>
          </div>
        </div>

        <div className="fade-up fade-up-1 card rounded-2xl p-7">
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[var(--line)]">
            <ScoreRing score={82} size={96} />
            <div>
              <p className="font-semibold text-[15px]">Senior Product Manager</p>
              <p className="text-sm text-[var(--muted)] mt-1">14 of 17 things this role wants — found</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted)] mb-2">What you have</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing'].map((k) => (
                <span key={k} className="px-2.5 py-1 bg-[var(--good-bg)] text-[var(--good)] text-xs rounded-md font-medium">{k}</span>
              ))}
            </div>
            <p className="text-xs font-medium text-[var(--muted)] mb-2">What&apos;s missing</p>
            <div className="flex flex-wrap gap-1.5">
              {['Stakeholder mgmt', 'OKRs'].map((k) => (
                <span key={k} className="px-2.5 py-1 bg-[var(--bad-bg)] text-[var(--bad)] text-xs rounded-md font-medium">{k}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick facts strip */}
      <section className="border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: '4', d: 'tools from one paste' },
            { n: '<10s', d: 'to your first result' },
            { n: '100', d: 'interview questions per role' },
            { n: '₹0', d: 'while we\'re in beta' },
          ].map((s) => (
            <div key={s.d}>
              <p className="text-3xl font-semibold tracking-tight">{s.n}</p>
              <p className="text-xs text-[var(--muted)] mt-1.5">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">Everything between you and the offer.</h2>
        <p className="text-center text-[var(--muted)] mb-16">One paste covers all of it.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card rounded-2xl p-6">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center mb-4">
                <f.icon size={17} className="text-[var(--accent-ink)]" />
              </div>
              <h3 className="font-semibold mb-2 text-[15px]">{f.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="max-w-5xl mx-auto px-6 py-24 scroll-mt-16">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">Where Cvly fits</h2>
        <p className="text-center text-[var(--muted)] mb-14 text-sm">Publicly listed pricing, 2026.</p>
        <div className="card rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] p-5 pb-4">Tool</th>
                {[
                  { icon: Target, label: 'Scoring' },
                  { icon: PenLine, label: 'Rewrite' },
                  { icon: Mail, label: 'Cover letter' },
                  { icon: MessagesSquare, label: '100 Qs prep' },
                ].map((h) => (
                  <th key={h.label} className="p-5 pb-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <h.icon size={15} className="text-[var(--muted-soft)]" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{h.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((c) => (
                <tr
                  key={c.name}
                  className={`transition ${c.highlight ? '' : 'hover:bg-[var(--surface)]'}`}
                  style={c.highlight ? { background: 'var(--accent-soft)' } : undefined}
                >
                  <td
                    className="p-5 border-t border-[var(--line)] first:rounded-l-none"
                    style={c.highlight ? { borderLeft: '3px solid var(--accent)' } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`font-semibold ${c.highlight ? 'text-[15px]' : ''}`}>{c.name}</span>
                      {c.highlight && (
                        <span className="text-[10px] font-bold text-white bg-[var(--accent)] px-2 py-0.5 rounded-full">FREE</span>
                      )}
                    </div>
                    {!c.highlight && <span className="text-xs text-[var(--muted)]">{c.price}</span>}
                  </td>
                  {[c.scoring, c.rewrite, c.cover, c.interview].map((v, i) => (
                    <td key={i} className="p-5 border-t border-[var(--line)] text-center">
                      {v ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--good)]">
                          <Check size={13} className="text-white" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--line)]">
                          <span className="w-2 h-[1.5px] bg-[var(--muted-soft)]" />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tool */}
      <section id="tool" className="max-w-5xl mx-auto px-6 py-24 scroll-mt-16">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">See where you stand</h2>
        <p className="text-center text-[var(--muted)] text-sm mb-14">No signup. No card. Paste and see.</p>

        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="card rounded-2xl p-6">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-4">Your resume</label>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--line)] text-sm font-medium cursor-pointer hover:bg-[var(--surface)] transition mb-3">
              <Upload size={14} /> Upload PDF / DOCX
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {fileName && <span className="block text-xs text-[var(--muted)] mb-2">{fileName}</span>}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="...or paste your resume text here"
              className="w-full h-44 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] resize-none placeholder:text-[var(--muted-soft)] transition"
            />
          </div>

          <div className="card rounded-2xl p-6">
            <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-4">The role</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here"
              className="w-full h-[178px] mt-[46px] p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] resize-none placeholder:text-[var(--muted-soft)] transition"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[var(--bad-bg)] text-[var(--bad)] text-sm">{error}</div>
        )}

        <div className="flex justify-center mb-16">
          <button
            onClick={handleScore}
            disabled={loading}
            className="btn-accent inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-medium text-sm disabled:opacity-40"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <>See where you stand <ArrowRight size={16} /></>}
          </button>
        </div>

        {result && (
          <div className="card rounded-2xl overflow-hidden">
            <div className="flex border-b border-[var(--line)] overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => (tab.key === 'score' ? setActiveTab('score') : handleTabAction(tab.key as 'rewrite' | 'cover' | 'interview'))}
                  className={`flex-1 min-w-[120px] py-4 text-sm font-medium transition ${
                    activeTab === tab.key ? 'text-[var(--ink)] bg-[var(--surface)] border-b-2 border-[var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'score' && (
                <div>
                  <DownloadBar content={scoreReport()} filename="cvly-results.txt" copied={copied} onCopy={copyContent} />
                  <div className="flex items-start gap-8 mb-8 flex-wrap">
                    <ScoreRing score={result.score} />
                    <p className="flex-1 min-w-[220px] pt-3 leading-relaxed text-[var(--ink)]/90">{result.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--good)] mb-3">What you have</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedKeywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-[var(--good-bg)] text-[var(--good)] text-xs rounded-md font-medium">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--bad)] mb-3">What&apos;s missing</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-[var(--bad-bg)] text-[var(--bad)] text-xs rounded-md font-medium">{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--ink)] mb-4">What to fix</h3>
                  <ul className="space-y-3">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="text-sm text-[var(--ink)]/80 flex gap-3 leading-relaxed">
                        <span className="text-[var(--accent-ink)] font-mono text-xs shrink-0 pt-0.5">{String(i + 1).padStart(2, '0')}</span> {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'rewrite' && (
                <div>
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Rewriting your resume…</p>
                  ) : rewritten ? (
                    <>
                      <DownloadBar content={rewritten} filename="cvly-rewrite.txt" copied={copied} onCopy={copyContent} />
                      <pre className="whitespace-pre-wrap text-sm text-[var(--ink)]/85 font-sans leading-relaxed">{rewritten}</pre>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === 'cover' && (
                <div>
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Writing your cover letter…</p>
                  ) : coverLetter ? (
                    <>
                      <DownloadBar content={coverLetter} filename="cvly-cover-letter.txt" copied={copied} onCopy={copyContent} />
                      <pre className="whitespace-pre-wrap text-sm text-[var(--ink)]/85 font-sans leading-relaxed">{coverLetter}</pre>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === 'interview' && (
                <div>
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Building 100 questions — about 20 seconds…</p>
                  ) : categories.length ? (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                        <p className="text-xs text-[var(--muted)]">{totalQuestions} questions, 4 categories</p>
                        <DownloadBar content={interviewReport()} filename="cvly-interview-prep.txt" copied={copied} onCopy={copyContent} />
                      </div>
                      <div className="space-y-3">
                        {categories.map((cat, ci) => (
                          <div key={ci} className="rounded-xl border border-[var(--line)] overflow-hidden">
                            <button
                              onClick={() => setOpenCategory(openCategory === ci ? -1 : ci)}
                              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface)] transition"
                            >
                              <span className="font-semibold text-sm">{cat.category} <span className="text-xs text-[var(--muted)] ml-2 font-normal">{cat.questions.length} questions</span></span>
                              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${openCategory === ci ? 'rotate-180' : ''}`} />
                            </button>
                            {openCategory === ci && (
                              <div className="divide-y divide-[var(--line)]">
                                {cat.questions.map((q, qi) => (
                                  <div key={qi} className="px-5 py-4">
                                    <p className="text-sm font-medium mb-1.5 flex gap-2.5">
                                      <span className="font-mono text-[var(--accent-ink)] text-xs shrink-0 pt-0.5">{String(qi + 1).padStart(2, '0')}</span>
                                      {q.question}
                                    </p>
                                    <p className="text-xs text-[var(--muted)] pl-7 leading-relaxed">{q.starHint}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24 scroll-mt-16">
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-14">Questions</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              open={openFaq === i}
              onToggle={(e) => setOpenFaq((e.target as HTMLDetailsElement).open ? i : null)}
              className="card rounded-xl px-5 py-4"
            >
              <summary className="flex items-center justify-between cursor-pointer font-medium text-[15px]">
                {f.q}
                <span className="text-[var(--muted)] text-lg ml-4">{openFaq === i ? '−' : '+'}</span>
              </summary>
              <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={20} height={20} className="rounded-md" />
            <span className="font-bold text-[15px] leading-none pt-0.5">Cvly</span>
          </div>
          <p className="text-xs text-[var(--muted)]">Built in Faridabad, India · cvly.in</p>
        </div>
      </footer>
    </main>
  );
}
