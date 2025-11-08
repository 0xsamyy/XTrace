import { NextRequest, NextResponse } from "next/server"
import { withClient, issuerWallet, issuerInfo } from "@/lib/xrpl"
import { TrustSetFlags, Client } from "xrpl"

export async function POST(req: NextRequest) {
  const { holder, currency, action } = await req.json()
  if (!holder || !currency) return NextResponse.json({ error: "holder,currency required" }, { status: 400 })
  const flag = action === "unfreeze" ? TrustSetFlags.tfClearFreeze : TrustSetFlags.tfSetFreeze

  const issuer = await issuerWallet()
  return withClient(async (c: Client) => {
    const tx = {
      TransactionType: "TrustSet",
      Account: issuer.classicAddress,
      LimitAmount: { currency, issuer: holder, value: "0" },
      Flags: flag
    }
    const res = await c.submitAndWait(tx, { wallet: issuer })
    return NextResponse.json({ hash: res.result.hash })
  })
}
