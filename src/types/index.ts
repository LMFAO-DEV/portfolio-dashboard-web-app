export type Lang = 'th' | 'en'

export interface Holding {
  ticker: string
  shares: number
  costUsd?: number
  costThb?: number
  isTHB?: boolean
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
