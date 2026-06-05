import type { IncomingMessage, ServerResponse } from 'http'

interface FinnhubQuote {
  c: number  // current price
  pc: number // previous close
}

interface FrankfurterRates {
  rates: Record<string, number>
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control':
      status === 200
        ? 'public, s-maxage=900, stale-while-revalidate=3600'
        : 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

const API_KEY = process.env.FINNHUB_API_KEY ?? ''
const BASE = 'https://finnhub.io/api/v1'

async function fetchQuote(symbol: string): Promise<number | null> {
  try {
    const resp = await fetch(
      `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!resp.ok) return null
    const data = (await resp.json()) as FinnhubQuote
    return data.c > 0 ? data.c : null
  } catch {
    return null
  }
}

async function fetchUsdThb(): Promise<number | null> {
  try {
    const resp = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=THB',
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!resp.ok) return null
    const data = (await resp.json()) as FrankfurterRates
    return data.rates?.THB ?? null
  } catch {
    return null
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!API_KEY) {
    send(res, 500, { error: 'FINNHUB_API_KEY not set' })
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const symbolsParam = url.searchParams.get('symbols') ?? ''

  if (!symbolsParam) {
    send(res, 200, { prices: {}, fxRate: 0 })
    return
  }

  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean)

  const [quoteResults, fxRate] = await Promise.all([
    Promise.all(symbols.map((s) => fetchQuote(s))),
    fetchUsdThb(),
  ])

  const prices: Record<string, number> = {}
  symbols.forEach((sym, i) => {
    const price = quoteResults[i]
    if (price != null) prices[sym] = price
  })

  send(res, 200, { prices, fxRate: fxRate ?? 0 })
}
