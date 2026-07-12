import { generateWithFallback } from './aiProviders';

export interface ScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
}

export async function scoreResume(resumeText: string, jobDescription: string): Promise<ScoreResult> {
  const prompt = `You are an ATS (Applicant Tracking System) resume analyzer. Compare the resume below against the job description and return ONLY valid JSON, no markdown, no backticks, no preamble.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return JSON in exactly this shape:
{
  "score": <number 0-100, how well the resume matches the JD for ATS purposes>,
  "matchedKeywords": [<list of important keywords from the JD that ARE present in the resume>],
  "missingKeywords": [<list of important keywords from the JD that are MISSING from the resume>],
  "summary": "<2-3 sentence plain-language summary of the match quality>",
  "improvements": [<3-5 short, specific, actionable bullet points to improve the resume for this JD>]
}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function rewriteResume(resumeText: string, jobDescription: string): Promise<string> {
  const prompt = `You are an expert resume writer. Rewrite the resume below to better match the job description, while keeping it 100% truthful to the person's real experience (do not invent companies, titles, or dates). Optimize keyword usage for ATS parsing, tighten bullet points to be achievement-focused, and keep formatting simple (no tables, no columns, no graphics) since this needs to pass ATS parsing. Return ONLY the rewritten resume text, no preamble, no explanation.

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

  return generateWithFallback(prompt);
}

export async function generateCoverLetter(resumeText: string, jobDescription: string): Promise<string> {
  const prompt = `Write a concise, professional, non-generic cover letter (under 300 words) based on this resume and job description. Avoid cliches like "I am writing to express my interest." Sound human and specific to the role. Return ONLY the letter text.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

  return generateWithFallback(prompt);
}

export interface InterviewQuestion {
  question: string;
  starHint: string;
}

export interface InterviewCategory {
  category: string;
  questions: InterviewQuestion[];
}

export async function generateInterviewPrep(resumeText: string, jobDescription: string): Promise<InterviewCategory[]> {
  const prompt = `Based on this resume and job description, generate exactly 100 interview questions the candidate should prepare for, split into exactly these 4 categories with 25 questions each:
1. "Behavioral" — past behavior, teamwork, conflict, leadership
2. "Technical & Role-Specific" — skills and tools from this exact JD
3. "Situational & Problem-Solving" — hypothetical scenarios for this role
4. "Culture, Motivation & Curveballs" — why this company, career goals, unexpected questions

For each question give a very short hint (max 15 words) on how to answer using the STAR method with THEIR actual resume background.

Return ONLY valid JSON, no markdown fences, in exactly this shape:
[
  { "category": "Behavioral", "questions": [ { "question": "...", "starHint": "..." } ] },
  { "category": "Technical & Role-Specific", "questions": [...] },
  { "category": "Situational & Problem-Solving", "questions": [...] },
  { "category": "Culture, Motivation & Curveballs", "questions": [...] }
]

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

  const text = await generateWithFallback(prompt, { maxTokens: 32768 });
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to salvage truncated JSON by closing brackets
    const lastComplete = cleaned.lastIndexOf('}');
    if (lastComplete > 0) {
      const salvaged = cleaned.slice(0, lastComplete + 1) + ']}]';
      try {
        return JSON.parse(salvaged);
      } catch {
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

export interface CareerReviewResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export async function reviewLinkedInProfile(profileText: string): Promise<CareerReviewResult> {
  const prompt = `You are a career coach reviewing a LinkedIn profile. The person pasted the text content of their profile below (headline, about section, experience, skills — whatever they included). Give honest, specific, actionable feedback. Do not invent achievements or numbers that aren't in the text. Return ONLY valid JSON, no markdown, no backticks.

PROFILE TEXT:
${profileText}

Return JSON in exactly this shape:
{
  "score": <number 0-100, overall profile strength for being found and making a strong impression>,
  "summary": "<2-3 sentence plain-language summary>",
  "strengths": [<3-5 short things that are genuinely working well>],
  "improvements": [<3-5 specific, actionable fixes — e.g. headline clarity, About section hook, quantifying experience bullets, keyword coverage for recruiter search>]
}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function reviewPortfolio(portfolioText: string): Promise<CareerReviewResult> {
  const prompt = `You are a career coach reviewing a portfolio — project descriptions, case studies, or work samples the person pasted below. Give honest, specific, actionable feedback on how well it would land with a hiring manager or recruiter. Do not invent achievements or numbers that aren't in the text. Return ONLY valid JSON, no markdown, no backticks.

PORTFOLIO CONTENT:
${portfolioText}

Return JSON in exactly this shape:
{
  "score": <number 0-100, overall strength of the portfolio at demonstrating real, hireable skill>,
  "summary": "<2-3 sentence plain-language summary>",
  "strengths": [<3-5 short things that are genuinely working well>],
  "improvements": [<3-5 specific, actionable fixes — e.g. missing outcomes/metrics, unclear problem statement, no visible process or reasoning, weak project selection>]
}`;

  const text = await generateWithFallback(prompt);
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}
