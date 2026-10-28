import type { CollectionMethod } from './collection-types';

export interface RefundRecord {
  id: string;
  txnId: string;
  qrCodeId: string | null;
  guestName: string;
  guestPhone: string;
  amount: number;
  method: CollectionMethod;
  reason: string;
  reference: string;
  recordedBy: string;
  createdAt: number;
  balanceAfter: number;
}

export interface RefundWallet {
  txnId: string;
  qrCodeId: string | null;
  guestName: string;
  guestPhone: string;
  status: string;
  balance: number;
  issuedCover: number;
  refunded: number;
  refundable: number;
}

export interface EventRefunds {
  eventId: string;
  canRecord: boolean;
  wallets: RefundWallet[];
  refunds: RefundRecord[];
  refundCount: number;
}
