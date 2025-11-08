import { Router } from 'express';
import { getBlueprint } from '../controllers/blueprintController.js';

const router = Router();

/**
 * POST /v1/blueprint
 * body: {
 *   centralAccount: string,
 *   network: "mainnet" | "testnet",
 *   timeRangeFetched: { start: ISO, end: ISO }
 * }
 */
router.post('/v1/blueprint', getBlueprint);

export default router;
