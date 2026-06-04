# PLAN.md — Feature Roadmap

Roadmap to evolve the dashboard from a live-snapshot calculator into a real tracking + decision tool. Phases are ordered by impact-to-effort. Each item lists what it does, where it touches, and how to verify.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Current State (baseline)

Four tabs, all snapshot-based (current value only):
- **Portfolio** — Core/Satellite holdings table, edit/add/remove, cash, live prices (Yahoo proxy), P&L in THB, weight bar, FX rate, copy-for-Claude.
- **Goal** — FV calculator (sliders), projected value, milestones, growth chart, required-DCA table.
- **Rebalance** — Core/Satellite 50:50 split, target vs actual, buy/trim actions (gap > ±3%).
- **AskClaude** — generates prompts for external skills (portfolio-analysis / trading-signals / stock-screener), copy-paste flow.

State: Zustand + localStorage (`portfolio-state-v2`). i18n th/en. No time dimension, no transaction history, no automation.

### Known gaps this roadmap closes
1. No history / time-series — can't see portfolio growth over time.
2. No transaction ledger — cost basis is a single manual number.
3. No FX attribution — asset gain and FX gain are mixed.
4. No dividend tracking — SCHD/VOO/VXUS are dividend funds.
5. Rebalance doesn't route incoming DCA cash.
6. No concentration / risk metric — Satellite is all US tech.

---

## Phase 1 — Quick wins (low effort, high impact)

Goal: turn it from "calculator" into "tracker" feel. No backend, all client-side.

- [x] **Net worth history chart**
  - Snapshot total THB once per day into localStorage (keyed by date), upsert by date, capped at 730 points.
  - Store slice `history: HistoryPoint[]` + `recordSnapshot` / `clearHistory`. Snapshot recorded in `App.tsx` once prices + FX load.
  - `computeTotals()` in `utils/calc.ts` is the shared totals source. Component `components/NetWorthChart.tsx` (area chart + % change since start) on Portfolio tab.
  - Shows empty-state copy until ≥2 days collected.

- [x] **DCA allocator**
  - `allocateDca()` in `pages/Rebalance.tsx`: routes Core + Satellite DCA budgets into most-underweight buckets (proportional to gap); falls back to target-weight split when all on target.
  - "This Month's DCA Plan" card below Action List.

- [x] **Concentration / risk warning**
  - Banner on Portfolio tab when any single holding ≥ 25% of total portfolio (lists offenders).
  - (Per-sector exposure deferred — needs sector data per ticker.)

- [x] **Export / Import JSON**
  - Export already existed; added **Import** in Settings (file picker → `importState()` action, validates it's a snapshot).
  - Verify: export, reset, import, state matches.

---

## Phase 2 — Real tracking (medium effort, high impact)

Goal: accurate cost basis and income, not just guesses.

- [x] **Transaction ledger**
  - Types `Transaction` / `Port` / `TxType` in `types/index.ts`. Store slice `transactions` + `addTransaction` / `removeTransaction`.
  - `derivePosition()` (average-cost) in `utils/calc.ts` → shares, avg cost (USD + THB), total invested THB, entry FX, realized P&L THB.
  - `applyTxToHoldings()` in `store/portfolio.ts` auto-syncs holdings (shares + avg cost + entry FX) on every tx change — transactions become the source of truth; manual editing still works for tickers with no transactions.
  - UI: `components/Ledger.tsx` slide-over (opened from ▤ in TopBar), Transactions sub-tab with add form, per-ticker position summary, and list.

- [x] **FX attribution**
  - `fxAttribution()` in `utils/calc.ts`: asset = (price−cost)·shares·entryFx; fx = (fxNow−entryFx)·shares·price (sums to THB P&L).
  - Entry FX comes from the ledger (`entryFxRate` on Holding). Shown as sub-line on the P&L tile (Portfolio) when ledger data exists.

- [x] **Dividend tracker**
  - Type `Dividend`. Store slice `dividends` + add/remove. Ledger Dividends sub-tab: add form, 12-mo + all-time income cards, per-ticker yield-on-cost (TTM income / cost basis).

- [x] **Goal scenario analysis**
  - `buildScenarioSeries()` → bear / base / bull lines (±3 pts) on the growth chart. Inflation input + "real (today's ฿)" toggle discounts the series. Result card stays nominal.

---

## Phase 3 — Smart / automated (higher effort, makes it "intelligent")

Goal: the app advises proactively instead of waiting to be asked.

- [~] **Claude API in-app analysis** — **skipped by design**
  - App is personal-use only; copy-prompt → Claude desktop app is sufficient.
  - Doing this properly requires a backend proxy (Vercel edge fn) to avoid CORS + key exposure.
  - AskClaude copy flow stays as-is.

- [x] **Alert engine**
  - `utils/alerts.ts` → `computeAlerts()`: drift (Core/Sat split + per-bucket), gold NAV stale >30 days, price target ±5%.
  - Store slice `alerts` + `dismissAlert` / `clearDismissed`. Recomputed in `App.tsx` on every price/holding change. Dismissed state preserved across recomputes.
  - `AlertBell` in TopBar: red badge count, drawer with dismiss per-alert or clear-all dismissed.
  - Settings: drift threshold slider (3–20%, default 10%), target price per holding, Anthropic API key field (stored locally, unused for now).

- [x] **Benchmark comparison**
  - `vooUsd` stored on each `HistoryPoint` snapshot (recorded in `App.tsx` alongside totalThb).
  - `NetWorthChart` "Benchmark" toggle shows 2 extra lines: VOO buy-and-hold (scales base totalThb by VOO price ratio) and flat cash.
  - ∆ vs VOO shown in chart header when benchmark is on. Hint shown if <2 days of VOO data available.

---

## Phase 4 — Polish / coverage (nice-to-have)

- [ ] **Gold NAV auto-fetch or staleness nudge** — auto-pull from a Thai source if available, else flag when stale.
- [ ] **Thai tax estimate** — rough foreign-dividend / capital-gains estimate for a THB investor.
- [ ] **PWA / offline** — installable, works offline with cached prices.
- [ ] **CSV export** — holdings + transactions for spreadsheets / accountant.

---

## Suggested build order

1. Phase 1 in full (history → DCA allocator → concentration → export). Biggest perceived change for least work.
2. Phase 2 transaction ledger first (unlocks FX attribution + accurate everything else).
3. Phase 3 Claude API in-app (the "smart" leap).

Keep each item a single focused PR. Update status boxes here as you go.
