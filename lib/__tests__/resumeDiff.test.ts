import { describe, it, expect } from 'vitest';
import { diffResumes } from '@/lib/resumeDiff';
import type { StructuredResume } from '@/lib/ai';

function makeResume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    name: 'Jane Doe',
    contact: 'jane@example.com',
    summary: 'A summary',
    experience: [],
    education: [],
    skills: [],
    ...overrides,
  };
}

describe('diffResumes — summary', () => {
  it('detects an unchanged summary', () => {
    const diff = diffResumes(makeResume({ summary: 'Same text' }), makeResume({ summary: 'Same text' }));
    expect(diff.summaryChanged).toBe(false);
  });

  it('detects a changed summary', () => {
    const diff = diffResumes(makeResume({ summary: 'Version A summary' }), makeResume({ summary: 'Version B summary' }));
    expect(diff.summaryChanged).toBe(true);
  });

  it('treats whitespace-only differences as unchanged', () => {
    const diff = diffResumes(makeResume({ summary: '  Same text  ' }), makeResume({ summary: 'Same text' }));
    expect(diff.summaryChanged).toBe(false);
  });
});

describe('diffResumes — skills', () => {
  it('correctly buckets shared, only-A, and only-B skills', () => {
    const diff = diffResumes(
      makeResume({ skills: ['Python', 'SQL', 'AWS'] }),
      makeResume({ skills: ['Python', 'SQL', 'Docker'] })
    );
    expect(diff.skillsShared).toEqual(['Python', 'SQL']);
    expect(diff.skillsOnlyA).toEqual(['AWS']);
    expect(diff.skillsOnlyB).toEqual(['Docker']);
  });

  it('matches skills case-insensitively', () => {
    const diff = diffResumes(makeResume({ skills: ['python'] }), makeResume({ skills: ['Python'] }));
    expect(diff.skillsShared).toEqual(['python']);
    expect(diff.skillsOnlyA).toEqual([]);
  });
});

describe('diffResumes — experience matching by company', () => {
  it('matches the same company across versions even when the title phrasing differs', () => {
    const diff = diffResumes(
      makeResume({ experience: [{ company: 'Acme Corp', title: 'Software Engineer', dates: '2020-2023', bullets: ['Did X'] }] }),
      makeResume({ experience: [{ company: 'Acme Corp', title: 'Backend Engineer', dates: '2020-2023', bullets: ['Did X'] }] })
    );
    expect(diff.experience).toHaveLength(1);
    expect(diff.experience[0].titleA).toBe('Software Engineer');
    expect(diff.experience[0].titleB).toBe('Backend Engineer');
  });

  it('matches company names case-insensitively', () => {
    const diff = diffResumes(
      makeResume({ experience: [{ company: 'ACME CORP', title: 'Engineer', dates: '', bullets: [] }] }),
      makeResume({ experience: [{ company: 'acme corp', title: 'Engineer', dates: '', bullets: [] }] })
    );
    expect(diff.experience).toHaveLength(1); // matched as one entry, not two separate ones
  });

  it('classifies an identical bullet as shared', () => {
    const diff = diffResumes(
      makeResume({ experience: [{ company: 'Acme', title: 'Eng', dates: '', bullets: ['Built the payment system'] }] }),
      makeResume({ experience: [{ company: 'Acme', title: 'Eng', dates: '', bullets: ['Built the payment system'] }] })
    );
    expect(diff.experience[0].bullets).toEqual([{ text: 'Built the payment system', status: 'shared' }]);
  });

  it('classifies a bullet only in A and only in B correctly, not just as one generic "different"', () => {
    const diff = diffResumes(
      makeResume({ experience: [{ company: 'Acme', title: 'Eng', dates: '', bullets: ['Only in A'] }] }),
      makeResume({ experience: [{ company: 'Acme', title: 'Eng', dates: '', bullets: ['Only in B'] }] })
    );
    const statuses = diff.experience[0].bullets.map((b) => b.status).sort();
    expect(statuses).toEqual(['onlyA', 'onlyB']);
  });

  it('keeps an unmatched company from version B as its own entry, not silently dropped', () => {
    const diff = diffResumes(
      makeResume({ experience: [{ company: 'Acme', title: 'Eng', dates: '', bullets: [] }] }),
      makeResume({ experience: [
        { company: 'Acme', title: 'Eng', dates: '', bullets: [] },
        { company: 'A Totally Different Company', title: 'Manager', dates: '', bullets: ['New bullet'] },
      ] })
    );
    expect(diff.experience).toHaveLength(2);
    const onlyInB = diff.experience.find((e) => e.company === 'A Totally Different Company');
    expect(onlyInB?.titleA).toBeNull();
    expect(onlyInB?.bullets[0].status).toBe('onlyB');
  });

  it('does not double-match the same B entry against two different A entries with the same company name', () => {
    const diff = diffResumes(
      makeResume({ experience: [
        { company: 'Acme', title: 'Junior Eng', dates: '2018-2020', bullets: [] },
        { company: 'Acme', title: 'Senior Eng', dates: '2020-2023', bullets: [] },
      ] }),
      makeResume({ experience: [{ company: 'Acme', title: 'Senior Eng', dates: '2020-2023', bullets: [] }] })
    );
    // Only one of the two A entries should match the single B entry — the
    // other A entry should show titleB as null, not both claiming the match.
    const matched = diff.experience.filter((e) => e.titleB !== null);
    expect(matched).toHaveLength(1);
  });
});
