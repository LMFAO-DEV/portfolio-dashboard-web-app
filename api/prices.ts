import type { IncomingMessage, ServerResponse } from 'http'

const STOCK_SYMBOLS = ['MSFT', 'AMZN', 'META', 'ORCL', 'COST', 'CRWV', 'NBIS', 'VOO', 'SCHD', 'VXUS']
const FX_SYMBOL = 'USD/THB'

interface TwelveDataPriceEntry {
  price?: string
  code?: number
  message?: string
}

type BatchResponse = Record<string, TwelveDataPriceEntry>

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

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    send(res, 500, { error: 'TWELVE_DATA_API_KEY env var is not set' })
    return
  }

  // Commas must stay literal (Twelve Data batch separator); only encode `/` in forex pair
  const symbolsParam = [...STOCK_SYMBOLS, FX_SYMBOL.replace('/', '%2F')].join(',')
  const url = `https://api.twelvedata.com/price?symbol=${symbolsParam}&apikey=${apiKey}`

  let raw: BatchResponse
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!resp.ok) {
      send(res, 502, { error: `Twelve Data returned HTTP ${resp.status}` })
      return
    }
    raw = (await resp.json()) as BatchResponse
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    send(res, 502, { error: `Price fetch failed: ${msg}` })
    return
  }

  const prices: Record<string, number> = {}
  let fxRate = 0

  for (const sym of STOCK_SYMBOLS) {
    const entry = raw[sym]
    if (entry?.price) {
      const n = parseFloat(entry.price)
      if (isFinite(n)) prices[sym] = n
    }
  }

  const fxEntry = raw[FX_SYMBOL]
  if (fxEntry?.price) {
    const n = parseFloat(fxEntry.price)
    if (isFinite(n)) fxRate = n
  }

  send(res, 200, { prices, fxRate })
}
