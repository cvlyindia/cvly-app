'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { trackPixelEvent } from '@/lib/metaPixelClient';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function UpgradeToProButton({ cycle }: { cycle: 'monthly' | 'yearly' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade() {
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?next=/pricing');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      trackPixelEvent('InitiateCheckout', data.subscriptionId);

      const razorpay = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Cvly',
        description: cycle === 'monthly' ? 'Pro — monthly' : 'Pro — yearly',
        prefill: { email: user.email ?? '' },
        theme: { color: '#FF6A1A' },
        handler: () => {
          // Fired only on a genuinely successful payment. The webhook is the
          // authoritative source of truth for actually activating the plan —
          // this client-side event exists purely for the matching Meta Purchase
          // signal (same subscription_id as event_id, deduplicated against the
          // server-side CAPI Purchase the webhook fires once activation confirms).
          trackPixelEvent('Purchase', data.subscriptionId, { currency: 'INR' });
          router.push('/dashboard?upgraded=1');
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout — try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="btn-accent w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
      >
        {loading ? <><Loader2 size={14} className="animate-spin" /> Starting checkout…</> : 'Upgrade to Pro'}
      </button>
      {error && <p className="text-xs text-[var(--bad)] mt-2 text-center">{error}</p>}
    </>
  );
}
