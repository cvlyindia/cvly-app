import type { Metadata } from 'next';
import { GuideLayout } from '@/components/GuideLayout';

export const metadata: Metadata = {
  title: 'How to Explain an Employment Gap on Your Resume',
  description: 'The honest way to handle a career gap — where to address it, how much to say, and why a short, confident line beats a long, defensive one.',
};

export default function EmploymentGapGuidePage() {
  return (
    <GuideLayout
      title="How to explain an employment gap on your resume"
      subtitle="A short, confident line does more work than a long, defensive one. Here's how to actually write it."
      readTime="6 min read"
    >
      <p>
        A gap in your work history — six months, a year, longer — feels like it needs a lot of explaining. In practice, it almost
        never does. Recruiters see gaps constantly: layoffs, health, caregiving, further study, a slow job market, a deliberate
        break. What actually raises a flag isn&apos;t the gap itself. It&apos;s a resume that seems to be working hard to hide one,
        with vague dates or unexplained inconsistencies that make a reader wonder what&apos;s not being said.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Say it plainly, briefly, once</h2>
      <p>
        The strongest way to handle a gap is usually the simplest: state it factually, in a few words, and move on. &quot;Career
        break, 2023&quot; or &quot;Family caregiving, Jan–Aug 2023&quot; as a line in your work history, in the same format as any
        other entry, does more good than a paragraph justifying it. A short, matter-of-fact line signals confidence. A long
        explanation — even a well-intentioned one — tends to signal the opposite, regardless of the actual reason.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">If something genuinely useful happened during the gap, say that instead</h2>
      <p>
        A certification completed, a course finished, freelance work taken on, a project shipped — if there&apos;s something real
        and relevant from that period, it deserves its own line, treated like any other credential, not folded into an apology for
        the time away. &quot;Completed AWS Solutions Architect certification, 2023&quot; reads as a genuine addition to your
        resume. It just happens to also cover the time gap, without ever needing to frame itself that way.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">What never actually helps</h2>
      <p>
        Inventing a job title, a freelance client, or a company that didn&apos;t exist to paper over the gap is the one thing worth
        naming directly as a bad idea — not because it&apos;s always caught (though background checks and reference calls do catch
        it more often than people expect), but because it turns a completely normal, explainable gap into a real, disqualifying
        problem if it ever surfaces. A gap is a non-issue for almost every recruiter. A fabricated job on a resume is not.
      </p>

      <h2 className="text-xl font-semibold text-[var(--ink)] pt-4">Save the full story for the interview, if it comes up at all</h2>
      <p>
        The resume&apos;s job is to get you to a conversation, not to pre-answer every question that conversation might raise. If a
        gap comes up in an interview, a calm, brief version of the truth — the same one that&apos;s already on your resume — is
        almost always enough. Most interviewers ask about a gap once, accept a straightforward answer, and move on to what they
        actually care about: whether you can do the job.
      </p>
    </GuideLayout>
  );
}
