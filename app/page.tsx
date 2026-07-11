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

  const scoreColor = result ? (result.score >= 75 ? '#16A34A' : result.score >= 50 ? '#D97706' : '#DC2626') : '#3D5AF1';

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-[#16203D]">cvly</span>
          <span className="text-sm text-gray-500">Free while in beta</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {!result && (
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-[#16203D] mb-3">
              Know if your resume passes the bots — in 10 seconds.
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Paste your resume and the job description. Get your ATS match score, missing keywords, and exactly what to fix.
            </p>
          </div>
        )}

        {/* Input section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-[#16203D] mb-3">Your resume</label>
            <div className="mb-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-200 transition">
                Upload PDF / DOCX
                <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              {fileName && <span className="ml-3 text-sm text-gray-500">{fileName}</span>}
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="...or paste your resume text here"
              className="w-full h-48 p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D5AF1] resize-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-[#16203D] mb-3">Job description</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here"
              className="w-full h-48 mt-9 p-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#3D5AF1] resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex justify-center mb-10">
          <button
            onClick={handleScore}
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-[#3D5AF1] text-white font-semibold hover:bg-[#2E47D9] transition disabled:opacity-50"
          >
            {loading ? 'Scoring...' : 'Score my resume'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {[
                { key: 'score', label: 'Score' },
                { key: 'rewrite', label: 'Rewrite' },
                { key: 'cover', label: 'Cover letter' },
                { key: 'interview', label: 'Interview prep' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabAction(tab.key as 'rewrite' | 'cover' | 'interview') || setActiveTab(tab.key as 'score')}
                  className={`flex-1 py-3 text-sm font-medium transition ${
                    activeTab === tab.key ? 'text-[#3D5AF1] border-b-2 border-[#3D5AF1]' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === 'score' && (
                <div>
                  <div className="flex items-center gap-6 mb-6">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white shrink-0"
                      style={{ background: scoreColor }}
                    >
                      {result.score}
                    </div>
                    <p className="text-gray-600">{result.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-sm font-semibold text-green-700 mb-2">✓ Matched keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.matchedKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-red-700 mb-2">✗ Missing keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-[#16203D] mb-2">How to improve</h3>
                  <ul className="space-y-2">
                    {result.improvements.map((imp, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-[#3D5AF1]">→</span> {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'rewrite' && (
                <div>
                  {tabLoading ? (
                    <p className="text-gray-500 text-sm">Rewriting your resume...</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{rewritten}</pre>
                  )}
                </div>
              )}

              {activeTab === 'cover' && (
                <div>
                  {tabLoading ? (
                    <p className="text-gray-500 text-sm">Writing your cover letter...</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{coverLetter}</pre>
                  )}
                </div>
              )}

              {activeTab === 'interview' && (
                <div className="space-y-4">
                  {tabLoading ? (
                    <p className="text-gray-500 text-sm">Preparing interview questions...</p>
                  ) : (
                    questions.map((q, i) => (
                      <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="font-medium text-[#16203D] mb-1">{q.question}</p>
                        <p className="text-sm text-gray-500">{q.starHint}</p>
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
