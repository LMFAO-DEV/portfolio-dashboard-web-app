import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Holding, FxRate, MtsGoldNav, DcaSettings, Price, Lang, SatTargets,
  HistoryPoint, PortfolioSnapshot, Transaction, Dividend, Alert,
} from '../types'
import { derivePosition } from '../utils/calc'

const MAX_HISTORY = 730 // ~2 years of daily points

/** Recompute holdings (shares, avg cost, entry FX) from the transaction ledger. */
function applyTxToHoldings(
  core: Holding[],
  satellite: Holding[],
  transactions: Transaction[],
): { core: Holding[]; satellite: Holding[] } {
  const nextCore = [...core]
  const nextSat = [...satellite]
  const groups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const key = `${tx.port}:${tx.ticker}`
    const arr = groups.get(key) ?? []
    arr.push(tx)
    groups.set(key, arr)
  }
  for (const [key, txs] of groups) {
    const [port, ticker] = key.split(':')
    const d = derivePosition(txs)
    const isTHB = txs[0].isTHB
    const patch: Partial<Holding> = isTHB
      ? { shares: d.shares, costThb: d.avgCostThb }
      : { shares: d.shares, costUsd: d.avgCostUsd, entryFxRate: d.entryFxRate }
    const list = port === 'core' ? nextCore : nextSat
    const idx = list.findIndex((h) => h.ticker === ticker)
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch }
    } else {
      list.push({
        ticker,
        shares: d.shares,
        isTHB,
        ...(port === 'satellite' ? { satGroup: 'coreGrowth' as const } : {}),
        ...patch,
      })
    }
  }
  return { core: nextCore, satellite: nextSat }
}

const DEFAULT_SATELLITE: Holding[] = []

const DEFAULT_CORE: Holding[] = []

const DEFAULT_MTS_GOLD_NAV: MtsGoldNav = {
  value: 9652,
  updatedAt: '2026-05-01',
}

const DEFAULT_DCA: DcaSettings = {
  coreMonthlyThb: 10000,
  satelliteMonthlyThb: 25000,
}

const DEFAULT_SAT_TARGETS: SatTargets = {
  coreGrowth: 60,
  smallCapAI: 20,
  defensive: 0,
  cash: 20,
}

interface PortfolioStore {
  lang: Lang
  setLang: (lang: Lang) => void

  satellite: Holding[]
  setSatellite: (h: Holding[]) => void
  updateSatelliteHolding: (ticker: string, data: Partial<Holding>) => void
  addSatelliteHolding: (h: Holding) => void
  removeSatelliteHolding: (ticker: string) => void

  core: Holding[]
  setCore: (h: Holding[]) => void
  updateCoreHolding: (ticker: string, data: Partial<Holding>) => void
  addCoreHolding: (h: Holding) => void
  removeCoreHolding: (ticker: string) => void

  mtsGoldNav: MtsGoldNav
  setMtsGoldNav: (nav: MtsGoldNav) => void

  satelliteCashThb: number
  setSatelliteCashThb: (amount: number) => void

  coreCashThb: number
  setCoreCashThb: (amount: number) => void

  dca: DcaSettings
  setDca: (dca: DcaSettings) => void

  satTargets: SatTargets
  setSatTargets: (t: SatTargets) => void

  prices: Record<string, Price>
  setPrices: (prices: Record<string, Price>) => void

  fxRate: FxRate
  setFxRate: (rate: FxRate) => void

  history: HistoryPoint[]
  recordSnapshot: (point: HistoryPoint) => void
  clearHistory: () => void

  transactions: Transaction[]
  addTransaction: (tx: Transaction) => void
  removeTransaction: (id: string) => void

  dividends: Dividend[]
  addDividend: (d: Dividend) => void
  removeDividend: (id: string) => void

  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void
  dismissAlert: (id: string) => void
  clearDismissed: () => void

  /** User-provided Anthropic API key stored locally (never sent anywhere except Anthropic). */
  anthropicApiKey: string
  setAnthropicApiKey: (key: string) => void

  /** Rebalance drift threshold in percentage points (default 10). */
  driftThresholdPct: number
  setDriftThresholdPct: (v: number) => void

  importState: (snapshot: Partial<PortfolioSnapshot>) => void

  resetToDefault: () => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      lang: 'th',
      setLang: (lang) => set({ lang }),

