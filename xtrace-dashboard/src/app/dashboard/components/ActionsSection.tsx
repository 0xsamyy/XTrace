"use client"
import { useState } from "react"
import useSWR from "swr"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function ActionsSection({ address }: { address: string }) {
  const [amount, setAmount] = useState("")
  const [rawAmount, setRawAmount] = useState<number>(0)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; body: string; onConfirm: () => Promise<void> } | null>(null)
  const [aboveMax, setAboveMax] = useState(false)

  const { data: info } = useSWR(
    address ? `/api/xrpl/account-overview?address=${address}` : null,
    fetcher,
    { refreshInterval: 10000 }
  )
  const { data: status } = useSWR(
    address ? `/api/xrpl/status?address=${address}` : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  async function call(path: string, body: any) {
    setBusy(true)
    await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setBusy(false)
  }

  if (!address || !info) return null

  const frozen = status?.frozen ?? false
  const currency = status?.currency ?? "USD"
  const tokenBalance = Number(info.balances?.token ?? 0)
  const canClawback = tokenBalance > 0 && !busy && !aboveMax
  const formatUSD = (n: number) =>
    `$${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  // 🧠 Handle input — allow only digits and decimal point
  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/,/g, "")
    if (raw === "") {
      setAmount("")
      setRawAmount(0)
      setAboveMax(false)
      return
    }

    // Accept only numbers and at most one dot
    if (!/^\d*\.?\d*$/.test(raw)) return

    const numeric = parseFloat(raw)
    if (isNaN(numeric)) return

    // Auto insert commas as user types
    const formatted = numeric.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    })
    setAmount(formatted)
    setRawAmount(numeric)

    // Check for exceeding available balance
    if (numeric > tokenBalance) setAboveMax(true)
    else setAboveMax(false)
  }

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-6 space-y-3">
      <h2 className="text-xl font-semibold">Admin Actions</h2>

      {/* Freeze / Unfreeze */}
      <div className="flex gap-2">
        <button
          disabled={frozen || busy}
          className={`btn border border-gray-600 px-3 py-2 rounded text-sm transition-all
            ${
              frozen
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-gray-700 hover:text-white active:scale-[0.97]"
            }`}
          onClick={() =>
            setConfirm({
              title: "Freeze tokenized deposits?",
              body: `Are you sure you want to freeze ${currency} (tokenized deposits) for:\n${address}`,
              onConfirm: () =>
                call("/api/xrpl/freeze", { holder: address, currency, action: "freeze" }),
            })
          }
        >
          Freeze
        </button>

        <button
          disabled={!frozen || busy}
          className={`btn border border-gray-600 px-3 py-2 rounded text-sm transition-all
            ${
              !frozen
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-gray-700 hover:text-white active:scale-[0.97]"
            }`}
          onClick={() =>
            setConfirm({
              title: "Unfreeze tokenized deposits?",
              body: `Are you sure you want to unfreeze ${currency} (tokenized deposits) for:\n${address}`,
              onConfirm: () =>
                call("/api/xrpl/freeze", { holder: address, currency, action: "unfreeze" }),
            })
          }
        >
          Unfreeze
        </button>
      </div>

      {/* Clawback */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="flex-1 w-full">
          <input
            className={`w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm ${
              !tokenBalance ? "opacity-40 cursor-not-allowed" : ""
            }`}
            placeholder={
              tokenBalance > 0
                ? `Available balance: ${formatUSD(tokenBalance)}`
                : "No funds available to claw back"
            }
            value={amount}
            onChange={handleAmountChange}
            disabled={!tokenBalance}
          />
          {aboveMax && (
            <p className="text-xs text-red-400 mt-1">Above available balance</p>
          )}
        </div>

        <button
          disabled={!canClawback || !rawAmount}
          className="btn border border-gray-600 px-3 py-2 rounded text-sm
                     hover:bg-gray-700 hover:text-white active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() =>
            setConfirm({
              title: "Claw back tokenized deposits?",
              body: `Are you sure you want to claw back ${formatUSD(rawAmount)} ${currency} (tokenized deposits) from:\n${address}`,
              onConfirm: () =>
                call("/api/xrpl/clawback", {
                  holder: address,
                  currency,
                  amount: rawAmount.toString(),
                }),
            })
          }
        >
          Clawback
        </button>
      </div>

      {busy && <p className="text-xs text-gray-400">Processing…</p>}

      {/* Confirmation modal */}
      {confirm && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setConfirm(null)}
        >
          <div
            className="bg-gray-950 border border-gray-700 rounded p-4 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">{confirm.title}</h3>
            <p className="text-sm text-gray-300 mb-4 whitespace-pre-line">{confirm.body}</p>
            <div className="flex justify-end gap-2">
              <button
                className="btn border border-gray-600 px-3 py-1 rounded text-sm
                           hover:bg-gray-700 hover:text-white active:scale-[0.97]"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn bg-white text-black px-3 py-1 rounded text-sm
                           hover:bg-gray-200 active:scale-[0.97]"
                onClick={async () => {
                  await confirm.onConfirm()
                  setConfirm(null)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
