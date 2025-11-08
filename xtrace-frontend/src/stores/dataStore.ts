import { create } from 'zustand';
import type {
  XRPLNode,
  XRPLTransaction,
  RequestPayload,
  DataResponse,
  TokenPrice,
} from '../services/dataContracts';

export interface NetworkNode {
  id: string;
  isCentral: boolean;
  txCount: number;
  inboundValue: number;
  outboundValue: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  inboundValue: number;
  outboundValue: number;
  totalValue: number;
}

// Simple animation switch the view can read
export type AnimationMode = 'none' | 'enter';

// Kept for compatibility, but we won't write into it anymore
type ResponseCache = Map<string, DataResponse>;

interface DataState {
  rawNodes: XRPLNode[];
  rawTransactions: XRPLTransaction[];
  tokenPrices: TokenPrice[];
  isFetching: boolean;
  error: string | null;
  lastRequest: RequestPayload | null;

  computedNetworkData: { nodes: NetworkNode[]; edges: NetworkEdge[] };
  selection: string | null;

  // Deprecated/no-op cache (left in state to avoid breaking imports)
  cache: ResponseCache;

  // Min/max time range of the entire raw dataset
  fullTimeRange: { start: string; end: string } | null;

  // Animation flag for the graph view
  animationMode: AnimationMode;
  setAnimationMode: (mode: AnimationMode) => void;

  // Actions
  startFetch: (request: RequestPayload) => void;
  setFetchSuccess: (data: DataResponse, requestKey: string) => void;
  setFetchError: (error: string) => void;
  setComputedNetworkData: (data: { nodes: NetworkNode[]; edges: NetworkEdge[] }) => void;
  setSelection: (nodeId: string | null) => void;

  // Kept for compatibility (some code may still call it)
  setFromCache: (cachedData: DataResponse) => void;

  setFullTimeRange: (range: { start: string; end: string }) => void;
}

export const useDataStore = create<DataState>((set) => ({
  // Initial state
  rawNodes: [],
  rawTransactions: [],
  tokenPrices: [],
  isFetching: false,
  error: null,
  lastRequest: null,

  computedNetworkData: { nodes: [], edges: [] },
  selection: null,

  // Cache present but unused
  cache: new Map(),

  fullTimeRange: null,

  // Default to 'enter' so the first load animates
  animationMode: 'enter',
  setAnimationMode: (mode) => set({ animationMode: mode }),

  // --- Actions ---
  startFetch: (request) =>
    set({
      isFetching: true,
      error: null,
      lastRequest: request,
      selection: null,
      computedNetworkData: { nodes: [], edges: [] },
      tokenPrices: [],
      // Any “real” fetch should animate on entry
      animationMode: 'enter',
    }),

  setFetchSuccess: (data, _requestKey) =>
    set((state) => ({
      rawNodes: data.nodes,
      rawTransactions: data.transactions,
      tokenPrices: data.tokenPrices ?? [],
      isFetching: false,
      error: null,
      // IMPORTANT: do NOT write into cache anymore (cache disabled)
      cache: state.cache,
    })),

  setFetchError: (errorMsg) =>
    set({
      isFetching: false,
      error: errorMsg,
      rawNodes: [],
      rawTransactions: [],
      tokenPrices: [],
      selection: null,
      computedNetworkData: { nodes: [], edges: [] },
    }),

  setComputedNetworkData: (data) => set({ computedNetworkData: data }),

  setSelection: (nodeId) => set({ selection: nodeId }),

  // Kept for compatibility; if someone calls it we still update state
  setFromCache: (cachedData) =>
    set({
      rawNodes: cachedData.nodes,
      rawTransactions: cachedData.transactions,
      tokenPrices: cachedData.tokenPrices ?? [],
      isFetching: false,
      error: null,
    }),

  setFullTimeRange: (range) => set({ fullTimeRange: range }),
}));