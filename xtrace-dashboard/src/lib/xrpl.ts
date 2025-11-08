import "dotenv/config"
import { Client, Wallet } from "xrpl"
import { promises as fs } from "fs"
import path from "path"

export const client = new Client(process.env.XRPL_NET!)
export async function withClient<T>(fn: (c: Client)=>Promise<T>) {
  if (!client.isConnected()) await client.connect()
  try { return await fn(client) } finally { /* keep open for speed */ }
}

export const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms))
export const currency = () => process.env.CURRENCY ?? "USD"
export const fromSeed = (seed:string) => Wallet.fromSeed(seed)

/** Server-only: return issuer Wallet from demo-state */
export async function issuerWallet(): Promise<Wallet> {
  const p = path.resolve(process.cwd(), "demo-state", "state.json")
  const raw = await fs.readFile(p, "utf8")
  const json = JSON.parse(raw)
  return Wallet.fromSeed(json.issuer.seed)
}

/** Server-only: read issuer address + currency */
export async function issuerInfo(): Promise<{address:string, currency:string}> {
  const p = path.resolve(process.cwd(), "demo-state", "state.json")
  const raw = await fs.readFile(p, "utf8")
  const json = JSON.parse(raw)
  return { address: json.issuer.address as string, currency: json.currency as string }
}
