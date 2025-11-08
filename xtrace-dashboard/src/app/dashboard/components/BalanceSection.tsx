"use client"
import useSWR from "swr"
import Image from "next/image"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function BalanceSection({ address }: { address: string }) {
  const { data, isLoading } = useSWR(
    `/api/xrpl/account-overview?address=${address}`,
    fetcher,
    { refreshInterval: 8000 }
  )

  if (isLoading || !data)
    return (
      <div className="rounded border border-gray-700 bg-gray-900/60 p-6">
        Loading balances…
      </div>
    )

  const format = (n: number, cur: string) => {
    const val = Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
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
          width={14}
          height={14}
          className="opacity-80"
        />
      </span>
    ) : null

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-6 space-y-3">
      <h2 className="text-xl font-semibold">Balances</h2>

      {/* XRP */}
      <div className="flex justify-between text-gray-300">
        <span>XRP</span>
        <span className="font-mono flex items-center">
          <TokenIcon cur="XRP" />
          {format(data.balances.xrp, "XRP")}
        </span>
      </div>

      {/* USD */}
      <div className="flex justify-between text-gray-300">
        <span>Tokenized Deposit ({data.currency})</span>
        <span className="font-mono">
          {format(data.balances.token, data.currency)}
        </span>
      </div>
    </div>
  )
}
