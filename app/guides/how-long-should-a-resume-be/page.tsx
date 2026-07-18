import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How Many Pages Should a Resume Be?',
  description: 'The honest answer depends on your experience, not a universal rule — here\'s how to actually decide, and how to cut down a resume that runs long.',
};

export default function ResumeLengthGuidePage() {
  return (
    <GuideLayout
      title="How many pages should a resume be?"
      subtitle="The honest answer depends on your experience, not a universal rule. Here's how to actually decide."
      readTime="4 min read"
    >
      <p>
        The real answer is &quot;as long as it needs to be to show your relevant experience, and not a line longer&quot; — which
        isn&apos;t satisfying as a rule, but it&apos;s the honest one. That said, there are real, useful defaults by experience
        level, and a length that&apos;s clearly out of line with them is usually a sign of padding or missing focus, not a genuine
        exception.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">By experience level</h2>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>0–3 years, freshers included:</strong> one page, close to a hard rule. There usually isn&apos;t enough distinct experience yet to justify more, and a second page tends to signal padding rather than substance.</li>
        <li><strong>4–10 years:</strong> one page is still ideal, two is acceptable if the content is genuinely dense with relevant, distinct experience — not stretched to fill the space.</li>
        <li><strong>10+ years, senior/leadership roles:</strong> two pages is normal and expected. Trying to compress fifteen years into one page usually means cutting real, relevant context that a hiring manager actually wants for a senior hire.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The real question isn&apos;t length — it&apos;s relevance</h2>
      <p>
        A one-page resume padded with irrelevant detail isn&apos;t better than a focused two-page one. The actual test: does every
        line on the page earn its place for the specific role being applied to. A resume that&apos;s the &quot;right&quot; length
        but full of generic, unspecific bullets is a bigger problem than one that runs slightly long with genuinely relevant detail.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">If a resume is running long, cut in this order</h2>
      <ol className="list-decimal pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Old, irrelevant roles first.</strong> A role from over a decade ago that has nothing to do with your current direction usually contributes less than it costs in space.</li>
        <li><strong>Generic bullets with no specific outcome.</strong> If a bullet doesn&apos;t contain something specific — a number, a real decision, a concrete result — it&apos;s often cuttable without real loss.</li>
        <li><strong>Redundant skills or tools already implied elsewhere.</strong> If a skill is already obvious from your job titles or project descriptions, listing it again separately rarely adds anything.</li>
        <li><strong>Formatting, not content, last.</strong> Tightening margins and font size is the least effective lever and the first one most people reach for — it should be the last, after the content itself has actually been trimmed.</li>
      </ol>
    </GuideLayout>
  );
}
