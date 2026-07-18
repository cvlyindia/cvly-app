import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Write a Cover Letter That Gets Read',
  description: 'Why most cover letters get skipped, what actually earns a second look, and a real structure to follow — not another "Dear Hiring Manager" template.',
};

export default function CoverLetterGuidePage() {
  return (
    <GuideLayout
      title="How to write a cover letter that doesn't get ignored"
      subtitle="Most cover letters get skimmed in ten seconds or skipped entirely. Here's what actually earns the other kind of read."
      readTime="6 min read"
    >
      <p>
        Recruiters skim cover letters, not read them — that&apos;s the honest starting point most advice skips. Knowing that changes
        what&apos;s worth writing. A cover letter&apos;s job isn&apos;t to repeat your resume in paragraph form. It&apos;s to answer
        one specific question a resume can&apos;t: <em>why this role, and why you, specifically</em> — in a way that&apos;s fast to
        skim and hard to skip past.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Skip the opening every recruiter has read a thousand times</h2>
      <p>
        &quot;I am writing to apply for the position of X at Y&quot; tells a reader nothing they don&apos;t already know from the
        subject line. That sentence is the single most common reason a skim stops right there. Open instead with the most specific,
        relevant thing about you — a real result, a specific shared interest in the company&apos;s actual work, or a direct
        connection to what the role needs. &quot;I led the redesign that took our checkout conversion from 2.1% to 3.4%&quot; earns
        a second sentence. A generic opening usually doesn&apos;t.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">One real story beats five generic claims</h2>
      <p>
        &quot;I am a hardworking team player with strong communication skills&quot; is a sentence that could describe anyone, which
        means it tells a reader nothing about you specifically. A single concrete example — a real project, a real number, a real
        decision you made — does more work than five adjectives strung together, because it&apos;s the kind of detail that&apos;s
        actually hard to fake and easy to remember. Pick the ONE story from your experience that most directly matches what this
        specific role needs, and spend your limited space on that, not a summary of everything you&apos;ve ever done.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Address the job description, not a generic version of the role</h2>
      <p>
        A cover letter that could be sent to any company for any similar-sounding role reads as exactly that — generic, and usually
        unread past the first paragraph. Naming something specific from the actual job posting (a technology they use, a problem
        they describe, a value they state) signals you actually read it, which is a real, if small, thing that separates a letter
        from a template. This doesn&apos;t mean quoting the posting back at them — it means letting it visibly shape what you chose
        to write about.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Length: shorter than you think</h2>
      <p>
        Three short paragraphs, not one long page. Opening hook, one real story that proves you can do the job, a brief close that
        states genuine interest and next steps. If a cover letter takes more than 30 seconds to skim, most of it won&apos;t get
        read at all — the goal is density, not completeness.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What to close with</h2>
      <p>
        Not &quot;I look forward to hearing from you&quot; — that&apos;s another line every recruiter has read a thousand times. A
        specific, confident close works better: what you&apos;re genuinely looking forward to about the role itself, or a direct,
        simple statement that you&apos;d welcome the chance to talk. Confidence reads better than politeness for its own sake.
      </p>
    </GuideLayout>
  );
}
