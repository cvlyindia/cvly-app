import { generateWithFallback } from './aiProviders';

export interface ScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
}

export interface InvalidInputResult {
  invalid: true;
  reason: string;
}

export async function scoreResume(resumeText: string, jobDescription: string, priority?: boolean): Promise<ScoreResult | InvalidInputResult> {
  const prompt = `You are an ATS (Applicant Tracking System) resume analyzer.

FIRST — check whether what's below is actually usable. The "resume" should read like an actual person's work history, education, or skills. The "job description" should read like an actual job posting. Real resumes can be messy, informal, short, or a student's first resume with barely any experience — all of that is completely fine and still valid. What's NOT valid: random/gibberish text, lorem ipsum, a completely unrelated document (a recipe, a poem, song lyrics, someone testing with keyboard mashing), or content that's clearly not attempting to be a resume or job posting at all.

If either one is genuinely not usable, respond with ONLY this JSON, nothing else:
{ "invalid": true, "reason": "<one warm, gently funny sentence, talking directly to the person, telling them what you actually got instead of a resume/JD and inviting them to try again — never mocking, never cold, like a friend raising an eyebrow, not a robot rejecting a form>" }

Otherwise, compare the resume against the job description and return ONLY valid JSON, no markdown, no backticks, no preamble, in exactly this shape:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

{
  "score": <number 0-100, how well the resume matches the JD for ATS purposes>,
  "matchedKeywords": [<list of important keywords from the JD that ARE present in the resume>],
  "missingKeywords": [<list of important keywords from the JD that are MISSING from the resume>],
  "summary": "<2-3 sentence plain-language summary of the match quality>",
  "improvements": [<3-5 short, specific, actionable bullet points to improve the resume for this JD>]
}`;

  const text = await generateWithFallback(prompt, { priority });
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

export interface StructuredResume {
  name: string;
  contact: string;
  summary: string;
  experience: {
    company: string;
    title: string;
    dates: string;
    bullets: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    dates: string;
  }[];
  skills: string[];
}

export async function rewriteResume(resumeText: string, jobDescription: string, priority?: boolean): Promise<StructuredResume> {
  const prompt = `You are a resume writer who has gotten hundreds of people past ATS screens and into interviews. Rewrite the resume below for this specific job, following professional resume-writing craft — not generic paraphrasing. Every bullet should read like it was written by someone who does this for a living, not by an AI restating the original.

RULES YOU MUST FOLLOW:
1. Every bullet starts with a strong past-tense action verb (Led, Built, Reduced, Launched, Negotiated, Redesigned) — never "Responsible for," "Worked on," "Helped with," or any first-person pronoun ("I").
2. Use the XYZ formula wherever the original resume has enough material: "Accomplished [X], measured by [Y], by doing [Z]." If the original already contains a number, percentage, dollar amount, team size, or timeframe, make sure it survives into the rewrite — don't let a real number get lost in a rewording. If no number exists in the original for a given bullet, do not invent one — describe the scope or method instead (e.g., "led a cross-functional team" is fine without a headcount if none was given).
3. Mirror the exact terminology the job description uses wherever the candidate's real experience genuinely matches it (e.g., if the JD says "stakeholder management" and the resume describes something equivalent but calls it "working with clients," use the JD's phrase) — this is a well-established technique, useful both for ATS keyword matching and for how a human reviewer pattern-matches a resume against the role they're hiring for. Never do this if the match isn't genuinely there.
4. Cut filler adjectives with no evidence behind them ("hardworking," "detail-oriented," "team player," "passionate") — show it through what was actually accomplished, don't just assert it.
5. Keep every bullet to one or two lines. If a bullet runs long, it usually means two accomplishments got merged — split them or cut the less relevant one.
6. Current role stays present tense; every past role is past tense. Be consistent within each entry.
7. The professional summary (if you write one) must be specific to THIS role and company context — not a generic "results-driven professional" opener that could apply to any resume.
8. Never invent a company, job title, date, degree, or number that isn't in the original resume. If the original is thin on a section, keep that section honest and short rather than padding it with invented specifics.

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON, no markdown, no backticks, no preamble, in exactly this shape:
{
  "name": "<the person's name as it appears on the resume>",
  "contact": "<a single line — email, phone, city, LinkedIn, whatever was actually on the original resume, separated by ' | '>",
  "summary": "<a short 2-3 sentence professional summary tailored to this specific role — empty string if there's not enough real content to base one on>",
  "experience": [
    { "company": "...", "title": "...", "dates": "...", "bullets": ["...", "..."] }
  ],
  "education": [
    { "institution": "...", "degree": "...", "dates": "..." }
  ],
  "skills": ["...", "..."]
}`;

  const text = await generateWithFallback(prompt, { priority });
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function generateCoverLetter(resumeText: string, jobDescription: string, priority?: boolean): Promise<string> {
  const prompt = `Write a cover letter for this specific role, based only on what's actually in the resume below. This should read like a real person wrote it in fifteen focused minutes, not like a template with the blanks filled in.

STRUCTURE:
1. Opening (1-2 sentences): a specific hook — name the role and, if the job description names the company, the company — plus one concrete reason this role fits their actual background. Never open with "I am writing to express my interest in..." or "I am excited to apply for..." — start with something that could only be about this person and this role, not any cover letter for any job.
2. Body (2-3 short paragraphs): pick the ONE or TWO strongest, most relevant things from their actual resume and go deeper on them — the specific problem, what they did, what happened. Do not just restate resume bullets in sentence form; add the connective narrative between their experience and what this role actually needs. If the resume doesn't have much to work with for a requirement in the JD, don't fabricate experience to cover it — either skip it or address it honestly (e.g., "while I haven't worked directly in X, my experience in Y gave me...").
3. Close (1-2 sentences): confident, specific, no groveling. Not "I look forward to hearing from you" — something that shows genuine interest in this specific opportunity.

RULES:
- Under 300 words total.
- Never invent an employer, project, title, or achievement that isn't in the resume.
- No filler phrases: "team player," "results-driven," "passionate about," "proven track record" — earn every claim with something specific instead of asserting it.
- Write in first person, naturally — not stiff corporate voice.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY the letter text, no subject line, no "Dear Hiring Manager" placeholder commentary, no explanation of what you wrote.`;

  return generateWithFallback(prompt, { priority });
}

export interface InterviewQuestion {
  question: string;
  starHint: string;
  suggestedAnswer: string;
}

export interface InterviewCategory {
  category: string;
  questions: InterviewQuestion[];
}

export async function generateInterviewPrep(resumeText: string, jobDescription: string, priority?: boolean): Promise<InterviewCategory[]> {
  const prompt = `Based on this resume and job description, generate exactly 100 interview questions the candidate should prepare for, split into exactly these 4 categories with 25 questions each:
1. "Behavioral" — past behavior, teamwork, conflict, leadership
2. "Technical & Role-Specific" — skills and tools from this exact JD
3. "Situational & Problem-Solving" — hypothetical scenarios for this role
4. "Culture, Motivation & Curveballs" — why this company, career goals, unexpected questions

For each question, provide:
- "starHint": a very short cue (max 12 words) on which STAR element to lead with.
- "suggestedAnswer": a concise example answer (2-3 sentences, max 50 words) that draws on SPECIFIC details actually present in their resume — a real project, tool, number, or outcome they listed. Never invent a company, title, metric, or achievement that isn't in the resume. If the resume genuinely doesn't have enough detail for a specific question, write a short answer framework instead ("Structure this around a time you...") rather than fabricating specifics.

Return ONLY valid JSON, no markdown fences, in exactly this shape:
[
  { "category": "Behavioral", "questions": [ { "question": "...", "starHint": "...", "suggestedAnswer": "..." } ] },
  { "category": "Technical & Role-Specific", "questions": [...] },
  { "category": "Situational & Problem-Solving", "questions": [...] },
  { "category": "Culture, Motivation & Curveballs", "questions": [...] }
]

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

  const text = await generateWithFallback(prompt, { maxTokens: 32768, priority });
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

export async function reviewLinkedInProfile(profileText: string, priority?: boolean): Promise<CareerReviewResult> {
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

  const text = await generateWithFallback(prompt, { priority });
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}

export async function reviewPortfolio(portfolioText: string, priority?: boolean): Promise<CareerReviewResult> {
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

  const text = await generateWithFallback(prompt, { priority });
  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }
}
