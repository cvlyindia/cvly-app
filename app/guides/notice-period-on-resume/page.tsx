import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Mention Notice Period on Your Resume',
  description: 'Where to put your notice period, how to phrase it for different situations, and real examples — written for how Indian hiring actually works.',
};

export default function NoticePeriodGuidePage() {
  return (
    <GuideLayout
      title="How to mention your notice period on a resume"
      subtitle="Where it goes, how to phrase it for your actual situation, and why leaving it out usually costs you time, not saves it."
      readTime="5 min read"
    >
      <p>
        Notice period is one of those details that barely comes up in US or UK resume advice, but is a routine, expected line item
        in Indian hiring — recruiters often filter candidates by it before they even open the resume. Leaving it out doesn&apos;t
        make you look more flexible. It usually just means a recruiter has to reach out and ask, which slows down a process that
        could&apos;ve moved faster with one clear line.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Where it actually belongs</h2>
      <p>
        Not as its own resume section — that reads as oddly formal. The two places it genuinely works:
      </p>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>In your header, alongside your contact details.</strong> A short line like &quot;Notice period: 30 days&quot; sitting next to your email and phone number is the cleanest, most common placement — visible immediately, doesn&apos;t interrupt your actual experience section.</li>
        <li><strong>In the application form itself, when there is one.</strong> Most job portals and ATS application flows have a dedicated field for this. When that exists, it usually doesn&apos;t need to live on the resume at all — check the application form before assuming you need to add it manually.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">How to phrase it, by situation</h2>
      <p>The exact wording should match your real situation — vague phrasing here tends to raise more questions than it answers:</p>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Currently employed, standard notice:</strong> &quot;Notice period: 30 days&quot; or &quot;60 days&quot; — whatever your actual contractual notice is. Don&apos;t round down hoping to seem more available; it just creates a mismatch later in the process.</li>
        <li><strong>Serving notice already:</strong> &quot;Currently serving notice period, last working day: [date]&quot; — this is a genuinely strong signal to a recruiter, since your actual availability date is concrete, not an estimate.</li>
        <li><strong>Immediately available:</strong> &quot;Immediately available&quot; or &quot;Available to join immediately&quot; — simple, no need to explain why unless asked directly in an interview.</li>
        <li><strong>Notice period is negotiable (e.g., willing to buy it out):</strong> &quot;Notice period: 60 days (negotiable)&quot; — this one specific word does real work, since it signals flexibility without you having to explain the mechanics of a buyout on the resume itself.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What not to do</h2>
      <p>
        Don&apos;t leave it blank hoping it won&apos;t matter — for roles with any urgency to fill, it&apos;s often one of the first
        filters applied, before your experience is even weighed. And don&apos;t overstate your availability to seem more attractive;
        a recruiter who schedules a start date around inaccurate information loses trust fast, and it&apos;s an easy thing to get
        right the first time.
      </p>
    </GuideLayout>
  );
}
