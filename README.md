# Personal Portfolio Dashboard

A personal investment portfolio tracker for THB-based investors. Tracks Core and Satellite portfolios with end-of-day prices, P&L, goal planning, and rebalance guidance.

## Features

### Portfolio Tab

- Holdings table for Core and Satellite portfolios with real columns: ticker, shares, cost/share, current price, market value (THB), P&L (THB), P&L %, and weight
- Summary metrics: total value, total P&L, P&L %, and live USD/THB rate
- Weight distribution bar comparing actual vs target allocation
- Supports THB-denominated assets (e.g. MTS-GOLD mutual fund) alongside USD stocks
- Cash reserve tracking for Satellite portfolio

### Goal Calculator Tab

- Interactive sliders for target amount, time horizon, annual return %, and monthly DCA
- Projects future portfolio value using compound interest formula
- Shows surplus/deficit vs target with required extra monthly DCA to close the gap
- Milestone tracker: marks which THB milestones (1M, 2M, 5M, 10M, 20M, 50M) are already reached and when projected ones will be hit
- Growth chart (Recharts): projected value vs capital invested vs target line
- DCA reference table: required monthly contribution for each time horizon

### Rebalance Tab

- Core portfolio allocation vs target (VOO 50%, SCHD 35%, VXUS 10%, Gold 5%)
- Satellite portfolio breakdown: Core Growth bucket, Small Cap AI bucket, and Cash
- Core : Satellite split tracker (50/50 target)
- Action list: BUY / TRIM recommendations with specific THB amounts per position
- Status badges: On Target / Warning / Overweight / Underweight with ±3% / ±8% thresholds

### Settings Panel

- Add, edit, and remove holdings for both Core and Satellite portfolios
- Edit shares and cost-per-share (USD or THB) with 500ms debounce auto-save
- Undo last removal within the same session
- MTS-GOLD NAV manual input with staleness warning (>30 days)
- DCA settings for Core and Satellite monthly contributions
- Cash reserve input for Satellite
- Export snapshot as JSON
- Reset to empty state

### Ask Claude Panel

- Pre-built prompt templates: Analyze portfolio, Entry point, Exit/take profit, Rebalance advice, Goal planning, Compare two stocks, Custom
- Toggle context sections to include (Satellite holdings, Core holdings, Goal settings, Rebalance status)
- Copy prompt to clipboard — paste into Claude for AI analysis

### Other

- TH / EN language toggle (full bilingual UI)
- Manual refresh button; prices cached for 8 hours (end-of-day workflow)
- Copy-for-Claude button: serializes full portfolio state as structured text
- URL hash routing (`#/portfolio`, `#/goal`, `#/rebalance`)
- Persistent state via `localStorage` (Zustand persist middleware)

## Tech Stack

| Layer | Library |
| --- | --- |
| Framework | Vite + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| State | Zustand v5 (global + localStorage persist) |
| Server state | TanStack Query v5 |
| Charts | Recharts v3 |
| HTTP | Axios |
| Price source | Yahoo Finance `v8/finance/chart` (unofficial, no API key) |
| FX rate | open.er-api.com (free, no API key) |
| Routing | React Router v6 |
| Deploy | Vercel (serverless function at `api/prices.ts`) |

## Project Structure

```text
portfolio-app/
├── api/
│   └── prices.ts          # Vercel serverless function — fetches Yahoo Finance in parallel
├── src/
│   ├── api/prices.ts      # Frontend fetch wrapper
│   ├── components/
│   │   ├── AskClaude.tsx  # Prompt builder panel
│   │   ├── Settings.tsx   # Holdings editor drawer
│   │   ├── TopBar.tsx     # Nav + tab bar
│   │   └── ui/            # Badge, DualBar, Skeleton
│   ├── hooks/
│   │   └── usePrices.ts   # React Query hook — 8h stale, no polling
│   ├── i18n/strings.ts    # EN + TH string map
│   ├── pages/
│   │   ├── Portfolio.tsx  # Tab 1
│   │   ├── Goal.tsx       # Tab 2
│   │   └── Rebalance.tsx  # Tab 3
│   ├── store/portfolio.ts # Zustand store — all holdings, prices, settings
│   ├── types/index.ts     # Shared TypeScript interfaces
│   └── utils/
│       ├── calc.ts        # FV, PMT, milestone, growth series
│       ├── copyForClaude.ts
│       └── format.ts      # THB/USD/% formatters
├── vite.config.ts         # Dev proxy plugin (mirrors serverless function)
└── tailwind.config.js
```

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
```

No API keys or environment variables required. Yahoo Finance and open.er-api.com are both free and keyless.

For production deploy:

```bash
npm i -g vercel
vercel --prod
```

## Price Fetching

Prices are fetched from Yahoo Finance's `v8/finance/chart` endpoint — one parallel request per ticker. The USD/THB rate comes from `open.er-api.com`. Both are called on first load and cached for 8 hours; use the ↻ button to refresh manually.

In development (`npm run dev`), a Vite plugin intercepts `/api/prices` and calls Yahoo Finance from the Node.js side, bypassing browser CORS. In production, the same logic runs as a Vercel serverless function at `api/prices.ts`.

MTS-GOLD (Thai mutual fund) is not available on Yahoo Finance — enter the NAV manually in Settings.
