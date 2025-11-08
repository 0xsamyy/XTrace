import { useFilterStore } from '../stores/filterStore';
import type { RequestPayload } from './dataContracts';

/**
 * Builds the canonical request object from the FilterStore
 */
export function buildRequest(): RequestPayload {
  // Get the current state from the store
  const {
    centralAccount,
    network,
    timeRange,
    types,
    direction,
    amountMin,
    amountMax,
    currencies,
    issuers,
    counterparty,
    includeTags,
    excludeTags,
  } = useFilterStore.getState();

  const payload: RequestPayload = {
    request: {
      centralAccount: centralAccount,
      network: network,
      timeRangeFetched: {
        start: timeRange.start,
        end: timeRange.end,
      },
      // Add the optional filters block
      filters: {
        types: types,
        direction: direction,
        amountMin: amountMin,
        amountMax: amountMax,
        currencies: currencies,
        issuers: issuers,
        counterparty: counterparty,
        includeTags: includeTags,
        excludeTags: excludeTags,
      },
    },
  };
  
  return payload;
}