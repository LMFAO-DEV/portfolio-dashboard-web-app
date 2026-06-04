import type { Alert, Holding, MtsGoldNav, SatTargets } from '../types'

/** Recompute which alerts should currently be active. Called whenever prices/holdings change. */
export function computeAlerts(
  params: {
    core: Holding[]
    satellite: Holding[]
    prices: Record<string, number>
    fxRate: number
    mtsGoldNav: MtsGoldNav
    satTargets: SatTargets
    satelliteCashThb: number
    coreCashThb: number
    driftThresholdPct?: number // default 10
  },
): Omit<Alert, 'dismissed'>[] {
  const {
    core, satellite, prices, fxRate, mtsGoldNav, satTargets,
    satelliteCashThb, coreCashThb, driftThresholdPct = 10,
  } = params
  const now = new Date().toISOString()
  const results: Omit<Alert, 'dismissed'>[] = []

  // --- Rebalance drift ---
  const coreEquity = core.reduce((s, h) => {
    if (!h.shares) return s
    if (h.isTHB) return s + h.shares * (h.navThb ?? mtsGoldNav.value)
    return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
  }, 0)
  const coreTotal = coreEquity + coreCashThb

  const satEquity = satellite.reduce((s, h) => {
    if (!h.shares) return s
    return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
  }, 0)
  const satTotal = satEquity + satelliteCashThb
  const grandTotal = coreTotal + satTotal

  if (grandTotal > 0) {
    // Core/Satellite 50:50 drift
    const corePct = (coreTotal / grandTotal) * 100
    const coreDrift = Math.abs(corePct - 50)
    if (coreDrift >= driftThresholdPct) {
      const side = corePct > 50 ? 'overweight' : 'underweight'
      results.push({
        id: `drift:core-sat`,
        severity: coreDrift >= 15 ? 'danger' : 'warning',
        rule: 'drift',
        title: `Core/Satellite drift ${coreDrift.toFixed(0)}%`,
        body: `Core is ${corePct.toFixed(0)}% of portfolio (target 50%). Core is ${side} by ฿${((coreDrift / 100) * grandTotal).toLocaleString('th-TH', { maximumFractionDigits: 0 })}.`,
        createdAt: now,
      })
    }

    // Core bucket drift
    for (const h of core) {
      if (!h.targetPct || h.targetPct <= 0) continue
      const val = h.isTHB
        ? h.shares * (h.navThb ?? mtsGoldNav.value)
        : h.shares * (prices[h.ticker] ?? 0) * fxRate
      const actualPct = (val / coreTotal) * 100
      const gap = Math.abs(actualPct - h.targetPct)
      if (gap >= driftThresholdPct) {
        results.push({
          id: `drift:core:${h.ticker}`,
          severity: gap >= 15 ? 'danger' : 'warning',
          rule: 'drift',
          title: `${h.ticker} drifted ${gap.toFixed(0)}%`,
          body: `${h.ticker} is ${actualPct.toFixed(0)}% of Core (target ${h.targetPct}%).`,
          createdAt: now,
        })
      }
    }

    // Satellite bucket drift
    const satBucketVal = (group: string) =>
      satellite.filter((h) => h.satGroup === group)
        .reduce((s, h) => s + h.shares * (prices[h.ticker] ?? 0) * fxRate, 0)
    const satBuckets = [
      { key: 'coreGrowth', val: satBucketVal('coreGrowth'), target: satTargets.coreGrowth },
      { key: 'smallCapAI', val: satBucketVal('smallCapAI'), target: satTargets.smallCapAI },
      { key: 'defensive', val: satBucketVal('defensive'), target: satTargets.defensive },
      { key: 'cash', val: satelliteCashThb, target: satTargets.cash },
    ]
    for (const b of satBuckets) {
      if (!b.target) continue
      const actualPct = satTotal > 0 ? (b.val / satTotal) * 100 : 0
      const gap = Math.abs(actualPct - b.target)
      if (gap >= driftThresholdPct) {
        results.push({
          id: `drift:sat:${b.key}`,
          severity: gap >= 15 ? 'danger' : 'warning',
          rule: 'drift',
          title: `Satellite ${b.key} drifted ${gap.toFixed(0)}%`,
          body: `${b.key} is ${actualPct.toFixed(0)}% of Satellite (target ${b.target}%).`,
          createdAt: now,
        })
      }
    }
  }

  // --- Gold NAV stale (> 30 days) ---
  const goldAge =
    (Date.now() - new Date(mtsGoldNav.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (goldAge > 30) {
    results.push({
      id: 'goldStale',
      severity: goldAge > 90 ? 'danger' : 'warning',
      rule: 'goldStale',
      title: `MTS-GOLD NAV is ${Math.floor(goldAge)} days old`,
      body: `Last updated ${mtsGoldNav.updatedAt}. Update the NAV in Settings for accurate P&L.`,
      createdAt: now,
    })
  }

  // --- Price target alerts ---
  for (const h of [...core, ...satellite]) {
    if (!h.targetPrice || !h.shares) continue
    const price = h.isTHB ? (h.navThb ?? mtsGoldNav.value) : (prices[h.ticker] ?? 0)
    if (price <= 0) continue
    const pct = ((price - h.targetPrice) / h.targetPrice) * 100
    if (Math.abs(pct) < 5) {
      results.push({
        id: `priceTarget:${h.ticker}`,
        severity: 'info',
        rule: 'priceTarget',
        title: `${h.ticker} near target ${h.isTHB ? '฿' : '$'}${h.targetPrice}`,
        body: `Current price is ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs your target.`,
        createdAt: now,
      })
    }
  }

  return results
}
