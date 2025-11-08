# 🧭 XTrace: XRPL Compliance & Visualization Suite

**XTrace** is a three-part tool suite designed for **commercial banks and financial institutions** issuing **tokenized assets** on the **XRP Ledger (XRPL)**.

Its mission is to deliver powerful, intuitive tools for **AML (Anti-Money Laundering) compliance**, **KYC (Know Your Customer) monitoring**, and **asset safety** — enabling real-time insight and control in an always-on blockchain environment.

With **XTrace**, compliance officers can:

* 🕵️‍♂️ **Visually trace** the flow of funds in real time
* 📊 **Monitor and review** any customer’s account, balances, and trust lines
* ⚖️ **Act decisively** to freeze or claw back funds in response to fraud, theft, or regulatory action

Together, these capabilities provide a complete workflow — from **investigation** to **intervention** — helping institutions meet regulatory requirements and protect on-chain assets.

---

## 🏛️ End-to-End Workflow: From Investigation to Action

The **XTrace Suite** consists of two user-facing applications powered by a shared backend data engine:

1. **XTrace Visualizer** — investigative and analytical interface
2. **XTrace Dashboard** — compliance and administrative control panel
3. **XTrace Backend** — data aggregation and API layer

A compliance officer’s workflow typically looks like this:

### Step 1: Investigate with the XTrace Visualizer

Open the **Visualizer** (the interactive “bubble map”) to begin tracing fund flows.

1. **Start with a seed account** — e.g., your treasury or a large customer wallet.
2. The graph renders counterparties, with **node size and edge width proportional to USD transaction value**.
3. Spot a suspicious outflow to an unknown wallet.
4. **Double-click the node** to re-center the graph and fetch that account’s transaction history.
5. Follow the path until you identify a high-risk destination such as a known mixer or flagged exchange.

### Step 2: Act with the XTrace Compliance Dashboard

Once you’ve identified a risky address, use the **Dashboard** to take on-ledger action.

1. **Copy the suspicious “r…” address** from the Visualizer.
2. **Paste it into the Dashboard** and click **Check**.
3. Instantly see account details:

   * Token balances
   * KYC/authorization status
   * Freeze state
4. Decide to lock the account pending review — click **Freeze** to submit a ledger transaction disabling its ability to send or receive your institution’s tokens.
5. If fraud is confirmed, execute a **Clawback** to retrieve the precise illicit amount and restore your assets.

This seamless hand-off from **Investigation (`xtrace-frontend`)** to **Action (`xtrace-dashboard`)** gives compliance teams full operational control within one coherent suite.

---

## ⚙️ System Architecture

```
            ┌─────────────────────────────┐
            │       XTrace Dashboard      │  ← Freeze / Clawback / KYC
            └─────────────▲───────────────┘
                          │  REST / WS
            ┌─────────────┴───────────────┐
            │       XTrace Backend        │  ← Data Engine (account_tx, DEX)
            └─────────────▲───────────────┘
                          │  REST API
            ┌─────────────┴───────────────┐
            │     XTrace Visualizer       │  ← Graph View / Analytics
            └─────────────────────────────┘
```

---

## 🚀 Running the Full Suite Locally

Each service runs in its own terminal.
**Prerequisites:**

* [Node.js ≥ 18](https://nodejs.org/)
* `npm`

### 1️⃣ Start the Backend Engine (Port 8080)

```bash
cd xtrace-backend
cp .env.example .env
npm install
npm run dev
```

> ✅ Backend running at **[http://localhost:8080](http://localhost:8080)**

---

### 2️⃣ Start the Visualizer Frontend (Port 5173)

```bash
cd xtrace-frontend
npm install
npm run dev
```

> ✅ Visualizer running at **[http://localhost:5173](http://localhost:5173)**

---

### 3️⃣ Start the Compliance Dashboard (Port 3000)

```bash
cd xtrace-dashboard
npm install
```

Create a file named `.env.local` and add:

```env
XRPL_NET=wss://s.altnet.rippletest.net:51233
CURRENCY=USD
METRICS_BASE_URL=http://localhost:8080/api/v1/blueprint
```

Then set up and launch the demo:

```bash
npm run demo:setup      # Create issuer & customer wallets
npm run demo:flow       # Generate test fund transfers
npm run dev             # Start dashboard
```

> ✅ Dashboard running at **[http://localhost:3000](http://localhost:3000)**

---

## 🧩 Project Structure

This repository contains **three independent but integrated projects**:

| Directory               | Tech Stack                                  | Role                                                                                                                        |
| ----------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **`/xtrace-backend`**   | Node.js + Express + TypeScript              | Connects to XRPL, fetches `account_tx`, computes USD valuations from DEX, and serves a unified REST API for both frontends. |
| **`/xtrace-frontend`**  | React + Vite + D3.js + TypeScript           | Read-only visualization tool showing interactive fund-flow graphs and time-series views.                                    |
| **`/xtrace-dashboard`** | Next.js + React + TypeScript + Tailwind CSS | Compliance and admin console; executes XRPL actions such as **Freeze** and **Clawback** using issuer credentials.           |

---

## 🧠 Key Features at a Glance

| Feature                       | Visualizer | Dashboard |
| ----------------------------- | ---------- | --------- |
| Real-time fund tracing        | ✅          | —         |
| Graph navigation & filters    | ✅          | —         |
| Transaction summaries         | ✅          | ✅         |
| KYC / Trust-line verification | —          | ✅         |
| Freeze / Unfreeze             | —          | ✅         |
| Clawback                      | —          | ✅         |
| Backend health monitoring     | ✅          | ✅         |

---

## 🏆 Summary

**XTrace** equips financial institutions on XRPL with a **complete compliance workflow**:

* Investigate and visualize token movements
* Identify suspicious activity with precision
* Enforce AML/KYC controls directly on-chain

Whether you’re a **bank issuing tokenized deposits**, a **compliance analyst**, or a **blockchain researcher**, XTrace provides a unified, transparent, and actionable view of value flow across the XRP Ledger.

## 👷 Built By

**XTrace Team** — "Above Code".  
Made with ❤️ for compliance, transparency, and safer digital assets.