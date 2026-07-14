import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/aiProviders', () => ({
  generateWithFallback: vi.fn(),
}));

import { generateWithFallback } from '@/lib/aiProviders';
import {
  scoreResume,
  rewriteResume,
  generateCoverLetter,
  generateInterviewPrep,
  reviewLinkedInProfile,
  reviewPortfolio,
} from '@/lib/ai';

const mockGenerate = vi.mocked(generateWithFallback);

beforeEach(() => {
  mockGenerate.mockReset();
});

describe('scoreResume', () => {
  it('parses a clean JSON response into a real score result', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({
      score: 78, matchedKeywords: ['SQL'], missingKeywords: ['Python'], summary: 'Decent match.', improvements: ['Add Python'],
    }));
    const result = await scoreResume('resume text', 'job description text');
    expect('score' in result && result.score).toBe(78);
  });

  it('strips markdown code fences before parsing — the AI often wraps JSON in ```json blocks despite being told not to', async () => {
    mockGenerate.mockResolvedValue('```json\n' + JSON.stringify({ score: 50, matchedKeywords: [], missingKeywords: [], summary: 'x', improvements: [] }) + '\n```');
    const result = await scoreResume('resume', 'jd');
    expect('score' in result && result.score).toBe(50);
  });

  it('passes through the garbage-input detection result correctly, without throwing', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({ invalid: true, reason: "That's a recipe for banana bread, not a resume!" }));
    const result = await scoreResume('banana bread recipe', 'flour, sugar, bananas');
    expect('invalid' in result && result.invalid).toBe(true);
    expect('reason' in result && result.reason).toContain('banana bread');
  });

  it('throws a clear error on genuinely malformed, non-JSON output instead of silently returning garbage', async () => {
    mockGenerate.mockResolvedValue('I cannot complete this request.');
    await expect(scoreResume('resume', 'jd')).rejects.toThrow('Failed to parse AI response as JSON');
  });

  it('actually sends the real resume and job description text in the prompt — not a stale or empty one', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({ score: 1, matchedKeywords: [], missingKeywords: [], summary: '', improvements: [] }));
    await scoreResume('UNIQUE_RESUME_MARKER_12345', 'UNIQUE_JD_MARKER_67890');
    const promptSent = mockGenerate.mock.calls[0][0];
    expect(promptSent).toContain('UNIQUE_RESUME_MARKER_12345');
    expect(promptSent).toContain('UNIQUE_JD_MARKER_67890');
  });
});

describe('rewriteResume', () => {
  it('parses a clean structured resume response', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({
      name: 'Jane Doe', contact: 'jane@email.com', summary: '', experience: [], education: [], skills: [],
    }));
    const result = await rewriteResume('resume', 'jd');
    expect(result.name).toBe('Jane Doe');
  });

  it('throws on malformed output rather than returning a half-built resume object', async () => {
    mockGenerate.mockResolvedValue('not json at all');
    await expect(rewriteResume('resume', 'jd')).rejects.toThrow('Failed to parse AI response as JSON');
  });
});

describe('generateCoverLetter', () => {
  it('returns the raw text directly — no JSON parsing involved, since a cover letter is plain prose', async () => {
    mockGenerate.mockResolvedValue('Dear Hiring Team, I noticed your posting for...');
    const result = await generateCoverLetter('resume', 'jd');
    expect(result).toBe('Dear Hiring Team, I noticed your posting for...');
  });
});

describe('generateInterviewPrep — including the truncated-JSON salvage logic, previously never tested', () => {
  it('parses a complete, well-formed response normally', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify([
      { category: 'Behavioral', questions: [{ question: 'Q1', starHint: 'H1', suggestedAnswer: 'A1' }] },
    ]));
    const result = await generateInterviewPrep('resume', 'jd');
    expect(result).toHaveLength(1);
    expect(result[0].questions).toHaveLength(1);
  });

  it('requests a much larger token budget than the other generators, since 100 questions is a genuinely bigger request', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify([]));
    await generateInterviewPrep('resume', 'jd');
    const optionsSent = mockGenerate.mock.calls[0][1];
    expect(optionsSent?.maxTokens).toBe(32768);
  });

  it('salvages a response truncated mid-question — the exact failure mode a token-limited response actually produces', async () => {
    // A realistic truncation: the model ran out of tokens mid-way through the second
    // question object, cutting off inside its "question" field, with no closing brace.
    const truncated = '[{"category": "Behavioral", "questions": [' +
      '{"question": "Tell me about a conflict.", "starHint": "Use STAR", "suggestedAnswer": "Describe a real disagreement."},' +
      '{"question": "Tell me about a time you led a team and it was really challenging because';
    mockGenerate.mockResolvedValue(truncated);

    const result = await generateInterviewPrep('resume', 'jd');
    // The complete first question should survive the salvage; the cut-off second one is
    // correctly dropped rather than corrupting the whole response.
    expect(result).toHaveLength(1);
    expect(result[0].questions).toHaveLength(1);
    expect(result[0].questions[0].question).toBe('Tell me about a conflict.');
  });

  it('throws when even the salvage attempt cannot produce valid JSON — genuinely unrecoverable output', async () => {
    mockGenerate.mockResolvedValue('{{{ not remotely valid json, no closing braces at all');
    await expect(generateInterviewPrep('resume', 'jd')).rejects.toThrow('Failed to parse AI response as JSON');
  });
});

describe('reviewLinkedInProfile and reviewPortfolio', () => {
  it('reviewLinkedInProfile parses a clean response', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({ score: 65, summary: 'x', strengths: [], improvements: [] }));
    const result = await reviewLinkedInProfile('profile text');
    expect(result.score).toBe(65);
  });

  it('reviewPortfolio parses a clean response', async () => {
    mockGenerate.mockResolvedValue(JSON.stringify({ score: 80, summary: 'x', strengths: [], improvements: [] }));
    const result = await reviewPortfolio('portfolio text');
    expect(result.score).toBe(80);
  });

  it('both throw on malformed output rather than returning a half-valid review', async () => {
    mockGenerate.mockResolvedValue('nonsense');
    await expect(reviewLinkedInProfile('x')).rejects.toThrow('Failed to parse AI response as JSON');
    await expect(reviewPortfolio('x')).rejects.toThrow('Failed to parse AI response as JSON');
  });
});
