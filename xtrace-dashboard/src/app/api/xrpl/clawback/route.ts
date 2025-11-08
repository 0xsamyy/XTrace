import { NextRequest, NextResponse } from "next/server"
import { withClient, issuerWallet } from "@/lib/xrpl"
import type { Client } from "xrpl"

export async function POST(req: NextRequest) {
  const { holder, currency, amount } = await req.json()
  if (!holder || !currency || amount == null)
    return NextResponse.json({ error: "holder,currency,amount required" }, { status: 400 })

  const issuer = await issuerWallet()
  return withClient(async (c: Client) => {
    const tx = {
      TransactionType: "Clawback",
      Account: issuer.classicAddress,
      Amount: { currency, issuer: holder, value: String(amount) }
    }
    const res = await c.submitAndWait(tx, { wallet: issuer })
    return NextResponse.json({ hash: res.result.hash })
  })
}
