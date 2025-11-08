// src/utils/xrpl.ts
import { Amount } from 'xrpl/dist/npm/models/common';
import { dropsToXrp } from 'xrpl';

const RIPPLE_EPOCH_UNIX = 946684800;

export function rippleTimeToISO(rippleSeconds?: number): string | undefined {
  if (rippleSeconds == null) return undefined;
  const unix = rippleSeconds + RIPPLE_EPOCH_UNIX;
  return new Date(unix * 1000).toISOString();
}

export function shortAccount(a: string): string {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}...${a.slice(-5)}`;
}

export function normalizeAmount(a: Amount): { value: string; currency: string; issuer?: string } {
  if (typeof a === 'string') {
    const value = String(dropsToXrp(a)); // XRP (drops -> XRP)
    return { value, currency: 'XRP' };
  }
  return {
    value: a.value,
    currency: a.currency,
    issuer: a.issuer
  };
}

export function classifyTx(tx: any):
  | { type: 'TRUSTSET'; amount?: { value: string; currency: string; issuer?: string }; target?: string }
  | { type: 'PAYMENT_XRP' | 'PAYMENT_IOU'; amount?: { value: string; currency: string; issuer?: string }; target?: string }
  | null {
  const tt = tx?.TransactionType;
  if (!tt) return null;

  if (tt === 'TrustSet') {
    const amt = tx.LimitAmount ? normalizeAmount(tx.LimitAmount) : undefined;
    const target = tx.LimitAmount?.issuer;
    return { type: 'TRUSTSET', amount: amt, target };
  }

  if (tt === 'Payment') {
    // Amount may be missing on some server shapes → we’ll let caller pass delivered_amount if needed
    const target = tx.Destination;
    return { type: 'PAYMENT_IOU', amount: undefined, target };
  }

  return null;
}

/** Uniform unpack for account_tx items (v1/v2) + carry hash up */
export function unpackAccountTxItem(item: any): { tx?: any; meta?: any; iso?: string; hash?: string } {
  if (!item) return {};

  // Clio v2 or hybrid shape
  if (item.tx_json || item.close_time_iso) {
    const tx = item.tx_json ?? item.tx;
    const iso = item.close_time_iso || rippleTimeToISO(tx?.date);
    const hash = item.hash || tx?.hash || item?.meta?.TransactionHash || item?.meta?.transaction_hash;

    // Fix: ensure Account and Destination exist inside tx
    if (!tx?.Account && item.Account) tx.Account = item.Account;
    if (!tx?.Destination && item.Destination) tx.Destination = item.Destination;

    return { tx, meta: item.meta, iso, hash };
  }

  // rippled v1 shape
  if (item.tx) {
    const tx = item.tx;
    const iso = rippleTimeToISO(tx?.date);
    const hash = tx?.hash || item?.meta?.TransactionHash || item?.meta?.transaction_hash;
    return { tx, meta: item.meta, iso, hash };
  }

  return {};
}
