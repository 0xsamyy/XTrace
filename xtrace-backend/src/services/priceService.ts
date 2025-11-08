// src/services/priceService.ts
import { Client } from 'xrpl'
import { dropsToXrp } from 'xrpl'

// Bitstamp USD issuer (reference USD IOU on mainnet)
const BITSTAMP_USD = { currency: 'USD', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' }

// Encode display names (e.g., "RLUSD" or "HADA") to XRPL 20-byte code for non-ISO assets
function encodeCurrency(code: string): string {
  if (/^[A-Z0-9]{3}$/.test(code)) return code // ISO code stays as-is
  if (/^[A-F0-9]{40}$/i.test(code)) return code.toUpperCase() // already 160-bit hex
  const buf = Buffer.alloc(20)
  buf.write(code.slice(0, 20), 0, 'ascii')
  return buf.toString('hex').toUpperCase()
}

// ---- helpers to read amounts safely ----
function toNumberXRP(dropsOrXrp: string): number {
  // In book_offers, XRP amounts are strings in DROPS
  // dropsToXrp returns a string XRP value (not scientific notation)
  return parseFloat(dropsToXrp(dropsOrXrp))
}
function toNumberIOU(obj: { value: string }): number {
  return parseFloat(obj?.value ?? '0')
}

type BookSide = {
  taker_gets: any
  taker_pays: any
}
type BookAgg = {
  offers: number
  baseAmount: number // sum in taker_gets units (normalized to XRP for XRP)
  quoteAmount: number // sum in taker_pays units (normalized to XRP for XRP)
  price: number // quote / base (i.e., taker_pays per 1 taker_gets unit)
}

/**
 * Aggregate a book into a clean price:
 * - We sum across top N offers:
 *   base = Σ taker_gets (normalized units)
 *   quote = Σ taker_pays (normalized units)
 * - price = quote / base  (units: taker_pays per 1 taker_gets)
 */
async function aggregateBook(
  client: Client,
  side: BookSide,
  limit = 10
): Promise<BookAgg | undefined> {
  const resp = await client.request({
    command: 'book_offers',
    taker_gets: side.taker_gets,
    taker_pays: side.taker_pays,
    limit
  })

  const offers = resp.result.offers || []
  if (offers.length === 0) return undefined

  let base = 0
  let quote = 0

  for (const o of offers) {
    const gets = o.TakerGets
    const pays = o.TakerPays

    // Normalize base (taker_gets)
    if (typeof gets === 'string') {
      base += toNumberXRP(gets) // XRP (drops) → XRP number
    } else {
      base += toNumberIOU(gets) // IOU
    }

    // Normalize quote (taker_pays)
    if (typeof pays === 'string') {
      quote += toNumberXRP(pays) // XRP in drops → XRP
    } else {
      quote += toNumberIOU(pays) // IOU
    }
  }

  if (base <= 0) return undefined
  const price = quote / base

  return {
    offers: offers.length,
    baseAmount: base,
    quoteAmount: quote,
    price
  }
}

/**
 * Resolve IOU → USD price using XRPL DEX order books.
 * Strategy:
 * 1) Try IOU/USD (Bitstamp USD) directly.
 *    - taker_gets = USD  (what the taker receives)
 *    - taker_pays = IOU  (what the taker pays)
 *    => aggregated price = USD per IOU
 *
 * 2) If missing, try IOU ↔ XRP:
 *    a) IOU→XRP:
 *       - taker_gets = XRP
 *       - taker_pays = IOU
 *       => price_a = XRP per IOU
 *       => USD per IOU = price_a * xrpUsd
 *
 *    b) XRP→IOU:
 *       - taker_gets = IOU
 *       - taker_pays = XRP
 *       => price_b = IOU per XRP
 *       => XRP per IOU = 1 / price_b
 *       => USD per IOU = (1 / price_b) * xrpUsd
 *
 * We pick the side with actual liquidity (and higher baseAmount if both exist).
 */
export async function fetchIOUPriceUSD(
  client: Client,
  currency: string,
  issuer: string,
  xrpUsdPrice: number
): Promise<number | undefined> {
  const code = encodeCurrency(currency)

  if (!/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(issuer)) {
    console.warn('[price] skipping invalid issuer', { currency, issuer });
    return undefined;
  }

  // ---------- 1) Direct IOU/USD ----------
  try {
    const direct = await aggregateBook(client, {
      taker_gets: { currency: 'USD', issuer: BITSTAMP_USD.issuer },
      taker_pays: { currency: code, issuer }
    })
    if (direct?.price && isFinite(direct.price)) {
      console.log('[price] IOU/USD direct', {
        currency,
        issuer,
        offers: direct.offers,
        baseUSD: direct.baseAmount,
        quoteIOU: direct.quoteAmount,
        usdPerIOU: direct.price
      })
      return direct.price // USD per IOU
    }
  } catch (e) {
    console.error('[price] direct IOU/USD failed', { currency, issuer, error: e })
  }

  // ---------- 2) IOU ↔ XRP route ----------
  let routeA: BookAgg | undefined
  let routeB: BookAgg | undefined

  try {
    // IOU→XRP (XRP per IOU)
    routeA = await aggregateBook(client, {
      taker_gets: { currency: 'XRP' },
      taker_pays: { currency: code, issuer }
    })
  } catch (e) {
    console.error('[price] IOU→XRP failed', { currency, issuer, error: e })
  }

  try {
    // XRP→IOU (IOU per XRP)
    routeB = await aggregateBook(client, {
      taker_gets: { currency: code, issuer },
      taker_pays: { currency: 'XRP' }
    })
  } catch (e) {
    console.error('[price] XRP→IOU failed', { currency, issuer, error: e })
  }

  if (!routeA && !routeB) {
    console.log('[price] no IOU<->XRP liquidity', { currency, issuer })
    return undefined
  }

  // Choose the more liquid side (by baseAmount); fallback to whichever exists.
  let chosen: { side: 'A' | 'B'; agg: BookAgg }
  if (routeA && routeB) {
    chosen =
      routeA.baseAmount >= routeB.baseAmount
        ? { side: 'A', agg: routeA }
        : { side: 'B', agg: routeB }
  } else if (routeA) {
    chosen = { side: 'A', agg: routeA }
  } else {
    chosen = { side: 'B', agg: routeB! }
  }

  const q = chosen.agg.price
  if (!isFinite(q) || q <= 0) return undefined

  let usdPerIOU: number
  if (chosen.side === 'A') {
    // A: IOU→XRP book → price = XRP per IOU
    usdPerIOU = q * xrpUsdPrice
    console.log('[price] IOU→XRP route used', {
      currency,
      issuer,
      offers: chosen.agg.offers,
      xrpPerIOU: q,
      xrpUsdPrice,
      usdPerIOU
    })
  } else {
    // B: XRP→IOU book → price = IOU per 1 XRP
    // For this orientation, 1 IOU = quality × XRP → USD
    usdPerIOU = q * xrpUsdPrice
    console.log('[price] XRP→IOU route used', {
    currency,
    issuer,
    offers: chosen.agg.offers,
    iouPerXrp: q,
    xrpUsdPrice,
    usdPerIOU
    })
  }

  return usdPerIOU
}
