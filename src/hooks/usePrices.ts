import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPrices } from '../api/prices'
import { usePortfolioStore } from '../store/portfolio'

// Cache for 8 hours — end-of-day prices don't change until next session
const STALE_MS = 8 * 60 * 60 * 1000

export function usePrices() {
  const setPrices = usePortfolioStore((s) => s.setPrices)
  const setFxRate = usePortfolioStore((s) => s.setFxRate)
  const cachedPrices = usePortfolioStore((s) => s.prices)
  const cachedFx = usePortfolioStore((s) => s.fxRate)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)

  // Collect all non-THB tickers (including zero-share ones for planning)
  const tickers = [
    ...satellite.filter((h) => !h.isTHB).map((h) => h.ticker),
    ...core.filter((h) => !h.isTHB).map((h) => h.ticker),
  ]

  const query = useQuery({
    queryKey: ['prices', tickers.join(',')],
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
    enabled: tickers.length > 0,
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 3000,
  })

  // Stable reference — only changes when query.data or cachedPrices actually updates.
  const prices = useMemo(() => {
    const result: Record<string, number> = {}
    if (query.data) {
      Object.assign(result, query.data.prices)
    } else {
      for (const [sym, p] of Object.entries(cachedPrices)) {
        result[sym] = p.usd
      }
    }
    return result
  }, [query.data, cachedPrices])

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
