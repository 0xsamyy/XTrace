"use client"
import useSWR from "swr"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function StatusSection({ address }: { address: string }) {
  const { data, isLoading } = useSWR(
    address ? `/api/xrpl/status?address=${address}` : null,
    fetcher,
    { refreshInterval: 10000 }
  )

  if (!address) return null
  if (isLoading || !data)
    return (
      <div className="rounded border border-gray-700 bg-gray-900/60 p-6">
        Loading status…
      </div>
    )

  const badge = (ok: boolean, text: string) => (
    <span
      className={`px-2 py-1 text-xs rounded font-mono ${
        ok
          ? "bg-green-700/30 text-green-300 border border-green-700/40"
          : "bg-red-700/30 text-red-300 border border-red-700/40"
      }`}
    >
      {text}
    </span>
  )

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-6 space-y-3">
      <h2 className="text-xl font-semibold mb-2">Status</h2>
      <div className="flex flex-col text-gray-300 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold w-32">KYC:</span>
          {badge(data.kyc, data.kyc ? "Yes" : "No")}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold w-32">Funds Frozen:</span>
          {badge(!data.frozen, data.frozen ? "Yes" : "No")}
        </div>
      </div>
    </div>
  )
}