      satellite: DEFAULT_SATELLITE,
      setSatellite: (satellite) => set({ satellite }),
      updateSatelliteHolding: (ticker, data) =>
        set((s) => ({
          satellite: s.satellite.map((h) => (h.ticker === ticker ? { ...h, ...data } : h)),
        })),
      addSatelliteHolding: (h) => set((s) => ({ satellite: [...s.satellite, h] })),
      removeSatelliteHolding: (ticker) =>
        set((s) => ({ satellite: s.satellite.filter((h) => h.ticker !== ticker) })),

      core: DEFAULT_CORE,
      setCore: (core) => set({ core }),
      updateCoreHolding: (ticker, data) =>
        set((s) => ({
          core: s.core.map((h) => (h.ticker === ticker ? { ...h, ...data } : h)),
        })),
      addCoreHolding: (h) => set((s) => ({ core: [...s.core, h] })),
      removeCoreHolding: (ticker) =>
        set((s) => ({ core: s.core.filter((h) => h.ticker !== ticker) })),

      mtsGoldNav: DEFAULT_MTS_GOLD_NAV,
      setMtsGoldNav: (mtsGoldNav) => set({ mtsGoldNav }),

      satelliteCashThb: 0,
      setSatelliteCashThb: (satelliteCashThb) => set({ satelliteCashThb }),

      coreCashThb: 0,
      setCoreCashThb: (coreCashThb) => set({ coreCashThb }),

      dca: DEFAULT_DCA,
      setDca: (dca) => set({ dca }),

      satTargets: DEFAULT_SAT_TARGETS,
      setSatTargets: (satTargets) => set({ satTargets }),

      prices: {},
      setPrices: (prices) => set({ prices }),

      fxRate: { rate: 0, fetchedAt: '' },
      setFxRate: (fxRate) => set({ fxRate }),

      history: [],
      recordSnapshot: (point) =>
        set((s) => {
          // Upsert by date — replace today's point if it already exists.
          const rest = s.history.filter((p) => p.date !== point.date)
          const next = [...rest, point].sort((a, b) => a.date.localeCompare(b.date))
          return { history: next.slice(-MAX_HISTORY) }
        }),
      clearHistory: () => set({ history: [] }),

      transactions: [],
      addTransaction: (tx) =>
        set((s) => {
          const transactions = [...s.transactions, tx]
          const { core, satellite } = applyTxToHoldings(s.core, s.satellite, transactions)
          return { transactions, core, satellite }
        }),
      removeTransaction: (id) =>
        set((s) => {
          const transactions = s.transactions.filter((t) => t.id !== id)
          const { core, satellite } = applyTxToHoldings(s.core, s.satellite, transactions)
          return { transactions, core, satellite }
        }),

      dividends: [],
      addDividend: (d) => set((s) => ({ dividends: [...s.dividends, d] })),
      removeDividend: (id) => set((s) => ({ dividends: s.dividends.filter((d) => d.id !== id) })),

      alerts: [],
      setAlerts: (alerts) => set({ alerts }),
      dismissAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) => a.id === id ? { ...a, dismissed: true } : a),
        })),
      clearDismissed: () =>
        set((s) => ({ alerts: s.alerts.filter((a) => !a.dismissed) })),

      anthropicApiKey: '',
      setAnthropicApiKey: (anthropicApiKey) => set({ anthropicApiKey }),

      driftThresholdPct: 10,
      setDriftThresholdPct: (driftThresholdPct) => set({ driftThresholdPct }),

      importState: (snapshot) =>
        set((s) => ({
          satellite: snapshot.satellite ?? s.satellite,
          core: snapshot.core ?? s.core,
          mtsGoldNav: snapshot.mtsGoldNav ?? s.mtsGoldNav,
          satelliteCashThb: snapshot.satelliteCashThb ?? s.satelliteCashThb,
          coreCashThb: snapshot.coreCashThb ?? s.coreCashThb,
          dca: snapshot.dca ?? s.dca,
          satTargets: snapshot.satTargets ?? s.satTargets,
          transactions: snapshot.transactions ?? s.transactions,
          dividends: snapshot.dividends ?? s.dividends,
        })),

      resetToDefault: () =>
        set({
          satellite: DEFAULT_SATELLITE,
          core: DEFAULT_CORE,
          mtsGoldNav: DEFAULT_MTS_GOLD_NAV,
          satelliteCashThb: 0,
          coreCashThb: 0,
          dca: DEFAULT_DCA,
          transactions: [],
          dividends: [],
          prices: {},
          fxRate: { rate: 0, fetchedAt: '' },
        }),
    }),
    { name: 'portfolio-state-v2' },
  ),
)
