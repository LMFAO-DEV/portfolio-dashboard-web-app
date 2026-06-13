import axios from 'axios'

interface PricesApiResponse {
  prices: Record<string, number>
  fxRate: number
  xauUsd: number
}

export interface PriceFetchResult {
  prices: Record<string, number>
  fxRate: number
  xauUsd: number
  fetchedAt: string
}

export async function fetchPrices(tickers: string[]): Promise<PriceFetchResult> {
  const symbols = tickers.join(',')
  const resp = await axios.get<PricesApiResponse>(`/api/prices?symbols=${encodeURIComponent(symbols)}`, {
    timeout: 12000,
  })
  return {
    prices: resp.data.prices ?? {},
    fxRate: resp.data.fxRate ?? 0,
    xauUsd: resp.data.xauUsd ?? 0,
    fetchedAt: new Date().toISOString(),
  }
}
