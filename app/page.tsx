'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  Target, KeyRound, PenLine, Mail, MessagesSquare, ShieldCheck,
  Upload, Check, X as XIcon, Download, Copy,
  Radar, ScanLine, ChevronDown, Zap,
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

function ScoreRing({ score, size = 150 }: { score: number; size?: number }) {
  const radius = size * 0.386;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'var(--good)' : score >= 50 ? 'var(--warn)' : 'var(--bad)';
  const label = score >= 75 ? 'STRONG MATCH' : score >= 50 ? 'NEEDS WORK' : 'WEAK MATCH';
  const c = size / 2;

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={c} cy={c} r={radius} fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          cx={c} cy={c} r={radius} fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <circle cx={c} cy={c} r={radius - 12} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: size * 0.12 }}>
        <span className="font-display font-bold" style={{ color, fontSize: size * 0.27 }}>{score}</span>
        <span className="font-mono text-[10px] tracking-widest text-[var(--muted)]">/100</span>
      </div>
      <span className="font-mono text-[10px] tracking-[0.25em] mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

const FEATURES = [
  { icon: Target, title: 'ATS match score', desc: 'A 0-100 score showing exactly how well your resume matches the job, the way tracking software reads it.' },
  { icon: KeyRound, title: 'Keyword gap analysis', desc: 'Every keyword the scanner expects — split into what you have and what you\'re missing.' },
  { icon: PenLine, title: 'AI resume rewrite', desc: 'Tailored to this exact job, keeping every fact truthful. No invented experience, ever.' },
  { icon: Mail, title: 'One-click cover letter', desc: 'Written from your real resume and the actual post. Specific, human, never a template.' },
  { icon: MessagesSquare, title: '100 interview questions', desc: 'Behavioral, technical, situational, and curveballs — each with a STAR-method answer hint.' },
  { icon: ShieldCheck, title: 'Free while in beta', desc: 'No card, no signup wall, no scan limits. All of it, free, right now.' },
];

const FAQS = [
  { q: 'Is this really free?', a: 'Yes — during beta, every feature (scoring, rewrite, cover letter, 100 interview questions, downloads) is free. No card required.' },
  { q: 'Does cvly store my resume?', a: 'Your resume text is sent only to generate your results. If you sign in, scan results save to your private history — otherwise nothing is stored.' },
  { q: 'What file types can I upload?', a: 'PDF, DOCX, and plain text — or just paste your resume text directly.' },
  { q: 'Will the rewrite invent fake experience?', a: 'No. The AI only rephrases and reframes your real experience for keyword match. It will not fabricate companies, titles, dates, or metrics.' },
  { q: 'How is this different from ChatGPT?', a: 'Zero prompt-writing. Paste resume + JD once and get a structured score, gap analysis, rewrite, cover letter, and 100 prep questions — with downloads — in one flow.' },
];

const COMPARISON = [
  { name: 'cvly', price: 'Free', scoring: true, rewrite: true, cover: true, interview: true, highlight: true },
  { name: 'Jobscan', price: '$49.95/mo', scoring: true, rewrite: false, cover: false, interview: false },
  { name: 'Teal', price: '$9/week', scoring: true, rewrite: true, cover: true, interview: false },
  { name: 'Rezi', price: '$29/mo', scoring: true, rewrite: true, cover: false, interview: false },
  { name: 'Enhancv', price: '$17.99/mo', scoring: true, rewrite: true, cover: true, interview: false },
];

