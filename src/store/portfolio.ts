import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Holding, FxRate, MtsGoldNav, DcaSettings, Price, Lang } from '../types'

const DEFAULT_SATELLITE: Holding[] = [
  { ticker: 'MSFT', shares: 3.83373, costUsd: 393.25 },
  { ticker: 'AMZN', shares: 7.22371, costUsd: 207.71 },
  { ticker: 'META', shares: 3.38266, costUsd: 591.52 },
  { ticker: 'ORCL', shares: 6.64523, costUsd: 150.64 },
  { ticker: 'COST', shares: 0.46556, costUsd: 860.10 },
  { ticker: 'CRWV', shares: 4.0, costUsd: 84.59 },
  { ticker: 'NBIS', shares: 0, costUsd: 0 },
]

const DEFAULT_CORE: Holding[] = [
  { ticker: 'VOO', shares: 3.7518, costUsd: 594.58 },
  { ticker: 'SCHD', shares: 43.58, costUsd: 25.55 },
  { ticker: 'VXUS', shares: 0, costUsd: 0 },
  { ticker: 'MTS-GOLD', shares: 1, costThb: 10030, isTHB: true },
]

const DEFAULT_MTS_GOLD_NAV: MtsGoldNav = {
  value: 9652,
  updatedAt: '2026-05-01',
}

const DEFAULT_DCA: DcaSettings = {
  coreMonthlyThb: 10000,
  satelliteMonthlyThb: 25000,
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

  dca: DcaSettings
  setDca: (dca: DcaSettings) => void

  prices: Record<string, Price>
  setPrices: (prices: Record<string, Price>) => void

  fxRate: FxRate
  setFxRate: (rate: FxRate) => void

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

      satelliteCashThb: 160000,
      setSatelliteCashThb: (satelliteCashThb) => set({ satelliteCashThb }),

      dca: DEFAULT_DCA,
      setDca: (dca) => set({ dca }),

      prices: {},
      setPrices: (prices) => set({ prices }),

      fxRate: { rate: 0, fetchedAt: '' },
      setFxRate: (fxRate) => set({ fxRate }),

      resetToDefault: () =>
        set({
          satellite: DEFAULT_SATELLITE,
          core: DEFAULT_CORE,
          mtsGoldNav: DEFAULT_MTS_GOLD_NAV,
          satelliteCashThb: 160000,
          dca: DEFAULT_DCA,
          prices: {},
          fxRate: { rate: 0, fetchedAt: '' },
        }),
    }),
    { name: 'portfolio-state' },
  ),
)
