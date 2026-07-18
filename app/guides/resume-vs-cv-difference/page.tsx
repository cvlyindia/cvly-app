import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'Resume vs CV: What\'s the Actual Difference?',
  description: 'They\'re not interchangeable everywhere, and using the wrong one for the wrong audience genuinely matters. Here\'s the real distinction.',
};

export default function ResumeVsCvGuidePage() {
  return (
    <GuideLayout
      title="Resume vs CV: what's the actual difference?"
      subtitle="They're not interchangeable everywhere, and using the wrong one for the wrong audience genuinely matters."
      readTime="4 min read"
    >
      <p>
        In everyday Indian usage, &quot;CV&quot; and &quot;resume&quot; are often used to mean the same one-to-two-page document,
        and for most private-sector job applications, that&apos;s functionally fine. The real distinction matters more in two
        specific contexts: applying internationally, and applying for academic or research positions.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The core difference</h2>
      <p>
        A resume is a short, targeted summary — one to two pages, tailored to a specific role, focused on relevant experience.
        A CV (curriculum vitae, literally &quot;course of life&quot;) is a comprehensive, chronological record of your entire
        academic and professional history — publications, presentations, grants, teaching experience, every credential — and it
        grows longer over a career rather than staying a fixed length.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Where the terms genuinely diverge by country</h2>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>United States and Canada:</strong> &quot;resume&quot; is standard for private-sector jobs; &quot;CV&quot; specifically means the long-form academic document, mainly used for academic, research, or medical positions.</li>
        <li><strong>United Kingdom, Ireland, and much of Europe:</strong> &quot;CV&quot; is the standard term for what Americans would call a resume — a normal one-to-two-page job application document, not necessarily the long academic form.</li>
        <li><strong>India:</strong> both terms are used, often interchangeably, for the standard short document — but if applying to a US company or an academic/research role specifically, it&apos;s worth matching their expected format rather than assuming the terms mean the same thing there too.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The practical takeaway</h2>
      <p>
        If a US-based company or a UK-based one asks for a &quot;CV,&quot; send your normal resume — that&apos;s what they mean.
        If applying for an academic, research, or medical position specifically (regardless of country), a genuine long-form CV
        is usually expected — a comprehensive record, not the tailored one-to-two-page document used for standard job
        applications. When in doubt, matching the length and structure other successful candidates in that specific field or
        country typically use is a safer bet than guessing from the term alone.
      </p>
    </GuideLayout>
  );
}
