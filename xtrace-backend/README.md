# XTrace Backend

## I. Overview — What It Does and Why It Exists

The **XRPL Blueprint Backend** is the data-gathering and normalization layer for our project.
It connects directly to the **XRP Ledger (XRPL)** mainnet or testnet and organizes all blockchain activity related to a chosen **central wallet** into a clean, predictable JSON format.

This backend exists to make blockchain data understandable.
Instead of showing raw XRPL transactions, it turns them into a structured "blueprint" of interactions:

* who the wallet interacted with (nodes),
* what types of transactions happened (trust lines, payments in XRP or IOUs),
* and when these actions occurred.

In plain terms:

> Give it a wallet address, tell it which network (mainnet or testnet), and a time window.
> It will return a detailed picture of all that wallet’s activity during that period.

### What it can do

* Fetch all transactions involving a given address in a specific time range
* Automatically recognize transaction types:

  * **PAYMENT_XRP** — native XRP transfers
  * **PAYMENT_IOU** — issued-token transfers (USD, RLUSD, etc.)
  * **TRUSTSET** — trust-line setups between accounts
* Identify every counterparty and classify them as **nodes** (the central wallet, exchanges, issuers, etc.)
* Return results in a clean JSON contract:

  ```json
  {
    "request": {...},
    "nodes": [...],
    "transactions": [...]
  }
  ```
* Handle both **XRPL mainnet and testnet** via configuration
* Normalize all timestamps to **UTC ISO 8601** format (e.g. `"2025-11-07T13:36:10Z"`)
* Future-ready design — easy to extend with metadata like tags, fees, destination tags, or pretty token names.
* Automatically fetches on-ledger IOU prices (in USD) using live XRPL DEX order-books

### Why it matters

Blockchain explorers are great for individual transactions but not for *stories*.
This backend gives you that story — the relationships and flows of value over time — in a developer-friendly format that any frontend (React, webapp, analytics dashboard, etc.) can visualize immediately.

---

## II. Technical Explanation — How It Works

### 1. Architecture Overview

```
Frontend (any JS/React app)
        │
        ▼
    /api/v1/blueprint  ← REST endpoint (POST)
        │
        ▼
Controller  →  Service Layer  →  XRPL WebSocket Client
        │            │
        ▼            ▼
   Input validation   ↳ Fetches + normalizes XRPL data
        │
        ▼
   Response Builder → Sends unified JSON
```

### 2. Tech Stack

| Component                   | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| **Node.js 20 + TypeScript** | Typed runtime & modern ES modules              |
| **Express.js**              | Lightweight REST API framework                 |
| **xrpl** npm package        | Official XRPL client SDK for WebSocket queries |
| **zod**                     | Schema validation of API inputs                |
| **pino**                    | Fast structured logging                        |
| **dotenv**                  | Environment configuration                      |
| **dayjs**                   | Time parsing and formatting                    |
| **nodemon + tsx**           | Dev-time live reload and TypeScript execution  |

### 3. Data Flow in Detail

1. **Frontend request → `/api/v1/blueprint` (POST)**
   Example:

   ```json
   {
     "centralAccount": "rGoLdHQ7ujED1TMNPBJH9Ek6VJwU7Ns7kr",
     "network": "mainnet",
     "timeRangeFetched": {
       "start": "2025-11-07T13:35:00Z",
       "end": "2025-11-07T15:38:00Z"
     }
   }
   ```

2. **Input validation**

   * Ensures address format, required fields, and valid time range.
   * Everything is in UTC (`Z` suffix).

3. **XRPL Connection**

   * Chooses endpoint based on network:

     * `wss://xrplcluster.com` → Mainnet
     * `wss://s.altnet.rippletest.net:51233` → Testnet
   * Uses a `Client` instance from the `xrpl` library, auto-disconnects after use.

4. **Ledger query (`account_tx`)**

   * Fetches all transactions where the central account is involved.
   * Paginates up to the requested window, stopping once older than `start`.
   * Supports both API v1 (`tx.date`) and v2 Clio (`close_time_iso`, `tx_json`, `hash`).

5. **Time normalization**

   * XRPL reports ledger close time in seconds-since-2000 or in ISO Z.
   * We always convert to full ISO UTC (`2025-11-07T13:36:10Z`).

