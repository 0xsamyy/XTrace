// src/services/xrplService.ts
import { Client, isValidAddress } from 'xrpl';
import { config } from '../config/env.js';
import {
  BlueprintRequest,
  Transaction as MyTx,
  NodeInfo
} from '../types/blueprint.js';
import { classifyTx, shortAccount, unpackAccountTxItem, normalizeAmount } from '../utils/xrpl.js';
import { inferTags } from '../config/registry.js';
import { decodeCurrencyHex } from '../utils/currency.js';
import { fetchIOUPriceUSD } from './priceService.js';
import { fetchXrpUsdPrice } from './xrpPriceService.js';

const endpointFor = (network: 'mainnet' | 'testnet') =>
  network === 'mainnet' ? config.xrpl.mainnetWss : config.xrpl.testnetWss;

export async function withClient<T>(
  network: 'mainnet' | 'testnet',
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client(endpointFor(network), {
    timeout: config.xrpl.requestTimeoutMs
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try { await client.disconnect(); } catch {}
  }
}

async function fetchAccountTxInWindow(
  client: Client,
  account: string,
  startISO: string,
  endISO: string,
  logger: (msg: string, extra?: any) => void
) {
  const startMs = new Date(startISO).getTime();
  const endMs = new Date(endISO).getTime();

  let marker: unknown | undefined = undefined;
  let pages = 0;
  const out: any[] = [];

  while (true) {
    const resp = await client.request({
      command: 'account_tx',
      account,
      ledger_index_min: -1,
      ledger_index_max: -1,
      limit: 200,
      forward: false,
      marker
    } as any);

    pages += 1;
    const txs: any[] = resp.result.transactions || [];
    logger(`account_tx page`, { page: pages, count: txs.length, marker: !!resp.result.marker });

    let hitOlderThanStart = false;

    for (const rawItem of txs) {
      const { tx, meta, iso, hash } = unpackAccountTxItem(rawItem);
      if (!tx || !iso) continue;

      const ms = new Date(iso).getTime();
      if (ms > endMs) continue;
      if (ms < startMs) { hitOlderThanStart = true; continue; }

      out.push({ tx, meta, iso, hash });
    }

    if (hitOlderThanStart) {
      logger(`hit older-than-start; stopping after page ${pages}`);
      break;
    }

    if (resp.result.marker) marker = resp.result.marker;
    else break;
  }

  logger(`pagination done`, { pages, kept: out.length });
  return out;
}

function ensureNode(
  map: Map<string, NodeInfo>,
  id: string,
  whenISO: string,
  isCentral = false,
  extraTags: string[] = []
) {
  if (!id) return;

  if (!map.has(id)) {
    map.set(id, {
      id,
      isCentral,
      displayName: shortAccount(id),
      activationDate: whenISO,
      tags: [...inferTags(id), ...extraTags]
    });
  } else {
    const node = map.get(id)!;
    // Update earliest activationDate
    if (new Date(whenISO).getTime() < new Date(node.activationDate).getTime()) {
      node.activationDate = whenISO;
    }
    // Merge tags
    for (const t of extraTags) if (!node.tags.includes(t)) node.tags.push(t);
  }
}


export async function fetchBlueprintData(
  req: BlueprintRequest
): Promise<{ nodes: NodeInfo[]; transactions: MyTx[] }> {
  const { centralAccount, network, timeRangeFetched } = req;

  if (!isValidAddress(centralAccount)) {
    console.warn('centralAccount is not a valid XRPL address. Proceeding anyway.');
  }

  const logger = (msg: string, extra?: any) =>
    console.log(`[xrpl:${network}]`, msg, extra ? JSON.stringify(extra) : '');

  return withClient(network, async (client) => {
    const raw = await fetchAccountTxInWindow(
      client,
      centralAccount,
      timeRangeFetched.start,
      timeRangeFetched.end,
      logger
    );

    const nodes = new Map<string, NodeInfo>();
    ensureNode(nodes, centralAccount, timeRangeFetched.start, true);

    const transactions: MyTx[] = [];

    for (const item of raw) {
      const tx = item.tx;
      const meta = item.meta;
      const iso = item.iso as string;
      const topHash = item.hash as string | undefined;

      // Skip transactions that don't directly involve the central account
      const src = tx?.Account;
      const dst = tx?.Destination;
      if (src !== centralAccount && dst !== centralAccount) continue;

      // Only keep successful txs if metadata reports the result
      const result = meta?.TransactionResult;
      if (result && result !== 'tesSUCCESS') continue;

      const base = classifyTx(tx);
      if (!base) continue;

      let amount = base.amount;

      // Robust Payment amount detection:
      // Prefer tx.Amount; if absent, fall back to meta.delivered_amount / DeliveredAmount
      if (tx.TransactionType === 'Payment') {
        const rawAmt = tx.Amount ?? meta?.delivered_amount ?? meta?.DeliveredAmount;
        if (rawAmt !== undefined) {
          amount = normalizeAmount(rawAmt);
        }
      }

      if (amount && amount.currency !== 'XRP' && /^[0-9A-Fa-f]{40}$/.test(amount.currency)) {
        const pretty = decodeCurrencyHex(amount.currency);
        if (pretty) {
            // overwrite the currency with the human-readable code, preserving the contract
            amount.currency = pretty; // e.g., "RLUSD"
        }
        }

      // Decide XRP vs IOU AFTER we have a real amount.
      let type = base.type;
      if (tx.TransactionType === 'Payment') {
        if (amount?.currency === 'XRP') type = 'PAYMENT_XRP';
        else type = 'PAYMENT_IOU';
      }

      const source = tx?.Account || '';
      const target = base.target ?? '';

      // Hash: prefer top-level hash from account_tx v2, else tx.hash, else meta.TransactionHash
      const hash =
        topHash ||
        tx?.hash ||
        meta?.TransactionHash ||
        meta?.transaction_hash ||
        '';

      transactions.push({
        hash,
        source,
        target,
        type,
        timestamp: iso,
        ...(amount ? { amount } : {})
      });

      if (source) ensureNode(nodes, source, iso, source === centralAccount);
      if (target) ensureNode(nodes, target, iso, target === centralAccount);
      const issuer = amount?.issuer;
      if (issuer && issuer !== target) {
        const tokenTag =
            amount?.currency && amount.currency !== 'XRP'
            ? `${amount.currency}_ISSUER`
            : 'ISSUER';
        ensureNode(nodes, issuer, iso, issuer === centralAccount, [tokenTag]);
        }

    }

    transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    logger(`normalized`, { nodes: nodes.size, txs: transactions.length });

    // ---- Collect unique IOU tokens ----
    const tokenSet = new Set<string>();
    for (const tx of transactions) {
      const amt = tx.amount;
      if (amt && amt.currency !== 'XRP' && amt.issuer) {
        tokenSet.add(`${amt.currency}.${amt.issuer}`);
      }
    }

    const tokenPrices: { currency: string; issuer: string; price_usd?: number }[] = [];

    if (tokenSet.size > 0) {
      logger('Fetching on-ledger prices for IOUs');

      // Reuse same XRPL client
      const xrpUsd = (await fetchXrpUsdPrice(client)) || 0;
      logger('XRP/USD price', { xrpUsd });

      for (const key of tokenSet) {
        const [currency, issuer] = key.split('.');
        const price = await fetchIOUPriceUSD(client, currency, issuer, xrpUsd);
        tokenPrices.push({ currency, issuer, price_usd: price });
      }
    }

    return { nodes: Array.from(nodes.values()), transactions, tokenPrices };
  });
}
