import type { IncomingMessage, ServerResponse } from 'http'

interface YahooChartMeta {
  symbol: string
  regularMarketPrice?: number
}

interface YahooChartResponse {
  chart?: {
    result?: { meta: YahooChartMeta }[]
    error?: { code: string; description: string }
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control':
      status === 200
        ? 'public, s-maxage=3600, stale-while-revalidate=28800'
        : 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(body))
}

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://finance.yahoo.com/',
}

async function fetchSymbol(symbol: string): Promise<number | null> {
  const encoded = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: YAHOO_HEADERS })
    if (!resp.ok) return null
    const data = (await resp.json()) as YahooChartResponse
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const symbolsParam = url.searchParams.get('symbols') ?? ''

  if (!symbolsParam) {
    send(res, 200, { prices: {}, fxRate: 0 })
    return
  }

  const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean)
  const allSymbols = [...symbols, 'USDTHB=X']

  const results = await Promise.all(allSymbols.map((s) => fetchSymbol(s)))

  const prices: Record<string, number> = {}
  let fxRate = 0

  allSymbols.forEach((sym, i) => {
    const price = results[i]
    if (price == null) return
    if (sym === 'USDTHB=X') fxRate = price
    else prices[sym] = price
  })

  send(res, 200, { prices, fxRate })
}
