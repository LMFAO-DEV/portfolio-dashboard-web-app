import { useQuery } from '@tanstack/react-query'
import { fetchPrices } from '../api/prices'
import { usePortfolioStore } from '../store/portfolio'

const STALE_MS = 15 * 60 * 1000

export function usePrices() {
  const setPrices = usePortfolioStore((s) => s.setPrices)
  const setFxRate = usePortfolioStore((s) => s.setFxRate)
  const cachedPrices = usePortfolioStore((s) => s.prices)
  const cachedFx = usePortfolioStore((s) => s.fxRate)

  const query = useQuery({
    queryKey: ['prices'],
    queryFn: async () => {
      const result = await fetchPrices()
      const priceMap: typeof cachedPrices = {}
      for (const [sym, usd] of Object.entries(result.prices)) {
        priceMap[sym] = { usd, fetchedAt: result.fetchedAt }
      }
      setPrices(priceMap)
      setFxRate({ rate: result.fxRate, fetchedAt: result.fetchedAt })
      return result
    },
    staleTime: STALE_MS,
    refetchInterval: STALE_MS,
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 3000,
  })

  // Merge live data with cached fallback
  const prices: Record<string, number> = {}
  if (query.data) {
    Object.assign(prices, query.data.prices)
  } else {
    for (const [sym, p] of Object.entries(cachedPrices)) {
      prices[sym] = p.usd
    }
  }

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
