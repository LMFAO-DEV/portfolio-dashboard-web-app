import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Holding, FxRate, MtsGoldNav, DcaSettings, Price, Lang } from '../types'

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

      satelliteCashThb: 0,
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
          satelliteCashThb: 0,
          dca: DEFAULT_DCA,
          prices: {},
          fxRate: { rate: 0, fetchedAt: '' },
        }),
    }),
    { name: 'portfolio-state-v2' },
  ),
)
