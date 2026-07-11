'use client';

import { useState } from 'react';

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
      <header className="border-b border-[var(--paper-line)]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">cvly</span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] border border-[var(--paper-line)] rounded-full px-3 py-1">
            Free while in beta
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-14">
        {!result && (
          <div className="text-center mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--blue)] mb-4">ATS resume review</p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-[var(--ink)] mb-4 leading-tight">
              Know if your resume<br /><span className="italic text-[var(--blue)]">passes the bots.</span>
            </h1>
            <p className="text-[var(--muted)] max-w-md mx-auto text-[15px]">
              Paste your resume and the job description. Get your match score, missing keywords, and exactly what to fix — in under 10 seconds.
            </p>
          </div>
        )}

        {/* Input section */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-[var(--paper-line)] p-6 shadow-[0_1px_3px_rgba(18,24,43,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">01 — Your resume</label>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--blue-mist)] text-sm font-medium text-[var(--blue-deep)] cursor-pointer hover:bg-[#E2E7FD] transition mb-3">
              Upload PDF / DOCX
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            {fileName && <span className="block text-xs text-[var(--muted)] mb-2 font-mono">{fileName}</span>}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="...or paste your resume text here"
              className="w-full h-44 p-3 rounded-lg border border-[var(--paper-line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent resize-none placeholder:text-[var(--muted)]"
            />
          </div>

          <div className="bg-white rounded-xl border border-[var(--paper-line)] p-6 shadow-[0_1px_3px_rgba(18,24,43,0.04)]">
            <label className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)] block mb-4">02 — Job description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here"
              className="w-full h-[172px] mt-[42px] p-3 rounded-lg border border-[var(--paper-line)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent resize-none placeholder:text-[var(--muted)]"
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
            className="px-8 py-3 rounded-full bg-[var(--ink)] text-white font-medium text-sm hover:bg-[var(--navy)] transition disabled:opacity-40 shadow-[0_2px_8px_rgba(18,24,43,0.15)]"
          >
            {loading ? 'Scoring…' : 'Score my resume →'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl border border-[var(--paper-line)] overflow-hidden shadow-[0_1px_3px_rgba(18,24,43,0.04)]">
            {/* Tabs */}
            <div className="flex border-b border-[var(--paper-line)] paper-texture">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => (tab.key === 'score' ? setActiveTab('score') : handleTabAction(tab.key as 'rewrite' | 'cover' | 'interview'))}
                  className={`flex-1 py-4 text-sm font-medium transition flex flex-col items-center gap-1 ${
                    activeTab === tab.key ? 'text-[var(--blue)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}
                  style={activeTab === tab.key ? { boxShadow: 'inset 0 -2px 0 var(--blue)' } : undefined}
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
                          <span key={i} className="font-mono px-2.5 py-1 bg-[var(--good-bg)] text-[var(--good)] text-xs rounded-md">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--bad)] mb-3">✗ Missing keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords.map((kw, i) => (
                          <span key={i} className="font-mono px-2.5 py-1 bg-[var(--bad-bg)] text-[var(--bad)] text-xs rounded-md">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] mb-3">How to improve</h3>
                  <ul className="space-y-2.5">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="text-sm text-[var(--ink)]/80 flex gap-3 leading-relaxed">
                        <span className="text-[var(--blue)] font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span> {imp}
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
                          <span className="font-mono text-[var(--blue)] text-xs shrink-0 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
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
      </div>
    </main>
  );
}
