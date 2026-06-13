import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPrices } from '../api/prices'
import { usePortfolioStore } from '../store/portfolio'

const STALE_MS = 8 * 60 * 60 * 1000

const MTS_GOLD_TICKER = 'MTS-GOLD'

export function usePrices() {
  const setPrices = usePortfolioStore((s) => s.setPrices)
  const setFxRate = usePortfolioStore((s) => s.setFxRate)
  const cachedPrices = usePortfolioStore((s) => s.prices)
  const cachedFx = usePortfolioStore((s) => s.fxRate)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)

  const hasMtsGold = core.some((h) => h.ticker === MTS_GOLD_TICKER)

  // MTS-GOLD never goes into the ticker list — price derived from xauUsd returned by the API
  const tickers = [
    ...satellite.filter((h) => !h.isTHB).map((h) => h.ticker),
    ...core.filter((h) => !h.isTHB && h.ticker !== MTS_GOLD_TICKER).map((h) => h.ticker),
  ]

  const query = useQuery({
    queryKey: ['prices', tickers.join(','), hasMtsGold],
    queryFn: async () => {
      const result = await fetchPrices(tickers)
      const priceMap: typeof cachedPrices = {}
      for (const [sym, usd] of Object.entries(result.prices)) {
        priceMap[sym] = { usd, fetchedAt: result.fetchedAt }
      }
      setPrices(priceMap)
      setFxRate({ rate: result.fxRate, fetchedAt: result.fetchedAt })
      return result
    },
    enabled: tickers.length > 0 || hasMtsGold,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 3000,
  })

  const prices = useMemo(() => {
    const result: Record<string, number> = {}
    if (query.data) {
      Object.assign(result, query.data.prices)
      // MTS-GOLD price = XAUUSD in USD — normal USD flow applies fxRate automatically
      if (hasMtsGold && query.data.xauUsd) {
        result[MTS_GOLD_TICKER] = query.data.xauUsd
      }
    } else {
      for (const [sym, p] of Object.entries(cachedPrices)) {
        result[sym] = p.usd
      }
    }
    return result
  }, [query.data, cachedPrices, hasMtsGold])

  const fxRate = query.data?.fxRate ?? cachedFx.rate
  const lastUpdated = query.data?.fetchedAt ?? cachedFx.fetchedAt

  return {
    prices,
    fxRate,
    lastUpdated,
    isLoading: query.isLoading && Object.keys(prices).length === 0,
    isError: query.isError,
    refetch: query.refetch,
  }
}
