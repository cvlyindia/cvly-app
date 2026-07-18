import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Structure a Portfolio That Gets You Hired',
  description: 'What to lead with, how many projects is actually enough, and the write-up structure that makes a project worth clicking into.',
};

export default function PortfolioGuidePage() {
  return (
    <GuideLayout
      title="How to structure a portfolio that gets you hired"
      subtitle="A portfolio isn't a gallery — it's an argument for why you're worth hiring. Here's how to structure it like one."
      readTime="6 min read"
    >
      <p>
        A common portfolio mistake is treating it like an archive — everything you&apos;ve ever made, in chronological order,
        with no explanation of why any of it matters. A hiring manager clicking through a portfolio is looking for evidence of
        specific things: can this person actually do the work, and do they think clearly about problems. A portfolio structured
        around answering those two questions works harder than one structured around &quot;here&apos;s everything I&apos;ve done.&quot;
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Fewer projects, more depth</h2>
      <p>
        Three to five strong, well-explained projects beat ten thin ones almost every time. A reviewer spending thirty seconds on
        each of ten projects learns less than one spending three minutes on each of four — depth is what actually demonstrates
        thinking, and thin coverage of many projects tends to read as exactly that. If a project doesn&apos;t have a real story
        behind it, it&apos;s usually better left out than included just to pad the count.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Every project needs a write-up, not just the output</h2>
      <p>
        The finished image, the live site, the deck — that&apos;s the output. What&apos;s usually missing is the thinking behind
        it, which is actually what a reviewer is trying to evaluate. A short write-up for each project should cover: what the
        actual problem or brief was, what decisions you made and why, and what the outcome was. &quot;I designed this landing
        page&quot; shows the output. &quot;The brief was to increase signup conversion for a B2B trial — I simplified the form
        from 6 fields to 2 and moved social proof above the fold, which took conversion from 2.8% to 4.1%&quot; shows the thinking,
        which is the part a hiring manager actually can&apos;t get from the image alone.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Lead with your strongest work, not your most recent</h2>
      <p>
        Chronological order is the default most portfolio tools ship with, and it&apos;s rarely the right order to actually use.
        A reviewer often doesn&apos;t make it past the first one or two projects. Leading with your strongest, most relevant piece
        — not necessarily your newest — means the work most likely to earn attention is the work that actually gets seen.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Tailor the order (or the selection) to the role</h2>
      <p>
        If you have range — say, both brand design and product design work — leading with whichever is most relevant to the
        specific role you&apos;re applying for matters more than showing everything you can do upfront. A portfolio doesn&apos;t
        need to prove range in the first three projects; it needs to prove fit for the role in front of the person looking at it.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Include real constraints and failures, not just polished wins</h2>
      <p>
        A project that only shows the finished, successful result tells a reviewer you can execute. Briefly mentioning a real
        constraint you worked within, or a decision that didn&apos;t work and what you changed because of it, tells them you can
        think under real conditions — which is closer to what the actual job will require than a portfolio of exclusively
        frictionless successes.
      </p>
    </GuideLayout>
  );
}