function DownloadBar({ content, filename, copied, onCopy }: { content: string; filename: string; copied: boolean; onCopy: (text: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <button
        onClick={() => downloadText(filename, content)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg glass text-xs font-medium text-[var(--ink)] hover:border-[var(--orange)] transition"
      >
        <Download size={13} /> Download .txt
      </button>
      <button
        onClick={() => onCopy(content)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg glass text-xs font-medium text-[var(--ink)] hover:border-[var(--orange)] transition"
      >
        <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
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
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
      'CVLY — ATS SCAN REPORT',
      '======================',
      '',
      `Score: ${result.score}/100`,
      '',
      `Summary: ${result.summary}`,
      '',
      'MATCHED KEYWORDS:',
      ...result.matchedKeywords.map((k) => `  ✓ ${k}`),
      '',
      'MISSING KEYWORDS:',
      ...result.missingKeywords.map((k) => `  ✗ ${k}`),
      '',
      'HOW TO IMPROVE:',
      ...result.improvements.map((imp, i) => `  ${i + 1}. ${imp}`),
      '',
      'Generated by cvly.in',
    ].join('\n');
  }

  function interviewReport(): string {
    return [
      'CVLY — INTERVIEW PREP (100 QUESTIONS)',
      '=====================================',
      '',
      ...categories.flatMap((cat) => [
        `## ${cat.category.toUpperCase()}`,
        '',
        ...cat.questions.flatMap((q, i) => [`${i + 1}. ${q.question}`, `   Hint: ${q.starHint}`, '']),
        '',
      ]),
      'Generated by cvly.in',
    ].join('\n');
  }

  const totalQuestions = categories.reduce((sum, c) => sum + c.questions.length, 0);

  const tabs: { key: 'score' | 'rewrite' | 'cover' | 'interview'; label: string }[] = [
    { key: 'score', label: 'Scan report' },
    { key: 'rewrite', label: 'Rewrite' },
    { key: 'cover', label: 'Cover letter' },
    { key: 'interview', label: 'Interview prep' },
  ];

  return (
    <main className="min-h-screen grid-bg relative overflow-hidden">
      {/* Ambient glows */}
      <div className="glow-spot w-[500px] h-[500px] bg-[var(--orange)]/10 -top-40 -right-40" />
      <div className="glow-spot w-[400px] h-[400px] bg-[#3D5AF1]/8 top-[60%] -left-48" />

      {/* Header */}
      <header className="border-b border-[var(--line)] sticky top-0 bg-[var(--bg)]/80 backdrop-blur-xl z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="cvly" width={34} height={34} className="rounded-lg" />
            <span className="font-display text-xl font-bold tracking-tight">cvly</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#compare" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Compare</a>
            <a href="#faq" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">FAQ</a>
            {user ? (
              <>
                <Link href="/history" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">History</Link>
                <button onClick={handleLogout} className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Sign out</button>
              </>
            ) : (
              <Link href="/login" className="px-4 py-2 rounded-full glass text-sm font-medium hover:border-[var(--orange)] transition">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-14 items-center relative">
        <div>
          <p className="fade-up font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--orange)] mb-5 flex items-center gap-2">
            <Radar size={14} className="animate-pulse" /> ATS scanner · Free beta
          </p>
          <h1 className="fade-up fade-up-1 font-display text-4xl md:text-6xl font-bold mb-6 leading-[1.05] tracking-tight">
            75% of resumes<br />never reach a human.<br />
            <span className="gradient-text">Beat the scanner.</span>
          </h1>
          <p className="fade-up fade-up-2 text-[var(--muted)] text-base md:text-lg mb-9 max-w-md leading-relaxed">
            Paste your resume and a job description. Get your match score, missing keywords, a tailored rewrite, cover letter, and 100 interview questions — in seconds.
          </p>
          <a
            href="#tool"
            className="fade-up fade-up-3 btn-glow inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--orange)] text-black font-bold text-sm hover:bg-[var(--orange-bright)] transition"
          >
            <ScanLine size={17} /> Scan my resume, free
          </a>
          <div className="fade-up fade-up-3 flex items-center gap-6 mt-7 text-xs text-[var(--muted)] font-mono">
            <span className="flex items-center gap-1.5"><Check size={13} className="text-[var(--good)]" /> No card</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-[var(--good)]" /> No signup wall</span>
            <span className="flex items-center gap-1.5"><Check size={13} className="text-[var(--good)]" /> No scan limits</span>
          </div>
        </div>

        {/* Scanner preview */}
        <div className="fade-up fade-up-2 relative">
          <div className="glass rounded-2xl p-7 relative overflow-hidden">
            <div className="scanline" />
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-[10px] tracking-[0.25em] text-[var(--muted)] uppercase">Live scan · resume_v3.pdf</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--good)]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--good)] animate-pulse" /> ACTIVE</span>
            </div>
            <div className="flex items-center gap-6 mb-6">
              <ScoreRing score={82} size={110} />
              <div>
                <p className="font-display font-semibold text-lg">Senior Product Manager</p>
                <p className="text-sm text-[var(--muted)] mt-1">14 of 17 required signals detected</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                {['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing', 'Agile'].map((k) => (
                  <span key={k} className="font-mono px-2.5 py-1 bg-[var(--good-bg)] text-[var(--good)] text-[10px] rounded border border-[var(--good)]/20">{k}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Stakeholder mgmt', 'OKRs', 'Figma'].map((k) => (
                  <span key={k} className="font-mono px-2.5 py-1 bg-[var(--bad-bg)] text-[var(--bad)] text-[10px] rounded border border-[var(--bad)]/20">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-[var(--line)] bg-[var(--surface)]/50">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: '75%', d: 'of resumes rejected by ATS before a human sees them' },
            { n: '<10s', d: 'from paste to full scan report' },
            { n: '100', d: 'interview questions generated per role' },
            { n: '₹0', d: 'cost during beta — every feature included' },
          ].map((s) => (
            <div key={s.d}>
              <p className="font-display text-3xl font-bold gradient-text">{s.n}</p>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed max-w-[180px] mx-auto">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-3">Everything the scanner checks.<br /><span className="gradient-text">Everything you need to pass it.</span></h2>
        <p className="text-center text-sm text-[var(--muted)] mb-12">Six tools. One paste. Zero cost.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-6 transition duration-300">
              <div className="w-10 h-10 rounded-xl bg-[var(--orange-soft)] border border-[var(--orange)]/20 flex items-center justify-center mb-4">
                <f.icon size={18} className="text-[var(--orange)]" />
              </div>
              <h3 className="font-display font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-16">
        <h2 className="font-display text-3xl font-bold text-center mb-3">How cvly compares</h2>
        <p className="text-center text-sm text-[var(--muted)] mb-12">Publicly listed pricing, 2026.</p>
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                {['Tool', 'Price', 'Scoring', 'Rewrite', 'Cover letter', '100 Qs prep'].map((h, i) => (
                  <th key={h} className={`font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] p-4 ${i < 2 ? 'text-left' : 'text-center'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((c) => (
                <tr key={c.name} className={`border-b border-[var(--line)] last:border-0 ${c.highlight ? 'bg-[var(--orange-soft)]' : ''}`}>
                  <td className="p-4 font-display font-semibold">{c.name}{c.highlight && <span className="ml-2 text-[9px] font-mono text-[var(--orange)] uppercase tracking-widest">← you</span>}</td>
                  <td className={`p-4 ${c.highlight ? 'text-[var(--orange)] font-bold' : 'text-[var(--muted)]'}`}>{c.price}</td>
                  {[c.scoring, c.rewrite, c.cover, c.interview].map((v, i) => (
                    <td key={i} className="p-4 text-center">{v ? <Check size={15} className="text-[var(--good)] mx-auto" /> : <XIcon size={15} className="text-[var(--muted)]/30 mx-auto" />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tool */}
      <section id="tool" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-16">
        <h2 className="font-display text-3xl font-bold text-center mb-3">Run your scan</h2>
        <p className="text-center text-[var(--muted)] text-sm mb-12 font-mono tracking-wide">NO SIGNUP · NO CARD · PASTE AND GO</p>

        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="glass rounded-2xl p-6">
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--orange)] block mb-4">01 / Your resume</label>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--orange-soft)] border border-[var(--orange)]/25 text-sm font-medium text-[var(--orange)] cursor-pointer hover:bg-[var(--orange)]/20 transition mb-3">
              <Upload size={14} /> Upload PDF / DOCX
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {fileName && <span className="block text-xs text-[var(--muted)] mb-2 font-mono">{fileName}</span>}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="...or paste your resume text here"
              className="w-full h-44 p-3.5 rounded-xl bg-[var(--bg)]/60 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--orange)] resize-none placeholder:text-[var(--muted)]/60 transition"
            />
          </div>

          <div className="glass rounded-2xl p-6">
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--orange)] block mb-4">02 / Job description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here"
              className="w-full h-[178px] mt-[46px] p-3.5 rounded-xl bg-[var(--bg)]/60 border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--orange)] resize-none placeholder:text-[var(--muted)]/60 transition"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-[var(--bad-bg)] border border-[var(--bad)]/25 text-[var(--bad)] text-sm font-mono">{error}</div>
        )}

        <div className="flex justify-center mb-14">
          <button
            onClick={handleScore}
            disabled={loading}
            className="btn-glow inline-flex items-center gap-2 px-9 py-4 rounded-full bg-[var(--orange)] text-black font-bold text-sm hover:bg-[var(--orange-bright)] transition disabled:opacity-40"
          >
            {loading ? <><Radar size={17} className="animate-spin" /> Scanning…</> : <><Zap size={17} /> Run scan</>}
          </button>
        </div>

        {result && (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex border-b border-[var(--line)] overflow-x-auto">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.key}
                  onClick={() => (tab.key === 'score' ? setActiveTab('score') : handleTabAction(tab.key as 'rewrite' | 'cover' | 'interview'))}
                  className={`flex-1 min-w-[120px] py-4 text-sm font-medium transition flex flex-col items-center gap-1 ${
                    activeTab === tab.key ? 'text-[var(--orange)] bg-[var(--orange-soft)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span className="font-mono text-[9px] tracking-[0.2em]">{String(idx + 1).padStart(2, '0')}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'score' && (
                <div>
                  <DownloadBar content={scoreReport()} filename="cvly-scan-report.txt" copied={copied} onCopy={copyContent} />
                  <div className="flex items-start gap-8 mb-8 flex-wrap">
                    <ScoreRing score={result.score} />
                    <p className="flex-1 min-w-[220px] pt-3 leading-relaxed text-[var(--ink)]/90">{result.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--good)] mb-3 flex items-center gap-1.5"><Check size={12}/> Detected</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedKeywords.map((kw, i) => (
                          <span key={i} className="font-mono px-2.5 py-1 bg-[var(--good-bg)] border border-[var(--good)]/20 text-[var(--good)] text-xs rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--bad)] mb-3 flex items-center gap-1.5"><XIcon size={12}/> Missing</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords.map((kw, i) => (
                          <span key={i} className="font-mono px-2.5 py-1 bg-[var(--bad-bg)] border border-[var(--bad)]/20 text-[var(--bad)] text-xs rounded-md">{kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink)] mb-4">Fix priority</h3>
                  <ul className="space-y-3">
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
                    <p className="text-[var(--muted)] text-sm font-mono flex items-center gap-2"><Radar size={14} className="animate-spin" /> Rewriting your resume…</p>
                  ) : rewritten ? (
                    <>
                      <DownloadBar content={rewritten} filename="cvly-optimized-resume.txt" copied={copied} onCopy={copyContent} />
                      <pre className="whitespace-pre-wrap text-sm text-[var(--ink)]/85 font-sans leading-relaxed">{rewritten}</pre>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === 'cover' && (
                <div>
                  {tabLoading ? (
                    <p className="text-[var(--muted)] text-sm font-mono flex items-center gap-2"><Radar size={14} className="animate-spin" /> Writing your cover letter…</p>
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
                    <p className="text-[var(--muted)] text-sm font-mono flex items-center gap-2"><Radar size={14} className="animate-spin" /> Generating 100 questions — this one takes ~20 seconds…</p>
                  ) : categories.length ? (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                        <p className="font-mono text-xs text-[var(--muted)]">{totalQuestions} questions · 4 categories</p>
                        <DownloadBar content={interviewReport()} filename="cvly-interview-prep-100.txt" copied={copied} onCopy={copyContent} />
                      </div>
                      <div className="space-y-3">
                        {categories.map((cat, ci) => (
                          <div key={ci} className="rounded-xl border border-[var(--line)] overflow-hidden">
                            <button
                              onClick={() => setOpenCategory(openCategory === ci ? -1 : ci)}
                              className="w-full flex items-center justify-between px-5 py-4 bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] transition"
                            >
                              <span className="font-display font-semibold text-sm">{cat.category} <span className="font-mono text-xs text-[var(--muted)] ml-2">{cat.questions.length} Qs</span></span>
                              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${openCategory === ci ? 'rotate-180' : ''}`} />
                            </button>
                            {openCategory === ci && (
                              <div className="divide-y divide-[var(--line)]">
                                {cat.questions.map((q, qi) => (
                                  <div key={qi} className="px-5 py-4">
                                    <p className="text-sm font-medium mb-1.5 flex gap-2.5">
                                      <span className="font-mono text-[var(--orange)] text-xs shrink-0 pt-0.5">{String(qi + 1).padStart(2, '0')}</span>
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
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-16">
        <h2 className="font-display text-3xl font-bold text-center mb-12">Frequently asked</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details
              key={i}
              open={openFaq === i}
              onToggle={(e) => setOpenFaq((e.target as HTMLDetailsElement).open ? i : null)}
              className="glass rounded-xl px-5 py-4"
            >
              <summary className="flex items-center justify-between cursor-pointer font-medium text-[15px]">
                {f.q}
                <span className="font-mono text-[var(--orange)] text-lg ml-4">{openFaq === i ? '−' : '+'}</span>
              </summary>
              <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] py-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="cvly" width={26} height={26} className="rounded-md" />
            <span className="font-display font-bold">cvly</span>
          </div>
          <p className="text-xs text-[var(--muted)] font-mono">BUILT IN FARIDABAD, INDIA · CVLY.IN</p>
        </div>
      </footer>
    </main>
  );
}