6. **Classification & normalization**

   * `TrustSet` → `TRUSTSET`
   * `Payment` where `Amount` is a string → `PAYMENT_XRP`
   * `Payment` where `Amount` is an object `{value,currency,issuer}` → `PAYMENT_IOU`
   * Each tx is converted into a simplified record:

     ```json
     {
       "hash": "...",
       "source": "...",
       "target": "...",
       "type": "PAYMENT_IOU",
       "timestamp": "2025-11-07T13:36:10Z",
       "amount": {
         "value": "3",
         "currency": "RLUSD",
         "issuer": "rMxCKbED..."
       }
     }
     ```
   * For IOUs, the `currency` hex code (like `524C5553...`) is decoded to `"RLUSD"`, replacing the field without changing the schema.

7. **Node extraction**

   * Builds a map of all unique addresses:

     * Central wallet (`isCentral: true`)
     * Every counterparty (`target` or `issuer`)
   * Records first-seen activation date within the window and tags (if known exchange/gateway).

8. **Response assembly**

   * Returns:

     ```json
     {
       "request": {...},
       "nodes": [...],
       "transactions": [...]
     }
     ```

   * Every timestamp is UTC; every value is stringified; XRP values are in XRP (not drops).

   * In addition to `nodes` and `transactions`, each response includes a `tokenPrices` array:

     ```json
     "tokenPrices": [
       { "currency": "RLUSD", "issuer": "rMxCKbED...", "price_usd": 1.003 },
       { "currency": "HADA", "issuer": "rsR5JS...", "price_usd": 0.00000057 }
     ]
     ```

     These prices are computed directly from XRPL DEX order books (`book_offers`) using real on-chain
     liquidity, automatically detecting the correct book direction and converting via XRP/USD when necessary.

9. **Logging & Safety**

   * Logs each page of pagination, counts, and normalization summary.
   * Handles malformed data and gracefully continues.

### 4. Environment Configuration (`.env`)

```
PORT=8080
XRPL_MAINNET_WSS=wss://xrplcluster.com
XRPL_TESTNET_WSS=wss://s.altnet.rippletest.net:51233
XRPL_REQUEST_TIMEOUT_MS=20000
```

### 5. Key Files

| File                                     | Purpose                                    |
| ---------------------------------------- | ------------------------------------------ |
| `src/index.ts`                           | Express entrypoint                         |
| `src/controllers/blueprintController.ts` | Validates request & sends response         |
| `src/services/xrplService.ts`            | Core XRPL logic, pagination, normalization |
| `src/utils/xrpl.ts`                      | Time & amount helpers                      |
| `src/utils/currency.ts`                  | Decodes 160-bit currency hex to ASCII      |
| `src/types/blueprint.ts`                 | Strongly typed response contract           |

### 6. Time Handling

* Input and output times: ISO UTC (`Z` suffix).
* XRPL ledger times: UTC close time.
* All internal comparisons: UTC milliseconds since epoch.
* Server local timezone does **not** affect results.

### 7. Example Real Outputs

#### XRP Payment

```json
{
  "type": "PAYMENT_XRP",
  "timestamp": "2025-11-07T13:32:32Z",
  "amount": { "value": "0.000001", "currency": "XRP" }
}
```

#### IOU Payment

```json
{
  "type": "PAYMENT_IOU",
  "timestamp": "2025-11-07T13:36:10Z",
  "amount": { "value": "3", "currency": "RLUSD", "issuer": "rMxCKbED..." }
}
```

---

## III. For Frontend Developers — How to Use the API

### Endpoint

```
POST /api/v1/blueprint
Content-Type: application/json
```

### Required Body

| Field                    | Type                      | Description                             |
| ------------------------ | ------------------------- | --------------------------------------- |
| `centralAccount`         | string                    | XRPL account address (starts with “r…”) |
| `network`                | `"mainnet"` | `"testnet"` | Which ledger to query                   |
| `timeRangeFetched.start` | ISO 8601 UTC              | Start of window (inclusive)             |
| `timeRangeFetched.end`   | ISO 8601 UTC              | End of window (inclusive)               |

### Example Request (fetch in JS)

