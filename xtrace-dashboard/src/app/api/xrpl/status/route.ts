import { NextRequest, NextResponse } from "next/server"
import { withClient, issuerInfo } from "@/lib/xrpl"
import type { Client } from "xrpl"

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get("address")
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 })

  const { address: issuer, currency } = await issuerInfo()

  return withClient(async (c: Client) => {
    try {
      const lines = await c.request({ command: "account_lines", account: address })
      const line = (lines.result.lines as any[]).find(
        (l) => l.account === issuer && l.currency === currency
      )

      if (!line)
        return NextResponse.json({
          address,
          kyc: false,
          frozen: false,
          currency,
        })

      const authorized = line.authorized === true || line.peer_authorized === true
      const frozen = line.freeze === true || line.freeze_peer === true

      return NextResponse.json({
        address,
        currency,
        kyc: authorized,
        frozen,
      })
    } catch (err) {
      console.error("status error", err)
      return NextResponse.json({ error: "failed to fetch status" }, { status: 500 })
    }
  })
}
