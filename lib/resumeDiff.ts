import type { StructuredResume } from '@/lib/ai';

export interface BulletDiff {
  text: string;
  status: 'shared' | 'onlyA' | 'onlyB';
}

export interface ExperienceDiff {
  company: string;
  titleA: string | null;
  titleB: string | null;
  bullets: BulletDiff[];
}

export interface ResumeDiff {
  summaryChanged: boolean;
  experience: ExperienceDiff[];
  skillsOnlyA: string[];
  skillsOnlyB: string[];
  skillsShared: string[];
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Matches experience entries between two resume versions by company name
 * (case-insensitive) — the same real job should be compared against itself
 * across versions, even if the AI phrased the title slightly differently
 * each time it rewrote the resume for a different role. */
function matchExperience(a: StructuredResume['experience'], b: StructuredResume['experience']): ExperienceDiff[] {
  const results: ExperienceDiff[] = [];
  const usedB = new Set<number>();

  for (const entryA of a) {
    const matchIndex = b.findIndex((entryB, i) => !usedB.has(i) && normalize(entryB.company) === normalize(entryA.company));
    const entryB = matchIndex !== -1 ? b[matchIndex] : null;
    if (matchIndex !== -1) usedB.add(matchIndex);

    const bulletsA = entryA.bullets.map(normalize);
    const bulletsB = (entryB?.bullets ?? []).map(normalize);
    const bullets: BulletDiff[] = [];

    entryA.bullets.forEach((text, i) => {
      bullets.push({ text, status: bulletsB.includes(bulletsA[i]) ? 'shared' : 'onlyA' });
    });
    if (entryB) {
      entryB.bullets.forEach((text, i) => {
        if (!bulletsA.includes(bulletsB[i])) bullets.push({ text, status: 'onlyB' });
      });
    }

    results.push({ company: entryA.company, titleA: entryA.title, titleB: entryB?.title ?? null, bullets });
  }

  // Any company in B that was never matched against A is a section that only
  // exists in version B — a real, different job listed in one version but not
  // the other, worth showing rather than silently dropping.
  b.forEach((entryB, i) => {
    if (usedB.has(i)) return;
    results.push({
      company: entryB.company,
      titleA: null,
      titleB: entryB.title,
      bullets: entryB.bullets.map((text) => ({ text, status: 'onlyB' as const })),
    });
  });

  return results;
}

export function diffResumes(a: StructuredResume, b: StructuredResume): ResumeDiff {
  const skillsA = new Set(a.skills.map(normalize));
  const skillsB = new Set(b.skills.map(normalize));

  return {
    summaryChanged: normalize(a.summary) !== normalize(b.summary),
    experience: matchExperience(a.experience, b.experience),
    skillsOnlyA: a.skills.filter((s) => !skillsB.has(normalize(s))),
    skillsOnlyB: b.skills.filter((s) => !skillsA.has(normalize(s))),
    skillsShared: a.skills.filter((s) => skillsB.has(normalize(s))),
  };
}
