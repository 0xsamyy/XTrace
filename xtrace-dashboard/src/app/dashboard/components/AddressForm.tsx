"use client"
import { useState } from "react"

export default function AddressForm({ onResult }: { onResult: (address: string, approved: boolean) => void }) {
  const [input, setInput] = useState("")
  const [checking, setChecking] = useState(false)

  async function check() {
    if (!input.startsWith("r")) {
      onResult(input, false)
      return
    }
    setChecking(true)
    try {
      const res = await fetch(`/api/xrpl/account-overview?address=${input}`)
      const data = await res.json()
      onResult(input, !!data.approved)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-6 space-y-3">
      <label className="block text-sm text-gray-400">Address</label>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
          placeholder="Enter XRPL address (r...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          onClick={check}
          disabled={checking}
          className="btn px-3 py-2 bg-white text-black rounded text-sm
                     hover:bg-gray-200 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </div>
    </div>
  )
}
