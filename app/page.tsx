'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  Target, KeyRound, PenLine, Mail, MessagesSquare, ShieldCheck,
  Upload, Check, ChevronDown, ArrowRight, Loader2, Heart, Sparkles, Lock, Trash2,
  Search, ChevronLeft, ChevronRight, Shuffle, FileScan, AlertTriangle, Copy, Menu, X,
} from 'lucide-react';
import { ScoreRing } from '@/components/ScoreRing';
import { SkeletonLines, DownloadBar } from '@/components/ScannerShared';
import type { ExportBlock } from '@/lib/export';
import { structuredResumeToPlainText } from '@/lib/resumeTemplate';
import { popReturnPath } from '@/lib/toolNav';
import { InstagramIcon, FacebookIcon, LinkedinIcon, XIcon } from '@/components/SocialIcons';
import { PAYWALL_ENABLED } from '@/lib/featureFlags';
import { OutOfCreditsModal } from '@/components/OutOfCreditsModal';
import { SaveResultPrompt } from '@/components/SaveResultPrompt';
import { AmbientBackground } from '@/components/AmbientBackground';
import { ListenButton } from '@/components/ListenButton';
import { ShareButton } from '@/components/ShareButton';

type ScoreResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
};

type StructuredResume = {
  name: string;
  contact: string;
  summary: string;
  experience: { company: string; title: string; dates: string; bullets: string[] }[];
  education: { institution: string; degree: string; dates: string }[];
  skills: string[];
};

type InterviewQuestion = { question: string; starHint: string; suggestedAnswer: string };
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

  const five = useCountUp(5, visible, 350);
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
            { n: five, suffix: '', d: 'steps, one paste' },
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
  { n: '01', icon: Upload, title: 'Upload', desc: 'Your resume, however it looks right now.' },
  { n: '02', icon: Target, title: 'Compare', desc: 'Against the role, the way Workday, Greenhouse, or Taleo actually reads it.' },
  { n: '03', icon: KeyRound, title: 'Understand', desc: 'Exactly what\'s missing, and why it matters here.' },
  { n: '04', icon: PenLine, title: 'Improve', desc: 'Nothing invented. Nothing exaggerated. Just your experience, presented better.' },
  { n: '05', icon: MessagesSquare, title: 'Practice', desc: '100 questions for this exact role, so nothing catches you off guard.' },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'Your resume is used only to generate your results — nothing else' },
  { icon: KeyRound, text: 'You decide what gets saved. Nothing stored unless you sign in.' },
  { icon: Trash2, text: 'Delete your data whenever you want. Really, anytime.' },
  { icon: Lock, text: 'Your resume belongs to you. We claim no rights to it.' },
  { icon: Sparkles, text: 'Built on Google Gemini, plainly — no hidden layer' },
  { icon: Check, text: 'We don\'t invent experience. We don\'t claim your achievements.' },
];

const FAQS = [
  { q: 'Is this actually free?', a: 'Yes. While we\'re in beta, every tool here — scoring, rewriting, cover letters, interview prep — is free. No card on file.' },
  { q: 'What happens to my resume?', a: 'Your resume is used only to generate your results. If you sign in, your results save to your private history. If you don\'t, nothing is stored.' },
  { q: 'What can I upload?', a: 'PDF, DOCX, or plain text. Upload keeps your resume exactly as it is — nothing to accidentally edit or retype.' },
  { q: 'Will it make things up?', a: 'No. Rewrites and cover letters only reframe what\'s actually on your resume. Nothing is invented — no fake numbers, no fake companies.' },
  { q: 'Why not just use ChatGPT?', a: 'You can. This just skips the prompt-writing — upload your resume, paste the role once, and get a score, a rewrite, a letter, and 100 questions to prepare with, in one place.' },
];

const COMPARISON = [
  { name: 'Cvly', price: 'Free', scoring: true, rewrite: true, cover: true, interview: true, highlight: true },
  { name: 'Jobscan', price: '$49.95/mo', scoring: true, rewrite: false, cover: false, interview: false },
  { name: 'Teal', price: '$9/week', scoring: true, rewrite: true, cover: true, interview: false },
  { name: 'Rezi', price: '$29/mo', scoring: true, rewrite: true, cover: false, interview: false },
  { name: 'Enhancv', price: '$17.99/mo', scoring: true, rewrite: true, cover: true, interview: false },
];

const SAMPLE_REPORT = {
  score: 78,
  role: 'Marketing Manager — D2C skincare brand',
  matched: ['Campaign Strategy', 'SEO', 'Content Calendar', 'Analytics'],
  missing: ['Marketo', 'Lifecycle Marketing'],
  improvements: [
    'Add specific campaign metrics — reach, CTR, or conversion lift — to your bullet points.',
    'Mention any marketing automation tools you\'ve used, even briefly.',
  ],
  rewrite: 'Led a full-funnel content strategy across Instagram and email that grew organic reach 3x over two quarters. Owned the campaign calendar for 4 concurrent product launches, coordinating with design and paid media...',
  cover: 'Skincare marketing lives or dies on trust — and that\'s exactly what I\'ve spent the last three years building for D2C brands. When I saw this role, the campaign calendar work you\'re describing is almost identical to what I ran at...',
  interview: 'Tell me about a campaign that didn\'t perform the way you expected. Hint: pick one, be specific about what you changed mid-flight, and end on the actual lesson — not just "it worked out."',
};

