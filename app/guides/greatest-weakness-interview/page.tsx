import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Answer "What Is Your Greatest Weakness?"',
  description: 'The fake-weakness trick ("I work too hard") doesn\'t work anymore. Here\'s a real answer structure that actually holds up.',
};

export default function GreatestWeaknessGuidePage() {
  return (
    <GuideLayout
      title='How to answer "What is your greatest weakness?"'
      subtitle="The old trick — disguising a strength as a weakness — is well-known enough now that it usually backfires. Here's what actually works."
      readTime="5 min read"
    >
      <p>
        &quot;I work too hard&quot; or &quot;I&apos;m too much of a perfectionist&quot; as a disguised-strength answer is a
        well-known enough trick by now that most interviewers see through it immediately, and it tends to read as either evasive
        or lacking real self-awareness — the opposite of what the question is actually trying to assess. The real point of this
        question isn&apos;t to catch you out. It&apos;s to see whether you can honestly evaluate yourself and whether you&apos;re
        actively working on something.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">A structure that holds up: real weakness, real context, real action</h2>
      <ol className="list-decimal pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Name a genuine, work-relevant weakness</strong> — not a disguised strength, and not something disqualifying for the role you&apos;re interviewing for.</li>
        <li><strong>Give brief, honest context</strong> for where it actually shows up, so it sounds like real self-knowledge rather than a rehearsed line.</li>
        <li><strong>Describe a specific, real action you&apos;ve taken</strong> to work on it — this is the part that actually matters most, and the part most answers skip.</li>
      </ol>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">An example that actually works</h2>
      <p>
        &quot;I tend to want to review every detail myself before handing off work, which doesn&apos;t scale well as a team grows.
        I noticed it slowing down my last team&apos;s delivery, so I started documenting my review criteria explicitly and doing
        spot-checks instead of reviewing everything — it took real, deliberate effort to trust the process, but it&apos;s made
        both my team faster and given me back real time.&quot;
      </p>
      <p>
        Notice this isn&apos;t a disguised strength — over-reviewing is a genuine, believable weakness — but it&apos;s specific,
        it shows real self-awareness about its actual impact, and it ends with a concrete action, not just an intention.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Pick a weakness that&apos;s real but not disqualifying</h2>
      <p>
        A weakness directly central to the core function of the role you&apos;re interviewing for is a genuinely risky choice —
        naming poor attention to detail for a QA role, for instance, works against you regardless of how well the rest of the
        answer is structured. A real weakness in a genuinely secondary area of the role is honest without being self-sabotaging.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Skip the fake-strength trick entirely</h2>
      <p>
        &quot;I care too much about my work&quot; or &quot;I&apos;m too much of a perfectionist&quot; are answers most
        interviewers have heard many times over, and recognizing the pattern immediately undercuts whatever credibility the rest
        of the interview built. A genuine, specific weakness — paired with real evidence you&apos;re actually working on it —
        is a stronger answer precisely because it&apos;s the less common, more honest choice.
      </p>
    </GuideLayout>
  );
}
