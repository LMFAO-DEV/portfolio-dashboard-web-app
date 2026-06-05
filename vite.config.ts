import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import type { ServerResponse } from 'http'

interface FinnhubQuote { c: number }
interface FrankfurterRates { rates: Record<string, number> }

function buildDevProxy(apiKey: string): Plugin {
  const BASE = 'https://finnhub.io/api/v1'

  async function fetchQuote(symbol: string): Promise<number | null> {
    try {
      const resp = await fetch(
        `${BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
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

        const [quoteResults, fxRate] = await Promise.all([
          Promise.all(symbols.map((s) => fetchQuote(s))),
          fetchUsdThb(),
        ])

        const prices: Record<string, number> = {}
        symbols.forEach((sym, i) => {
          const price = quoteResults[i]
          if (price != null) prices[sym] = price
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ prices, fxRate: fxRate ?? 0 }))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), buildDevProxy(env.FINNHUB_API_KEY ?? '')],
  }
})
