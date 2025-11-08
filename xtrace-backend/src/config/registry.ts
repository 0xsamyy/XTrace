// src/config/registry.ts
export type TagEntry = {
  match: (account: string) => boolean;
  tags: string[];
};

export const KNOWN_TAGS: TagEntry[] = [
  {
    match: (a) => /binance/i.test(a),
    tags: ['CEX', 'KNOWN_EXCHANGE', 'BINANCE']
  },
  {
    match: (a) => /bitstamp/i.test(a),
    tags: ['GATEWAY', 'KNOWN_ISSUER', 'BITSTAMP']
  }
];

export function inferTags(account: string): string[] {
  for (const entry of KNOWN_TAGS) {
    if (entry.match(account)) return entry.tags;
  }
  return [];
}
