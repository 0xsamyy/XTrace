// src/transforms/aggregators.ts
import { valuationService } from '../services/valuationService';
import type { XRPLTransaction } from '../services/dataContracts';
import type { NetworkNode, NetworkEdge } from '../stores/dataStore';

/**
 * Prepares Network View elements.
 * Creates nodes + one aggregated edge per counterparty.
 * - Counts transactions even if USD price is missing (value = 0).
 * - Updates central node totals correctly for inbound/outbound/self flows.
 * - Edges are keyed by counterparty:
 *     inboundValue  = value CP received from Central (Central -> CP)
 *     outboundValue = value CP sent to Central (CP -> Central)
 */
export function prepareNetworkView(
  transactions: XRPLTransaction[],
  centralAccount: string
): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  console.log(`Preparing Network View for ${transactions.length} transactions...`);

  type Agg = {
    txCount: number;
    inboundValue: number;
    outboundValue: number;
  };

  const nodeAggregates = new Map<string, Agg>();

  const getAgg = (id: string): Agg => {
    let agg = nodeAggregates.get(id);
    if (!agg) {
      agg = { txCount: 0, inboundValue: 0, outboundValue: 0 };
      nodeAggregates.set(id, agg);
    }
    return agg;
  };

  // Ensure and reference the central aggregate
  const centralAgg = getAgg(centralAccount);

  // --- Aggregate all node values ---
  for (const tx of transactions) {
    // Only payment types
    if (tx.type !== 'PAYMENT_XRP' && tx.type !== 'PAYMENT_IOU') continue;

    const sourceIsCentral = tx.source === centralAccount;
    const targetIsCentral = tx.target === centralAccount;

    // Ignore flows that don't involve the central account
    if (!sourceIsCentral && !targetIsCentral) continue;

    // USD value (may be 0 if unpriced)
    const valueInBase = valuationService.convertToBase(tx);

    // Self-to-self (rare)
    if (sourceIsCentral && targetIsCentral) {
      centralAgg.txCount += 1;
      centralAgg.inboundValue  += valueInBase;
      centralAgg.outboundValue += valueInBase;
      continue;
    }

    // Direction relative to central
    const inbound = targetIsCentral; // CP -> Central
    const counterparty = inbound ? tx.source : tx.target;
    const cpAgg = getAgg(counterparty);

    // Always count transactions, even if valueInBase = 0
    centralAgg.txCount += 1;
    cpAgg.txCount += 1;

    if (inbound) {
      // CP -> Central
      centralAgg.inboundValue  += valueInBase;
      cpAgg.outboundValue      += valueInBase;
    } else {
      // Central -> CP
      centralAgg.outboundValue += valueInBase;
      cpAgg.inboundValue       += valueInBase;
    }
  }

  // --- Build nodes array ---
  const nodes: NetworkNode[] = [];
  for (const [id, agg] of nodeAggregates.entries()) {
    nodes.push({
      id,
      isCentral: id === centralAccount,
      txCount: agg.txCount,
      inboundValue: agg.inboundValue,
      outboundValue: agg.outboundValue,
    });
  }

  // --- Build aggregated edges (one per counterparty) ---
  const edges: NetworkEdge[] = [];
  for (const node of nodes) {
    if (node.isCentral) continue;

    edges.push({
      source: centralAccount,
      target: node.id,
      // Edge semantics: values are from the counterparty's perspective
      inboundValue: node.inboundValue,    // CP received from Central
      outboundValue: node.outboundValue,  // CP sent to Central
      totalValue: node.inboundValue + node.outboundValue,
    });
  }

  console.log(`Network View: ${nodes.length} nodes, ${edges.length} edges.`);
  return { nodes, edges };
}