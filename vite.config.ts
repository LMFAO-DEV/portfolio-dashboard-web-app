import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { ServerResponse } from 'http'

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
    const data = await resp.json() as {
      chart?: { result?: { meta?: { regularMarketPrice?: number } }[] }
    }
    return data.chart?.result?.[0]?.meta?.regularMarketPrice ?? null
  } catch {
    return null
  }
}

// Dev-only middleware: mirrors api/prices.ts without CORS issues
function pricesDevProxy(): Plugin {
  return {
    name: 'prices-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res: ServerResponse, next) => {
        if (!req.url?.startsWith('/api/prices')) return next()

        const qs = req.url.split('?')[1] ?? ''
        const symbolsParam = new URLSearchParams(qs).get('symbols') ?? ''

        if (!symbolsParam) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ prices: {}, fxRate: 0 }))
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

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ prices, fxRate }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), pricesDevProxy()],
})
