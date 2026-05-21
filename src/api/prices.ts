import axios from 'axios'

interface YahooQuote {
  symbol: string
  regularMarketPrice: number
}

interface YahooResponse {
  quoteResponse: {
    result: YahooQuote[]
    error: unknown
  }
}

export interface PriceFetchResult {
  prices: Record<string, number>
  fxRate: number
  fetchedAt: string
}

export async function fetchPrices(): Promise<PriceFetchResult> {
  // Calls the Vercel serverless function (api/prices.ts) in production and on
  // `vercel dev`. In plain `vite dev` the vite.config.ts proxy forwards this to
  // Yahoo Finance directly so no separate process is needed.
  const resp = await axios.get<YahooResponse>('/api/prices', { timeout: 12000 })
  const results = resp.data.quoteResponse?.result ?? []

  const prices: Record<string, number> = {}
  let fxRate = 0
  const fetchedAt = new Date().toISOString()

  for (const q of results) {
    if (!q.symbol || !isFinite(q.regularMarketPrice)) continue
    if (q.symbol === 'USDTHB=X') {
      fxRate = q.regularMarketPrice
    } else {
      prices[q.symbol] = q.regularMarketPrice
    }
  }

  return { prices, fxRate, fetchedAt }
}
