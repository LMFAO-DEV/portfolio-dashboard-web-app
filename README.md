# Personal Portfolio Dashboard

A personal investment portfolio tracker for THB-based investors. Tracks Core + Satellite portfolios with end-of-day prices, P&L, goal planning, rebalance guidance, transaction ledger, and smart alerts.

## Features

### Portfolio Tab

- Holdings table for Core and Satellite with: ticker, shares, avg cost, price, market value (THB), P&L (THB + %)
- Summary metrics: total value, total P&L, P&L % — with **FX attribution** (asset return vs FX return) when ledger data exists
- **Net worth history chart**: daily snapshot stored locally, area chart with % change since start + benchmark overlay
- **Benchmark toggle**: VOO buy-and-hold vs flat cash comparison on the history chart
- Weight distribution bar for Satellite holdings
- **Concentration warning**: banner when any single holding ≥ 25% of total portfolio
- Supports THB-denominated assets (e.g. MTS-GOLD) alongside USD stocks
- Cash reserve tracking per portfolio

### Goal Calculator Tab

- Interactive sliders for target amount, current value, monthly DCA, annual return %, and time horizon
- **Bear / Base / Bull scenario lines** (±3 pts spread) on the growth chart
- **Inflation / real-value toggle**: discounts projections to today's THB purchasing power
- Projects future value using compound interest; shows surplus/deficit and required extra DCA
- Milestone tracker: marks THB milestones (1M → 50M) as reached or projected year
- DCA reference table: required monthly contribution across time horizons

### Rebalance Tab

- Core/Satellite 50:50 split tracker with visual bar
- Core bucket allocation vs target; Satellite bucket breakdown (Core Growth / Small Cap AI / Defensive / Cash)
- Action list: BUY / TRIM with specific THB amounts per position (±3% threshold)
- **DCA allocator**: routes this month's Core + Satellite DCA budget into the most underweight buckets first — no selling needed

### Ledger Panel (▤ in TopBar)

- **Transaction ledger**: log buy/sell entries per ticker; auto-derives average cost, shares, entry FX rate, and realized P&L back to holdings
- **Dividend tracker**: log payouts with FX; shows trailing-12-month income, all-time total, and yield on cost per ticker
- Position summary table: shares, avg cost (USD or THB), realized P&L

### Alert Engine (🔔 in TopBar)

- **Drift alerts**: Core/Satellite split and per-bucket drift beyond a configurable threshold (default 10%)
- **Gold NAV stale**: warns when MTS-GOLD NAV hasn't been updated in >30 days
- **Price target alerts**: notifies when a holding is within ±5% of a set target price
- Dismiss per-alert or clear all dismissed; badge count on TopBar

### Settings Panel

- Add, edit, remove holdings for Core and Satellite
- **Drift threshold slider** (3–20%) for alert sensitivity
- **Per-holding target price** for price-target alerts
- Core target allocation % per ticker
- Satellite target allocation % per bucket
- DCA settings (Core + Satellite monthly THB)
- MTS-GOLD NAV manual input
- Export / Import snapshot as JSON (backup + restore)
- Reset to empty state

### Ask Claude Panel (✦ in TopBar)

- Pre-built prompt templates: Analyze portfolio, Entry point, Exit/take-profit, Rebalance advice, Goal planning, Compare stocks, Screen a stock, Custom
- Includes portfolio context (holdings, P&L, DCA, rebalance status) in the prompt
- Copy to clipboard → paste into Claude desktop app for AI analysis

### Other

- TH / EN language toggle (full bilingual UI)
- Manual refresh; prices cached end-of-day (↻ to force refresh)
- URL hash routing (`#/portfolio`, `#/goal`, `#/rebalance`)
- Persistent state via `localStorage` (Zustand persist)

## Tech Stack

| Layer | Library |
| --- | --- |
| Framework | Vite + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| State | Zustand v5 (global + localStorage persist) |
| Server state | TanStack Query v5 |
| Charts | Recharts v3 |
| HTTP | Axios |
| Price source | Yahoo Finance `v8/finance/chart` (unofficial, no key) |
| FX rate | open.er-api.com (free, no key) |
| Routing | React Router v6 |
| Deploy | Vercel (serverless function at `api/prices.ts`) |

## Project Structure

```text
personal-portfolio-web-app/
├── api/
│   └── prices.ts              # Vercel serverless — fetches Yahoo Finance
├── public/
│   └── favicon.svg            # Dark-gold chart icon
├── src/
│   ├── api/prices.ts          # Frontend fetch wrapper
│   ├── components/
│   │   ├── AlertBell.tsx      # 🔔 Alert badge + dismiss drawer
│   │   ├── AskClaude.tsx      # Prompt builder panel
│   │   ├── Ledger.tsx         # Transaction + dividend ledger
│   │   ├── NetWorthChart.tsx  # History area chart + benchmark lines
│   │   ├── Settings.tsx       # Holdings editor + alert config drawer
│   │   ├── TopBar.tsx         # Nav + tab bar
│   │   └── ui/                # Badge, DualBar, Skeleton
│   ├── hooks/
│   │   └── usePrices.ts       # React Query hook — end-of-day, no polling
│   ├── i18n/strings.ts        # EN + TH string map
│   ├── pages/
│   │   ├── Portfolio.tsx      # Tab 1
│   │   ├── Goal.tsx           # Tab 2
│   │   └── Rebalance.tsx      # Tab 3
│   ├── store/portfolio.ts     # Zustand store — holdings, history, alerts, ledger
│   ├── types/index.ts         # Shared TypeScript interfaces
│   └── utils/
│       ├── alerts.ts          # computeAlerts() — drift, stale NAV, price target
│       ├── calc.ts            # FV, PMT, derivePosition, fxAttribution, scenarios
│       ├── copyForClaude.ts   # Portfolio → structured text for Claude
│       └── format.ts          # THB / USD / % formatters
├── PLAN.md                    # Feature roadmap (Phase 1–4)
├── vite.config.ts             # Dev proxy for Yahoo Finance CORS bypass
└── tailwind.config.js
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
```

No API keys or environment variables required.

For production deploy:

```bash
npm i -g vercel
vercel --prod
```

## Price Fetching

Prices are fetched from Yahoo Finance `v8/finance/chart` — one batch call per load. USD/THB rate from `open.er-api.com`. Both cached end-of-day; use ↻ to refresh manually.

In development, a Vite plugin intercepts `/api/prices` and calls Yahoo Finance server-side (bypasses browser CORS). In production, the same logic runs as a Vercel serverless function.

MTS-GOLD (Thai mutual fund) is not on Yahoo Finance — enter NAV manually in Settings.

## Transaction Ledger & FX Attribution

When you log buy/sell transactions, the app derives average cost, current shares, and the weighted-average USD/THB rate at entry time (`entryFxRate`). This enables FX attribution on the P&L tile:

- **Asset return** = (current price − avg cost) × shares × entry FX
- **FX return** = (current FX − entry FX) × shares × current price

Without transactions, holdings fall back to manually entered cost and no FX split is shown.
