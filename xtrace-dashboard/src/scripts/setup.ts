import { Client, Wallet, AccountSetAsfFlags, TrustSetFlags } from "xrpl"
import { withClient, currency, fromSeed } from "@/lib/xrpl"
import { DemoState, Named, loadState, saveState } from "@/lib/state"

/** Fund a new wallet on Testnet */
async function fundNewWallet(c: Client) {
  const funded = await c.fundWallet()
  return funded.wallet
}

/** Enable RequireAuth, AllowClawback, DefaultRipple on the issuer */
async function enableIssuerFlags(c: Client, issuer: Wallet) {
  console.log("🏦 Setting issuer flags...")

  // RequireAuth
  const tx1 = await c.submitAndWait({
    TransactionType: "AccountSet",
    Account: issuer.classicAddress,
    SetFlag: AccountSetAsfFlags.asfRequireAuth,
  }, { wallet: issuer })
  console.log("   • RequireAuth hash:", tx1.result.hash)

  // AllowTrustLineClawback
  const tx2 = await c.submitAndWait({
    TransactionType: "AccountSet",
    Account: issuer.classicAddress,
    SetFlag: AccountSetAsfFlags.asfAllowTrustLineClawback,
  }, { wallet: issuer })
  console.log("   • AllowClawback hash:", tx2.result.hash)

  // ✅ DefaultRipple (critical for IOU payments)
  const tx3 = await c.submitAndWait({
    TransactionType: "AccountSet",
    Account: issuer.classicAddress,
    SetFlag: AccountSetAsfFlags.asfDefaultRipple,
  }, { wallet: issuer })
  console.log("   • DefaultRipple hash:", tx3.result.hash)
}

/** Create a trust line from a user to the issuer */
async function trustFromUser(c: Client, user: Wallet, issuerAddr: string, curr: string) {
  const res = await c.submitAndWait({
    TransactionType: "TrustSet",
    Account: user.classicAddress,
    LimitAmount: { currency: curr, issuer: issuerAddr, value: "1000000000" },
  }, { wallet: user })
  console.log(`      ↳ trustSet (${user.classicAddress.slice(0, 6)}...) hash:`, res.result.hash)
}

/** Authorize the user's trust line + clear NoRipple on issuer side */
async function authorizeTrust(c: Client, issuer: Wallet, userAddr: string, curr: string) {
  const res = await c.submitAndWait({
    TransactionType: "TrustSet",
    Account: issuer.classicAddress,
    LimitAmount: { currency: curr, issuer: userAddr, value: "0" },
    Flags: TrustSetFlags.tfSetfAuth | TrustSetFlags.tfClearNoRipple,
  }, { wallet: issuer })
  console.log(`      ↳ authorized ${userAddr.slice(0, 6)}... hash:`, res.result.hash)
}

/** Main setup */
export async function runSetup(forceFresh = false): Promise<DemoState> {
  const existing = await loadState()
  if (existing && !forceFresh) {
    console.log("✅ Using existing setup from state file.")
    return existing
  }

  return withClient(async (c) => {
    console.log("🚀 Funding issuer wallet on Testnet...")
    const issuerW = await fundNewWallet(c)
    console.log("   Issuer:", issuerW.classicAddress)
    await enableIssuerFlags(c, issuerW)

    console.log("👥 Creating and funding user wallets...")
    const mk = async (name: string, groups: number[]): Promise<Named> => {
      const w = await fundNewWallet(c)
      console.log(`   ↳ ${name}: ${w.classicAddress}`)
      return { name, seed: w.seed!, address: w.classicAddress, groups }
    }

    const users: Named[] = [
      await mk("first_receiver", [1]),
      await mk("g1_1", [1]),
      await mk("link12", [1, 2]),
      await mk("g2_1", [2]), await mk("g2_2", [2]), await mk("g2_3", [2]),
      await mk("link23", [2, 3]),
      await mk("g3_1", [3]), await mk("g3_2", [3]), await mk("g3_3", [3]), await mk("g3_4", [3]),
    ]

    const curr = currency()
    console.log("🔗 Creating trust lines and authorizing users...")

    let i = 1
    for (const u of users) {
      console.log(`   [${i++}/${users.length}] ${u.name}`)
      await trustFromUser(c, fromSeed(u.seed), issuerW.classicAddress, curr)
      await authorizeTrust(c, issuerW, u.address, curr)
    }

    const state: DemoState = {
      issuer: { seed: issuerW.seed!, address: issuerW.classicAddress },
      users,
      currency: curr,
      flowDone: false,
    }
    await saveState(state)
    console.log("✅ Setup complete. Saved to demo-state/state.json.")
    return state
  })
}

/** CLI entry */
if (require.main === module) {
  const force = process.argv.includes("--fresh")
  runSetup(force).then(() => process.exit(0))
}
