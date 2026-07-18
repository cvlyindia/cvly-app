import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AmbientBackground } from '@/components/AmbientBackground';

export const metadata: Metadata = {
  title: 'Guides',
  description: 'Real, specific advice on resumes, ATS systems, and job hunting — written for the Indian job market.',
};

const GUIDES = [
  {
    href: '/guides/ats-resume-format-india',
    title: 'The ATS resume format guide for Indian job seekers',
    description: 'How Applicant Tracking Systems actually read your resume, what quietly breaks them, and how to format yours so it survives the first read.',
    readTime: '8 min read',
  },
  {
    href: '/guides/quantify-resume-achievements',
    title: 'How to quantify achievements on your resume',
    description: 'A number doesn\'t just look impressive — it makes a claim believable in a way an adjective can\'t. Here\'s how to find yours.',
    readTime: '7 min read',
  },
  {
    href: '/guides/resume-for-freshers-india',
    title: 'Resume format for freshers: your first job in India',
    description: 'No work experience isn\'t a gap to hide — it just means the resume needs to lead with different things. Here\'s what actually works.',
    readTime: '7 min read',
  },
  {
    href: '/guides/linkedin-profile-optimization',
    title: 'How to optimize your LinkedIn profile for recruiters',
    description: 'Recruiters skim dozens of profiles a day. Here\'s what actually makes one worth a second look.',
    readTime: '7 min read',
  },
  {
    href: '/guides/how-to-write-a-cover-letter',
    title: 'How to write a cover letter that doesn\'t get ignored',
    description: 'Most cover letters get skimmed in ten seconds or skipped entirely. Here\'s what actually earns the other kind of read.',
    readTime: '6 min read',
  },
  {
    href: '/guides/tell-me-about-yourself-interview',
    title: 'How to answer "Tell me about yourself"',
    description: 'It\'s usually the very first question, which means it sets the tone for everything after it. Here\'s a real structure, not just "be confident."',
    readTime: '6 min read',
  },
  {
    href: '/guides/employment-gap-resume',
    title: 'How to explain an employment gap on your resume',
    description: 'A short, confident line does more work than a long, defensive one. Here\'s how to actually write it.',
    readTime: '6 min read',
  },
  {
    href: '/guides/notice-period-on-resume',
    title: 'How to mention your notice period on a resume',
    description: 'Where it goes, how to phrase it for your actual situation, and why leaving it out usually costs you time, not saves it.',
    readTime: '5 min read',
  },
];

export default function GuidesIndexPage() {
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
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Guides</h1>
        <p className="text-sm text-[var(--muted)] mb-12">Real, specific advice — not generic filler, and not written for a different country&apos;s hiring norms.</p>

        <div className="space-y-4">
          {GUIDES.map((guide) => (
            <Link key={guide.href} href={guide.href} className="card card-hover-lift block rounded-2xl p-6">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-soft)] mb-2">{guide.readTime}</p>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {guide.title}
                <ArrowRight size={15} className="text-[var(--accent-ink)]" />
              </h2>
              <p className="text-sm text-[var(--muted)] leading-relaxed">{guide.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
