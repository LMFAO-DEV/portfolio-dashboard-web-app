import type { Alert, CategoryConfig, Holding, MtsGoldNav, SatTargets } from '../types'

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
    driftThresholdPct?: number
    categoryConfigs?: CategoryConfig[]
    positionLimit?: number
  },
): Omit<Alert, 'dismissed'>[] {
  const {
    core, satellite, prices, fxRate, mtsGoldNav, satTargets,
    satelliteCashThb, coreCashThb,
    driftThresholdPct = 10,
    categoryConfigs = [],
    positionLimit = 8,
  } = params
  const now = new Date().toISOString()
  const today = new Date()
  const results: Omit<Alert, 'dismissed'>[] = []

  // --- Portfolio totals ---
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

  // --- Core/Satellite split drift ---
  if (grandTotal > 0) {
    const corePct = (coreTotal / grandTotal) * 100
    const coreDrift = Math.abs(corePct - 50)
    if (coreDrift >= driftThresholdPct) {
      const side = corePct > 50 ? 'overweight' : 'underweight'
      results.push({
        id: 'drift:core-sat',
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

    // Satellite category drift (new user-defined system)
    if (categoryConfigs.length > 0) {
      for (const cfg of categoryConfigs) {
        const catVal = satellite
          .filter((h) => h.category_id === cfg.id && h.shares > 0)
          .reduce((s, h) => s + h.shares * (prices[h.ticker] ?? 0) * fxRate, 0)
        const actualPct = satTotal > 0 ? (catVal / satTotal) * 100 : 0
        const gap = Math.abs(actualPct - cfg.target_pct)
        if (gap >= 8) {
          results.push({
            id: `catDeviation:${cfg.id}`,
            severity: gap >= 15 ? 'danger' : 'warning',
            rule: 'catDeviation',
            title: `${cfg.label} drifted ${gap.toFixed(0)}%`,
            body: `${cfg.label} is ${actualPct.toFixed(0)}% of Satellite (target ${cfg.target_pct}%).`,
            createdAt: now,
          })
        }
      }
    } else {
      // Legacy: satellite bucket drift using satGroup
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

  // --- Stop-loss alerts ---
  for (const h of satellite) {
    if (!h.stop_loss_pct || !h.shares || !h.costUsd) continue
    const price = prices[h.ticker] ?? 0
    if (price <= 0) continue
    const stopPrice = h.costUsd * (1 - h.stop_loss_pct)
    if (price <= stopPrice) {
      results.push({
        id: `stopLoss:${h.ticker}`,
        severity: 'danger',
        rule: 'stopLoss',
        title: `${h.ticker} hit stop-loss`,
        body: `${h.ticker} at $${price.toFixed(2)} is at or below stop-loss price $${stopPrice.toFixed(2)}.`,
        createdAt: now,
      })
    }
  }

  // --- P&L > +50% alert ---
  for (const h of satellite) {
    if (!h.shares || !h.costUsd) continue
    const price = prices[h.ticker] ?? 0
    if (price <= 0 || h.costUsd <= 0) continue
    const pnlPct = ((price - h.costUsd) / h.costUsd) * 100
    if (pnlPct >= 50) {
      results.push({
        id: `pnlAlert:${h.ticker}`,
        severity: 'warning',
        rule: 'pnlAlert',
        title: `${h.ticker} up ${pnlPct.toFixed(0)}%`,
        body: `${h.ticker} is +${pnlPct.toFixed(1)}% above cost. Consider taking partial profits.`,
        createdAt: now,
      })
    }
  }

  // --- Catalyst within 14 days ---
  for (const h of satellite) {
    if (!h.catalyst || !h.catalyst_date || !h.shares) continue
    const daysUntil = Math.floor(
      (new Date(h.catalyst_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysUntil >= 0 && daysUntil <= 14) {
      results.push({
        id: `catalyst:${h.ticker}`,
        severity: 'info',
        rule: 'catalyst',
        title: `${h.ticker}: ${h.catalyst} in ${daysUntil}d`,
        body: `${h.ticker} has a catalyst event "${h.catalyst}" on ${h.catalyst_date}.`,
        createdAt: now,
      })
    }
  }

  // --- Position count exceeds limit ---
  const activeCount = satellite.filter((h) => h.shares > 0).length
  if (activeCount > positionLimit) {
    results.push({
      id: 'positionCount',
      severity: 'info',
      rule: 'positionCount',
      title: `${activeCount} positions (limit: ${positionLimit})`,
      body: `You have ${activeCount} active satellite positions. Your configured limit is ${positionLimit}.`,
      createdAt: now,
    })
  }

  // --- Cash reserve below 10% ---
  if (satTotal > 0) {
    const cashPct = (satelliteCashThb / satTotal) * 100
    if (cashPct < 10) {
      results.push({
        id: 'cashReserve',
        severity: 'warning',
        rule: 'cashReserve',
        title: `Cash reserve low: ${cashPct.toFixed(1)}%`,
        body: `Satellite cash is ${cashPct.toFixed(1)}% of portfolio (below 10% threshold).`,
        createdAt: now,
      })
    }
  }

  // --- Unassigned positions ---
  const unassigned = satellite.filter((h) => h.shares > 0 && !h.category_id)
  if (unassigned.length > 0 && categoryConfigs.length > 0) {
    results.push({
      id: 'unassigned',
      severity: 'info',
      rule: 'unassigned',
      title: `${unassigned.length} unassigned position${unassigned.length > 1 ? 's' : ''}`,
      body: `${unassigned.map((h) => h.ticker).join(', ')} ${unassigned.length > 1 ? 'are' : 'is'} not assigned to a category and excluded from rebalancing.`,
      createdAt: now,
    })
  }

  // Sort: danger → warning → info
  const order: Record<string, number> = { danger: 0, warning: 1, info: 2 }
  return results.sort((a, b) => order[a.severity] - order[b.severity])
}
