export interface TopUpPack {
  id: 'small' | 'medium' | 'large';
  credits: number;
  priceRupees: number;
}

// The server-side create-order route validates every request against this exact
// list — a client can only ever request one of these three, never an arbitrary
// (credits, price) pair. Without that check, a tampered request could ask for
// 1000 credits at the ₹49 price point, since Razorpay Orders are created with
// whatever amount the server tells them to charge, not whatever the client claims.
export const TOPUP_PACKS: TopUpPack[] = [
  { id: 'small', credits: 20, priceRupees: 49 },
  { id: 'medium', credits: 60, priceRupees: 129 },
  { id: 'large', credits: 150, priceRupees: 299 },
];

export function getTopUpPack(id: string): TopUpPack | undefined {
  return TOPUP_PACKS.find((p) => p.id === id);
}
