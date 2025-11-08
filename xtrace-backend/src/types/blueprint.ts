export type Network = 'mainnet' | 'testnet';

export interface BlueprintRequest {
  centralAccount: string;      // e.g., "rCentralWallet...12345"
  network: Network;            // "mainnet" | "testnet"
  timeRangeFetched: {
    start: string;             // ISO 8601 Z
    end: string;               // ISO 8601 Z
  };
}

export interface NodeInfo {
  id: string;
  isCentral: boolean;
  displayName: string;
  activationDate: string;      // ISO
  tags: string[];
}

export type TxType = 'TRUSTSET' | 'PAYMENT_XRP' | 'PAYMENT_IOU';

export interface AmountIOU {
  value: string;
  currency: string;            // e.g., "USD"
  issuer?: string;             // issuer account for IOUs
}

export interface Transaction {
  hash: string;
  source: string;
  target: string;
  type: TxType;
  timestamp: string;           // ISO
  amount?: AmountIOU;          // XRP uses currency "XRP" and no issuer
}

export interface TokenPrice {
  currency: string;
  issuer: string;
  price_usd?: number;
}

export interface BlueprintResponse {
  request: BlueprintRequest;
  nodes: NodeInfo[];
  transactions: Transaction[];
  tokenPrices?: TokenPrice[];
}