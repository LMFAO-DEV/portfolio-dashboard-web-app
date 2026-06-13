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
- **Gold NAV stale**: warns when MTS-GOLD NAV hasn't been updated in >30 days (fallback only — live XAU/USD used when available)
- **Price target alerts**: notifies when a holding is within ±5% of a set target price (USD-denominated assets only)
- Dismiss per-alert or clear all dismissed; badge count on TopBar

### Settings Panel

- Add, edit, remove holdings for Core and Satellite
- **Drift threshold slider** (3–20%) for alert sensitivity
- **Per-holding target price** for price-target alerts
- Core target allocation % per ticker
- Satellite target allocation % per bucket
- DCA settings (Core + Satellite monthly THB)
- MTS-GOLD NAV manual input (fallback when live XAU/USD fetch fails)
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
| Stock prices | Finnhub REST API (free tier, API key via env) |
| Gold price | Yahoo Finance `v8/finance/chart/GC=F` (XAU/USD, no key) |
| FX rate | Frankfurter API (free, no key) |
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

Set `VITE_FINNHUB_KEY=<your_key>` in `.env.local` for stock price fetching. Gold and FX need no keys.

For production deploy:

```bash
npm i -g vercel
vercel --prod
```

## Price Fetching

Three sources, all server-side (dev: Vite plugin; prod: Vercel serverless at `api/prices.ts`):

| Data | Source |
| --- | --- |
| Stock/ETF quotes | Finnhub REST (`/quote`) — requires `VITE_FINNHUB_KEY` |
| USD/THB FX rate | Frankfurter API (`/latest?from=USD&to=THB`) — no key |
| Gold (XAU/USD) | Yahoo Finance `GC=F` futures — no key |

All three are fetched in parallel per `/api/prices` request. Results cached end-of-day in React Query; use ↻ to force refresh.

MTS-GOLD price is derived from the live XAU/USD rate × shares (oz). The manual NAV field in Settings is a fallback only (used if the GC=F fetch fails).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at `http://localhost:5173` |
| `npm run build` | TypeScript check + Vite production build → `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint |
| `npm run test:ui-e2e-mtsgold` | Playwright E2E: adds MTS-GOLD, verifies live XAU/USD price displayed in Portfolio tab (requires dev server running) |

## Transaction Ledger & FX Attribution

When you log buy/sell transactions, the app derives average cost, current shares, and the weighted-average USD/THB rate at entry time (`entryFxRate`). This enables FX attribution on the P&L tile:

- **Asset return** = (current price − avg cost) × shares × entry FX
- **FX return** = (current FX − entry FX) × shares × current price

Without transactions, holdings fall back to manually entered cost and no FX split is shown.
