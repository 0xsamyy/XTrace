import { useDataStore } from '../stores/dataStore';
import { useFilterStore } from '../stores/filterStore';
import type { XRPLTransaction } from './dataContracts';

function toNum(x: unknown): number {
  // Robust numeric parsing (handles "1e-7", "2.5E-8", numbers, etc.)
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
}

function normCurrency(c?: string): string {
  return (c || '').trim().toUpperCase();
}
function normIssuer(i?: string): string {
  return (i || '').trim();
}

/**
 * Handles converting transaction amounts into USD.
 * Priority:
 *   1) User valuations overrides (store.valuations)
 *   2) Treat IOU.USD as $1 (if flag is enabled)
 *   3) API-provided prices (tokenPrices)
 *   4) Otherwise -> 0 (unpriced)
 */
export class ValuationService {
  public convertToBase(tx: XRPLTransaction): number {
    const { amount } = tx;
    if (!amount) return 0;

    const qty = toNum(amount.value); // supports e-notation
    if (qty === 0) return 0;

    const currency = normCurrency(amount.currency);
    const issuer = normIssuer(amount.issuer);

    // 1) Pull valuation-related state once
    const { tokenPrices } = useDataStore.getState();
    const { valuations, treatIouUsdAsOne } = useFilterStore.getState();

    // 2) User overrides first (exact match by currency + optional issuer)
    //    - exact C+I match wins
    //    - then first entry with same currency and empty issuer acts as a global currency price
    const exactOverride = valuations.find(
      v => normCurrency(v.currency) === currency && normIssuer(v.issuer) === issuer
    );
    const currencyOnlyOverride = valuations.find(
      v => normCurrency(v.currency) === currency && !normIssuer(v.issuer)
    );

    const chosenOverride = exactOverride ?? currencyOnlyOverride;
    if (chosenOverride) {
      const price = toNum(chosenOverride.value);
      return qty * price;
    }

    // 3) Treat IOU.USD as $1 (if enabled)
    if (treatIouUsdAsOne && currency === 'USD') {
      return qty * 1;
    }

    // 4) XRP path
    if (currency === 'XRP') {
      // Look up XRP from API prices (currency === 'XRP')
      const xrpPrice = tokenPrices.find(p => normCurrency(p.currency) === 'XRP');
      const px = toNum(xrpPrice?.price_usd);
      return px > 0 ? qty * px : 0;
    }

    // 5) IOU path: look for a price with matching currency + issuer
    //    First try exact C+I, then currency-only if your API provides such rows.
    const apiExact = tokenPrices.find(
      p => normCurrency(p.currency) === currency && normIssuer(p.issuer) === issuer
    );
    const apiCurrencyOnly = tokenPrices.find(
      p => normCurrency(p.currency) === currency && !normIssuer(p.issuer)
    );

    const matched = apiExact ?? apiCurrencyOnly;
    const px = toNum(matched?.price_usd);
    return px > 0 ? qty * px : 0;
  }
}

// Singleton
export const valuationService = new ValuationService();