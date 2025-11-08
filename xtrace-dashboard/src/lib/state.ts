import { promises as fs } from "fs"
import path from "path"

const STATE_PATH = path.resolve(process.cwd(), "demo-state", "state.json")

export type Named = { name:string, seed:string, address:string, groups:number[] }
export type DemoState = {
  issuer: { seed:string, address:string }
  users: Named[]
  currency: string
  flowDone?: boolean
}

export async function loadState(): Promise<DemoState|null> {
  try { 
    const raw = await fs.readFile(STATE_PATH, "utf8")
    return JSON.parse(raw)
  } catch { return null }
}

export async function saveState(state: DemoState) {
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true })
  await fs.writeFile(STATE_PATH, JSON.stringify(state, null, 2))
}

export async function clearState() {
  try { await fs.unlink(STATE_PATH) } catch {}
}

export function statePath() { return STATE_PATH }
