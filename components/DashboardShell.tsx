'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard, History, Settings, Menu, X, LogOut, Zap, ChevronDown, KanbanSquare, BookOpen, Sparkles, TrendingUp,
} from 'lucide-react';
import { ScannerModal } from '@/components/ScannerModal';
import { ScannerContext } from '@/components/ScannerContext';

type ActivePage = 'dashboard' | 'history' | 'settings' | 'tracker' | 'analytics';

const NAV_ITEMS: { key: ActivePage; label: string; href: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'tracker', label: 'Tracker', href: '/tracker', icon: KanbanSquare },
  { key: 'analytics', label: 'Analytics', href: '/analytics', icon: TrendingUp },
  { key: 'history', label: 'History', href: '/history', icon: History },
  { key: 'settings', label: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardShell({
  children,
  activePage,
  pageTitle,
  userEmail,
  credits,
  onCreditsChange,
  onScanSaved,
  onSignOut,
}: {
  children: React.ReactNode;
  activePage: ActivePage;
  pageTitle: string;
  userEmail: string;
  credits: { remaining: number; plan: string } | null;
  onCreditsChange: (updater: (c: { remaining: number; plan: string } | null) => { remaining: number; plan: string } | null) => void;
  onScanSaved?: () => void;
  onSignOut: () => void;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const initial = userEmail ? userEmail[0].toUpperCase() : '?';

  const SidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <Image src="/logo.png" alt="Cvly" width={28} height={26} className="rounded-md" />
        <span className="text-[17px] font-bold tracking-[-0.02em] text-[var(--chrome-text)]">Cvly</span>
      </Link>
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition relative ${
              activePage === item.key
                ? 'bg-[var(--chrome-raised)] text-white'
                : 'text-[var(--chrome-muted)] hover:bg-[var(--chrome-raised)]/60 hover:text-[var(--chrome-text)]'
            }`}
          >
            {activePage === item.key && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--grad-prism)' }} />
            )}
            <item.icon size={17} className={activePage === item.key ? 'text-[#B4A6F0]' : ''} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-3 pb-3 space-y-0.5">
        <Link href="/guides" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--chrome-muted)] hover:bg-[var(--chrome-raised)]/60 hover:text-[var(--chrome-text)] transition">
          <BookOpen size={15} /> Guides
        </Link>
        <Link href="/changelog" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[var(--chrome-muted)] hover:bg-[var(--chrome-raised)]/60 hover:text-[var(--chrome-text)] transition">
          <Sparkles size={15} /> Changelog
        </Link>
      </div>
      <div className="px-3 pb-5">
        <button
          onClick={() => setScannerOpen(true)}
          className="btn-accent w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold"
        >
          New check
        </button>
        {credits?.plan === 'free' && (
          <Link href="/pricing" className="block text-center text-xs text-[#B4A6F0] hover:text-white hover:underline transition mt-3">
            Upgrade for more credits
          </Link>
        )}
      </div>
    </>
  );

  return (
    <ScannerContext.Provider value={{ openScanner: () => setScannerOpen(true) }}>
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Desktop sidebar — dark chrome, the app's anchor */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[var(--chrome)]">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[var(--ink)]/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--chrome)] flex flex-col">
            <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="self-end mr-4 mt-4 w-8 h-8 rounded-full text-[var(--chrome-muted)] hover:bg-[var(--chrome-raised)] hover:text-white flex items-center justify-center transition">
              <X size={16} />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="border-b border-[var(--line)] sticky top-0 bg-[var(--bg)]/90 backdrop-blur-md z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface)]">
                <Menu size={18} />
              </button>
              <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={profileOpen}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[var(--surface)] transition"
              >
                <span className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] flex items-center justify-center text-sm font-semibold">
                  {initial}
                </span>
                <ChevronDown size={14} className={`text-[var(--muted)] transition-transform hidden sm:block ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 card rounded-xl overflow-hidden z-20 shadow-lg">
                    <div className="px-4 py-3 border-b border-[var(--line)]">
                      <p className="text-sm font-medium truncate">{userEmail}</p>
                      {credits && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Zap size={11} className="text-[var(--accent-ink)]" />
                          <span className="text-xs text-[var(--muted)] capitalize">{credits.plan} · {credits.remaining} credits left</span>
                        </div>
                      )}
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--ink)]/85 hover:bg-[var(--surface)] transition"
                    >
                      <Settings size={14} /> Settings
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--ink)]/85 hover:bg-[var(--surface)] transition"
                    >
                      <Zap size={14} /> Plans &amp; billing
                    </Link>
                    <button
                      onClick={() => { setProfileOpen(false); onSignOut(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--bad)] hover:bg-[var(--bad-bg)] transition text-left"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
      </div>

      <ScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        credits={credits}
        onCreditsChange={onCreditsChange}
        onScanSaved={onScanSaved}
      />
    </div>
    </ScannerContext.Provider>
  );
}
