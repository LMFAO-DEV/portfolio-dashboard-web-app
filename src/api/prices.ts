import axios from 'axios'

interface PricesApiResponse {
  prices: Record<string, number>
  fxRate: number
}

export interface PriceFetchResult {
  prices: Record<string, number>
  fxRate: number
  fetchedAt: string
}

export async function fetchPrices(): Promise<PriceFetchResult> {
  const resp = await axios.get<PricesApiResponse>('/api/prices', { timeout: 12000 })
  return {
    prices: resp.data.prices ?? {},
    fxRate: resp.data.fxRate ?? 0,
    fetchedAt: new Date().toISOString(),
  }
}
