import type { IncomingMessage, ServerResponse } from 'http'

// NBIS and VXUS have 0 shares — excluded to stay within Twelve Data free tier (8 credits/min)
const STOCK_SYMBOLS = ['MSFT', 'AMZN', 'META', 'ORCL', 'COST', 'CRWV', 'VOO', 'SCHD']

interface TwelveDataPriceEntry {
  price?: string
  code?: number
  message?: string
}

interface ExchangeRateResponse {
  rates?: Record<string, number>
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control':
      status === 200
        ? 'public, s-maxage=60, stale-while-revalidate=900'
        : 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

async function fetchFxRate(): Promise<number> {
  // open.er-api.com — free, no API key, no credit limit
  const resp = await fetch('https://open.er-api.com/v6/latest/USD', {
    signal: AbortSignal.timeout(8_000),
  })
  if (!resp.ok) return 0
  const data = (await resp.json()) as ExchangeRateResponse
  return data.rates?.THB ?? 0
}

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    send(res, 500, { error: 'TWELVE_DATA_API_KEY env var is not set' })
    return
  }

  // 8 symbols = 8 credits/request, exactly at the free tier per-minute limit
  const symbolsParam = STOCK_SYMBOLS.join(',')
  const url = `https://api.twelvedata.com/price?symbol=${symbolsParam}&apikey=${apiKey}`

  const [stockResp, fxRate] = await Promise.allSettled([
    fetch(url, { signal: AbortSignal.timeout(10_000) }),
    fetchFxRate(),
  ])

  if (stockResp.status === 'rejected') {
    send(res, 502, { error: `Price fetch failed: ${stockResp.reason}` })
    return
  }

  const httpResp = stockResp.value
  if (!httpResp.ok) {
    const detail = await httpResp.text().catch(() => '')
    send(res, 502, { error: `Twelve Data returned HTTP ${httpResp.status}`, detail: detail.slice(0, 200) })
    return
  }

  let raw: Record<string, TwelveDataPriceEntry>
  try {
    raw = (await httpResp.json()) as Record<string, TwelveDataPriceEntry>
  } catch {
    send(res, 502, { error: 'Twelve Data response was not valid JSON' })
    return
  }

  const prices: Record<string, number> = {}
  for (const sym of STOCK_SYMBOLS) {
    const entry = raw[sym]
    if (entry?.price) {
      const n = parseFloat(entry.price)
      if (isFinite(n)) prices[sym] = n
    }
  }

  send(res, 200, {
    prices,
    fxRate: fxRate.status === 'fulfilled' ? fxRate.value : 0,
  })
}
