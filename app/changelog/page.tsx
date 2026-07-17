import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Sparkles, Wrench, ShieldCheck } from 'lucide-react';
import { AmbientBackground } from '@/components/AmbientBackground';

type EntryType = 'new' | 'improved' | 'fixed';

const TYPE_META: Record<EntryType, { label: string; icon: typeof Sparkles; className: string }> = {
  new: { label: 'New', icon: Sparkles, className: 'bg-[var(--accent-soft)] text-[var(--accent-ink)]' },
  improved: { label: 'Improved', icon: Wrench, className: 'bg-[var(--cyan-soft)] text-[#0E7C93]' },
  fixed: { label: 'Fixed', icon: ShieldCheck, className: 'bg-[var(--good-bg)] text-[var(--good)]' },
};

interface Entry {
  type: EntryType;
  title: string;
  body: string;
}

interface Release {
  period: string;
  entries: Entry[];
}

const RELEASES: Release[] = [
  {
    period: 'July 2026',
    entries: [
      {
        type: 'new',
        title: 'Real payments are live',
        body: 'Pro subscriptions and credit top-up packs, both powered by Razorpay, both working with real money — not a "coming soon" anymore.',
      },
      {
        type: 'new',
        title: 'Priority processing for Pro',
        body: 'Pro and Enterprise generations race against a backup provider automatically, so a slow moment from our primary AI provider doesn\'t mean a slow result for you.',
      },
      {
        type: 'improved',
        title: 'A full visual refresh',
        body: 'Brighter, more alive, still built around the same trust-first promise underneath it.',
      },
      {
        type: 'fixed',
        title: 'PDF upload reliability',
        body: 'Found and fixed a real bug where certain PDF files were silently failing to upload. If you had trouble before, it should work now.',
      },
    ],
  },
  {
    period: 'Earlier this year',
    entries: [
      {
        type: 'new',
        title: 'Chrome extension',
        body: 'Grab a job description right from the posting — Naukri, LinkedIn, Indeed — without copy-pasting anything. Signed-in users can score instantly, right in the popup.',
      },
      {
        type: 'new',
        title: 'LinkedIn and Portfolio review',
        body: 'Paste your profile or portfolio, get honest feedback. Kept free for every account, not gated behind Pro.',
      },
      {
        type: 'new',
        title: 'Application tracker',
        body: 'A simple Kanban board — Saved, Applied, Interview, Offer — so your job search lives in one place instead of a dozen browser tabs.',
      },
      {
        type: 'new',
        title: 'Parse Safety check',
        body: 'We actually open your file\'s structure — tables, columns, text boxes, hidden headers — the same things that break real ATS platforms like Workday and Greenhouse. Not a guess from an AI, a real check.',
      },
      {
        type: 'improved',
        title: 'The no-fabrication rule',
        body: 'Enforced in the instructions behind every single generation: we never invent a company, a title, or a number that isn\'t already in your resume.',
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen relative">
      <AmbientBackground />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition mb-10">
          <ArrowLeft size={15} /> Back to Cvly
        </Link>

        <div className="flex items-center gap-2.5 mb-2">
          <Image src="/logo.png" alt="Cvly" width={28} height={26} className="rounded-md" />
          <span className="font-bold text-[17px]">Cvly</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Changelog</h1>
        <p className="text-sm text-[var(--muted)] mb-12">
          What&apos;s actually shipped, in plain language — same rule as everything else here: nothing on this page that isn&apos;t real.
        </p>

        <div className="space-y-14">
          {RELEASES.map((release) => (
            <div key={release.period}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-5">{release.period}</h2>
              <div className="space-y-5">
                {release.entries.map((entry) => {
                  const meta = TYPE_META[entry.type];
                  const Icon = meta.icon;
                  return (
                    <div key={entry.title} className="card rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${meta.className}`}>
                          <Icon size={10} /> {meta.label}
                        </span>
                        <p className="text-sm font-semibold">{entry.title}</p>
                      </div>
                      <p className="text-sm text-[var(--muted)] leading-relaxed">{entry.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
