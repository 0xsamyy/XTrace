"use client"
import { useState, useEffect } from "react"
import Image from "next/image"

type Agg = {
  currency: string
  issuer?: string
  sent: number
  received: number
  net: number
  inflow: { address: string; amount: number }[]
  outflow: { address: string; amount: number }[]
}

export default function TxSection({ address }: { address: string }) {
  const [hours, setHours] = useState<number>(24)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<Agg[]>([])
  const [modal, setModal] = useState<{ token: string } | null>(null)

  useEffect(() => {
    if (!address) return
    setSummary([])
    setModal(null)
    setHours(24)
    load(24)
  }, [address])

  async function load(h = hours) {
    if (!address) return
    setLoading(true)
    const res = await fetch(`/api/stats/summary?address=${address}&hours=${h}`)
    const data = await res.json()
    setSummary(data.summary ?? [])
    setLoading(false)
  }

  const presets = [
    { label: "30 min", value: 0.5 },
    { label: "1h", value: 1 },
    { label: "6h", value: 6 },
    { label: "12h", value: 12 },
    { label: "24h", value: 24 },
    { label: "7d", value: 168 },
    { label: "30d", value: 720 },
  ]

  const fmt = (n: number, cur: string) => {
    const val = n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    })
    if (cur === "USD") return `$${val}`
    return val
  }

  const TokenIcon = ({ cur }: { cur: string }) =>
    cur === "XRP" ? (
      <span className="inline-flex items-center relative top-[1.5px] mx-[2px]">
        <Image
          src="/icons/xrp.svg"
          alt="XRP"
          width={12}
          height={12}
          className="opacity-80"
        />
      </span>
    ) : null

  async function copy(addr: string) {
    try {
      await navigator.clipboard.writeText(addr)
    } catch (err) {
      console.error("Clipboard error", err)
    }
  }

  const CopyIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v16h14c1.1 0 2-.9 2-2V5z" />
    </svg>
  )

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <div className="flex gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => { setHours(p.value); load(p.value) }}
              className={`btn px-2 py-1 rounded text-sm border border-gray-600 transition-all
                ${
                  p.value === hours
                    ? "bg-white text-black"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white active:scale-[0.97]"
                }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => load(hours)}
            className="btn px-3 py-1 bg-white text-black rounded text-sm
                       hover:bg-gray-200 active:scale-[0.97]"
          >
            Reload
          </button>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {!loading && summary.length === 0 && (
        <p className="text-gray-400 text-sm">No transactions in this time window.</p>
      )}

      {!loading &&
        summary.map((t) => {
          const token = t.currency
          return (
            <div key={token} className="border-t border-gray-700 pt-3 space-y-1">
              <div className="grid grid-cols-3 text-sm text-gray-300">
                <div>Token: <b>{token}</b></div>
                <div className="flex items-center">
                  <TokenIcon cur={token} />
                  Received: {fmt(t.received, token)}
                </div>
                <div className="text-right flex items-center justify-end">
                  <TokenIcon cur={token} />
                  Sent: {fmt(t.sent, token)}
                </div>
              </div>
              <div className="flex justify-between text-gray-200 mt-1">
                <span className="flex items-center">
                  Net:&nbsp;
                  <b className="flex items-center">
                    {t.net >= 0 ? "+" : ""}
                    {token === "XRP" && (
                      <span className="inline-flex items-center relative top-[1.5px] mx-[2px]">
                        <TokenIcon cur={token} />
                      </span>
                    )}
                    {fmt(Math.abs(t.net), token)}
                  </b>
                </span>
                <button
                  className="btn text-xs px-2 py-1 border border-gray-600 rounded
                             hover:bg-gray-700 hover:text-white active:scale-[0.97]"
                  onClick={() => setModal({ token })}
                >
                  Show TXs
                </button>
              </div>
            </div>
          )
        })}

      {modal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-gray-950 border border-gray-700 rounded p-5 w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-white">
                Transactions — {modal.token}
              </h3>
              <button
                className="btn text-sm text-gray-400 hover:text-white active:scale-[0.97]"
                onClick={() => setModal(null)}
              >
                ✕
              </button>
            </div>

            {/* 2-column layout */}
            <div className="grid grid-cols-2 gap-6 text-sm text-gray-300">
              {/* inflow */}
              <div>
                <h4 className="font-semibold text-white mb-2">Biggest Contributors</h4>
                {(summary.find((s) => s.currency === modal.token)?.inflow ?? [])
                  .slice(0, 15)
                  .map((row) => (
                    <div
                      key={row.address}
                      className="flex justify-between items-center border-b border-gray-800 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copy(row.address)}
                          title="Copy full address"
                          className="btn text-gray-500 hover:text-white active:scale-[0.97]"
                        >
                          {CopyIcon}
                        </button>
                        <span className="truncate w-40">{row.address.slice(0, 12)}…</span>
                      </div>
                      <span className="flex items-center">
                        <TokenIcon cur={modal.token} />
                        {fmt(row.amount, modal.token)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* outflow */}
              <div>
                <h4 className="font-semibold text-white mb-2">Biggest Receivers</h4>
                {(summary.find((s) => s.currency === modal.token)?.outflow ?? [])
                  .slice(0, 15)
                  .map((row) => (
                    <div
                      key={row.address}
                      className="flex justify-between items-center border-b border-gray-800 py-1"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copy(row.address)}
                          title="Copy full address"
                          className="btn text-gray-500 hover:text-white active:scale-[0.97]"
                        >
                          {CopyIcon}
                        </button>
                        <span className="truncate w-40">{row.address.slice(0, 12)}…</span>
                      </div>
                      <span className="flex items-center">
                        <TokenIcon cur={modal.token} />
                        {fmt(row.amount, modal.token)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
