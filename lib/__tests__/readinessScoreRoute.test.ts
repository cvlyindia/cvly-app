import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { createClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/readiness-score/route';

const mockCreateClient = vi.mocked(createClient);

function mockSupabase(opts: {
  user: { id: string } | null;
  scan?: { score: number; interview_questions: unknown; practiced_questions: unknown } | null;
  linkedin?: { score: number } | null;
  portfolio?: { score: number } | null;
}) {
  const scanChain = {
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: opts.scan ?? null, error: null }),
          }),
        }),
      }),
    }),
  };

  function reviewChain(type: 'linkedin' | 'portfolio') {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: (type === 'linkedin' ? opts.linkedin : opts.portfolio) ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    };
  }

  let careerReviewsCallCount = 0;
  const fakeSupabase = {
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from: (table: string) => {
      if (table === 'scans') return scanChain;
      // First call for career_reviews is linkedin, second is portfolio — matches
      // the actual call order in the route.
      careerReviewsCallCount += 1;
      return reviewChain(careerReviewsCallCount === 1 ? 'linkedin' : 'portfolio');
    },
  };
  mockCreateClient.mockResolvedValue(fakeSupabase as unknown as Awaited<ReturnType<typeof createClient>>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/readiness-score', () => {
  it('requires login', async () => {
    mockSupabase({ user: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns null overall when the user has no data at all yet', async () => {
    mockSupabase({ user: { id: 'user-1' }, scan: null, linkedin: null, portfolio: null });
    const res = await GET();
    const body = await res.json();
    expect(body.overall).toBeNull();
  });

  it('averages only the components that actually exist — the real design decision, not a penalty for unused tools', async () => {
    mockSupabase({
      user: { id: 'user-1' },
      scan: { score: 80, interview_questions: null, practiced_questions: null },
      linkedin: null,
      portfolio: null,
    });
    const res = await GET();
    const body = await res.json();
    // Only resumeMatch (80) exists — overall should equal it exactly, not be
    // dragged down by averaging against zeros for the missing pieces.
    expect(body.overall).toBe(80);
    expect(body.components.resumeMatch).toBe(80);
    expect(body.components.linkedinStrength).toBeNull();
  });

  it('computes interview completion as a real percentage against the actual flattened question count', async () => {
    const categories = [
      { category: 'Behavioral', questions: [{ question: 'Q1', starHint: '', suggestedAnswer: '' }, { question: 'Q2', starHint: '', suggestedAnswer: '' }] },
      { category: 'Technical', questions: [{ question: 'Q3', starHint: '', suggestedAnswer: '' }, { question: 'Q4', starHint: '', suggestedAnswer: '' }] },
    ]; // 4 total questions across 2 categories
    mockSupabase({
      user: { id: 'user-1' },
      scan: { score: 70, interview_questions: categories, practiced_questions: ['Q1', 'Q3'] }, // 2 of 4 practiced
    });
    const res = await GET();
    const body = await res.json();
    expect(body.components.interviewCompletion).toBe(50);
  });

  it('averages all four components correctly when everything exists', async () => {
    const categories = [{ category: 'Behavioral', questions: [{ question: 'Q1', starHint: '', suggestedAnswer: '' }] }];
    mockSupabase({
      user: { id: 'user-1' },
      scan: { score: 80, interview_questions: categories, practiced_questions: ['Q1'] }, // 100% completion
      linkedin: { score: 60 },
      portfolio: { score: 40 },
    });
    const res = await GET();
    const body = await res.json();
    // (80 + 60 + 40 + 100) / 4 = 70
    expect(body.overall).toBe(70);
  });

  it('never exceeds 100% completion even if practiced_questions somehow has stale/extra entries', async () => {
    const categories = [{ category: 'Behavioral', questions: [{ question: 'Q1', starHint: '', suggestedAnswer: '' }] }];
    mockSupabase({
      user: { id: 'user-1' },
      scan: { score: 50, interview_questions: categories, practiced_questions: ['Q1', 'Q_stale_from_a_different_scan'] },
    });
    const res = await GET();
    const body = await res.json();
    expect(body.components.interviewCompletion).toBe(100); // not 200%
  });
});
