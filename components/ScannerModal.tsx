'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Upload, Loader2, Check, ChevronDown, Search, ChevronLeft, ChevronRight,
  Shuffle, FileScan, AlertTriangle, Copy, Lock,
} from 'lucide-react';
import { ScoreRing } from '@/components/ScoreRing';
import { SkeletonLines, DownloadBar } from '@/components/ScannerShared';
import { structuredResumeToPlainText } from '@/lib/resumeTemplate';
import type { ExportBlock } from '@/lib/export';
import type { ScoreResult, InterviewCategory, StructuredResume } from '@/lib/ai';
import { PAYWALL_ENABLED } from '@/lib/featureFlags';
import { OutOfCreditsModal } from '@/components/OutOfCreditsModal';
import { ListenButton } from '@/components/ListenButton';
import { ShareButton } from '@/components/ShareButton';

interface FormatCheckResult {
  score: number;
  checked: boolean;
  issues: { severity: string; title: string; detail: string }[];
  passed: string[];
}

interface Credits {
  remaining: number;
  plan: string;
}

export function ScannerModal({
  open,
  onClose,
  credits,
  onCreditsChange,
  onScanSaved,
}: {
  open: boolean;
  onClose: () => void;
  credits: Credits | null;
  onCreditsChange: (updater: (c: Credits | null) => Credits | null) => void;
  onScanSaved?: () => void;
}) {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [importingJob, setImportingJob] = useState(false);
  const [importError, setImportError] = useState('');
  const [fileName, setFileName] = useState('');
  const [formatCheck, setFormatCheck] = useState<FormatCheckResult | null>(null);
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
  const [openCategory, setOpenCategory] = useState<number>(0);
  const [interviewMode, setInterviewMode] = useState<'browse' | 'practice'>('browse');
  const [interviewSearch, setInterviewSearch] = useState('');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [revealHint, setRevealHint] = useState(false);
  const [practicedIds, setPracticedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Focus trap — identical behavior to the homepage's own instance
  useEffect(() => {
    if (!open) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;

    const getFocusable = () => {
      if (!modalRef.current) return [];
      return Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    const raf = requestAnimationFrame(() => {
      getFocusable()[0]?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
  }, [open, onClose]);

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
        return;
      }
      if (data.error) throw new Error(data.error);
      setResult(data);
      setActiveTab('score');
      onCreditsChange((c) => (c ? { ...c, remaining: Math.max(0, c.remaining - 1) } : c));

      fetch('/api/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription, ...data }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.id) setScanId(d.id);
          onScanSaved?.();
        })
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
      onCreditsChange((c) => (c ? { ...c, remaining: Math.max(0, c.remaining - cost) } : c));

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

  if (!open) return null;

  const totalQuestions = categories.reduce((sum, c) => sum + c.questions.length, 0);
  const tabs: { key: 'score' | 'rewrite' | 'cover' | 'interview'; label: string }[] = [
    { key: 'score', label: 'Your score' },
    { key: 'rewrite', label: 'Rewrite' },
    { key: 'cover', label: 'Cover letter' },
    { key: 'interview', label: 'Interview prep' },
  ];

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-sm" onClick={onClose} />
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
              onClick={onClose}
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
                      <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
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
                                                className="text-[var(--muted)] hover:text-[var(--ink)] transition"
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
                                                      className="shrink-0 text-[var(--muted-soft)] hover:text-[var(--ink)] transition"
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
  );
}
