import type { Holding, MtsGoldNav, Transaction } from '../types'

export function calcMktValueThb(shares: number, priceUsd: number, fxRate: number): number {
  return shares * priceUsd * fxRate
}

/** Single source of truth for portfolio totals in THB. */
export function computeTotals(
  satellite: Holding[],
  core: Holding[],
  prices: Record<string, number>,
  fxRate: number,
  mtsGoldNav: MtsGoldNav,
  satelliteCashThb: number,
  coreCashThb: number,
): { totalThb: number; coreThb: number; satThb: number } {
  const satEquity = satellite.reduce((s, h) => {
    if (!h.shares) return s
    return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
  }, 0)
  const coreEquity = core.reduce((s, h) => {
    if (!h.shares) return s
    if (h.isTHB) return s + h.shares * (h.navThb ?? mtsGoldNav.value)
    return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
  }, 0)
  const satThb = satEquity + satelliteCashThb
  const coreThb = coreEquity + coreCashThb
  return { totalThb: satThb + coreThb, coreThb, satThb }
}

export function calcPnlThb(shares: number, costUsd: number, priceUsd: number, fxRate: number): number {
  return (priceUsd - costUsd) * shares * fxRate
}

export function calcPnlPct(costPerUnit: number, currentPerUnit: number): number {
  if (costPerUnit === 0) return 0
  return ((currentPerUnit - costPerUnit) / costPerUnit) * 100
}

export interface DerivedPosition {
  shares: number
  avgCostUsd: number
  avgCostThb: number // per-unit, THB assets
  totalInvestedThb: number // remaining cost basis in THB (entry-time FX)
  entryFxRate: number // weighted-avg USD/THB at buy time
  realizedPnlThb: number
}

/**
 * Average-cost derivation of a position from its transaction history.
 * Realized P&L is in THB and includes FX effect (proceeds at sell FX − cost basis at buy FX).
 */
export function derivePosition(txs: Transaction[]): DerivedPosition {
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))
  let shares = 0
  let costPoolUsd = 0
  let costPoolThb = 0
  let fxWeighted = 0
  let realizedPnlThb = 0

  for (const tx of sorted) {
    const isThb = tx.isTHB
    const price = isThb ? (tx.priceThb ?? 0) : (tx.priceUsd ?? 0)
    const fx = isThb ? 1 : (tx.fxRate ?? 0)
    const fee = tx.feeThb ?? 0

    if (tx.type === 'buy') {
      shares += tx.shares
      costPoolUsd += tx.shares * price
      costPoolThb += tx.shares * price * fx + fee
      fxWeighted += tx.shares * fx
    } else {
      if (shares <= 0) continue
      const frac = Math.min(1, tx.shares / shares)
      const costBasisRemoved = costPoolThb * frac
      const proceeds = tx.shares * price * fx - fee
      realizedPnlThb += proceeds - costBasisRemoved
      costPoolUsd *= 1 - frac
      costPoolThb *= 1 - frac
      fxWeighted *= 1 - frac
      shares -= tx.shares
    }
  }

  if (shares < 1e-9) shares = 0
  return {
    shares,
    avgCostUsd: shares > 0 ? costPoolUsd / shares : 0,
    avgCostThb: shares > 0 ? costPoolThb / shares : 0,
    totalInvestedThb: shares > 0 ? costPoolThb : 0,
    entryFxRate: shares > 0 ? fxWeighted / shares : 0,
    realizedPnlThb,
  }
}

/**
 * Split a USD holding's THB P&L into asset effect vs FX effect.
 * Returns nulls-friendly zeros when entry FX is unknown.
 */
export function fxAttribution(
  shares: number, costUsd: number, priceUsd: number, entryFxRate: number, fxNow: number,
): { assetThb: number; fxThb: number } {
  if (!shares || !entryFxRate || !fxNow) return { assetThb: 0, fxThb: 0 }
  const assetThb = (priceUsd - costUsd) * shares * entryFxRate
  const fxThb = (fxNow - entryFxRate) * shares * priceUsd
  return { assetThb, fxThb }
}

/** Bear / base / bull projection series (+ optional inflation discounting to real THB). */
export function buildScenarioSeries(
  pv: number, pmt: number, baseRate: number, years: number, spread: number, inflationPct: number,
): { year: number; bear: number; base: number; bull: number; invested: number }[] {
  const series: { year: number; bear: number; base: number; bull: number; invested: number }[] = []
  const bearRate = Math.max(0, baseRate - spread)
  const bullRate = baseRate + spread
  for (let y = 0; y <= years; y++) {
    const discount = inflationPct > 0 ? Math.pow(1 + inflationPct / 100, y) : 1
    series.push({
      year: new Date().getFullYear() + y,
      bear: calcFV(pv, pmt, bearRate, y) / discount,
      base: calcFV(pv, pmt, baseRate, y) / discount,
      bull: calcFV(pv, pmt, bullRate, y) / discount,
      invested: pv + pmt * 12 * y,
    })
  }
  return series
}

/** FV = PV*(1+r/12)^(n*12) + PMT*[((1+r/12)^(n*12)-1)/(r/12)] */
export function calcFV(pv: number, pmt: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (r === 0) return pv + pmt * n
  const factor = Math.pow(1 + r, n)
  return pv * factor + pmt * ((factor - 1) / r)
}

/** Required PMT to hit target */
export function calcRequiredPmt(target: number, pv: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (r === 0) return (target - pv) / Math.max(n, 1)
  const factor = Math.pow(1 + r, n)
  return ((target - pv * factor) * r) / (factor - 1)
}

/** Year (from now) when portfolio first hits milestone; 0 = already reached; null = not in horizon */
export function calcMilestoneYear(
  pv: number,
  pmt: number,
  annualRatePct: number,
  maxYears: number,
  milestone: number,
): number | null {
  if (pv >= milestone) return 0
  for (let y = 1; y <= maxYears; y++) {
    if (calcFV(pv, pmt, annualRatePct, y) >= milestone) return y
  }
  return null
}

/** Build year-by-year series for the growth chart */
export function buildGrowthSeries(
  pv: number,
  pmt: number,
  annualRatePct: number,
  years: number,
): { year: number; projected: number; invested: number }[] {
  const series: { year: number; projected: number; invested: number }[] = []
  for (let y = 0; y <= years; y++) {
    series.push({
      year: new Date().getFullYear() + y,
      projected: calcFV(pv, pmt, annualRatePct, y),
      invested: pv + pmt * 12 * y,
    })
  }
  return series
}
