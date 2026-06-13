export type Lang = 'th' | 'en'

export type SatGroup = 'coreGrowth' | 'smallCapAI' | 'defensive'

export interface CategoryConfig {
  id: string
  label: string
  target_pct: number
  colour_hex: string
  sort_order: number
}

export interface Holding {
  ticker: string
  shares: number
  costUsd?: number
  costThb?: number
  isTHB?: boolean
  targetPct?: number
  navThb?: number
  /** @deprecated Use category_id instead */
  satGroup?: SatGroup
  /** User-defined category ID (satellite only). null = Unassigned. */
  category_id?: string | null
  /** Weighted-avg USD/THB rate at entry, derived from transactions. Enables FX attribution. */
  entryFxRate?: number
  /** Price target alert threshold (USD for USD assets, THB for THB assets). */
  targetPrice?: number
  /** Stop-loss threshold, e.g. 0.15 for -15% from avg cost. */
  stop_loss_pct?: number
  /** Upcoming event label, e.g. "Q4 earnings". */
  catalyst?: string
  /** ISO date string for catalyst event, e.g. "2026-09-02". */
  catalyst_date?: string
}

export type Port = 'core' | 'satellite'
export type TxType = 'buy' | 'sell'

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  port: Port
  ticker: string
  type: TxType
  shares: number
  priceUsd?: number // USD assets
  priceThb?: number // THB assets (e.g. MTS-GOLD)
  fxRate?: number // USD/THB at transaction time
  feeThb?: number
  isTHB?: boolean
}

export interface Dividend {
  id: string
  date: string // YYYY-MM-DD
  ticker: string
  amountUsd?: number // total payout (not per share)
  amountThb?: number
  fxRate?: number
}

export interface SatTargets {
  coreGrowth: number
  smallCapAI: number
  defensive: number
  cash: number
}

export interface Price {
  usd: number
  fetchedAt: string
}

export interface FxRate {
  rate: number
  fetchedAt: string
}

export interface MtsGoldNav {
  value: number
  updatedAt: string
}

export interface DcaSettings {
  coreMonthlyThb: number
  satelliteMonthlyThb: number
}

export interface HistoryPoint {
  date: string // YYYY-MM-DD
  totalThb: number
  coreThb: number
  satThb: number
  vooUsd?: number // VOO close price for benchmark comparison
}

export type AlertSeverity = 'info' | 'warning' | 'danger'

export interface Alert {
  id: string
  severity: AlertSeverity
  rule: 'drift' | 'goldStale' | 'priceTarget' | 'stopLoss' | 'pnlAlert' | 'catalyst' | 'positionCount' | 'cashReserve' | 'unassigned' | 'catDeviation'
  title: string
  body: string
  createdAt: string // ISO
  dismissed: boolean
}

export interface PortfolioSnapshot {
  satellite: Holding[]
  core: Holding[]
  mtsGoldNav: MtsGoldNav
  satelliteCashThb: number
  coreCashThb: number
  dca: DcaSettings
  satTargets: SatTargets
  transactions?: Transaction[]
  dividends?: Dividend[]
  categoryConfigs?: CategoryConfig[]
  positionLimit?: number
}
