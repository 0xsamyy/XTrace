import { NextRequest, NextResponse } from "next/server"
import { withClient, issuerInfo } from "@/lib/xrpl"
import type { Client } from "xrpl"

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get("address")
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })

  const { address: issuer, currency } = await issuerInfo()

  return withClient(async (c: Client) => {
    // XRP
    const info = await c.request({ command: "account_info", account: address })
    const xrp = Number(info.result.account_data.Balance) / 1_000_000

    // Find the trust line FROM holder TO issuer for our currency
    const lines = await c.request({ command: "account_lines", account: address })
    const line = (lines.result.lines as any[]).find(
      (l) => l.account === issuer && l.currency === currency
    )

    const approved = !!line && (line.peer_authorized === true || line.authorized === true || Number(line.limit_peer ?? 0) >= 0)
    const tokenBalance = line ? Number(line.balance || 0) : 0

    return NextResponse.json({
      address,
      approved,
      issuer,
      currency,
      balances: {
        xrp: xrp,
        token: tokenBalance
      }
    })
  })
}
