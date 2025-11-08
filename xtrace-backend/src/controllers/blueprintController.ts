import { Request, Response } from 'express';
import { z } from 'zod';
import { fetchBlueprintData } from '../services/xrplService.js';
import { buildBlueprintResponse } from '../mappers/formatter.js';
import { BlueprintRequest } from '../types/blueprint.js';

const RequestSchema = z.object({
  centralAccount: z.string().min(1),
  network: z.enum(['mainnet', 'testnet']),
  timeRangeFetched: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  })
});

export async function getBlueprint(req: Request, res: Response) {
  try {
    const parsed = RequestSchema.parse(req.body);
    const { start, end } = parsed.timeRangeFetched;
    if (new Date(end).getTime() <= new Date(start).getTime()) {
        return res.status(400).json({ error: '`end` must be after `start`' });
    }
    const blueprintReq: BlueprintRequest = parsed;
    const { nodes, transactions, tokenPrices } = await fetchBlueprintData(blueprintReq);
    const payload = buildBlueprintResponse(blueprintReq, nodes, transactions, tokenPrices);
    res.status(200).json(payload);
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({ error: 'Invalid request', details: err.issues });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