```js
const res = await fetch("http://localhost:8080/api/v1/blueprint", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    centralAccount: "rGoLdHQ7ujED1TMNPBJH9Ek6VJwU7Ns7kr",
    network: "mainnet",
    timeRangeFetched: {
      start: "2025-11-07T13:35:00Z",
      end: "2025-11-07T15:38:00Z"
    }
  })
});
const data = await res.json();
console.log(data);
```

### Example Response

```json
{
  "request": {
    "centralAccount": "rGoLdHQ7ujED1TMNPBJH9Ek6VJwU7Ns7kr",
    "network": "mainnet",
    "timeRangeFetched": {
      "start": "2025-11-07T13:35:00Z",
      "end": "2025-11-07T15:38:00Z"
    }
  },
  "nodes": [
    { "id": "rGoLdHQ7...", "isCentral": true, "displayName": "rGoLdH...Ns7kr", "activationDate": "2025-11-07T13:35:00Z", "tags": [] },
    { "id": "rMxCKbED...", "isCentral": false, "displayName": "rMxCKb...8m5De", "activationDate": "2025-11-07T13:36:10Z", "tags": [] },
    { "id": "rrwjw1W2...", "isCentral": false, "displayName": "rrwjw1...2MCQJ", "activationDate": "2025-11-07T13:36:10Z", "tags": [] }
  ],
  "transactions": [
    {
      "hash": "09099F92...",
      "source": "rGoLdHQ7...",
      "target": "rrwjw1W2...",
      "type": "PAYMENT_IOU",
      "timestamp": "2025-11-07T13:36:10Z",
      "amount": {
        "value": "3",
        "currency": "RLUSD",
        "issuer": "rMxCKbED..."
      }
    }
  ]
}
```


### 🏷 Understanding `tags` in `nodes`

Each object inside `"nodes"` has a `tags` array that helps the frontend understand *what role* that account plays in the network.

| Example Tag | Meaning | How to Display (suggestion) |
|--------------|----------|-----------------------------|
| `"RLUSD_ISSUER"` | This account issued the RLUSD token (IOU). Added automatically when an IOU payment references this issuer. | Mark as a **token issuer** (e.g., orange node, label “Issuer”). |
| `"USD_ISSUER"` or `"EUR_ISSUER"` | Same logic for other IOU currencies. | Same as above. |
| `"KNOWN_EXCHANGE"`, `"CEX"`, `"BINANCE"` | Known centralized exchange wallet. These come from the static registry of exchange addresses. | Show with exchange icon or gray cluster. |
| `"GATEWAY"`, `"KNOWN_ISSUER"` | Gateway / institutional issuer from the registry (Bitstamp, GateHub, etc.). | Show as issuer-type node. |
| `[]` (empty) | No known special role; ordinary counterparty. | Display normally. |

**Notes for frontend developers**
- A node may have multiple tags. For example:  
  `["RLUSD_ISSUER", "KNOWN_ISSUER"]`
- Tags are plain strings; treat them as descriptive labels only.  
- The `"isCentral"` field is separate — it tells you which address was the central wallet in the request.
- Use tags to color-code, group, or filter nodes (e.g., highlight issuers or exchanges differently).

Example node object:
```json
{
  "id": "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  "isCentral": false,
  "displayName": "rMxCKb...8m5De",
  "activationDate": "2025-11-07T13:36:10Z",
  "tags": ["RLUSD_ISSUER"]
}
```

### Usage Tips

* Always pass ISO times with **`Z`** (UTC).
* You can call it directly from a React app, a Node script, or a curl command.
* Expect network latency depending on XRPL node load; pagination may require a few seconds for active accounts.
* Handle the response as read-only data; all strings are normalized and safe for JSON parsing.

---

## Summary

* The backend is **a self-contained XRPL data engine** that converts raw ledger data into a ready-to-visualize blueprint.
* It uses **official XRPL APIs**, keeps **strict UTC time**, and outputs a **stable contract** for any frontend.
* The same backend works for both **mainnet** and **testnet**, and can scale to handle complex wallets, issuers, and CEX interactions.
* It also provides **real-time on-ledger USD valuations** for all IOUs discovered, derived entirely from XRPL DEX data.