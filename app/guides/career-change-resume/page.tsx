import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Write a Resume When Switching Industries',
  description: 'Standard resume advice assumes a straight-line career. Here\'s how to structure one when yours genuinely isn\'t — without hiding the switch.',
};

export default function CareerChangeGuidePage() {
  return (
    <GuideLayout
      title="How to write a resume when switching industries"
      subtitle="Standard resume advice assumes a straight-line career. Here's how to structure one when yours genuinely isn't."
      readTime="6 min read"
    >
      <p>
        Most resume advice quietly assumes a linear career — each role a logical next step from the last. A genuine industry
        switch breaks that assumption, and following the standard structure anyway (strict reverse-chronological, one role
        naturally leading to the next) can make a real, deliberate change look confusing rather than intentional. The fix isn&apos;t
        to hide the switch. It&apos;s to structure the resume around what actually transfers.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Lead with a summary that explains the &quot;why,&quot; briefly</h2>
      <p>
        This is one of the few cases where a short summary genuinely earns its place at the top. Two or three sentences
        connecting where you&apos;ve been to where you&apos;re going gives a reader the context to correctly interpret everything
        below it, rather than making them guess why a marketing manager is applying for a data analyst role. &quot;Marketing
        manager with four years leading data-driven campaign analysis, transitioning into a dedicated analytics role&quot; frames
        the whole resume that follows.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Reframe past roles around transferable substance, not job titles</h2>
      <p>
        A job title from a different industry can undersell directly relevant work. The fix isn&apos;t changing the title — it&apos;s
        making sure the bullets under it emphasize the transferable substance. A &quot;Marketing Manager&quot; bullet about
        building attribution models and running statistical significance tests on campaign performance is genuinely relevant
        experience for a data role, even though the job title alone wouldn&apos;t signal that.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">A skills section that bridges, not just lists</h2>
      <p>
        For a career changer specifically, a skills section grouped by relevance to the NEW field — rather than a flat list —
        does real work. Grouping &quot;Data & Analysis: SQL, A/B testing, statistical modeling&quot; separately from
        &quot;Marketing: campaign strategy, brand positioning&quot; helps a reader immediately see the overlap that makes the
        switch make sense, rather than making them piece it together themselves.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Real projects or certifications matter more here than in a linear resume</h2>
      <p>
        For a genuine industry switch, any real, concrete evidence of capability in the new field — a certification actually
        completed, a real project (even a personal one), relevant freelance work — carries more weight than it would on a
        straight-line resume, since it&apos;s direct evidence in the field you&apos;re moving into, not just an inference from
        adjacent experience. It&apos;s worth giving this its own clearly labeled section rather than burying it under education.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Don&apos;t apologize for the switch</h2>
      <p>
        Resume language that frames a career change defensively (&quot;despite having no formal background in...&quot;) undercuts
        the case before it&apos;s made. A confident, direct framing — genuine relevant experience, clearly connected, no
        apology — reads as a deliberate decision. That framing does more for how the switch is perceived than any single bullet
        point can.
      </p>
    </GuideLayout>
  );
}
