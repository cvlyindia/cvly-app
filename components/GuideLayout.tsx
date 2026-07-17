import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AmbientBackground } from '@/components/AmbientBackground';

export function GuideLayout({
  title,
  subtitle,
  readTime,
  children,
}: {
  title: string;
  subtitle: string;
  readTime: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen relative">
      <AmbientBackground />
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/guides" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition mb-10">
          <ArrowLeft size={15} /> All guides
        </Link>

        <div className="flex items-center gap-2.5 mb-6">
          <Image src="/logo.png" alt="Cvly" width={24} height={22} className="rounded-md" />
          <span className="font-bold text-sm">Cvly</span>
          <span className="text-[var(--muted-soft)]">·</span>
          <span className="text-xs text-[var(--muted)]">{readTime}</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight mb-3 leading-tight">{title}</h1>
        <p className="text-base text-[var(--muted)] mb-12 leading-relaxed">{subtitle}</p>

        <article className="prose-guide space-y-6 text-[15px] leading-[1.75] text-[var(--ink)]/90">
          {children}
        </article>

        <div className="mt-16 card rounded-2xl p-7 text-center">
          <p className="text-base font-semibold mb-1.5">See exactly where your resume stands</p>
          <p className="text-sm text-[var(--muted)] mb-5">Free match score, no account needed — takes about 30 seconds.</p>
          <Link href="/" className="btn-accent inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold">
            Try it free <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
