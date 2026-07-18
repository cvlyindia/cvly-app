import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Quantify Achievements on Your Resume (With Examples)',
  description: 'Why numbers make a resume bullet actually believable, how to find them even when you never tracked metrics, and real before/after examples.',
};

export default function QuantifyAchievementsGuidePage() {
  return (
    <GuideLayout
      title="How to quantify achievements on your resume"
      subtitle="A number doesn't just look impressive — it makes a claim believable in a way an adjective can't. Here's how to find yours."
      readTime="7 min read"
    >
      <p>
        &quot;Improved team performance&quot; and &quot;increased team output by 23% over two quarters&quot; are making the same
        basic claim. Only one of them sounds like something that actually happened. A number does something an adjective
        can&apos;t: it&apos;s specific enough to be checked, which makes it specific enough to be believed. That&apos;s the real
        reason quantified bullets read as stronger, not just that they look more impressive.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The transformation, in practice</h2>
      <ul className="list-disc pl-5 space-y-3 marker:text-[var(--accent-ink)]">
        <li>
          <span className="line-through text-[var(--muted)]">Managed social media accounts for the company.</span><br />
          Grew Instagram following from 4,200 to 18,500 in 8 months through a consistent posting schedule and paid campaigns.
        </li>
        <li>
          <span className="line-through text-[var(--muted)]">Responsible for customer support.</span><br />
          Resolved an average of 45 support tickets daily with a 96% first-contact resolution rate.
        </li>
        <li>
          <span className="line-through text-[var(--muted)]">Helped improve the sales process.</span><br />
          Redesigned the lead qualification process, cutting average deal cycle from 34 to 21 days.
        </li>
      </ul>
      <p>
        Notice the pattern: each rewrite isn&apos;t just longer — it replaces a vague verb-object pair with a specific before/after
        or a concrete rate. That&apos;s the actual mechanism, not just &quot;add more detail.&quot;
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What to do when you genuinely never tracked the numbers</h2>
      <p>
        This is the real, common blocker — plenty of real work was never measured in a way that left a clean number behind.
        A few honest ways to still find one:
      </p>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Scale, not precision.</strong> &quot;Managed a portfolio of roughly 30 client accounts&quot; is still a real, useful number, even if it&apos;s an honest approximation rather than an exact figure pulled from a report.</li>
        <li><strong>Frequency and volume.</strong> How often did you do the thing, and how much of it — weekly reports, daily transactions handled, number of people trained. These are usually easier to reconstruct honestly than a percentage improvement.</li>
        <li><strong>Time saved or time to completion.</strong> &quot;Cut onboarding time for new hires from two weeks to four days&quot; is a real, checkable claim even without a formal metrics dashboard behind it.</li>
        <li><strong>Scope.</strong> Team size managed, budget size handled, number of stakeholders coordinated — scope is a legitimate number even when outcome metrics genuinely don&apos;t exist for the work.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Never invent a number you can&apos;t stand behind</h2>
      <p>
        This deserves saying plainly: a fabricated metric is a real risk, not a shortcut — it&apos;s exactly the kind of specific
        claim an interviewer is most likely to ask a genuine follow-up question about, and a number you can&apos;t actually explain
        under a simple &quot;how did you measure that?&quot; does far more damage than a well-written bullet with no number at all.
        If you genuinely can&apos;t find or honestly estimate a real number for something, a strong qualitative bullet beats an
        invented quantitative one every time.
      </p>
    </GuideLayout>
  );
}
