// src/services/xrpPriceService.ts
import { Client } from 'xrpl'
import { dropsToXrp } from 'xrpl'

// Bitstamp USD issuer (reference USD IOU on mainnet)
const BITSTAMP_USD = { currency: 'USD', issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq' }

/**
 * Compute USD per 1 XRP from the USD/XRP book by aggregating offers:
 * - taker_gets = USD
 * - taker_pays = XRP (drops)
 * - price = (Σ USD) / (Σ XRP)
 */
export async function fetchXrpUsdPrice(client: Client): Promise<number | undefined> {
  try {
    const resp = await client.request({
      command: 'book_offers',
      taker_gets: { currency: 'USD', issuer: BITSTAMP_USD.issuer },
      taker_pays: { currency: 'XRP' },
      limit: 10
    })
    const offers = resp.result.offers || []
    if (offers.length === 0) return undefined

    let sumUsd = 0
    let sumXrp = 0
    for (const o of offers) {
      const gets = o.TakerGets // USD obj
      const pays = o.TakerPays // XRP in drops

      if (typeof gets === 'string') continue // unexpected
      if (typeof pays !== 'string') continue // unexpected

      sumUsd += parseFloat(gets.value)
      sumXrp += parseFloat(dropsToXrp(pays))
    }
    if (sumUsd <= 0 || sumXrp <= 0) return undefined

    const usdPerXrp = sumUsd / sumXrp
    console.log('[price] XRP/USD aggregated', {
      offers: offers.length,
      sumUsd,
      sumXrp,
      usdPerXrp
    })
    return usdPerXrp
  } catch (e) {
    console.error('[price] fetchXrpUsdPrice failed', e)
    return undefined
  }
}
