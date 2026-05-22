# CLAUDE.md — Portfolio Investment Dashboard

## Project Overview
Personal investment portfolio tracker for a THB-based investor.
Tracks Core Port (VOO/SCHD/VXUS/Gold) + Satellite Port (US Tech/AI stocks).
Features: real-time prices, P&L tracking, goal calculator, rebalance tracker.

## Tech Stack
- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS v3
- **State**: Zustand (global) + React Query v5 (server state)
- **Charts**: Recharts
- **HTTP**: Axios
- **Price API**: Yahoo Finance (unofficial, free) — primary
- **Routing**: React Router v6

## Project Structure
```
portfolio-app/
├── public/
├── src/
│   ├── api/
│   │   ├── prices.ts        # Yahoo Finance price fetcher
│   │   └── fx.ts            # USD/THB exchange rate
│   ├── components/
│   │   ├── ui/              # Reusable: Card, Badge, Metric, ProgressBar
│   │   ├── portfolio/       # PortfolioTable, WeightBar, PnlBadge
│   │   ├── goal/            # GoalCalculator, MilestoneList, GrowthChart
│   │   └── rebalance/       # RebalanceBar, ActionList
│   ├── hooks/
│   │   ├── usePrices.ts     # React Query wrapper for price fetching
│   │   └── useFxRate.ts     # USD/THB rate hook
│   ├── store/
│   │   └── portfolio.ts     # Zustand store — holdings, cash, settings
│   ├── types/
│   │   └── index.ts         # All TypeScript interfaces
│   ├── utils/
│   │   ├── calc.ts          # P&L, compound interest, DCA calculations
│   │   └── format.ts        # THB/USD formatters
│   ├── pages/
│   │   ├── Dashboard.tsx    # Tab layout container
│   │   ├── Portfolio.tsx    # Tab 1
│   │   ├── Goal.tsx         # Tab 2
│   │   └── Rebalance.tsx    # Tab 3
│   ├── App.tsx
│   └── main.tsx
├── CLAUDE.md                # This file
├── FEATURES.md              # Full feature spec
├── .env.example
├── package.json
└── vite.config.ts
```

## Portfolio Data (Source of Truth)

### Satellite Port Holdings
```typescript
const SATELLITE_HOLDINGS = [
  { ticker: 'MSFT', shares: 3.83373, costUSD: 393.25 },
  { ticker: 'AMZN', shares: 7.22371, costUSD: 207.71 },
  { ticker: 'META', shares: 3.38266, costUSD: 591.52 },
  { ticker: 'ORCL', shares: 6.64523, costUSD: 150.64 },
  { ticker: 'COST', shares: 0.46556, costUSD: 860.10 },
  { ticker: 'CRWV', shares: 4.0,     costUSD: 84.59  },
  { ticker: 'NBIS', shares: 0,       costUSD: 0      },
];
const SATELLITE_CASH_THB = 160000;
```

### Core Port Holdings
```typescript
const CORE_HOLDINGS = [
  { ticker: 'VOO',      shares: 3.7518,  costUSD: 594.58 },
  { ticker: 'SCHD',     shares: 43.58,   costUSD: 25.55  },
  { ticker: 'VXUS',     shares: 0,       costUSD: 0      },
  { ticker: 'MTS-GOLD', shares: 1,       costTHB: 10030, isTHB: true },
];
const CORE_DCA_MONTHLY_THB = 10000;
```

### Target Allocations
```typescript
const CORE_TARGETS = { VOO: 0.50, SCHD: 0.35, VXUS: 0.10, 'MTS-GOLD': 0.05 };
const SATELLITE_TARGETS = { coreGrowth: 0.60, smallCapAI: 0.20, cash: 0.20 };
const PORT_SPLIT = { core: 0.50, satellite: 0.50 };
```

## Coding Conventions

### TypeScript
- Strict mode always on
- No `any` — use proper types or `unknown`
- All API responses typed
- Props interfaces named `{Component}Props`

### React
- Functional components only
- Custom hooks for all data fetching logic
- No inline styles — Tailwind classes only
- Components max ~100 lines, split if larger

### Naming
- Files: `PascalCase.tsx` for components, `camelCase.ts` for utils/hooks
- Hooks: always prefix `use`
- Constants: `SCREAMING_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Error Handling
- All API calls wrapped in try/catch
- React Query handles loading/error states
- Fallback UI for price fetch failures (show last cached)
- Never crash on missing price data — show `—`

## API Notes

### Price Fetching (Yahoo Finance unofficial)
```typescript
// Base URL — proxy may be needed for CORS in dev
const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

// Rate limit: ~2000 req/hour per IP
// Fetch all tickers in ONE batch call using comma-separated symbols
// Cache: 15 minutes (React Query staleTime)

// MTS-GOLD: Yahoo Finance does not support Thai mutual funds
// Manual entry via localStorage or .env variable
```

### USD/THB Rate
```typescript
// Free source: use ExchangeRate-API free tier
// Or: Yahoo Finance USDTHB=X ticker
const FX_TICKER = 'USDTHB=X'
// Refresh: every 30 minutes
```

### CORS Handling (Dev)
```typescript
// vite.config.ts proxy
server: {
  proxy: {
    '/api/yahoo': {
      target: 'https://query1.finance.yahoo.com',
      changeOrigin: true,
      rewrite: path => path.replace(/^\/api\/yahoo/, '')
    }
  }
}
```

## Environment Variables
```bash
# .env.local
VITE_GOLD_NAV_THB=9652        # Manual MTS-GOLD NAV (update monthly)
VITE_PRICE_REFRESH_MS=900000  # 15 min default
VITE_FX_REFRESH_MS=1800000    # 30 min default
```

## Key Calculations (All in utils/calc.ts)

```typescript
// P&L in THB
const pnlTHB = (mktValueUSD - costUSD) * fxRate

// Portfolio weight
const weight = positionValueTHB / totalPortfolioTHB

// Compound interest (Goal Calculator)
const FV = PV * (1 + r/12)^n + PMT * ((1 + r/12)^n - 1) / (r/12)

// Monthly DCA needed to reach target
const PMT = (Target - PV * (1+r/12)^n) * (r/12) / ((1+r/12)^n - 1)

// Rebalance gap
const gap = actualWeight - targetWeight  // positive = overweight
const rebalanceAmountTHB = gap * totalPortfolioTHB
```

## Build Commands
```bash
npm install          # Install deps
npm run dev          # Dev server http://localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run type-check   # TypeScript check only
```

## Deploy (Vercel)
```bash
npm i -g vercel
vercel --prod
# Auto-detects Vite, sets build command and output dir
```

## Step-by-Step Build Plan
See FEATURES.md for detailed feature spec and build order.

Build in this order:
1. Project scaffold + types + utils
2. Price API + hooks
3. UI primitives (Card, Badge, Metric)
4. Portfolio Tab
5. Goal Calculator Tab
6. Rebalance Tab
7. Settings (edit holdings, cash)
8. Polish + mobile responsive
