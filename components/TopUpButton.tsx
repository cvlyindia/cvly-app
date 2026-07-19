'use client';

import { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { trackPixelEvent } from '@/lib/metaPixelClient';
import { friendlyErrorMessage, safeParseJson } from '@/lib/friendlyError';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function TopUpButton({ packId, credits, priceRupees }: { packId: string; credits: number; priceRupees: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleBuy() {
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?next=/pricing');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const data = await safeParseJson(res);
      if (!data) throw new Error(`request failed with status ${res.status}`);
      if (data.error) throw new Error(data.error as string);

      trackPixelEvent('InitiateCheckout', data.orderId as string);

      const razorpay = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        name: 'Cvly',
        description: `${credits} credit top-up`,
        prefill: { email: user.email ?? '' },
        theme: { color: '#FF6A1A' },
        handler: () => {
          trackPixelEvent('Purchase', data.orderId as string, { currency: 'INR', value: priceRupees });
          router.push('/dashboard?topup=1');
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      razorpay.open();
    } catch (err) {
      setError(friendlyErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--line)] p-4 text-center hover:border-[var(--line-strong)] transition">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <p className="text-xl font-bold tracking-tight">{credits}</p>
      <p className="text-xs text-[var(--muted)] mb-2">credits</p>
      <p className="text-sm font-semibold mb-3">₹{priceRupees}</p>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="w-full py-1.5 rounded-full border border-[var(--line)] text-xs font-medium hover:bg-[var(--surface)] transition disabled:opacity-50 inline-flex items-center justify-center gap-1"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : 'Buy'}
      </button>
      {error && <p className="text-[10px] text-[var(--bad)] mt-1.5">{error}</p>}
    </div>
  );
}
