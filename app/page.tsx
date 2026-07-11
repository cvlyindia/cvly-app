'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  Target, KeyRound, PenLine, Mail, MessagesSquare, ShieldCheck,
  Upload, Check, Download, Copy, ChevronDown, ArrowRight, Loader2, Heart, Sparkles,
} from 'lucide-react';
import { ScoreRing } from '@/components/ScoreRing';
import { downloadTxt, downloadPdf, downloadDocx, type ExportBlock } from '@/lib/export';

type ScoreResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
};

type InterviewQuestion = { question: string; starHint: string };
type InterviewCategory = { category: string; questions: InterviewQuestion[] };

function Reveal({ children, className = '', delayMs = 0 }: { children: React.ReactNode; className?: string; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700`}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        transitionDelay: `${delayMs}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
      }}
    >
      {children}
    </div>
  );
}

function useCountUp(target: number, active: boolean, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const four = useCountUp(4, visible, 350);
  const hundred = useCountUp(100, visible, 450);

  return (
    <section ref={ref} className="border-y border-[var(--line)] bg-[var(--surface)] relative overflow-hidden">
      <div className="float-slow absolute top-2 left-[8%] w-24 h-24 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-60 pointer-events-none" />
      <div className="float-slower absolute -bottom-6 right-[10%] w-28 h-28 rounded-full bg-[var(--good-bg)] blur-3xl opacity-50 pointer-events-none" />
      <div
        className="max-w-6xl mx-auto px-6 py-12 relative transition-all duration-700"
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(18px)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4">
          {[
            { n: four, suffix: '', d: 'tools from one paste' },
            { n: null, suffix: '<10s', d: 'to your first result' },
            { n: hundred, suffix: '', d: 'interview questions per role' },
            { n: null, suffix: '₹0', d: 'to start' },
          ].map((s, i) => (
            <div
              key={s.d}
              className={`text-center px-4 py-2 ${i > 0 ? 'md:border-l border-[var(--line)]' : ''} ${i % 2 === 1 ? 'border-l md:border-l-0 border-[var(--line)]' : ''}`}
            >
              <p className="text-4xl font-bold tracking-tight text-[var(--ink)] tabular-nums">{s.n !== null ? s.n : s.suffix}</p>
              <p className="text-[13px] text-[var(--muted)] mt-2 leading-snug">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const EXAMPLES = [
  { role: 'Senior Product Manager', score: 82, have: ['Product Strategy', 'Roadmapping', 'SQL', 'A/B Testing'], missing: ['Stakeholder mgmt', 'OKRs'] },
  { role: 'Software Engineer', score: 88, have: ['React', 'TypeScript', 'System Design', 'CI/CD'], missing: ['Kubernetes'] },
  { role: 'Data Analyst', score: 76, have: ['Python', 'Tableau', 'A/B Testing'], missing: ['dbt', 'Snowflake', 'Airflow'] },
  { role: 'Marketing Manager', score: 91, have: ['Campaign Strategy', 'SEO', 'Analytics', 'Brand'], missing: ['Marketo'] },
  { role: 'UX Designer', score: 79, have: ['Figma', 'User Research', 'Prototyping'], missing: ['Design Systems', 'Accessibility'] },
  { role: 'Sales Executive', score: 85, have: ['B2B Sales', 'CRM', 'Negotiation', 'Pipeline'], missing: ['Salesforce'] },
  { role: 'HR Manager', score: 73, have: ['Recruitment', 'Onboarding'], missing: ['HRIS', 'Compliance', 'L&D'] },
  { role: 'Financial Analyst', score: 89, have: ['Excel', 'Forecasting', 'Financial Modeling'], missing: ['SAP'] },
  { role: 'Content Strategist', score: 94, have: ['Content Planning', 'SEO', 'Editorial', 'Analytics'], missing: [] },
  { role: 'DevOps Engineer', score: 81, have: ['AWS', 'Docker', 'Terraform', 'CI/CD'], missing: ['Kubernetes', 'Prometheus'] },
];

const STEPS = [
  { n: '01', icon: Upload, title: 'Paste your resume', desc: 'Upload a PDF or DOCX, or just paste the text. Takes a few seconds.' },
  { n: '02', icon: Target, title: 'We compare it to the role', desc: 'Your resume against the actual job description, the way a real recruiter\'s software reads it.' },
  { n: '03', icon: KeyRound, title: 'See exactly what\'s missing', desc: 'A score, and the specific terms this role wants that your resume doesn\'t say yet.' },
  { n: '04', icon: PenLine, title: 'Fix it in one click', desc: 'A sharper resume and a cover letter, built from what you actually wrote — nothing invented.' },
  { n: '05', icon: MessagesSquare, title: 'Practice 100 interview questions', desc: 'Built for this exact role, each with a hint for structuring your answer.' },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'Your resume is used only to generate your results' },
  { icon: KeyRound, text: 'Nothing is stored unless you choose to sign in' },
  { icon: Target, text: 'Delete any saved check from your history, anytime' },
  { icon: Sparkles, text: 'Built on Google Gemini — no fake numbers, ever' },
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

function DownloadBar({ blocks, baseFilename, copyText, copied, onCopy }: { blocks: ExportBlock[]; baseFilename: string; copyText: string; copied: boolean; onCopy: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFormat(format: 'txt' | 'pdf' | 'docx') {
    setOpen(false);
    setBusy(true);
    try {
      if (format === 'txt') downloadTxt(`${baseFilename}.txt`, blocks);
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
  const [toolOpen, setToolOpen] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setExampleIndex((i) => (i + 1) % EXAMPLES.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (window.location.hash === '#tool') {
      const id = setTimeout(() => {
        setToolOpen(true);
        history.replaceState(null, '', window.location.pathname);
      }, 0);
      return () => clearTimeout(id);
    }
  }, []);

  useEffect(() => {
    if (!toolOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [toolOpen]);

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
      setToolOpen(true);

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

  function scoreBlocks(): ExportBlock[] {
    if (!result) return [];
    return [
      { type: 'title', text: 'Cvly — Results' },
      { type: 'body', text: `Score: ${result.score}/100` },
      { type: 'body', text: result.summary },
      { type: 'heading', text: 'What you have' },
      ...result.matchedKeywords.map((k): ExportBlock => ({ type: 'body', text: `• ${k}` })),
      { type: 'heading', text: 'What\'s missing' },
      ...result.missingKeywords.map((k): ExportBlock => ({ type: 'body', text: `• ${k}` })),
      { type: 'heading', text: 'What to fix' },
      ...result.improvements.map((imp, i): ExportBlock => ({ type: 'body', text: `${i + 1}. ${imp}` })),
      { type: 'space' },
      { type: 'body', text: 'cvly.in' },
    ];
  }

  function rewriteBlocks(): ExportBlock[] {
    return [
      { type: 'title', text: 'Cvly — Optimized Resume' },
      ...rewritten.split('\n').filter((l) => l.trim()).map((line): ExportBlock => ({ type: 'body', text: line })),
    ];
  }

  function coverBlocks(): ExportBlock[] {
    return [
      { type: 'title', text: 'Cvly — Cover Letter' },
      ...coverLetter.split('\n').filter((l) => l.trim()).map((line): ExportBlock => ({ type: 'body', text: line })),
    ];
  }

  function interviewBlocks(): ExportBlock[] {
    return [
      { type: 'title', text: 'Cvly — 100 Interview Questions' },
      ...categories.flatMap((cat): ExportBlock[] => [
        { type: 'heading', text: cat.category },
        ...cat.questions.flatMap((q, i): ExportBlock[] => [
          { type: 'body', text: `${i + 1}. ${q.question}` },
          { type: 'body', text: `   ${q.starHint}` },
        ]),
      ]),
      { type: 'space' },
      { type: 'body', text: 'cvly.in' },
    ];
  }

  function plainText(blocks: ExportBlock[]): string {
    return blocks.map((b) => (b.type === 'space' ? '' : b.text)).join('\n');
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
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={36} height={33} className="rounded-md" />
            <span className="text-[20px] font-bold tracking-[-0.02em]">Cvly</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#how" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">How it works</a>
            <a href="#compare" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Compare</a>
            <a href="#faq" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">FAQ</a>
            {user ? (
              <>
                <Link href="/dashboard" className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Dashboard</Link>
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
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        <div>
          <h1 className="fade-up text-[2.75rem] md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] mb-7">
            The interview isn&apos;t<br />the hard part.<br /><span className="text-[var(--accent-ink)]">Getting one is.</span>
          </h1>
          <p className="fade-up fade-up-1 text-[var(--muted)] text-lg leading-relaxed mb-3 max-w-md">
            Cvly shows you exactly what&apos;s standing between your resume and a callback — then helps you fix it. Free.
          </p>
          <p className="fade-up fade-up-1 text-[var(--muted-soft)] text-sm mb-9 max-w-md">
            Most people send the same resume to every job. Yours doesn&apos;t have to.
          </p>
          <button
            onClick={() => setToolOpen(true)}
            className="fade-up fade-up-2 btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm"
          >
            See my interview chances <ArrowRight size={16} />
          </button>
          <div className="fade-up fade-up-2 flex items-center gap-5 mt-8 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[var(--good)]" /> No card</span>
            <span className="flex items-center gap-1.5"><Check size={14} className="text-[var(--good)]" /> No signup wall</span>
          </div>

          {result && (
            <button
              onClick={() => setToolOpen(true)}
              className="fade-up fade-up-2 mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-ink)] hover:underline"
            >
              Your last result: {result.score}/100 — View <ArrowRight size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          {/* Ambient floating accents — subtle, restrained, not neon */}
          <div className="float-slow absolute -top-8 -right-6 w-24 h-24 rounded-full bg-[var(--accent-soft)] blur-2xl opacity-70 pointer-events-none" />
          <div className="float-slower absolute -bottom-10 -left-8 w-32 h-32 rounded-full bg-[var(--good-bg)] blur-3xl opacity-60 pointer-events-none" />

          <div className="fade-up fade-up-1 float-card card rounded-2xl p-7 relative">
            <div key={exampleIndex} className="card-swap">
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[var(--line)]">
                <ScoreRing score={EXAMPLES[exampleIndex].score} size={96} />
                <div>
                  <p className="font-semibold text-[15px]">{EXAMPLES[exampleIndex].role}</p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {EXAMPLES[exampleIndex].have.length} of {EXAMPLES[exampleIndex].have.length + EXAMPLES[exampleIndex].missing.length} things this role wants — found
                  </p>
                </div>
              </div>
              <div className="space-y-3 min-h-[132px]">
                <p className="text-xs font-medium text-[var(--muted)] mb-2.5">What you have</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {EXAMPLES[exampleIndex].have.map((k) => (
                    <span key={k} className="px-3 py-1.5 bg-[var(--good-bg)] border border-[var(--good)]/15 text-[var(--good)] text-xs rounded-full font-medium whitespace-nowrap">{k}</span>
                  ))}
                </div>
                {EXAMPLES[exampleIndex].missing.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-[var(--muted)] mb-2.5">What&apos;s missing</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLES[exampleIndex].missing.map((k) => (
                        <span key={k} className="px-3 py-1.5 bg-[var(--bad-bg)] border border-[var(--bad)]/15 text-[var(--bad)] text-xs rounded-full font-medium whitespace-nowrap">{k}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mt-6 pt-5 border-t border-[var(--line)]">
              {EXAMPLES.map((_, i) => (
                <span
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === exampleIndex ? '18px' : '5px',
                    background: i === exampleIndex ? 'var(--accent)' : 'var(--line-strong)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <StatsStrip />

      {/* Story */}
      <section id="how" className="max-w-3xl mx-auto px-6 py-20 relative scroll-mt-16">
        <div className="float-slower absolute top-10 right-[6%] w-40 h-40 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-30 pointer-events-none" />
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">From resume to ready, in five steps.</h2>
          <p className="text-center text-[var(--muted)] mb-16">No signup needed to see it work.</p>
        </Reveal>
        <div className="relative">
          <div className="absolute left-[27px] top-3 bottom-3 w-px bg-[var(--line)]" />
          <div className="space-y-9">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delayMs={i * 70}>
                <div className="flex gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--line)] flex items-center justify-center shrink-0 relative z-10">
                    <s.icon size={20} className="text-[var(--accent-ink)]" />
                  </div>
                  <div className="pt-1.5">
                    <p className="font-mono text-[11px] text-[var(--accent-ink)] tracking-wide mb-1">STEP {s.n}</p>
                    <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
                    <p className="text-sm text-[var(--muted)] leading-relaxed max-w-md">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="text-center mt-14">
          <button
            onClick={() => setToolOpen(true)}
            className="btn-accent inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm"
          >
            Try it now, no signup <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-[var(--line)]">
        <Reveal>
          <p className="text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-8">What actually happens to your data</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-4">
          {TRUST_POINTS.map((t, i) => (
            <Reveal key={t.text} delayMs={i * 60}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface)]">
                <t.icon size={16} className="text-[var(--accent-ink)] shrink-0" />
                <p className="text-sm text-[var(--ink)]/80">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-16">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">Where Cvly fits</h2>
          <p className="text-center text-[var(--muted)] mb-14 text-sm">Publicly listed pricing, 2026.</p>
        </Reveal>
        <Reveal delayMs={100}>
        <div className="relative">
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
          <div className="md:hidden absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-2xl" />
          <p className="md:hidden text-center text-[11px] text-[var(--muted-soft)] mt-3">← Swipe to see all columns →</p>
        </div>
        </Reveal>
      </section>

      {/* Tool */}
      {toolOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm"
            onClick={() => setToolOpen(false)}
          />
          <div className="relative card rounded-none sm:rounded-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto bg-white">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
              <span className="text-sm font-semibold">{result ? 'Your results' : 'Check your resume'}</span>
              <div className="flex items-center gap-3">
                {result && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setRewritten('');
                      setCoverLetter('');
                      setCategories([]);
                      setError('');
                    }}
                    className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition"
                  >
                    New scan
                  </button>
                )}
                <button
                  onClick={() => setToolOpen(false)}
                  className="w-8 h-8 rounded-full bg-[var(--surface)] hover:bg-[var(--line)] flex items-center justify-center transition"
                  aria-label="Close"
                >
                  <span className="text-lg leading-none text-[var(--muted)]">×</span>
                </button>
              </div>
            </div>

            {!result ? (
              <div className="p-6">
                <div className="grid gap-5 mb-6">
                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">Your resume</label>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--line)] text-sm font-medium cursor-pointer hover:bg-[var(--surface)] transition mb-3">
                      <Upload size={14} /> Upload PDF / DOCX
                      <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {fileName && <span className="block text-xs text-[var(--muted)] mb-2">{fileName}</span>}
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="...or paste your resume text here"
                      className="w-full h-36 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] resize-none placeholder:text-[var(--muted-soft)] transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">The role</label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the full job description here"
                      className="w-full h-36 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:border-[var(--ink)] resize-none placeholder:text-[var(--muted-soft)] transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-3.5 rounded-xl bg-[var(--bad-bg)] text-[var(--bad)] text-sm">{error}</div>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleScore}
                    disabled={loading}
                    className="btn-accent inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-medium text-sm disabled:opacity-40"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : <>Check my resume <ArrowRight size={16} /></>}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  <DownloadBar blocks={scoreBlocks()} baseFilename="cvly-results" copyText={plainText(scoreBlocks())} copied={copied} onCopy={copyContent} />
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
                      <DownloadBar blocks={rewriteBlocks()} baseFilename="cvly-rewrite" copyText={rewritten} copied={copied} onCopy={copyContent} />
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
                      <DownloadBar blocks={coverBlocks()} baseFilename="cvly-cover-letter" copyText={coverLetter} copied={copied} onCopy={copyContent} />
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
                        <DownloadBar blocks={interviewBlocks()} baseFilename="cvly-interview-prep" copyText={plainText(interviewBlocks())} copied={copied} onCopy={copyContent} />
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
              </>
            )}
          </div>
        </div>
      )}


      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-16">
        <Reveal><h2 className="text-3xl font-semibold tracking-tight text-center mb-14">Before you paste your resume</h2></Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={i} delayMs={i * 60}>
            <details
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
            </Reveal>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] pt-14 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-[1.4fr_1fr_1fr] gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.png" alt="Cvly" width={28} height={26} className="rounded-md" />
                <span className="font-bold text-[17px]">Cvly</span>
              </div>
              <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed">
                The interview isn&apos;t the hard part. Getting one is. Free while we&apos;re building.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">Product</p>
              <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
                <a href="#how" className="hover:text-[var(--ink)] transition">How it works</a>
                <a href="#compare" className="hover:text-[var(--ink)] transition">Compare</a>
                <a href="#faq" className="hover:text-[var(--ink)] transition">FAQ</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">Legal</p>
              <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
                <Link href="/privacy" className="hover:text-[var(--ink)] transition">Privacy</Link>
                <Link href="/terms" className="hover:text-[var(--ink)] transition">Terms</Link>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-[var(--line)] flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-[var(--muted)] flex items-center gap-1">Made with <Heart size={11} className="fill-[var(--accent)] text-[var(--accent)]" /> in India · cvly.in</p>
            <p className="text-xs text-[var(--muted-soft)]">© 2026 Cvly</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
