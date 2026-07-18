import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Common Resume Mistakes That Get You Rejected',
  description: 'The mistakes that quietly cost interviews — not typos, the structural and content problems that are easy to miss in your own resume.',
};

export default function ResumeMistakesGuidePage() {
  return (
    <GuideLayout
      title="Common resume mistakes that get you rejected"
      subtitle="Not typos — the structural and content problems that are genuinely easy to miss when it's your own resume."
      readTime="7 min read"
    >
      <p>
        Most resume-mistake lists lead with typos and spelling errors, which are real but usually caught by a basic proofread.
        The mistakes that quietly cost interviews are harder to spot in your own resume precisely because they don&apos;t look
        wrong — they look like reasonable choices at the time. These are the ones worth actually checking for.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Describing responsibilities instead of outcomes</h2>
      <p>
        &quot;Responsible for managing client relationships&quot; describes a job description, not an achievement — it says what
        you were assigned, not what you actually did with it. &quot;Grew three client accounts from month-to-month contracts to
        annual retainers&quot; describes the same role but shows the outcome. A resume full of responsibility statements reads as
        a job description restated, not evidence of impact.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">One resume for every application</h2>
      <p>
        A resume that never changes between applications is optimized for no specific role, which in practice means it&apos;s
        under-optimized for all of them. This doesn&apos;t mean rewriting from scratch each time — it means the emphasis,
        keyword alignment, and which achievements get top billing should shift based on what the specific posting actually asks
        for. A generalist resume applied everywhere tends to underperform a tailored one applied more selectively.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Burying the most relevant experience</h2>
      <p>
        Strict reverse-chronological order is the default, and it&apos;s not always the right choice — if your most relevant
        experience for a specific role isn&apos;t your most recent job, it can end up buried below less relevant, more recent
        roles. It&apos;s worth checking: does the first third of the resume contain the strongest, most relevant case for this
        specific role, or does a reader have to dig for it.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Formatting that fights the ATS, not just looks</h2>
      <p>
        Tables, multi-column layouts, and text boxes can look clean to a human eye and still be structurally unreadable to the
        parsing software many companies use before a human ever sees the resume. This is a genuinely separate problem from how a
        resume looks — a resume can look polished and still fail this check, which is why it&apos;s worth verifying structurally,
        not just visually.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">An objective statement that says nothing specific</h2>
      <p>
        &quot;Seeking a challenging role where I can grow and contribute&quot; is true of almost every candidate for almost every
        role, which means it communicates nothing a recruiter can actually use. If a summary or objective is included at all, it
        should be specific enough that it couldn&apos;t be copy-pasted onto a stranger&apos;s resume without anyone noticing.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Inconsistent formatting from copy-pasting between sections</h2>
      <p>
        Mismatched date formats, some bullets ending in periods and others not, font sizes that drift slightly between sections —
        each individually minor, but together they read as a lack of attention to detail, which is a real, if unfair, inference a
        recruiter is likely to make in the few seconds they spend on a first pass.
      </p>
    </GuideLayout>
  );
}
