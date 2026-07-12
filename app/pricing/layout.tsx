import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Free while we\'re building. Individual, Pro, and Enterprise plans with monthly or yearly billing — see what\'s included.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
