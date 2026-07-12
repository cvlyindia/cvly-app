'use client';

import { useScanner } from '@/components/ScannerContext';

export function NewCheckButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { openScanner } = useScanner();
  return (
    <button onClick={openScanner} className={className}>
      {children}
    </button>
  );
}
