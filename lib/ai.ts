import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Cheap, fast model for scoring/matching
export const flashModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  const result = await flashModel.generateContent(prompt);
  const text = result.response.text();
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

  const result = await flashModel.generateContent(prompt);
  return result.response.text();
}

export async function generateCoverLetter(resumeText: string, jobDescription: string): Promise<string> {
  const prompt = `Write a concise, professional, non-generic cover letter (under 300 words) based on this resume and job description. Avoid cliches like "I am writing to express my interest." Sound human and specific to the role. Return ONLY the letter text.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

  const result = await flashModel.generateContent(prompt);
  return result.response.text();
}

export interface InterviewQuestion {
  question: string;
  starHint: string;
}

export async function generateInterviewPrep(resumeText: string, jobDescription: string): Promise<InterviewQuestion[]> {
  const prompt = `Based on this resume and job description, generate 5 likely interview questions the candidate should prepare for. For each, give a short hint on how to structure a STAR-method answer (Situation, Task, Action, Result) using details from THEIR actual resume. Return ONLY valid JSON, no markdown:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return JSON in exactly this shape:
[
  { "question": "<interview question>", "starHint": "<1-2 sentence hint on how to structure their STAR answer using their real background>" }
]`;

  const result = await flashModel.generateContent(prompt);
  const text = result.response.text();
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}
