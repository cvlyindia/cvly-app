import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'The STAR Method for Behavioral Interview Questions',
  description: 'A real structure for "tell me about a time when" questions, with a worked example — and the part most people get wrong.',
};

export default function StarMethodGuidePage() {
  return (
    <GuideLayout
      title="The STAR method for behavioral interview questions"
      subtitle={"\"Tell me about a time when...\" questions reward structure over memory. Here's how STAR actually works, with a real example."}
      readTime="6 min read"
    >
      <p>
        Behavioral questions — &quot;tell me about a time you disagreed with a manager,&quot; &quot;describe a project that
        failed&quot; — are asking for a specific story with a specific shape, not a general philosophy. Answers that ramble
        without structure are the single most common reason a genuinely good story doesn&apos;t land. STAR is a simple structure
        that fixes that: Situation, Task, Action, Result.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The four parts, briefly</h2>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Situation.</strong> The real context — brief, just enough for the story to make sense. One or two sentences, not a full backstory.</li>
        <li><strong>Task.</strong> What you specifically were responsible for or needed to solve. This is where a lot of answers blur — be specific about what was actually yours to handle, not the team&apos;s in general.</li>
        <li><strong>Action.</strong> What you actually did — this is the part worth spending the most time on, and the part most answers rush past to get to the result.</li>
        <li><strong>Result.</strong> What happened, ideally with a real, specific outcome — and if there&apos;s a genuine lesson or what you&apos;d do differently, that&apos;s worth a closing sentence too.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">A worked example</h2>
      <p>
        Question: &quot;Tell me about a time you had to deliver difficult feedback.&quot;
      </p>
      <p>
        <strong>Situation:</strong> A developer on my team was consistently missing sprint deadlines, and it was starting to
        affect the rest of the team&apos;s planning.
      </p>
      <p>
        <strong>Task:</strong> As the lead, I needed to address it directly without damaging the relationship or making them
        defensive, since I suspected there was a real reason behind it.
      </p>
      <p>
        <strong>Action:</strong> I set up a private one-on-one rather than raising it in standup, asked directly what was making
        estimates hard rather than opening with the missed deadlines, and learned they were stuck on an unfamiliar part of the
        codebase and hadn&apos;t wanted to ask for help. We agreed on a plan: pairing with a senior engineer for the next two
        sprints and flagging blockers earlier instead of quietly working through them.
      </p>
      <p>
        <strong>Result:</strong> Their estimates became reliable within a month, and the earlier-flagging habit ended up helping
        the whole team&apos;s planning, not just theirs.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">The part almost everyone underweights: Action</h2>
      <p>
        The most common structural mistake is spending 80% of the answer on Situation and Task, then rushing Action and Result
        into a single sentence. Action is the part that actually answers what an interviewer is trying to learn — what YOU did,
        specifically, not what the team or the situation did. If Action is the shortest part of your answer, it&apos;s usually
        worth restructuring before the interview, not during it.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Prepare stories, not scripts</h2>
      <p>
        Trying to have a perfectly memorized answer for every possible behavioral question isn&apos;t realistic and tends to sound
        rehearsed when it works and falls apart when it doesn&apos;t. A more durable approach: prepare four or five real stories
        that cover common themes (a conflict, a failure, a leadership moment, a tight deadline), know their STAR shape well, and
        adapt the framing to whatever specific question comes up. The structure stays the same; the story you reach for changes.
      </p>
    </GuideLayout>
  );
}
