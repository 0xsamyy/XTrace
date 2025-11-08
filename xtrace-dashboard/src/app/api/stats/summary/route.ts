import { NextRequest, NextResponse } from "next/server"

type Tx = {
  hash: string
  source: string
  target: string
  type: "PAYMENT_XRP" | "PAYMENT_IOU" | "TRUSTSET"
  timestamp: string
  amount?: { value: string, currency: string, issuer?: string }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const address = url.searchParams.get("address")
  const hoursStr = url.searchParams.get("hours")

  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })

  const hours = Number(hoursStr ?? 24)
  const now = new Date()
  const end = now.toISOString()
  const start = new Date(now.getTime() - Math.round(hours * 3600_000)).toISOString()

  // Call your XTrace backend
  const res = await fetch(process.env.METRICS_BASE_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      centralAccount: address,
      network: "testnet",
      timeRangeFetched: { start, end }
    })
  })
  if (!res.ok) {
    return NextResponse.json({ error: "metrics backend error", status: res.status }, { status: 502 })
  }

  const data = await res.json()
  const txs: Tx[] = data.transactions ?? []

  // Aggregate by token key
  type Agg = {
    currency: string
    issuer?: string
    sent: number
    received: number
    net: number
    inflow: { address: string, amount: number }[]
    outflow: { address: string, amount: number }[]
  }

  const map = new Map<string, Agg>()

  function keyOf(cur: string, iss?: string) { return iss ? `${cur}:${iss}` : `${cur}` }

  for (const tx of txs) {
    if (!tx.amount) continue
    if (tx.type !== "PAYMENT_XRP" && tx.type !== "PAYMENT_IOU") continue

    const cur = tx.amount.currency
    const iss = tx.amount.issuer
    const k = keyOf(cur, iss)
    const amt = Number(tx.amount.value)

    if (!map.has(k)) map.set(k, { currency: cur, issuer: iss, sent: 0, received: 0, net: 0, inflow: [], outflow: [] })
    const agg = map.get(k)!

    if (tx.source === address) {
      agg.sent += amt
      // outflow: to counterparty
      const row = agg.outflow.find(r => r.address === tx.target)
      if (row) row.amount += amt; else agg.outflow.push({ address: tx.target, amount: amt })
    } else if (tx.target === address) {
      agg.received += amt
      // inflow: from counterparty
      const row = agg.inflow.find(r => r.address === tx.source)
      if (row) row.amount += amt; else agg.inflow.push({ address: tx.source, amount: amt })
    }
  }

  // finalize
  const summary = Array.from(map.values()).map(a => {
    a.net = +(a.received - a.sent).toFixed(6)
    a.inflow.sort((x,y)=>y.amount - x.amount)
    a.outflow.sort((x,y)=>y.amount - x.amount)
    return a
  })

  return NextResponse.json({ request: { address, start, end }, summary })
}
