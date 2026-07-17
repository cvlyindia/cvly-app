import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Resume Format for Freshers (First Job) in India',
  description: 'What to lead with when you have no work experience yet, how to make projects and internships count, and the mistakes that quietly cost freshers interviews.',
};

export default function FresherResumeGuidePage() {
  return (
    <GuideLayout
      title="Resume format for freshers: your first job in India"
      subtitle="No work experience isn't a gap to hide — it just means the resume needs to lead with different things. Here's what actually works."
      readTime="7 min read"
    >
      <p>
        Most resume advice assumes you already have a job history to organize. If you don&apos;t — because you&apos;re a student,
        a recent graduate, or making your first real job search — that advice mostly doesn&apos;t apply, and following it anyway is
        how you end up with a resume that&apos;s three-quarters empty space and a vague objective statement at the top. The actual
        fix isn&apos;t to pad what you don&apos;t have. It&apos;s to lead with what you do.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What actually goes first</h2>
      <p>
        For a fresher, education and projects usually deserve the top of the resume, not the bottom — that&apos;s a reversal of
        where they&apos;d sit on an experienced professional&apos;s resume, and it&apos;s the right one. A recruiter reading a
        fresher&apos;s resume is not expecting five years of job titles. They&apos;re looking for signal that you can actually do
        the work: relevant coursework, real projects, internships, and any hands-on experience that demonstrates it — in that rough
        order of how concrete and provable it is.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Treat projects like work experience — because they are</h2>
      <p>
        This is the single biggest lever a fresher has, and the one most underused. A college project, a personal build, a
        hackathon entry — these should be written the same way you&apos;d describe a job: what the goal was, what you actually did,
        and what the measurable outcome was. &quot;Built a food delivery app for a class project&quot; says almost nothing. &quot;Built
        a food delivery app handling 200+ concurrent orders in load testing, using React Native and a Node.js backend&quot; says a
        great deal — it shows scope, technology, and a real number, exactly the same way a strong bullet point would for a paid
        job. If you can&apos;t attach a real number to a project yet, a specific technical detail does similar work.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Skip the generic objective statement</h2>
      <p>
        &quot;Seeking a challenging position where I can utilize my skills and grow professionally&quot; tells a recruiter
        nothing they couldn&apos;t assume already, and it costs you the most valuable space on the page — the first thing anyone
        actually reads. If you include a summary at all, make it two lines, specific to the type of role, and backed by something
        real: &quot;Computer Science graduate with three shipped personal projects in full-stack web development, seeking a
        frontend engineering role.&quot; That&apos;s a sentence a recruiter can actually act on.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">One page, genuinely</h2>
      <p>
        For a fresher specifically, a one-page resume isn&apos;t a stylistic preference — it&apos;s close to a hard rule. There
        usually isn&apos;t enough real, distinct experience yet to justify a second page, and stretching content to fill one
        signals padding rather than substance. If you&apos;re finding it hard to fill one page, that&apos;s useful information
        too — it usually means leaning harder into project detail rather than adding a coursework list of every subject you&apos;ve
        ever studied.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The mistakes that quietly cost interviews</h2>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Listing every course you&apos;ve taken.</strong> A recruiter doesn&apos;t need your full transcript — a short &quot;Relevant Coursework&quot; line naming 4-5 specific, role-relevant subjects does more than a long list that dilutes attention.</li>
        <li><strong>Describing projects by what tools were used, not what was built.</strong> &quot;Used Python, Pandas, and Matplotlib&quot; is a tool list. &quot;Analyzed 50,000 rows of sales data to identify a 12% drop-off point in the customer funnel&quot; is a project — name the tools too, just not instead of the substance.</li>
        <li><strong>A vague skills section with no proof anywhere else on the resume.</strong> If &quot;Leadership&quot; is listed as a skill, something elsewhere on the resume — a project, a college club role, an internship — should actually demonstrate it. An unsupported skill list reads as filler.</li>
      </ul>
    </GuideLayout>
  );
}
