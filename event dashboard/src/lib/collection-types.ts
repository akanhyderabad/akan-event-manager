/** Shared by the issue form and its collection summary. */
export const COLLECTION_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'online', label: 'Online' },
  { value: 'razorpay', label: 'Razorpay' },
] as const;

export type CollectionMethod = typeof COLLECTION_METHODS[number]['value'];

export interface CollectionAmounts {
  count: number;
  entry: number;
  cover: number;
  total: number;
  refunded: number;
  refundCount: number;
  net: number;
}

export interface EventWalletCollections {
  eventId: string;
  methods: Array<CollectionAmounts & { method: string; label: string }>;
  totals: CollectionAmounts;
}
