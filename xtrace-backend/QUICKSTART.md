# 🚀 Quick Start for Frontend Developers

This backend provides a single REST endpoint that returns **XRPL transaction data** in a clean, ready-to-visualize format.  
Use it as your data source for the frontend (React, Vite, etc.).

---

## 1. Clone & run locally

```bash
git clone https://github.com/0xsamyy/xtrace-backend.git
cd xtrace-backend
npm install
cp .env.example .env
npm run dev
````

Server starts at **[http://localhost:8080](http://localhost:8080)**

Health check:

```bash
curl http://localhost:8080/health
```

---

## 2. API endpoint

**POST** `http://localhost:8080/api/v1/blueprint`

**Headers:**

```
Content-Type: application/json
```

**Body (example):**

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

---

## 3. Example fetch (in React or plain JS)

```js
async function loadData() {
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
}
```

---

## 4. Response format

```json
{
  "request": { "centralAccount": "...", "network": "mainnet", "timeRangeFetched": {...} },
  "nodes": [
    { "id": "rGoLdHQ7...", "isCentral": true, "tags": [] },
    { "id": "rMxCKbED...", "isCentral": false, "tags": ["RLUSD_ISSUER"] }
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

**Notes:**

* `timestamps` → always UTC (Z-suffix)
* `nodes[].tags` may include `"RLUSD_ISSUER"`, `"CEX"`, `"KNOWN_EXCHANGE"`, etc.
* `transactions[].type` can be `"PAYMENT_XRP"`, `"PAYMENT_IOU"`, or `"TRUSTSET"`
* Treat `isCentral: true` as the currently focused account.

---

## 5. Token price data

Every response now includes a `tokenPrices` array at the top level.  
This section lists each unique IOU (token) seen in the fetched transactions and its **on-ledger USD price**, derived automatically from the XRPL DEX.

Example:

```json
"tokenPrices": [
  { "currency": "RLUSD", "issuer": "rMxCKbED...", "price_usd": 1.003 },
  { "currency": "HADA", "issuer": "rsR5JS...", "price_usd": 0.00000057 }
]
````

Notes:

* Prices are pulled directly from the **on-chain order books** (`book_offers` API).
* The backend automatically determines the correct market direction (`IOU→XRP` or `XRP→IOU`) and converts through XRP/USD when needed.
* If a token has no liquidity, `price_usd` will be omitted (no guessing or off-chain data).

---

## 6. Ready to build

The backend is **stateless and CORS-enabled**, so your frontend can call it directly from `http://localhost:5173` (or any local dev server).
No authentication or keys are required.

```
Frontend URL  →  http://localhost:5173
Backend URL   →  http://localhost:8080/api/v1/blueprint
```

Use this API to populate your Bubble / Network / Details views.