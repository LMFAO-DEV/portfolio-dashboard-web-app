export function calcMktValueThb(shares: number, priceUsd: number, fxRate: number): number {
  return shares * priceUsd * fxRate
}

export function calcPnlThb(shares: number, costUsd: number, priceUsd: number, fxRate: number): number {
  return (priceUsd - costUsd) * shares * fxRate
}

export function calcPnlPct(costPerUnit: number, currentPerUnit: number): number {
  if (costPerUnit === 0) return 0
  return ((currentPerUnit - costPerUnit) / costPerUnit) * 100
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
