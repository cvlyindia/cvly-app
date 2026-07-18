import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Explain Being Laid Off or Let Go',
  description: 'A layoff and a performance-related exit need different honest framings. Here\'s how to talk about either without over-explaining.',
};

export default function LaidOffGuidePage() {
  return (
    <GuideLayout
      title="How to explain being laid off or let go"
      subtitle="A layoff and a performance-related exit call for genuinely different honest framings. Here's how to handle either."
      readTime="6 min read"
    >
      <p>
        These are two different situations that get lumped together, and they deserve different handling. A layoff — a company
        reducing headcount, a restructuring, a role eliminated — reflects a business decision, not a judgment about you
        specifically. Being let go for performance or fit is a different, more personal situation, and pretending otherwise in
        an interview tends to backfire if it comes up in a reference check.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">If it was a genuine layoff: say so plainly, with real context</h2>
      <p>
        Layoffs are common enough now that they carry little stigma on their own — how you talk about it is what actually
        matters. A simple, factual line works: &quot;My role was eliminated as part of a company-wide restructuring in [month] —
        about 15% of the team was affected.&quot; That specific detail (a real number, a real reason) reads as far more credible
        than a vague &quot;the company was going through some changes.&quot; If you know your former employer will confirm this
        was a layoff and not a performance exit, saying so directly removes any doubt.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">If it was performance or fit-related: brief, honest, forward-looking</h2>
      <p>
        This is harder to talk about, and the instinct to either over-explain or deflect blame entirely usually makes it worse,
        not better. A short, honest framing that takes real ownership without excessive self-criticism tends to land better than
        either extreme: &quot;It wasn&apos;t the right fit, and looking back, I underestimated how different the pace and
        expectations were from my previous role. I&apos;ve since [specific thing you changed or learned] and made sure to ask
        more direct questions about expectations in interviews since.&quot; The goal isn&apos;t a confession — it&apos;s a short,
        credible answer that shows you learned something real, then a pivot back to what you bring now.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Don&apos;t volunteer more than what&apos;s asked</h2>
      <p>
        A brief, confident answer to a direct question is usually enough — most interviewers ask once, get a reasonable answer,
        and move on to what they actually care about, which is whether you can do the job in front of you now. Over-explaining
        past what was actually asked tends to invite more follow-up questions than a short, complete answer does.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">On the resume itself: keep it simple</h2>
      <p>
        The resume doesn&apos;t need to explain why a role ended — that&apos;s a conversation for the interview, not a line item.
        A clean end date is enough. If there&apos;s a real gap afterward worth addressing, that&apos;s a separate, shorter
        conversation about the gap itself, not about why the previous role ended.
      </p>
    </GuideLayout>
  );
}
