import type { IncomingMessage, ServerResponse } from 'node:http'

const SYMBOLS = [
  'MSFT', 'AMZN', 'META', 'ORCL', 'COST', 'CRWV',
  'NBIS', 'VOO', 'SCHD', 'VXUS', 'USDTHB=X',
]

// Encode `=` in tickers (USDTHB=X) but keep commas literal — Yahoo Finance
// parses comma-separated symbols and needs the = sign percent-encoded.
const SYMBOLS_PARAM = SYMBOLS.map((s) => s.replace(/=/g, '%3D')).join(',')

const YAHOO_URL =
  `https://query1.finance.yahoo.com/v7/finance/quote` +
  `?symbols=${SYMBOLS_PARAM}&fields=regularMarketPrice,currency&lang=en-US&region=US`

// Browser-like headers — Yahoo Finance rejects bare Node.js User-Agents
const UPSTREAM_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://finance.yahoo.com',
  'Referer': 'https://finance.yahoo.com/',
}

function send(res: ServerResponse, status: number, body: unknown, extra?: Record<string, string>): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': status === 200
      ? 'public, s-maxage=60, stale-while-revalidate=900'
      : 'no-store',
    'Access-Control-Allow-Origin': '*',
    ...extra,
  })
  res.end(payload)
}

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let upstream: Response
  try {
    upstream = await fetch(YAHOO_URL, {
      headers: UPSTREAM_HEADERS,
      signal: AbortSignal.timeout(9_000),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    send(res, 502, { error: `Price fetch failed: ${msg}` })
    return
  }

  if (!upstream.ok) {
    send(res, upstream.status, { error: `Yahoo returned HTTP ${upstream.status}` })
    return
  }

  let data: unknown
  try {
    data = await upstream.json()
  } catch {
    send(res, 502, { error: 'Yahoo response was not valid JSON' })
    return
  }

  send(res, 200, data)
}
