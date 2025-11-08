# XTrace Frontend

**XTrace** is an interactive tool for tracing and visualizing XRP Ledger fund flows.
It allows users to explore on-ledger payment relationships around a given account,
filter transactions over time, and visualize token movements through a dynamic network graph.

---

## Part 1: User Guide – How to Trace Funds

### Getting Started

1. **Run the frontend**

   ```bash
   npm install
   npm run dev
   ```

   Then open [http://localhost:5173](http://localhost:5173) in your browser.

2. **Ensure backend is running**
   The frontend communicates with the backend API at
   `http://localhost:8080/api/v1/blueprint` and checks health at `/health`.
   Make sure your backend is running on that port.

---

### Step-by-Step: Tracing Funds

#### 1. **Enter a Central Account**

In the **left panel** under **Scope**, paste an XRPL address (starting with `r...`).
This account becomes the **center** of the network graph — all flows are shown **to and from** it.

#### 2. **Select a Network**

Choose **mainnet**, **testnet**, or **devnet** from the dropdown.

#### 3. **Pick a Time Range**

You can:

* Use **quick presets** like `5m`, `1h`, `24h`, `7d`, etc.
* Or manually set **Start** and **End** timestamps (local time).

Click **Apply** to fetch transactions from the backend.

> The **"Apply"** button triggers a network request and refreshes the visualization.

#### 4. **Adjust Filters**

At the **top of the visualization area**, you can refine what’s displayed:

* **Type:** toggle between `PAYMENT_XRP` and `PAYMENT_IOU`
* **Direction:** view `Inbound`, `Outbound`, or `Both`
* **Show Dust:** toggle to hide or show very small transactions (< $1)

The graph updates automatically when you change these.

#### 5. **Explore the Graph**

In the center panel:

* **Click a node** → show details on the right sidebar.
* **Double-click a node** → re-center the graph around that account.
* **Hover a node** → show tooltip with transactions, inflow, outflow, etc.

Edges are drawn between the central account and counterparties:

* **Line thickness** = total USD value exchanged
* **Arrow direction & color:**

  * 🟢 Green → inflow (funds coming to central)
  * 🔴 Red → outflow (funds sent from central)

#### 6. **Timeline Navigation**

At the **bottom panel**, drag or resize the **blue selection brush** to zoom into a shorter time window.
The network view instantly recomputes to show only transactions within that range.

#### 7. **Details Drawer**

When you click a node:

* Shows its address, transaction count, inflow/outflow amounts.
* Click **“Re-center on this Account”** to make it the new hub of analysis.

#### 8. **Breadcrumb Navigation**

At the **top header**, use:

* **Home** → return to the original starting account
* **Back** → go one level up the navigation history
* **Breadcrumb links** → jump back to any previous account

On the right side, a **status badge** shows backend health:

* 🟢 Online
* 🔴 Offline

---

## Part 2: Technical Overview

### Architecture

| Layer            | Technology                           | Purpose                                         |
| ---------------- | ------------------------------------ | ----------------------------------------------- |
| Framework        | **React + TypeScript**               | UI and component logic                          |
| State Management | **Zustand**                          | Lightweight, reactive global state              |
| Build Tool       | **Vite**                             | Fast dev server and production build            |
| Visualization    | **D3.js** + **Cytoscape (optional)** | Graph layout, timelines, and data visualization |
| Data Fetching    | **Native fetch** + custom controller | API requests with caching and cancellation      |
| Styling          | **CSS Modules**                      | Responsive, dark-themed 3-column layout         |

---

### Folder Structure

```
src/
├── components/         # React UI components
│   ├── HeaderBar.tsx           # Breadcrumb + backend health
│   ├── LeftFilterPanel.tsx     # Filters & fetch controls
│   ├── VisualisationArea.tsx   # Top filter + Graph + Timeline
│   ├── NetworkView.tsx         # D3 force-directed graph
│   ├── BottomPanel.tsx         # D3 timeline with brush
│   ├── DetailsDrawer.tsx       # Right-side node details
│   └── ...css                  # Styling per component
│
├── stores/             # Zustand state containers
│   ├── dataStore.ts     # Raw + computed data
│   ├── filterStore.ts   # User-selected filters
│   ├── healthStore.ts   # Backend health
│   ├── configStore.ts   # Config (API base URL)
│   └── navigationService.ts # Breadcrumbs
│
├── services/           # API & logic layers
│   ├── dataAdapter.ts       # Fetch wrapper with abort/retry
│   ├── dataContracts.ts     # API payload & types
│   ├── valuationService.ts  # Convert XRPL values → USD
│   ├── requestBuilder.ts    # Canonical request builder
│   └── navigationService.ts # Breadcrumb management
│
├── transforms/         # Data pipeline
│   ├── aggregators.ts     # Build nodes & edges from raw txs
│   └── viewTransforms.ts  # Apply filters and recompute
│
├── appController.ts     # Orchestrates fetch, caching, recompute
├── main.tsx / app.tsx   # Entry point & root layout
└── App.css              # Global layout styles
```

---

### Data Flow

1. **User clicks “Apply”** → `appController.initiateFetch()` → posts to backend `/api/v1/blueprint`
2. **Response parsed** into `DataResponse` (nodes, transactions, token prices)
3. **Stored in Zustand (`dataStore`)** → triggers `computeViewData()`
4. **`computeViewData`** filters by:

   * Time range (from brush)
   * Type (`PAYMENT_XRP`, `PAYMENT_IOU`)
   * Direction (`inbound` / `outbound`)
   * Dust filter (< $1)
     → then calls `prepareNetworkView()`
5. **`prepareNetworkView()`**

   * Aggregates transactions by counterparty
   * Computes inflow/outflow totals
   * Builds node & edge arrays
6. **UI updates reactively**

   * Graph updates via D3
   * Details drawer syncs with selection
   * Timeline brush recomputes instantly

---

### Key Features

* **Dynamic force-directed layout** (D3)
* **Interactive brushing** for time navigation
* **Live filter recomputation**
* **USD valuation pipeline** via `valuationService`
* **Offline-aware health badge**
* **Navigation history (breadcrumb)** with Zustand
* **Cache-aware fetch logic** to avoid redundant network calls

---

### Data Model Highlights

Each **transaction**:

```ts
{
  hash: string;
  source: string;
  target: string;
  timestamp: string;
  type: 'PAYMENT_XRP' | 'PAYMENT_IOU';
  amount: { value: string; currency: string; issuer?: string };
}
```

Each **node**:

```ts
{
  id: string;
  isCentral: boolean;
  txCount: number;
  inboundValue: number;
  outboundValue: number;
}
```

Each **edge**:

```ts
{
  source: string;
  target: string;
  inboundValue: number;
  outboundValue: number;
  totalValue: number;
}
```

---

### Health & Reliability

* **Health check:** `GET /health`
* **Abortable fetches:** via `AbortController` in `dataAdapter`
* **Retry logic:** automatic one-time retry on transient network failure
* **No external state mutation:** all stores are isolated

---

## Summary

**XTrace** transforms raw ledger data into an intuitive, interactive exploration tool for fund tracing.

Users can:

* Focus on any account and follow the trail of payments
* Visually see who sent or received funds, and when
* Instantly re-center, filter, and zoom into specific time ranges

Developers and researchers can easily extend this to:

* Add new transaction types
* Integrate analytics overlays
* Connect to different data sources