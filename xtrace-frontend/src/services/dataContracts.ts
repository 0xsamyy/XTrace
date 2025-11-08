/**
 * XRPL Visualiser – Data Contracts
 * --------------------------------
 * Shared TypeScript interfaces for request / response objects exchanged
 * between the UI and the data provider.
 * (Implements Plan – Step 2: Data contracts)
 */

import type { Direction, TransactionType } from '../stores/filterStore';

/**
 * 5.1: The *actual* JSON payload the v1 backend API expects.
 * Note it is "flat" and does not have the "request: {}" wrapper.
 */
export interface BackendRequestV1 {
  centralAccount: string;
  network: 'mainnet' | 'testnet'; // Backend only supports these two
  timeRangeFetched: {
    start: string; // ISO 8601
    end: string;   // ISO 8601
  };
  // 'filters' will be added here later
}


// 1. The request payload we send (UI Logical Request)
export interface RequestPayload {
  request: {
    /** XRPL account address that acts as the visualisation centre */
    centralAccount: string;
    /** Which XRPL network to query */
    network: 'mainnet' | 'testnet' | 'devnet'; // UI supports devnet
    /** Time window to fetch transactions for */
    timeRangeFetched: {
      /** ISO 8601 string, e.g. 2025-10-01T00:00:00Z */
      start: string;
      /** ISO 8601 string, e.g. 2025-11-07T13:25:00Z */
      end: string;
    };
    
    /** Optional filters applied by the UI */
    filters?: {
      types?: TransactionType[];
      direction?: Direction;
      amountMin?: number;
      amountMax?: number;
      currencies?: string[];
      issuers?: string[];
      counterparty?: string;
      includeTags?: string[];
      excludeTags?: string[];
    };
  };
}

// 2. The Node (account) data we expect back
export interface XRPLNode {
  id: string; // XRPL address
  isCentral: boolean;
  displayName?: string;
  activationDate?: string; // ISO 8601
  tags?: string[];
  /** Allow other dynamic properties */
  [key: string]: unknown;
}

// 3. The Transaction (edge) data we expect back
export interface XRPLTransaction {
  hash: string;
  source: string;
  target: string;
  timestamp: string; // ISO 8601
  type: 'PAYMENT_XRP' | 'PAYMENT_IOU' | string; // Allow future types
  amount: {
    value: string;
    currency: string;
    issuer?: string;
  };
  [key: string]: unknown;
}

/**
 * 5. Token Price Data (from backend docs)
 * On-ledger USD price for a specific IOU.
 */
export interface TokenPrice {
  currency: string;
  issuer: string;
  price_usd: number;
}

// 4. The full response from the data source
export interface DataResponse {
  nodes: XRPLNode[];
  transactions: XRPLTransaction[];
  /** Optional metadata (e.g., pagination, request echo) */
  meta?: Record<string, unknown>;
  /** NEW: Automatic on-ledger USD prices for IOUs */
  tokenPrices: TokenPrice[];
}

// --- THIS IS THE FIX ---
// --- ADD THESE DEFINITIONS ---

/**
 * 6. Computed Network Node
 * This is the data structure for a node in our graph,
 * after aggregation.
 */
export interface NetworkNode {
  id: string; // address
  isCentral: boolean;
  txCount: number;
  inboundValue: number;
  outboundValue: number;
}

/**
 * 7. Computed Network Edge
 * This is the data structure for one aggregated edge
 * (line) in our graph.
 */
export interface NetworkEdge {
  source: string; // Will be the Central Account ID
  target: string; // Will be the Counterparty ID
  inboundValue: number;  // Net value to the counterparty
  outboundValue: number; // Net value from the counterparty
  totalValue: number;  // Sum of both (for thickness)
}

// --- END OF FIX ---


// Optional: bundle common exports together
export type { XRPLNode as Node, XRPLTransaction as Transaction };