import Link from 'next/link';
import Image from 'next/image';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Cvly" width={28} height={26} className="rounded-md" />
            <span className="text-[17px] font-bold tracking-[-0.02em]">Cvly</span>
          </Link>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition">← Back</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Privacy</h1>
        <p className="text-sm text-[var(--muted)] mb-10">Last updated July 2026. Plain language, no legal padding.</p>

        <div className="space-y-8 text-sm leading-relaxed text-[var(--ink)]/85">
          <section>
            <h2 className="font-semibold text-base mb-2">What we collect</h2>
            <p>The text of your resume and the job description you paste, only to generate your results. If you sign in, your email address (used only for login) and the results of checks you run, so you can see your history later.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2">What we don&apos;t do</h2>
            <p>We don&apos;t store anything if you use Cvly without signing in — your resume and results exist only for that session. We don&apos;t sell or share your data with third parties. We don&apos;t use your resume to train any model.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2">How results are generated</h2>
            <p>Your resume and the job description are sent to Google&apos;s Gemini API to generate your score, rewrite, cover letter, and interview questions. That&apos;s the only third party involved in generating your results.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2">Deleting your data</h2>
            <p>If you&apos;re signed in, you can delete any saved check from your <Link href="/history" className="text-[var(--accent-ink)] underline">history page</Link> at any time. Deleting your account entirely — email us and we&apos;ll remove everything tied to it.</p>
          </section>
          <section>
            <h2 className="font-semibold text-base mb-2">Contact</h2>
            <p>Questions about this — reach out through the contact details on cvly.in.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
