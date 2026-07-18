import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Optimize Your LinkedIn Profile for Recruiters',
  description: 'What actually makes a recruiter stop scrolling — the headline, the About section, and the details most profiles get wrong.',
};

export default function LinkedInOptimizationGuidePage() {
  return (
    <GuideLayout
      title="How to optimize your LinkedIn profile for recruiters"
      subtitle="Recruiters skim dozens of profiles a day. Here's what actually makes one worth a second look."
      readTime="7 min read"
    >
      <p>
        A LinkedIn profile gets judged differently than a resume — it&apos;s skimmed, often on a phone, often as part of a search
        result among dozens of others. That changes what&apos;s worth optimizing. The goal isn&apos;t to cram in everything
        you&apos;ve ever done. It&apos;s to make the first three seconds — headline, photo, top of the About section — worth
        stopping for.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The headline is doing more work than you think</h2>
      <p>
        By default, LinkedIn fills your headline with your current job title and company. That&apos;s the single most common
        missed opportunity on the platform — it&apos;s prime, always-visible real estate, and a plain job title tells a recruiter
        nothing they couldn&apos;t get from your job title itself. A stronger headline states what you actually do and for whom,
        in language a recruiter searching for that skill set would use. &quot;Backend Engineer&quot; is a title. &quot;Backend
        Engineer building high-throughput payment systems — Python, AWS, Kafka&quot; is a headline that shows up in more relevant
        searches and tells a human reader something real in one line.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The About section: write it like a person, not a resume</h2>
      <p>
        The most common mistake here is pasting a resume summary — third-person, bullet points, no voice. The About section is
        the one place on the platform written in first person by design; using it that way is what makes it worth reading. A short
        opening about what you actually care about in your work, one or two real examples of impact, and what you&apos;re looking
        for next — written like you&apos;re actually talking to someone, not filing a report. Three to five short paragraphs is
        usually enough; this isn&apos;t the place for your entire career history.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Skills: list what recruiters actually search for</h2>
      <p>
        LinkedIn&apos;s recruiter search tool matches heavily on the Skills section — genuinely more than most people realize. A
        skills list padded with soft, unsearchable terms (&quot;team player,&quot; &quot;fast learner&quot;) does little for
        discoverability. Specific, concrete, searchable skills — the actual tools, languages, and named methodologies you use —
        are what surface a profile in the searches that matter. Aim for the skills genuinely central to the roles you want, not
        an exhaustive list of everything you&apos;ve ever touched.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">&quot;Open to work&quot;: the setting most people get wrong</h2>
      <p>
        LinkedIn&apos;s Open to Work feature has two visibility modes: visible to recruiters only, or visible to everyone,
        including a public banner on your photo. If you&apos;re currently employed and job searching quietly, the
        recruiters-only setting exists specifically for this — it signals your availability to people actually hiring without
        broadcasting it to your current employer&apos;s network. Choosing the public banner while still employed is one of the
        more common, avoidable mistakes people make on the platform.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">A little real activity beats a static profile</h2>
      <p>
        A profile that&apos;s never been touched since it was created reads as exactly that. It doesn&apos;t take much — genuinely
        engaging with a handful of posts in your field, occasionally sharing something real you&apos;ve worked on — signals an
        active, current presence rather than an abandoned one, and recruiters do notice the difference when they click through.
      </p>
    </GuideLayout>
  );
}
