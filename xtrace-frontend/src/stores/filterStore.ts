import { create } from 'zustand';

// --- Helper Types ---
export type TransactionType = 'PAYMENT_XRP' | 'PAYMENT_IOU';
export type Direction = 'inbound' | 'outbound' | 'both';
export type BaseCurrency = 'XRP' | 'USD' | 'EUR';

export interface ValuationEntry {
  currency: string;
  issuer?: string;
  value: number;
}

// --- State Shape ---
export interface FilterState {
  // 1) Scope
  centralAccount: string;
  network: 'mainnet' | 'testnet' | 'devnet';

  /**
   * Back-compat field used by some parts of the app (e.g., requestBuilder).
   * It mirrors timeRangeFetched and is always kept in sync.
   */
  timeRange: { start: string; end: string };

  /** The time range to fetch from the API (set by Left Panel) */
  timeRangeFetched: { start: string; end: string };

  /** The active window to display (set by Bottom Panel brush) */
  timeRangeActive: { start: string; end: string };

  // 2) Transaction Type
  types: TransactionType[];

  // 3) Direction
  direction: Direction;

  // 4) Amount & Currency
  baseCurrency: BaseCurrency;
  amountMin: number | null;
  amountMax: number | null;
  currencies: string[];
  issuers: string[];

  // 5) Counterparty / Tags
  counterparty: string;
  includeTags: string[];
  excludeTags: string[];

  // 6) Valuation
  valuations: ValuationEntry[];
  treatIouUsdAsOne: boolean;

  // View options
  showDust: boolean;

  // --- Actions ---
  setCentralAccount: (address: string) => void;
  setNetwork: (network: 'mainnet' | 'testnet' | 'devnet') => void;

  /** Back-compat: sets all ranges to the same value */
  setTimeRange: (range: { start: string; end: string }) => void;

  /** Sets the fetching range (and resets the active brush) */
  setTimeRangeFetched: (range: { start: string; end: string }) => void;

  /** Sets only the active brush window */
  setTimeRangeActive: (range: { start: string; end: string }) => void;

  setTypes: (types: TransactionType[]) => void;
  setDirection: (direction: Direction) => void;
  resetFilters: () => void;

  setTreatIouUsdAsOne: (value: boolean) => void;
  addValuation: () => void;
  removeValuation: (index: number) => void;
  updateValuation: (index: number, field: keyof ValuationEntry, value: string) => void;

  setShowDust: (value: boolean) => void;
}

// --- Initial State ---
const getInitialState = (): Omit<
  FilterState,
  | 'setCentralAccount'
  | 'setNetwork'
  | 'setTimeRange'
  | 'setTimeRangeFetched'
  | 'setTimeRangeActive'
  | 'setTypes'
  | 'setDirection'
  | 'resetFilters'
  | 'setTreatIouUsdAsOne'
  | 'addValuation'
  | 'removeValuation'
  | 'updateValuation'
  | 'setShowDust'
> => {
  const defaultEnd = new Date();
  const defaultStart = new Date(defaultEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const range = {
    start: defaultStart.toISOString(),
    end: defaultEnd.toISOString(),
  };

  return {
    // 1) Scope
    centralAccount: 'rGoLdHQ7ujED1TMNPBJH9Ek6VJwU7Ns7kr',
    network: 'mainnet',

    // keep all three in sync initially
    timeRange: { ...range },
    timeRangeFetched: { ...range },
    timeRangeActive: { ...range },

    // 2) Types
    types: ['PAYMENT_XRP', 'PAYMENT_IOU'],

    // 3) Direction
    direction: 'both',

    // 4) Amount & Currency
    baseCurrency: 'XRP',
    amountMin: null,
    amountMax: null,
    currencies: [],
    issuers: [],

    // 5) Counterparty / Tags
    counterparty: '',
    includeTags: [],
    excludeTags: [],

    // 6) Valuation
    valuations: [],
    treatIouUsdAsOne: true,

    // View
    showDust: false,
  };
};

// --- Store ---
export const useFilterStore = create<FilterState>((set) => ({
  ...getInitialState(),

  // --- Actions ---
  setCentralAccount: (address) => set({ centralAccount: address }),
  setNetwork: (network) => set({ network }),

  // Back-compat: update all three ranges
  setTimeRange: (range) =>
    set({
      timeRange: range,
      timeRangeFetched: range,
      timeRangeActive: range,
    }),

  setTimeRangeFetched: (range) =>
    set({
      timeRangeFetched: range,
      timeRange: range, // keep alias in sync
      timeRangeActive: range, // reset brush to full range
    }),

  setTimeRangeActive: (range) =>
    set({
      timeRangeActive: range, // only update brush window
    }),

  setTypes: (types) => set({ types }),
  setDirection: (direction) => set({ direction }),
  resetFilters: () => set(getInitialState()),

  setTreatIouUsdAsOne: (value) => set({ treatIouUsdAsOne: value }),

  addValuation: () =>
    set((state) => ({
      valuations: [...state.valuations, { currency: '', value: 1, issuer: '' }],
    })),

  removeValuation: (index) =>
    set((state) => ({
      valuations: state.valuations.filter((_, i) => i !== index),
    })),

  updateValuation: (index, field, value) =>
    set((state) => {
      const next = [...state.valuations];
      const updated = { ...next[index] };

      if (field === 'value') {
        updated.value = parseFloat(value) || 0;
      } else if (field === 'currency' || field === 'issuer') {
        updated[field] = value;
      }

      next[index] = updated;
      return { valuations: next };
    }),

  setShowDust: (value) => set({ showDust: value }),
}));