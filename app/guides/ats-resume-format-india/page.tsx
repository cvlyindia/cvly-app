import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'ATS Resume Format Guide for Indian Job Seekers',
  description: 'How Applicant Tracking Systems actually read your resume, what breaks them, and how to format yours so it survives the first read — written for the Indian job market specifically.',
};

export default function ATSGuidePage() {
  return (
    <GuideLayout
      title="The ATS resume format guide for Indian job seekers"
      subtitle="How Applicant Tracking Systems actually read your resume, what quietly breaks them, and how to format yours so it survives the first read."
      readTime="8 min read"
    >
      <p>
        Most advice about &quot;beating the ATS&quot; treats it like a mysterious black box. It isn&apos;t. An Applicant Tracking System is
        just software that does two unglamorous jobs: it pulls the text out of your file, and it checks that text against the job
        description for relevant keywords. Almost every resume that gets silently rejected fails at the <em>first</em> job, not the
        second — the software simply couldn&apos;t read it correctly, so it never even got to judge your experience.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What actually breaks an ATS parse</h2>
      <p>
        These aren&apos;t opinions or best-guesses — they&apos;re structural facts about how parsing engines like the ones inside
        Workday, Greenhouse, and Taleo read a DOCX or PDF file:
      </p>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Tables.</strong> Content inside a table is often read in the wrong order, or skipped entirely, since the parser reads column-by-column or row-by-row depending on the engine — not the visual left-to-right order a human sees.</li>
        <li><strong>Multi-column layouts.</strong> Same root problem as tables — a two-column resume can get read top-to-bottom across both columns as if it were one column, scrambling your work history into nonsense.</li>
        <li><strong>Text boxes.</strong> Content placed in a text box (common in visually &quot;designed&quot; resume templates) is sometimes invisible to a parser entirely — it never gets extracted at all.</li>
        <li><strong>Headers and footers.</strong> Some ATS platforms skip header/footer content outright. If your name or contact details only live there, they may never be read.</li>
        <li><strong>Scanned images or photo uploads.</strong> If there&apos;s no actual selectable text — a photo of a resume, or a PDF exported from a scan — there&apos;s nothing for the parser to extract at all.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The format that survives</h2>
      <p>
        A single column. Standard section headings (&quot;Work Experience,&quot; &quot;Education,&quot; &quot;Skills&quot; — not
        creative alternatives like &quot;My Journey&quot;). Plain bullet points instead of tables for listing achievements. A real
        DOCX or PDF export, not a photo or a scan. None of this needs to look boring — clean, single-column resumes with clear
        typographic hierarchy still look genuinely professional. It just means the visual design lives in font weight, spacing, and
        color, not in structural tricks that a parser can&apos;t follow.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Keyword matching isn&apos;t magic — or keyword stuffing</h2>
      <p>
        The second job an ATS does is compare your resume&apos;s text against the job description&apos;s. This is usually simpler
        than people assume: it&apos;s largely looking for whether specific skills, tools, and qualifications mentioned in the
        posting also appear somewhere in your resume. That means two things in practice. First, if a posting asks for
        &quot;stakeholder management&quot; and your resume only says &quot;worked with teams,&quot; that&apos;s a real gap worth
        closing — not because the system is picky, but because a human reader would want to see that language too. Second, invisibly
        stuffing a resume with white-text keywords or a hidden keyword list doesn&apos;t work the way people hope — modern parsers
        generally strip formatting before matching, so hidden text gets read as visible text, and it just looks like spam to whoever
        reads it next.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What&apos;s different for the Indian job market specifically</h2>
      <p>
        A few conventions come up often enough in Indian hiring that they&apos;re worth calling out directly, since most ATS advice
        online is written for the US market and doesn&apos;t mention them:
      </p>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Notice period.</strong> Indian employers commonly expect to see this stated somewhere — either directly on the resume or in the application form. Leaving it out isn&apos;t wrong, but stating it clearly (&quot;Notice period: 30 days&quot; or &quot;Immediately available&quot;) removes a question a recruiter would otherwise have to chase down.</li>
        <li><strong>Personal details are declining, not required.</strong> Older Indian resume templates often included date of birth, marital status, or a photo. Most current hiring guidance — including from Indian recruiters themselves — now treats these as unnecessary at best, and a source of unconscious bias at worst. Leaving them off is increasingly the norm, not a gap.</li>
        <li><strong>Educational institution names carry real weight.</strong> Unlike some markets where this is downplayed, Indian ATS platforms and recruiters frequently filter specifically on institution and degree — make sure both are spelled out in full, not abbreviated in a way a parser might not recognize.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The honest limit of formatting advice</h2>
      <p>
        Getting the format right gets your resume <em>read</em>. It doesn&apos;t make thin experience look like strong experience,
        and it shouldn&apos;t — the best use of a clean format is making sure your real experience actually gets seen, not dressing
        up something that isn&apos;t there. If you&apos;re not sure whether your specific resume has a structural parsing problem
        versus a content problem, that&apos;s a genuinely different question, and it&apos;s worth checking directly rather than
        guessing from a general guide like this one.
      </p>
    </GuideLayout>
  );
}
