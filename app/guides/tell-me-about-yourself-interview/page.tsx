import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Answer "Tell Me About Yourself" in an Interview',
  description: 'A real structure for the question every interview opens with — what to actually say, how long to talk, and the mistakes that lose the room in the first minute.',
};

export default function TellMeAboutYourselfGuidePage() {
  return (
    <GuideLayout
      title='How to answer "Tell me about yourself"'
      subtitle="It's usually the very first question, which means it sets the tone for everything after it. Here's a real structure, not just 'be confident.'"
      readTime="6 min read"
    >
      <p>
        This is close to a universal opening question, which means it&apos;s worth actually preparing for specifically, not
        winging it because it &quot;seems easy.&quot; The honest reason it trips people up: it&apos;s not really asking for your
        life story. It&apos;s asking for a short, relevant pitch — and without a structure, most answers either ramble too long or
        default to reading the resume back out loud, neither of which uses the moment well.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">A structure that actually works: present, past, future</h2>
      <p>
        Three short parts, roughly 60-90 seconds total:
      </p>
      <ul className="list-disc pl-5 space-y-2 marker:text-[var(--accent-ink)]">
        <li><strong>Present.</strong> What you do right now, in one sentence — your current role and the core of what it involves.</li>
        <li><strong>Past.</strong> The one or two career moments that most directly explain how you got here and why they&apos;re relevant to this specific interview — not a full timeline, just the parts that build toward the role you&apos;re interviewing for.</li>
        <li><strong>Future.</strong> Why this role, specifically, is the next right step — connecting your trajectory to what they&apos;re actually hiring for.</li>
      </ul>
      <p>
        This structure does two things at once: it&apos;s naturally short (each part is one or two sentences), and it ends by
        pointing directly at the job in front of you, which is a stronger close than trailing off after a list of past
        responsibilities.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Don&apos;t read your resume out loud</h2>
      <p>
        An interviewer already has your resume. Repeating it chronologically — &quot;I started as X, then I became Y, then I moved
        to Z&quot; — wastes the one part of the interview that&apos;s entirely open-ended and uses it to repeat information
        they&apos;ve already seen. This is the actual moment to add something the resume can&apos;t: what connects the roles, what
        you learned that isn&apos;t in a bullet point, why this next step makes sense as a story, not just a list.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Tailor the &quot;future&quot; part to the actual role every time</h2>
      <p>
        The present and past parts of your answer can stay fairly consistent across interviews — but the closing &quot;future&quot;
        part should genuinely change based on the specific job and company in front of you. A generic close (&quot;I&apos;m looking
        for a new challenge&quot;) undercuts an otherwise strong answer. A specific one — naming something real about this role or
        company that connects to your own trajectory — is what makes the whole answer feel intentional rather than rehearsed.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Practice it out loud, not just in your head</h2>
      <p>
        An answer that sounds complete in your head often runs long or loses structure the first time it&apos;s actually spoken —
        that&apos;s normal, and it&apos;s exactly why rehearsing out loud once or twice, even alone, closes the gap between the two.
        The goal isn&apos;t to memorize a script word for word — a memorized answer tends to sound memorized. It&apos;s to know the
        three beats well enough that you can hit them naturally, in your own words, under real interview nerves.
      </p>
    </GuideLayout>
  );
}
