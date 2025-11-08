// src/transforms/viewTransforms.ts
import { useDataStore } from '../stores/dataStore';
import { useFilterStore, type TransactionType } from '../stores/filterStore';
import { prepareNetworkView } from './aggregators';
import { min, max } from 'd3-array';

/**
 * Main transform pipeline.
 * Takes raw data, filters it, creates network data, and stores it.
 */
export function computeViewData() {
  console.log('viewTransforms: Starting computation...');

  // --- State & actions ---
  const { rawTransactions, fullTimeRange } = useDataStore.getState();
  const { setComputedNetworkData, setSelection, setFullTimeRange } = useDataStore.getState();

  const {
    centralAccount,
    types,
    direction,
    showDust,
    // ✅ Use the brush/active window, not the back-compat alias
    timeRangeActive,
  } = useFilterStore.getState();

  // --- Establish full dataset time range once ---
  if (!fullTimeRange && rawTransactions.length > 0) {
    const minDate = min(rawTransactions, (d) => new Date(d.timestamp));
    const maxDate = max(rawTransactions, (d) => new Date(d.timestamp));
    if (minDate && maxDate) {
      setFullTimeRange({
        start: minDate.toISOString(),
        end: maxDate.toISOString(),
      });
    }
  }

  // --- Apply filters (including active time window) ---
  const activeStart = new Date(timeRangeActive.start);
  const activeEnd = new Date(timeRangeActive.end);

  console.log(`Filtering by types: ${types.join(', ') || 'NONE'}`);
  console.log(`Filtering by direction: ${direction}`);
  console.log(`Active window: ${activeStart.toISOString()} → ${activeEnd.toISOString()}`);

  const filteredTxs = rawTransactions.filter((tx) => {
    // 1) Type
    const typeMatch = types.includes(tx.type as TransactionType);
    if (!typeMatch) return false;

    // 2) Direction (relative to central account)
    const isSource = tx.source === centralAccount;
    const isTarget = tx.target === centralAccount;
    if (direction === 'inbound' && !isTarget) return false;
    if (direction === 'outbound' && !isSource) return false;
    if (direction === 'both' && !isSource && !isTarget) return false;

    // 3) Time window (brush)
    const t = new Date(tx.timestamp);
    if (t < activeStart || t > activeEnd) return false;

    return true;
  });

  console.log(`Filtered ${rawTransactions.length} txs down to ${filteredTxs.length}`);

  // --- Build network (priced + central-aware) ---
  let networkData = prepareNetworkView(filteredTxs, centralAccount);

  // --- Optional dust filter at node level ---
  if (!showDust) {
    console.log('Filtering dust nodes...');
    const nodesToKeep = networkData.nodes.filter((node) => {
      const total = node.inboundValue + node.outboundValue;
      return node.isCentral || total >= 1;
    });

    const keepIds = new Set(nodesToKeep.map((n) => n.id));
    const edgesToKeep = networkData.edges.filter(
      (e) => keepIds.has(e.source) && keepIds.has(e.target)
    );

    console.log(`Removed ${networkData.nodes.length - nodesToKeep.length} dust nodes.`);
    networkData = { nodes: nodesToKeep, edges: edgesToKeep };
  }

  // --- Store results & default selection ---
  setComputedNetworkData(networkData);
  setSelection(centralAccount);

  console.log('viewTransforms: Computation complete. Network data stored.');
}