function SampleReport() {
  const [tab, setTab] = useState<'score' | 'rewrite' | 'cover' | 'interview'>('score');
  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'score', label: 'Score' },
    { key: 'rewrite', label: 'Rewrite' },
    { key: 'cover', label: 'Cover letter' },
    { key: 'interview', label: 'Interview prep' },
  ];

  return (
    <section className="max-w-4xl mx-auto px-6 py-16 border-t border-[var(--line)]">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">See a sample report</h2>
        <p className="text-center text-[var(--muted)] mb-10 text-sm">This is what you actually get — not a teaser. On a sample resume, not yours.</p>
      </Reveal>
      <Reveal delayMs={100}>
        <div className="card rounded-2xl overflow-hidden">
          <div className="flex border-b border-[var(--line)] overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 min-w-[110px] py-3.5 text-sm font-medium transition ${
                  tab === t.key ? 'text-[var(--ink)] bg-[var(--surface)] border-b-2 border-[var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-7">
            {tab === 'score' && (
              <div>
                <div className="flex items-start gap-6 mb-6 flex-wrap">
                  <ScoreRing score={SAMPLE_REPORT.score} size={88} />
                  <div className="pt-2">
                    <p className="text-sm font-medium text-[var(--ink)]">{SAMPLE_REPORT.role}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">{SAMPLE_REPORT.matched.length} of {SAMPLE_REPORT.matched.length + SAMPLE_REPORT.missing.length} things this role wants — found</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SAMPLE_REPORT.matched.map((k) => (
                    <span key={k} className="px-2.5 py-1 bg-[var(--good-bg)] text-[var(--good)] text-xs rounded-full font-medium">{k}</span>
                  ))}
                  {SAMPLE_REPORT.missing.map((k) => (
                    <span key={k} className="px-2.5 py-1 bg-[var(--bad-bg)] text-[var(--bad)] text-xs rounded-full font-medium">{k}</span>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted-soft)] mt-4">{SAMPLE_REPORT.improvements[0]}</p>
              </div>
            )}
            {tab === 'rewrite' && <p className="text-sm text-[var(--ink)]/80 leading-relaxed">{SAMPLE_REPORT.rewrite}</p>}
            {tab === 'cover' && <p className="text-sm text-[var(--ink)]/80 leading-relaxed">{SAMPLE_REPORT.cover}</p>}
            {tab === 'interview' && <p className="text-sm text-[var(--ink)]/80 leading-relaxed italic">&quot;{SAMPLE_REPORT.interview}&quot;</p>}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [importingJob, setImportingJob] = useState(false);
  const [importError, setImportError] = useState('');
  const [fileName, setFileName] = useState('');
  const [formatCheck, setFormatCheck] = useState<{ score: number; checked: boolean; issues: { severity: string; title: string; detail: string }[]; passed: string[] } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outOfCredits, setOutOfCredits] = useState<{ plan: string; resetAt: string } | null>(null);

  const [result, setResult] = useState<ScoreResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const scanIdRef = useRef<string | null>(null);

  useEffect(() => {
    scanIdRef.current = scanId;
  }, [scanId]);
  const [activeTab, setActiveTab] = useState<'score' | 'rewrite' | 'cover' | 'interview'>('score');
  const [rewritten, setRewritten] = useState<StructuredResume | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openCategory, setOpenCategory] = useState<number>(0);
  const [interviewMode, setInterviewMode] = useState<'browse' | 'practice'>('browse');
  const [interviewSearch, setInterviewSearch] = useState('');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [revealHint, setRevealHint] = useState(false);
  const [practicedIds, setPracticedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<{ remaining: number; plan: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const closeTool = useCallback(() => {
    const returnTo = popReturnPath();
    if (returnTo) {
      router.push(returnTo);
    } else {
      setToolOpen(false);
    }
  }, [router]);
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setExampleIndex((i) => (i + 1) % EXAMPLES.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      const bareVisit = window.location.hash === '' && window.location.search === '';
      if (sessionUser && bareVisit) {
        router.replace('/dashboard');
        return;
      }
      setUser(sessionUser);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) {
      const id = setTimeout(() => setCredits(null), 0);
      return () => clearTimeout(id);
    }
    fetch('/api/credits')
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) setCredits({ remaining: data.remaining, plan: data.plan });
      })
      .catch(() => {});
  }, [user]);

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
    const jd = new URLSearchParams(window.location.search).get('jd');
    if (!jd) return;
    const id = setTimeout(() => {
      setJobDescription(jd);
      setToolOpen(true);
      window.history.replaceState(null, '', window.location.pathname);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const resumeId = new URLSearchParams(window.location.search).get('resume');
    if (!resumeId) return;

    fetch(`/api/scans/${resumeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error === 'Not logged in') {
          window.location.href = `/login?next=${encodeURIComponent(`/?resume=${resumeId}`)}`;
          return;
        }
        if (data.error || !data.scan) {
          setError('Couldn\'t find that check — it may have been deleted.');
          setToolOpen(true);
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        const scan = data.scan;
        setResumeText(scan.resume_text ?? '');
        setJobDescription(scan.job_description ?? '');
        setResult({
          score: scan.score,
          summary: scan.summary,
          matchedKeywords: scan.matched_keywords ?? [],
          missingKeywords: scan.missing_keywords ?? [],
          improvements: scan.improvements ?? [],
        });
        setScanId(scan.id);
        if (scan.rewritten_resume) setRewritten(scan.rewritten_resume);
        if (scan.cover_letter) setCoverLetter(scan.cover_letter);
        if (scan.interview_questions) {
          setCategories(scan.interview_questions);
          setPracticedIds(new Set(scan.practiced_questions ?? []));
          setActiveTab('interview');
          setInterviewMode('practice');
        } else if (scan.rewritten_resume) {
          setActiveTab('rewrite');
        } else if (scan.cover_letter) {
          setActiveTab('cover');
        } else {
          setActiveTab('score');
        }
        setToolOpen(true);
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!toolOpen) return;

    // Remember what was focused so we can restore it when the modal closes
    lastFocusedRef.current = document.activeElement as HTMLElement;

    const getFocusable = () => {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    // Focus the first focusable element once the modal renders
    const raf = requestAnimationFrame(() => {
      const focusable = getFocusable();
      focusable[0]?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTool();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lastFocusedRef.current?.focus();
    };
  }, [toolOpen, closeTool]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  async function processResumeFile(file: File) {
    setFileName(file.name);
    setError('');
    setFormatCheck(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/extract-text', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResumeText(data.text);
      if (data.formatCheck) setFormatCheck(data.formatCheck);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processResumeFile(file);
  }

  function handleResumeDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processResumeFile(file);
  }

  async function handleImportJob() {
    if (!jobUrl.trim()) return;
    setImportingJob(true);
    setImportError('');
    try {
      const res = await fetch('/api/import-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setJobDescription(data.description);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import from that link');
    } finally {
      setImportingJob(false);
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
    setRewritten(null);
    setCoverLetter('');
    setCategories([]);
    setScanId(null);
    setPracticedIds(new Set());
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const data = await res.json();
      if (data.error === 'out_of_credits') {
        setOutOfCredits({ plan: data.plan, resetAt: data.resetAt });
        setToolOpen(true);
        return;
      }
      if (data.error) throw new Error(data.error);
      if (data.invalid) {
        setError(data.reason || "That doesn't look like a resume and job description — mind trying again with the real thing?");
        setToolOpen(true);
        setCredits((c) => (c ? { ...c, remaining: Math.max(0, c.remaining - 1) } : c));
        return;
      }
      setResult(data);
      setActiveTab('score');
      setToolOpen(true);
      setCredits((c) => (c ? { ...c, remaining: Math.max(0, c.remaining - 1) } : c));

      fetch('/api/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, ...data }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.id) setScanId(d.id); })
        .catch(() => {});
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
      if (data.error === 'out_of_credits') {
        setOutOfCredits({ plan: data.plan, resetAt: data.resetAt });
        return;
      }
      if (data.error) throw new Error(data.error);
      if (tab === 'rewrite') setRewritten(data.rewritten);
      if (tab === 'cover') setCoverLetter(data.letter);
      if (tab === 'interview') setCategories(data.questions);
      const cost = tab === 'interview' ? 3 : 1;
      setCredits((c) => (c ? { ...c, remaining: Math.max(0, c.remaining - cost) } : c));

      if (scanIdRef.current) {
        const patchField = tab === 'rewrite' ? { rewrittenResume: data.rewritten } : tab === 'cover' ? { coverLetter: data.letter } : { interviewQuestions: data.questions };
        fetch(`/api/scans/${scanIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchField),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setTabLoading(false);
    }
  }

  function scoreHeadline(score: number): string {
    if (score >= 85) return "This is a strong match. You're ready to apply.";
    if (score >= 75) return 'Strong fit — a few tweaks and this is ready.';
    if (score >= 50) return "You're getting there. Here's exactly what's missing.";
    return "Real gaps here, but every one is fixable. Let's go through them.";
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
      ...(formatCheck && formatCheck.checked
        ? [
            { type: 'heading' as const, text: `Parse safety: ${formatCheck.score}/100` },
            ...formatCheck.issues.map((iss): ExportBlock => ({ type: 'body', text: `• ${iss.title} — ${iss.detail}` })),
          ]
        : []),
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
          { type: 'body', text: `   Lead with: ${q.starHint}` },
          ...(q.suggestedAnswer ? [{ type: 'body' as const, text: `   Suggested answer: ${q.suggestedAnswer}` }] : []),
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
    <main className="min-h-screen">
      <AmbientBackground />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Cvly',
            url: 'https://cvly.in',
            description: "See exactly what's standing between your resume and a callback — then fix it. ATS score, rewrite, cover letter, and 100 interview questions.",
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
            publisher: { '@type': 'Organization', name: 'Cvly', url: 'https://cvly.in', logo: 'https://cvly.in/logo.png' },
          }),
        }}
      />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* Header */}
      <header className="border-b border-[var(--line)] sticky top-0 bg-[var(--bg)]/85 backdrop-blur-md z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Cvly" width={36} height={33} className="rounded-md" />
            <span className="text-[20px] font-bold tracking-[-0.02em]">Cvly</span>
          </div>
          <div className="flex items-center gap-7">
            <a href="#how" className="hidden md:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">How it works</a>
            <a href="#compare" className="hidden md:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Compare</a>
            <a href="#faq" className="hidden md:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">FAQ</a>
            <Link href="/pricing" className="hidden md:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Pricing</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="hidden md:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Dashboard</Link>
                <Link href="/history" className="hidden md:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">History</Link>
                <button onClick={handleLogout} className="hidden sm:block text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">Sign out</button>
                {credits && (
                  <Link href="/pricing" className="hidden sm:flex items-center gap-1 text-xs font-mono text-[var(--muted)] hover:text-[var(--ink)] transition">
                    {credits.remaining} credits
                  </Link>
                )}
                <button onClick={() => setToolOpen(true)} className="btn-accent px-4 py-2 rounded-full text-sm font-semibold">
                  New check
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm font-medium text-[var(--ink)] hover:text-[var(--muted)] transition">
                  Sign in
                </Link>
                <button onClick={() => setToolOpen(true)} className="btn-accent px-4 py-2 rounded-full text-sm font-semibold">
                  See what&apos;s missing
                </button>
              </>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--surface)] transition -mr-1"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[var(--ink)]/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col p-6">
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="self-end w-9 h-9 rounded-full hover:bg-[var(--surface)] flex items-center justify-center mb-4"
            >
              <X size={18} />
            </button>
            <nav className="flex flex-col gap-1">
              <a href="#how" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition">How it works</a>
              <a href="#compare" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition">Compare</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition">FAQ</a>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition">Pricing</Link>
              <div className="h-px bg-[var(--line)] my-3" />
              {user ? (
                <>
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition">Dashboard</Link>
                  <Link href="/history" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-[var(--surface)] transition">History</Link>
                  {credits && (
                    <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-mono text-[var(--muted)]">{credits.remaining} credits</Link>
                  )}
                  <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="px-3 py-3 rounded-lg text-sm font-medium text-left text-[var(--bad)] hover:bg-[var(--bad-bg)] transition">Sign out</button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-soft)]/30 transition">Sign in</Link>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Hero */}
      <section id="main-content" className="max-w-6xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        <div>
          <h1 className="fade-up text-[2.75rem] md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] mb-7">
            The interview isn&apos;t<br />the hard part.<br /><span className="text-[var(--accent-ink)]">Getting one is.</span>
          </h1>
          <p className="fade-up fade-up-1 text-[var(--muted)] text-lg leading-relaxed mb-3 max-w-md">
            You&apos;ve applied. You&apos;ve waited. Nothing. It&apos;s rarely your experience. It&apos;s that your resume never made it past the first read.
          </p>
          <p className="fade-up fade-up-1 text-[var(--muted-soft)] text-sm mb-9 max-w-md">
            We&apos;ll show you exactly what&apos;s missing. Free, no card.
          </p>
          <button
            onClick={() => setToolOpen(true)}
            className="fade-up fade-up-2 btn-accent inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm"
          >
            Let&apos;s see what&apos;s missing <ArrowRight size={16} />
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
                  {EXAMPLES[exampleIndex].have.map((k, ki) => (
                    <span
                      key={k}
                      className="card-swap px-3 py-1.5 bg-[var(--good-bg)] border border-[var(--good)]/15 text-[var(--good)] text-xs rounded-full font-medium whitespace-nowrap"
                      style={{ animationDelay: `${150 + ki * 90}ms` }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
                {EXAMPLES[exampleIndex].missing.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-[var(--muted)] mb-2.5">What&apos;s missing</p>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLES[exampleIndex].missing.map((k, ki) => (
                        <span
                          key={k}
                          className="card-swap px-3 py-1.5 bg-[var(--bad-bg)] border border-[var(--bad)]/15 text-[var(--bad)] text-xs rounded-full font-medium whitespace-nowrap"
                          style={{ animationDelay: `${150 + (EXAMPLES[exampleIndex].have.length + ki) * 90}ms` }}
                        >
                          {k}
                        </span>
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
      <section id="how" className="max-w-6xl mx-auto px-6 py-20 relative scroll-mt-16">
        <div className="float-slower absolute top-10 right-[6%] w-40 h-40 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-30 pointer-events-none" />
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">From resume to ready, in five steps.</h2>
          <p className="text-center text-[var(--muted)] mb-16">No signup needed to see it work.</p>
        </Reveal>

        {/* Desktop: horizontal timeline */}
        <div className="hidden lg:block relative mb-2">
          <div className="absolute left-[10%] right-[10%] top-7 h-px bg-[var(--line)]" />
          <div className="grid grid-cols-5 gap-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delayMs={i * 80}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--line)] flex items-center justify-center shrink-0 relative z-10 mb-4">
                    <s.icon size={20} className="text-[var(--accent-ink)]" />
                  </div>
                  <p className="font-mono text-[11px] text-[var(--accent-ink)] tracking-wide mb-1.5">STEP {s.n}</p>
                  <h3 className="font-semibold text-[15px] mb-1.5">{s.title}</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed max-w-[160px]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="lg:hidden max-w-md mx-auto relative">
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
            Try it yourself, free <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-[var(--line)]">
        <Reveal>
          <p className="text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-8">What actually happens to your data</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TRUST_POINTS.map((t, i) => (
            <Reveal key={t.text} delayMs={i * 60}>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface)] h-full">
                <t.icon size={16} className="text-[var(--accent-ink)] shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--ink)]/80">{t.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why not ChatGPT */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-[var(--line)]">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">Why not just use ChatGPT?</h2>
          <p className="text-center text-[var(--muted)] mb-14 text-sm max-w-md mx-auto">You can. ChatGPT is a conversation. Cvly is a complete workflow.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-5">
          <Reveal>
            <div className="rounded-2xl p-6 border border-[var(--line)] h-full">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">A general assistant</p>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Great at almost anything, if you know what to ask. You&apos;re writing the prompts, holding the context, and starting from a blank page each time.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="rounded-2xl p-6 bg-[var(--ink)] text-white h-full">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-3">Cvly, built for this</p>
              <div className="space-y-2.5">
                {['Resume vs. role scoring', 'ATS-style keyword comparison', 'Tailored rewrite', 'Cover letter in your voice', '100-question interview prep', 'Your history, saved and searchable'].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check size={14} className="text-[var(--accent)] shrink-0" />
                    <p className="text-sm text-white/90">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sample report */}
      <SampleReport />

      {/* The two things we don't fake */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-[var(--line)]">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">Two things we refuse to fake.</h2>
          <p className="text-center text-[var(--muted)] mb-14 text-sm max-w-lg mx-auto">Every AI resume tool claims to be accurate. Most of that is just an AI&apos;s opinion, stated confidently. Here&apos;s specifically where we don&apos;t do that.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 gap-5">
          <Reveal>
            <div className="rounded-2xl p-7 border border-[var(--line)] h-full">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mb-4">
                <Check size={18} className="text-[var(--accent-ink)]" />
              </div>
              <h3 className="text-base font-semibold mb-2">We never invent your achievements.</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">Every rewrite, cover letter, and interview answer runs against one hard rule, enforced in the instructions behind every single generation: never invent a company, a title, a number, or a metric that isn&apos;t already in your resume. If your resume is thin on a section, the output stays honest and thin there too — it doesn&apos;t get padded with numbers that sound plausible but aren&apos;t yours.</p>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="rounded-2xl p-7 border border-[var(--line)] h-full">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mb-4">
                <FileScan size={18} className="text-[var(--accent-ink)]" />
              </div>
              <h3 className="text-base font-semibold mb-2">We actually open your file.</h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">Most tools just ask an AI &quot;does this look ATS-friendly?&quot; and repeat whatever it guesses. Cvly&apos;s Parse Safety check opens the real file structure — tables, columns, text boxes, headers and footers — the same things that actually break parsing in systems like Workday, Greenhouse, and Taleo. That&apos;s a structural check, not an opinion.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="max-w-5xl mx-auto px-6 py-20 scroll-mt-16">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-center mb-3">Why Cvly exists</h2>
          <p className="text-center text-[var(--ink)]/70 max-w-lg mx-auto mb-3 leading-relaxed">
            Most tools give you a piece of the process. A scanner. A builder. A tracker. Job hunting isn&apos;t a piece — it&apos;s one continuous workflow. So that&apos;s what we built.
          </p>
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
        <>
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm"
            onClick={closeTool}
          />
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={result ? 'Your results' : 'Check your resume'}
            className="relative card rounded-none sm:rounded-2xl w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[85vh] overflow-y-auto bg-white"
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
              <span className="text-sm font-semibold">{result ? 'Your results' : 'Check your resume'}</span>
              <div className="flex items-center gap-3">
                {result && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setRewritten(null);
                      setCoverLetter('');
                      setCategories([]);
                      setScanId(null);
                      setPracticedIds(new Set());
                      setError('');
                    }}
                    className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition"
                  >
                    New scan
                  </button>
                )}
                <button
                  onClick={closeTool}
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
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleResumeDrop}
                    className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragActive ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)]'}`}
                  >
                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">Your resume</label>
                    {resumeText ? (
                      <div>
                        <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--good)]">
                          <Check size={16} /> {fileName || 'Resume uploaded'}
                        </p>
                        <button
                          onClick={() => { setResumeText(''); setFileName(''); setFormatCheck(null); }}
                          className="block mx-auto mt-2 text-xs text-[var(--muted)] hover:text-[var(--ink)] underline underline-offset-2 transition"
                        >
                          Change file
                        </button>
                      </div>
                    ) : (
                      <>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--line)] text-sm font-medium cursor-pointer hover:bg-[var(--surface)] transition bg-white">
                          <Upload size={14} /> Upload PDF / DOCX
                          <input type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png" onChange={handleFileUpload} className="hidden" />
                        </label>
                        <p className="text-xs text-[var(--muted-soft)] mt-3">{dragActive ? 'Drop your resume here' : 'or drag a file in'}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide block mb-3">The role</label>
                    <div className="flex gap-2 mb-2.5">
                      <input
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImportJob(); } }}
                        placeholder="Paste a job posting link (optional)"
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
                      />
                      <button
                        onClick={handleImportJob}
                        disabled={importingJob || !jobUrl.trim()}
                        className="shrink-0 px-3.5 py-2 rounded-lg border border-[var(--line)] text-xs font-medium hover:bg-[var(--surface)] transition disabled:opacity-40"
                      >
                        {importingJob ? 'Importing…' : 'Import'}
                      </button>
                    </div>
                    {importError && <p className="text-xs text-[var(--bad)] mb-2.5">{importError}</p>}
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="...or paste the full job description here"
                      className="w-full h-36 p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none placeholder:text-[var(--muted-soft)] transition"
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
                {credits && (
                  <p className="text-center text-xs text-[var(--muted-soft)] mt-4">
                    {credits.remaining} credits left · <a href="/pricing" className="text-[var(--accent-ink)] hover:underline">Buy more</a>
                  </p>
                )}
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
              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-[var(--bad-bg)] text-[var(--bad)] text-sm">{error}</div>
              )}
              {activeTab === 'score' && (
                <div>
                  <div key={`hero-${result.score}`} className="flex flex-col items-center text-center mb-8 pb-8 border-b border-[var(--line)]">
                    <div className="fade-up"><ScoreRing score={result.score} size={148} /></div>
                    <h2 className="fade-up fade-up-1 text-xl font-semibold tracking-tight mt-5 max-w-sm">{scoreHeadline(result.score)}</h2>
                    <p className="fade-up fade-up-2 text-sm text-[var(--ink)]/70 leading-relaxed mt-2 max-w-md">{result.summary}</p>
                  </div>

                  {!user && (
                    <SaveResultPrompt resumeText={resumeText} jobDescription={jobDescription} result={result} />
                  )}

                  <div className="flex items-center gap-2 flex-wrap mb-6">
                    <div className="flex-1 min-w-0"><DownloadBar blocks={scoreBlocks()} baseFilename="cvly-results" copyText={plainText(scoreBlocks())} copied={copied} onCopy={copyContent} /></div>
                    <ListenButton text={`Your score is ${result.score} out of 100. ${result.summary} What to fix: ${result.improvements.join('. ')}`} />
                    <ShareButton score={result.score} />
                  </div>

                  {formatCheck && formatCheck.checked && (
                    <div className={`rounded-xl border p-5 mb-8 ${formatCheck.issues.length > 0 ? 'border-[var(--warn)]/25 bg-[var(--warn-bg)]' : 'border-[var(--good)]/20 bg-[var(--good-bg)]'}`}>
                      <div className="flex items-center gap-2.5 mb-1">
                        <FileScan size={16} className={formatCheck.issues.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--good)]'} />
                        <p className="text-sm font-semibold">Parse safety: {formatCheck.score}/100</p>
                      </div>
                      <p className="text-xs text-[var(--muted)] mb-3">
                        Whether the file itself can be read by systems like Workday, Greenhouse, or Taleo — separate from how well the content matches this role.
                      </p>
                      {formatCheck.issues.length === 0 ? (
                        <p className="text-sm text-[var(--good)]">Clean, single-column format. Nothing here should trip up Workday, Greenhouse, or Taleo.</p>
                      ) : (
                        <div className="space-y-3">
                          {formatCheck.issues.map((issue, i) => (
                            <div key={i} className="flex gap-2.5">
                              <AlertTriangle size={14} className={`shrink-0 mt-0.5 ${issue.severity === 'high' ? 'text-[var(--bad)]' : 'text-[var(--warn)]'}`} />
                              <div>
                                <p className="text-sm font-medium">{issue.title}</p>
                                <p className="text-xs text-[var(--muted)] leading-relaxed mt-0.5">{issue.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

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
                    <SkeletonLines label="Rewriting your resume…" />
                  ) : rewritten ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap mb-6">
                        <div className="flex-1 min-w-0"><DownloadBar blocks={[]} baseFilename="cvly-rewrite" copyText={structuredResumeToPlainText(rewritten)} copied={copied} onCopy={copyContent} resumeData={rewritten} locked={PAYWALL_ENABLED && credits?.plan === 'free'} /></div>
                        <ListenButton text={structuredResumeToPlainText(rewritten)} />
                      </div>
                      <div className="border border-[var(--line)] rounded-xl p-7 bg-white">
                        <div className="text-center mb-6 pb-5 border-b border-[var(--line)]">
                          <h2 className="text-xl font-bold tracking-tight">{rewritten.name}</h2>
                          {rewritten.contact && <p className="text-xs text-[var(--muted)] mt-1.5">{rewritten.contact}</p>}
                        </div>
                        {rewritten.summary && <p className="text-sm text-[var(--ink)]/85 leading-relaxed mb-6">{rewritten.summary}</p>}
                        {rewritten.experience.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--accent-ink)] border-b border-[var(--accent)]/20 pb-1.5 mb-3">Experience</h3>
                            {rewritten.experience.map((e, i) => (
                              <div key={i} className="mb-4 last:mb-0">
                                <p className="text-sm font-semibold">{e.title} — {e.company}</p>
                                <p className="text-xs text-[var(--muted)] italic mb-2">{e.dates}</p>
                                <ul className="space-y-1">
                                  {e.bullets.map((b, bi) => (
                                    <li key={bi} className="text-sm text-[var(--ink)]/80 flex gap-2"><span className="text-[var(--accent-ink)]">•</span> {b}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                        {rewritten.education.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--accent-ink)] border-b border-[var(--accent)]/20 pb-1.5 mb-3">Education</h3>
                            {rewritten.education.map((ed, i) => (
                              <div key={i} className="mb-3 last:mb-0">
                                <p className="text-sm font-semibold">{ed.degree} — {ed.institution}</p>
                                <p className="text-xs text-[var(--muted)] italic">{ed.dates}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {rewritten.skills.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--accent-ink)] border-b border-[var(--accent)]/20 pb-1.5 mb-3">Skills</h3>
                            <p className="text-sm text-[var(--ink)]/80">{rewritten.skills.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === 'cover' && (
                <div>
                  {tabLoading ? (
                    <SkeletonLines label="Writing your cover letter…" />
                  ) : coverLetter ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap mb-6">
                        <div className="flex-1 min-w-0"><DownloadBar blocks={coverBlocks()} baseFilename="cvly-cover-letter" copyText={coverLetter} copied={copied} onCopy={copyContent} locked={PAYWALL_ENABLED && credits?.plan === 'free'} /></div>
                        <ListenButton text={coverLetter} />
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-[var(--ink)]/85 font-sans leading-relaxed">{coverLetter}</pre>
                    </>
                  ) : null}
                </div>
              )}

              {activeTab === 'interview' && (
                <div>
                  {tabLoading ? (
                    <SkeletonLines label="Building 100 questions — about 20 seconds…" sublabel="This one takes longer since it's generating a full set." />
                  ) : categories.length ? (
                    <>
                      {(() => {
                        const flat = categories.flatMap((cat) => cat.questions.map((q) => ({ ...q, category: cat.category })));
                        const filtered = interviewSearch.trim()
                          ? categories
                              .map((cat) => ({ ...cat, questions: cat.questions.filter((q) => q.question.toLowerCase().includes(interviewSearch.toLowerCase()) || cat.category.toLowerCase().includes(interviewSearch.toLowerCase())) }))
                              .filter((cat) => cat.questions.length > 0)
                          : categories;
                        const current = flat[practiceIndex];

                        return (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface)]">
                                <button
                                  onClick={() => setInterviewMode('browse')}
                                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${interviewMode === 'browse' ? 'bg-white shadow-sm text-[var(--ink)]' : 'text-[var(--muted)]'}`}
                                >
                                  Browse
                                </button>
                                <button
                                  onClick={() => { setInterviewMode('practice'); setRevealHint(false); }}
                                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${interviewMode === 'practice' ? 'bg-white shadow-sm text-[var(--ink)]' : 'text-[var(--muted)]'}`}
                                >
                                  Practice
                                </button>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-xs text-[var(--muted)]">{practicedIds.size} of {totalQuestions} practiced</p>
                                <DownloadBar blocks={interviewBlocks()} baseFilename="cvly-interview-prep" copyText={plainText(interviewBlocks())} copied={copied} onCopy={copyContent} locked={PAYWALL_ENABLED && credits?.plan === 'free'} />
                              </div>
                            </div>

                            {interviewMode === 'browse' ? (
                              <>
                                <div className="relative mb-5">
                                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-soft)]" />
                                  <input
                                    value={interviewSearch}
                                    onChange={(e) => setInterviewSearch(e.target.value)}
                                    placeholder="Search questions…"
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition"
                                  />
                                </div>
                                {filtered.length === 0 ? (
                                  <p className="text-sm text-[var(--muted)] text-center py-8">No questions match &quot;{interviewSearch}&quot;.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {filtered.map((cat) => {
                                      const ci = categories.findIndex((c) => c.category === cat.category);
                                      return (
                                        <div key={cat.category} className="rounded-xl border border-[var(--line)] overflow-hidden">
                                          <div className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--surface)] transition">
                                            <button
                                              onClick={() => setOpenCategory(openCategory === ci ? -1 : ci)}
                                              className="flex-1 text-left flex items-center gap-2"
                                            >
                                              <span className="font-semibold text-sm">{cat.category} <span className="text-xs text-[var(--muted)] ml-2 font-normal">{cat.questions.length} questions</span></span>
                                            </button>
                                            <div className="flex items-center gap-3 shrink-0">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (PAYWALL_ENABLED && credits?.plan === 'free') { window.location.href = '/pricing'; return; }
                                                  const text = cat.questions.map((q, i) => `${i + 1}. ${q.question}\n   Lead with: ${q.starHint}${q.suggestedAnswer ? `\n   Suggested answer: ${q.suggestedAnswer}` : ''}`).join('\n\n');
                                                  copyContent(`${cat.category}\n\n${text}`);
                                                }}
                                                aria-label={PAYWALL_ENABLED && credits?.plan === 'free' ? `Upgrade to copy ${cat.category} questions` : `Copy ${cat.category} questions`}
                                                className="p-1.5 -m-1.5 text-[var(--muted)] hover:text-[var(--ink)] transition"
                                              >
                                                {PAYWALL_ENABLED && credits?.plan === 'free' ? <Lock size={13} /> : <Copy size={14} />}
                                              </button>
                                              <button onClick={() => setOpenCategory(openCategory === ci ? -1 : ci)} aria-label="Toggle category">
                                                <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${openCategory === ci ? 'rotate-180' : ''}`} />
                                              </button>
                                            </div>
                                          </div>
                                          {(openCategory === ci || interviewSearch.trim()) && (
                                            <div className="divide-y divide-[var(--line)]">
                                              {cat.questions.map((q, qi) => (
                                                <div key={qi} className="px-5 py-4">
                                                  <p className="text-sm font-medium mb-1.5 flex gap-2.5 items-start">
                                                    <span className="font-mono text-[var(--accent-ink)] text-xs shrink-0 pt-0.5">{String(qi + 1).padStart(2, '0')}</span>
                                                    <span className="flex-1">{q.question}</span>
                                                    {practicedIds.has(q.question) && <Check size={13} className="text-[var(--good)] shrink-0 mt-0.5" />}
                                                    <button
                                                      onClick={() => {
                                                        if (PAYWALL_ENABLED && credits?.plan === 'free') { window.location.href = '/pricing'; return; }
                                                        copyContent(`${q.question}\n\nLead with: ${q.starHint}${q.suggestedAnswer ? `\nSuggested answer: ${q.suggestedAnswer}` : ''}`);
                                                      }}
                                                      aria-label={PAYWALL_ENABLED && credits?.plan === 'free' ? 'Upgrade to copy this question' : 'Copy this question'}
                                                      className="shrink-0 p-1.5 -m-1.5 text-[var(--muted-soft)] hover:text-[var(--ink)] transition"
                                                    >
                                                      {PAYWALL_ENABLED && credits?.plan === 'free' ? <Lock size={11} /> : <Copy size={12} />}
                                                    </button>
                                                  </p>
                                                  <p className="text-xs text-[var(--muted-soft)] pl-7 mb-2">{q.starHint}</p>
                                                  {q.suggestedAnswer && (
                                                    <p className="text-xs text-[var(--ink)]/75 leading-relaxed bg-[var(--surface)] rounded-lg p-3 ml-7">{q.suggestedAnswer}</p>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            ) : practicedIds.size >= flat.length ? (
                              <div className="text-center py-6">
                                <div className="w-14 h-14 rounded-full bg-[var(--good-bg)] flex items-center justify-center mx-auto mb-4">
                                  <Check size={24} className="text-[var(--good)]" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">All {flat.length} questions practiced.</h3>
                                <p className="text-sm text-[var(--muted)] max-w-xs mx-auto mb-6">That&apos;s real preparation — most people walk in having practiced a handful. You&apos;ve gone through all of them.</p>
                                <button
                                  onClick={() => { setPracticeIndex(0); setRevealHint(false); }}
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-ink)] hover:underline"
                                >
                                  Go through them again
                                </button>
                              </div>
                            ) : (
                              current && (
                                <div className="text-center">
                                  <div className="flex items-center justify-between mb-6">
                                    <p className="text-xs text-[var(--muted)] font-mono">Question {practiceIndex + 1} of {flat.length}</p>
                                    <button
                                      onClick={() => { setPracticeIndex(Math.floor(Math.random() * flat.length)); setRevealHint(false); }}
                                      className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)] transition"
                                    >
                                      <Shuffle size={12} /> Shuffle
                                    </button>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-[var(--line)] overflow-hidden mb-8">
                                    <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${((practiceIndex + 1) / flat.length) * 100}%` }} />
                                  </div>

                                  <div key={practiceIndex} className="card-swap">
                                    <p className="text-[11px] font-mono text-[var(--accent-ink)] uppercase tracking-wide mb-4">{current.category}</p>
                                    <p className="text-xl font-semibold mb-4 leading-snug max-w-md mx-auto">{current.question}</p>
                                    <div className="mb-6">
                                      <ListenButton
                                        text={revealHint ? `${current.question}. Lead with: ${current.starHint}. ${current.suggestedAnswer ? `Suggested answer: ${current.suggestedAnswer}` : ''}` : current.question}
                                        label="Listen to question"
                                      />
                                    </div>

                                    {revealHint ? (
                                      <div className="card rounded-xl p-5 mb-6 text-left max-w-md mx-auto space-y-3">
                                        <div>
                                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-1.5">Lead with</p>
                                          <p className="text-sm text-[var(--ink)]/80 leading-relaxed">{current.starHint}</p>
                                        </div>
                                        {current.suggestedAnswer && (
                                          <div className="pt-3 border-t border-[var(--line)]">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-ink)] mb-1.5">Suggested answer</p>
                                            <p className="text-sm text-[var(--ink)]/80 leading-relaxed">{current.suggestedAnswer}</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setRevealHint(true)}
                                        className="mb-6 px-5 py-2.5 rounded-full border border-[var(--line)] text-sm font-medium hover:bg-[var(--surface)] transition"
                                      >
                                        Reveal answer
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-center gap-3">
                                    <button
                                      onClick={() => { setPracticeIndex((i) => Math.max(0, i - 1)); setRevealHint(false); }}
                                      disabled={practiceIndex === 0}
                                      aria-label="Previous question"
                                      className="w-10 h-10 rounded-full border border-[var(--line)] flex items-center justify-center hover:bg-[var(--surface)] transition disabled:opacity-30"
                                    >
                                      <ChevronLeft size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPracticedIds((prev) => {
                                          const next = new Set(prev).add(current.question);
                                          if (scanIdRef.current) {
                                            fetch(`/api/scans/${scanIdRef.current}`, {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ practicedQuestions: [...next] }),
                                            }).catch(() => {});
                                          }
                                          return next;
                                        });
                                        setPracticeIndex((i) => Math.min(flat.length - 1, i + 1));
                                        setRevealHint(false);
                                      }}
                                      className="btn-accent px-6 py-2.5 rounded-full text-sm font-semibold"
                                    >
                                      {practicedIds.has(current.question) ? 'Next' : 'Got it, next'}
                                    </button>
                                    <button
                                      onClick={() => { setPracticeIndex((i) => Math.min(flat.length - 1, i + 1)); setRevealHint(false); }}
                                      disabled={practiceIndex === flat.length - 1}
                                      aria-label="Next question"
                                      className="w-10 h-10 rounded-full border border-[var(--line)] flex items-center justify-center hover:bg-[var(--surface)] transition disabled:opacity-30"
                                    >
                                      <ChevronRight size={16} />
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : null}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        </div>
        {outOfCredits && (
          <OutOfCreditsModal plan={outOfCredits.plan} resetAt={outOfCredits.resetAt} onClose={() => setOutOfCredits(null)} />
        )}
        </>
      )}


      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20 scroll-mt-16">
        <Reveal><h2 className="text-3xl font-semibold tracking-tight text-center mb-14">Before you upload your resume</h2></Reveal>
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

      {/* Building in public + founder note */}
      <section className="max-w-3xl mx-auto px-6 py-16 border-t border-[var(--line)]">
        <Reveal>
          <div className="card rounded-2xl p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-4">Why I built this</p>
            <p className="text-sm text-[var(--ink)]/80 leading-relaxed mb-4">
              I run a small performance marketing agency. Over the years I&apos;ve looked at a lot of resumes — for clients, for candidates, for NGOs I&apos;ve worked with. The same thing kept happening. Good people. Resumes that never got past the first filter. So I built the tool I wished existed for them.
            </p>
            <p className="text-sm text-[var(--ink)]/80 leading-relaxed mb-6">
              It&apos;s still early. I&apos;m building it in public, adding what people actually ask for, keeping it free while that&apos;s true. If something&apos;s missing or broken, I want to hear about it.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[var(--accent-soft)] flex items-center justify-center font-semibold text-[var(--accent-ink)] shrink-0">A</div>
              <div>
                <p className="text-sm font-semibold">Anurag, Faridabad</p>
                <a href="https://linkedin.com/in/anuxbiz" target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent-ink)] hover:underline">Connect on LinkedIn</a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center border-t border-[var(--line)]">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">Your next interview could start here.</h2>
          <p className="text-[var(--muted)] mb-9 max-w-md mx-auto">You&apos;ve already earned the experience. Let&apos;s help recruiters see it. Free, no card.</p>
          <button
            onClick={() => setToolOpen(true)}
            className="btn-accent inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-sm"
          >
            Show me what&apos;s missing <ArrowRight size={16} />
          </button>
        </Reveal>
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
              <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed mb-4">
                The interview isn&apos;t the hard part. Getting one is. Free while we&apos;re building.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://www.instagram.com/cvly.in/" target="_blank" rel="noopener noreferrer" aria-label="Cvly on Instagram" className="text-[var(--muted)] hover:text-[var(--ink)] transition">
                  <InstagramIcon size={17} />
                </a>
                <a href="https://www.facebook.com/cvly.in" target="_blank" rel="noopener noreferrer" aria-label="Cvly on Facebook" className="text-[var(--muted)] hover:text-[var(--ink)] transition">
                  <FacebookIcon size={17} />
                </a>
                <a href="https://www.linkedin.com/company/getcvly" target="_blank" rel="noopener noreferrer" aria-label="Cvly on LinkedIn" className="text-[var(--muted)] hover:text-[var(--ink)] transition">
                  <LinkedinIcon size={17} />
                </a>
                <a href="https://x.com/getcvly" target="_blank" rel="noopener noreferrer" aria-label="Cvly on X" className="text-[var(--muted)] hover:text-[var(--ink)] transition">
                  <XIcon size={17} />
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-3">Product</p>
              <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
                <a href="#how" className="hover:text-[var(--ink)] transition">How it works</a>
                <a href="#compare" className="hover:text-[var(--ink)] transition">Compare</a>
                <a href="#faq" className="hover:text-[var(--ink)] transition">FAQ</a>
                <Link href="/pricing" className="hover:text-[var(--ink)] transition">Pricing</Link>
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
