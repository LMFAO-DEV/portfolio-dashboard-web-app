import type { Holding, MtsGoldNav } from '../types'
import { fmtDate, fmtTime } from './format'
import type { Lang } from '../types'

function pad(s: string, w: number): string {
  return s.padEnd(w, ' ')
}

function pctStr(val: number, total: number): string {
  if (!total) return '0.0%'
  return ((val / total) * 100).toFixed(1) + '%'
}

export function buildCopyForClaude(
  satellite: Holding[],
  core: Holding[],
  satelliteCashThb: number,
  mtsGoldNav: MtsGoldNav,
  prices: Record<string, number>,
  fxRate: number,
  lang: Lang,
): string {
  const now = new Date()
  const dateStr = fmtDate(now, lang)
  const timeStr = fmtTime(now)

  const lines: string[] = []
  lines.push(`Portfolio Snapshot — ${dateStr}, ${timeStr}`)
  lines.push(`USD/THB: ${fxRate.toFixed(2)}`)
  lines.push('')

  // Satellite
  const satEquity = satellite.reduce((sum, h) => {
    if (!h.shares) return sum
    const price = prices[h.ticker] ?? 0
    return sum + h.shares * price * fxRate
  }, 0)
  const satTotal = satEquity + satelliteCashThb

  lines.push(`SATELLITE PORT — Total: ฿${satTotal.toFixed(0)} | Cash: ฿${satelliteCashThb.toFixed(0)} (${pctStr(satelliteCashThb, satTotal)})`)

  for (const h of satellite) {
    const price = prices[h.ticker]
    if (!h.shares || h.shares === 0) {
      lines.push(`${pad(h.ticker, 6)} 0.0000 shares | not held`)
      continue
    }
    const mktVal = h.shares * (price ?? 0) * fxRate
    const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
    const sign = pnlPct >= 0 ? '+' : '−'
    lines.push(
      `${pad(h.ticker, 6)} ${h.shares.toFixed(4)} shares | cost $${(h.costUsd ?? 0).toFixed(2)} | price $${(price ?? 0).toFixed(2)} | ฿${mktVal.toFixed(0)} | ${sign}${Math.abs(pnlPct).toFixed(2)}%`,
    )
  }
  lines.push(`Cash   ฿${satelliteCashThb.toFixed(0)} (${pctStr(satelliteCashThb, satTotal)} of Satellite)`)
  lines.push('')

  // Core
  const coreTotal = core.reduce((sum, h) => {
    if (!h.shares) return sum
    if (h.isTHB) return sum + h.shares * mtsGoldNav.value
    const price = prices[h.ticker] ?? 0
    return sum + h.shares * price * fxRate
  }, 0)

  lines.push(`CORE PORT — Total: ฿${coreTotal.toFixed(0)}`)

  for (const h of core) {
    if (h.isTHB) {
      const nav = mtsGoldNav.value
      const cost = h.costThb ?? 0
      const pnlPct = cost ? ((nav - cost) / cost) * 100 : 0
      const sign = pnlPct >= 0 ? '+' : '−'
      const updStr = mtsGoldNav.updatedAt
        ? fmtDate(new Date(mtsGoldNav.updatedAt), lang)
        : '—'
      lines.push(
        `GOLD   NAV ฿${nav.toFixed(0)} | cost ฿${cost.toFixed(0)} | ${sign}${Math.abs(pnlPct).toFixed(2)}% (updated ${updStr})`,
      )
      continue
    }
    const price = prices[h.ticker]
    if (!h.shares || h.shares === 0) {
      lines.push(`${pad(h.ticker, 6)} not held`)
      continue
    }
    const mktVal = h.shares * (price ?? 0) * fxRate
    const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
    const sign = pnlPct >= 0 ? '+' : '−'
    lines.push(
      `${pad(h.ticker, 6)} ${h.shares.toFixed(4)} shares | cost $${(h.costUsd ?? 0).toFixed(2)} | price $${(price ?? 0).toFixed(2)} | ฿${mktVal.toFixed(0)} | ${sign}${Math.abs(pnlPct).toFixed(2)}%`,
    )
  }
  lines.push('')

  // Split
  const total = satTotal + coreTotal
  const coreShare = total ? Math.round((coreTotal / total) * 100) : 0
  const satShare = 100 - coreShare
  lines.push(`PORTFOLIO SPLIT — Core: ${coreShare}% | Satellite: ${satShare}% | Target: 50:50`)
  lines.push('')
  lines.push('Question:')

  return lines.join('\n')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}
