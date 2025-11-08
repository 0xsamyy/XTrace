# XTrace Dashboard

**XTrace Dashboard** is a Next.js-based **bank compliance and monitoring dashboard**
for visualizing on-ledger fund movements and controlling tokenized deposits on the XRP Ledger.

It demonstrates how a financial institution (the **issuer**) can:

* onboard and authorize customers,
* monitor their trust lines and token balances,
* review transaction summaries,
* and execute **administrative actions** like **freeze** and **clawback** —
  all via a secure web interface backed by the XRP Ledger testnet.

---

## Part 1: User Guide – Running the Demo

### Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set environment variables**

   Create a `.env` file in the project root with at least:

   ```env
   XRPL_NET=wss://s.altnet.rippletest.net:51233
   METRICS_BASE_URL=http://localhost:8080/api/v1/blueprint
   CURRENCY=USD
   ```

   * `XRPL_NET` → WebSocket endpoint of your XRPL testnet node
   * `METRICS_BASE_URL` → points to your running **XTrace Backend** (same one used by the frontend)
   * `CURRENCY` → the ISO code for the tokenized deposit (default: USD)

3. **Run the local dashboard**

   ```bash
   npm run dev
   ```

   Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Demo Data Setup

The dashboard ships with ready-to-run scripts that create a mini testnet ecosystem
(bank issuer + customers + fund flows) under `demo-state/state.json`.

| Command                    | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run demo:setup`       | Create issuer and customer wallets, trust lines, and authorizations |
| `npm run demo:setup:fresh` | Rebuild everything from scratch (new wallets)                       |
| `npm run demo:flow`        | Send a sequence of IOU payments between customers                   |
| `npm run demo:flow:again`  | Replay the fund flow even if already done                           |
| `npm run demo:once`        | Run setup + flow in one go                                          |
| `npm run demo:reset`       | Delete existing state and run full setup again                      |
| `npm run demo:show-state`  | Display current saved wallet state                                  |

Example:

```bash
npm run demo:once
```

→ creates the demo wallets and distributes funds across groups of linked accounts.

All wallet data is stored locally in `demo-state/state.json` (never uploaded).

---

### Using the Dashboard UI

1. **Open the dashboard:**
   [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

2. **Enter an XRPL address** (starting with `r...`) and click **Check**
   The system verifies whether the address has an **authorized trust line** with the bank’s issuer.

3. **If approved:**

   * The **Status** panel shows:

     * ✅ KYC = Authorized trust line
     * 🔒 Funds Frozen = Whether the account is currently frozen
   * The **Balances** panel shows:

     * Native XRP balance
     * Tokenized deposit balance (e.g. USD IOU)
   * The **Transactions** section summarizes inflows/outflows by token for the past N hours or days.
   * The **Admin Actions** section lets the issuer:

     * **Freeze / Unfreeze** a customer’s token holdings
     * **Claw back** tokenized deposits (with typed confirmation)

4. **If not approved:**
   A red notice explains that the address has no authorized trust line.

---

## Part 2: Technical Overview

### Architecture

| Layer            | Technology                  | Purpose                                     |
| ---------------- | --------------------------- | ------------------------------------------- |
| Framework        | **Next.js 16** (App Router) | Server + client rendering                   |
| Language         | **TypeScript**              | Strong typing throughout                    |
| Styling          | **Tailwind CSS v4**         | Responsive dark UI                          |
| Data Fetching    | **SWR**                     | Auto-refreshing hooks for API routes        |
| XRPL Integration | **xrpl.js v4.4**            | Wallet management + ledger transactions     |
| Validation       | **Zod**                     | Schema validation for API requests          |
| Demo Scripts     | **tsx + xrpl**              | Automatic testnet setup and flow generation |

---

### Folder Structure

```
xtrace-dashboard/
├── demo-state/               # Persistent wallet state (issuer + users)
│   └── state.json
├── src/
│   ├── app/
│   │   ├── api/              # API endpoints (Next.js routes)
│   │   │   ├── xrpl/         # Ledger operations
│   │   │   └── stats/        # Aggregated transaction summaries
│   │   ├── dashboard/        # React client components
│   │   ├── globals.css       # Tailwind base
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Redirects → /dashboard
│   ├── lib/
│   │   ├── xrpl.ts           # XRPL client helpers
│   │   └── state.ts          # Demo state management
│   └── scripts/              # Testnet setup and payment flow scripts
│       ├── setup.ts
│       └── flow.ts
└── package.json
```

---

### Key APIs

| Route                        | Method   | Description                                            |
| ---------------------------- | -------- | ------------------------------------------------------ |
| `/api/xrpl/account-overview` | **GET**  | Returns balances, trust line status, and issuer info   |
| `/api/xrpl/status`           | **GET**  | Returns whether account is authorized (KYC) and frozen |
| `/api/xrpl/freeze`           | **POST** | Freeze/unfreeze trust line                             |
| `/api/xrpl/clawback`         | **POST** | Claw back specified IOU amount                         |
| `/api/stats/summary`         | **GET**  | Aggregate inflow/outflow by token within N hours       |
| `/api/xrpl/...`              | —        | All interact directly with the XRP Ledger testnet      |

---

### Demo Mechanics

The scripts simulate a **mini-bank ecosystem**:

1. **`setup.ts`**

   * Creates one **issuer** wallet and several **user** wallets.
   * Enables key issuer flags: `RequireAuth`, `AllowClawback`, `DefaultRipple`.
   * Establishes trust lines (`TrustSet`) and authorizes them on issuer side.

2. **`flow.ts`**

   * Performs a staged series of **IOU payments** between demo users.
   * Builds a branching flow of value propagation (group 1 → group 2 → group 3).
   * Updates `demo-state/state.json` with `flowDone: true`.

3. **Dashboard UI**

   * Reads live XRPL data for any address.
   * Combines issuer info, balances, and a 24-hour transaction summary.
   * Enables admin functions via on-chain transactions.

---

### Data Flow

1. User enters an address → `/api/xrpl/account-overview`
2. Backend connects to XRPL testnet via `withClient()` (shared client)
3. Reads:

   * `account_info` (for XRP balance)
   * `account_lines` (for trust line balance + flags)
4. Returns JSON with:

   ```json
   {
     "address": "...",
     "approved": true,
     "balances": { "xrp": 123.45, "token": 5000 },
     "issuer": "...",
     "currency": "USD"
   }
   ```
5. Client components (SWR hooks) auto-refresh every few seconds for real-time state.

---

### Core Features

* **Real-time monitoring** of customer trust lines and balances
* **KYC / Freeze / Unfreeze / Clawback** actions from UI
* **Transaction summary API** aggregates inflows/outflows per token
* **Demo scripts** to spin up complete testnet ecosystem in minutes
* Lightweight Tailwind UI with Next.js App Router APIs
* **SWR** ensures continuous live data refresh
* Connects seamlessly to the **XTrace Backend** metrics API

---

### Security and Reliability

* No seeds are exposed in the frontend.
* Demo wallets are stored locally under `demo-state/`.
* Server-side routes interact directly with the XRP Ledger via `xrpl.js`.
* Administrative actions require the **issuer wallet** from local state.
* Environment-based configuration enables easy deployment to dev/test networks.

---

## Summary

The **XTrace Dashboard** demonstrates **regulatory control and transparency** for tokenized assets on XRPL.
It complements the **XTrace Frontend** by providing the **issuer’s view** — enabling compliance officers to:

* Verify customers and their trust lines
* Inspect token balances and activity
* Freeze, unfreeze, or claw back deposits
* Observe fund flows via the same backend used by XTrace Frontend
