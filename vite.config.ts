import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Symbols must match api/prices.ts — encode `=` so it isn't parsed as a
// query-param separator, keep commas literal (Yahoo Finance accepts both).
const SYMBOLS = 'MSFT,AMZN,META,ORCL,COST,CRWV,NBIS,VOO,SCHD,VXUS,USDTHB%3DX'
const YAHOO_PATH =
  `/v7/finance/quote?symbols=${SYMBOLS}&fields=regularMarketPrice,currency&lang=en-US&region=US`

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In plain `npm run dev` (no Vercel CLI) the browser calls /api/prices and
      // this proxy forwards it to Yahoo Finance server-side, bypassing CORS.
      // When using `vercel dev` Vercel intercepts /api/* before Vite, so the
      // proxy is never reached — the real serverless function runs instead.
      '/api/prices': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        // Add browser-like headers so Yahoo Finance accepts the request
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader(
              'User-Agent',
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            )
            proxyReq.setHeader('Referer', 'https://finance.yahoo.com/')
            proxyReq.setHeader('Origin', 'https://finance.yahoo.com')
          })
        },
        rewrite: () => YAHOO_PATH,
      },
    },
  },
})
