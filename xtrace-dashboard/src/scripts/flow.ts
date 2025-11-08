import { Client } from "xrpl"
import { withClient, sleep, fromSeed } from "@/lib/xrpl"
import { loadState, saveState } from "@/lib/state"

/** Helper to send IOU payments */
async function payIOU(c: Client, fromSeedStr: string, to: string, currency: string, issuer: string, value: string, label: string) {
  const w = fromSeed(fromSeedStr)
  const res = await c.submitAndWait({
    TransactionType: "Payment",
    Account: w.classicAddress,
    Destination: to,
    Amount: { currency, issuer, value },
  }, { wallet: w })
  console.log(`   💸 ${label} hash: ${res.result.hash}`)
  await sleep(5000) // small gap to get distinct timestamps
}

/** Main flow logic */
export async function runFlow(force = false) {

  console.log("⏳ Waiting 5 seconds for trust lines to validate...")
  await sleep(5000)
  const state = await loadState()
  if (!state) throw new Error("No setup found. Run: npm run demo:setup")
  if (state.flowDone && !force) {
    console.log("Flow already executed. Skipping (use --force to run again).")
    return
  }

  const { issuer, users, currency } = state
  const get = (name: string) => users.find(u => u.name === name)!

  await withClient(async (c) => {
    console.log("🚦 Starting flow phase...")

    const issuerSeed = issuer.seed
    const first = get("first_receiver")
    const link12 = get("link12")
    const g1_1 = get("g1_1")
    const link23 = get("link23")
    const g2_1 = get("g2_1"), g2_2 = get("g2_2"), g2_3 = get("g2_3")
    const u1 = get("g3_1"), u2 = get("g3_2"), u3 = get("g3_3"), u4 = get("g3_4")

    // Bank issues 50,000 to first_receiver
    await payIOU(c, issuerSeed, first.address, currency, issuer.address, "50000", "Issuer → first_receiver 50,000")

    // first_receiver → link12 (30k) and g1_1 (5k)
    await payIOU(c, first.seed, link12.address, currency, issuer.address, "30000", "first_receiver → link12 30,000")
    await payIOU(c, first.seed, g1_1.address, currency, issuer.address, "5000", "first_receiver → g1_1 5,000")

    // link12 → link23 (15k) + 3x 5k
    await payIOU(c, link12.seed, link23.address, currency, issuer.address, "15000", "link12 → link23 15,000")
    for (const g2 of [g2_1, g2_2, g2_3]) {
      await payIOU(c, link12.seed, g2.address, currency, issuer.address, "5000", `link12 → ${g2.address.slice(0, 6)} 5,000`)
    }

    // link23 → 10k / 2k / 2k / 1k
    await payIOU(c, link23.seed, u1.address, currency, issuer.address, "10000", "link23 → g3_1 10,000")
    await payIOU(c, link23.seed, u2.address, currency, issuer.address, "2000", "link23 → g3_2 2,000")
    await payIOU(c, link23.seed, u3.address, currency, issuer.address, "2000", "link23 → g3_3 2,000")
    await payIOU(c, link23.seed, u4.address, currency, issuer.address, "1000", "link23 → g3_4 1,000")
  })

  state.flowDone = true
  await saveState(state)
  console.log("✅ Flow complete. Marked as done in state file.")
}

/** CLI entry */
if (require.main === module) {
  const force = process.argv.includes("--force")
  runFlow(force)
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1) })
}
