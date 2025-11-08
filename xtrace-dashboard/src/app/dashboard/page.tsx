"use client"
import { useState } from "react"
import AddressForm from "./components/AddressForm"
import StatusSection from "./components/StatusSection"
import BalanceSection from "./components/BalanceSection"
import TxSection from "./components/TxSection"
import ActionsSection from "./components/ActionsSection"

export default function DashboardPage() {
  const [address, setAddress] = useState("")
  const [approved, setApproved] = useState(false)

  return (
    <main className="min-h-screen bg-black text-gray-100 font-sans px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Bank Compliance Dashboard</h1>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Address check */}
        <AddressForm
          onResult={(addr, ok) => {
            setAddress(addr)
            setApproved(ok)
          }}
        />

        {/* Status + Balances row */}
        {address && approved && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <StatusSection address={address} />
            </div>
            <div className="flex-1">
              <BalanceSection address={address} />
            </div>
          </div>
        )}

        {/* Not approved notice */}
        {address && !approved && (
          <div className="rounded border border-red-600 bg-red-900/20 p-4">
            <p className="text-red-300">
              This address is <b>not approved</b> by the bank (no authorized trust line).
            </p>
          </div>
        )}

        {/* Rest of the dashboard */}
        {address && approved && (
          <>
            <TxSection address={address} />
            <ActionsSection address={address} />
          </>
        )}
      </div>
    </main>
  )
}
