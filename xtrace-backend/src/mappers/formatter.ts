import { BlueprintRequest, BlueprintResponse, NodeInfo, Transaction, TokenPrice } from '../types/blueprint.js';

export function buildBlueprintResponse(
  request: BlueprintRequest,
  nodes: NodeInfo[],
  transactions: Transaction[],
  tokenPrices?: TokenPrice[]
): BlueprintResponse {
  return {
    request,
    nodes,
    transactions,
    ...(tokenPrices ? { tokenPrices } : {})
  };
}