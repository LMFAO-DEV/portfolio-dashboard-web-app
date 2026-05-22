import { useMemo } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { Badge } from '../components/ui/Badge'
import { DualBar } from '../components/ui/DualBar'
import { fmtThbRaw, fmtPctRaw } from '../utils/format'

const CORE_TARGETS: Record<string, number> = { VOO: 50, SCHD: 35, VXUS: 10, 'MTS-GOLD': 5 }
const SAT_TARGETS = { coreGrowth: 60, smallCapAI: 20, cash: 20 }
const CORE_GROWTH_TICKERS = ['MSFT', 'AMZN', 'META', 'ORCL', 'COST', 'CRWV']

function getTone(gap: number): 'success' | 'warning' | 'danger' {
  const abs = Math.abs(gap)
  if (abs <= 3) return 'success'
  if (abs <= 8) return 'warning'
  return 'danger'
}

function getStatusLabel(gap: number, t: ReturnType<typeof useStrings>) {
  const abs = Math.abs(gap)
  if (abs <= 3) return { label: t.onTarget, variant: 'success' as const }
  if (gap > 0) return { label: abs <= 8 ? t.warning : t.overweight, variant: abs <= 8 ? 'warning' as const : 'danger' as const }
  return { label: abs <= 8 ? t.warning : t.underweight, variant: abs <= 8 ? 'warning' as const : 'danger' as const }
}

interface AllocationRowProps {
  name: string
  target: number
  actual: number
  valueThb: number
  totalThb: number
  t: ReturnType<typeof useStrings>
}

function AllocationRow({ name, target, actual, totalThb, t }: AllocationRowProps) {
  const gap = actual - target
  const tone = getTone(gap)
  const { label, variant } = getStatusLabel(gap, t)
  const actionThb = Math.abs(gap / 100) * totalThb

  return (
    <div className="py-3 border-b border-surface-border/50 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-sm text-white">{name}</span>
          <span className="text-xs text-faint">target {target}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white">{fmtPctRaw(actual)}</span>
          <Badge variant={variant} size="sm">{label}</Badge>
        </div>
      </div>
      <DualBar actual={actual} target={target} tone={tone} />
      {Math.abs(gap) > 3 && (
        <p className="mt-1.5 text-xs text-faint">
          → {gap < 0
            ? <span className="text-gain">{t.buy}</span>
            : <span className="text-loss">{t.trim}</span>
          } {fmtThbRaw(actionThb, true)}
        </p>
      )}
    </div>
  )
}

interface RebalanceProps {
  prices: Record<string, number>
  fxRate: number
}

export function Rebalance({ prices, fxRate }: RebalanceProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)

  const { coreRows, coreTotal, satBuckets, satTotal, total, actions } = useMemo(() => {
    const coreRows = core.map((h) => {
      const valThb = h.isTHB
        ? h.shares * mtsGoldNav.value
        : h.shares * (prices[h.ticker] ?? 0) * fxRate
      return { ticker: h.ticker, valThb }
    })
    const coreTotal = coreRows.reduce((s, r) => s + r.valThb, 0)

    const coreGrowthThb = satellite
      .filter((h) => CORE_GROWTH_TICKERS.includes(h.ticker))
      .reduce((s, h) => s + h.shares * (prices[h.ticker] ?? 0) * fxRate, 0)
    const smallCapAiThb = satellite
      .filter((h) => !CORE_GROWTH_TICKERS.includes(h.ticker) && h.ticker !== 'NBIS')
      .concat(satellite.filter((h) => h.ticker === 'NBIS'))
      .reduce((s, h) => s + h.shares * (prices[h.ticker] ?? 0) * fxRate, 0)
    const satTotal = coreGrowthThb + smallCapAiThb + satelliteCashThb

    const satBuckets = [
      { name: t.coreGrowth, target: SAT_TARGETS.coreGrowth, valThb: coreGrowthThb },
      { name: t.smallCapAI, target: SAT_TARGETS.smallCapAI, valThb: smallCapAiThb },
      { name: t.cashReserve, target: SAT_TARGETS.cash, valThb: satelliteCashThb },
    ]

    const total = coreTotal + satTotal

    const actions: { type: 'buy' | 'trim'; asset: string; amtThb: number; reason: string }[] = []

    for (const [ticker, targetPct] of Object.entries(CORE_TARGETS)) {
      const valThb = coreRows.find((r) => r.ticker === ticker)?.valThb ?? 0
      const actual = coreTotal > 0 ? (valThb / coreTotal) * 100 : 0
      const gap = actual - targetPct
      if (Math.abs(gap) > 3) {
        const amtThb = Math.abs(gap / 100) * coreTotal
        actions.push({
          type: gap < 0 ? 'buy' : 'trim',
          asset: ticker,
          amtThb,
          reason: `${ticker} ${gap < 0 ? 'under' : 'over'} target (${actual.toFixed(0)}% vs ${targetPct}%)`,
        })
      }
    }

    for (const b of satBuckets) {
      const actual = satTotal > 0 ? (b.valThb / satTotal) * 100 : 0
      const gap = actual - b.target
      if (Math.abs(gap) > 3) {
        const amtThb = Math.abs(gap / 100) * satTotal
        actions.push({
          type: gap < 0 ? 'buy' : 'trim',
          asset: b.name,
          amtThb,
          reason: `${b.name} ${gap < 0 ? 'under' : 'over'} target (${actual.toFixed(0)}% vs ${b.target}%)`,
        })
      }
    }

    actions.sort((a, b) => b.amtThb - a.amtThb)

    return { coreRows, coreTotal, satBuckets, satTotal, total, actions }
  }, [core, satellite, prices, fxRate, mtsGoldNav, satelliteCashThb, t])

  const corePct = total > 0 ? (coreTotal / total) * 100 : 50
  const satPct = 100 - corePct
  const splitGap = Math.abs(corePct - 50)
  const splitTone = splitGap <= 5 ? 'success' : splitGap <= 10 ? 'warning' : 'danger'
  const splitLabel = splitGap <= 5 ? t.onTarget : splitGap <= 10 ? t.warning : t.actionRequired

  return (
    <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
      <h1 className="font-bold text-lg text-white">{t.rebalanceTracker}</h1>

      {/* Split overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface border border-surface-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-wide">{t.corePort}</p>
          <p className="text-xl font-bold font-mono text-white mt-1.5">{fmtThbRaw(coreTotal, true)}</p>
          <p className="text-xs text-faint mt-0.5">{fmtPctRaw(corePct)} of total</p>
        </div>
        <div className="bg-surface border border-surface-border rounded-xl p-4">
          <p className="text-xs text-muted uppercase tracking-wide">{t.satellitePort}</p>
          <p className="text-xl font-bold font-mono text-white mt-1.5">{fmtThbRaw(satTotal, true)}</p>
          <p className="text-xs text-faint mt-0.5">{fmtPctRaw(satPct)} of total</p>
        </div>
        <div className="bg-surface border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted uppercase tracking-wide">{t.portSplit}</p>
            <Badge variant={splitTone} size="sm">{splitLabel}</Badge>
          </div>
          <p className="text-lg font-bold font-mono text-white mt-1.5">
            {corePct.toFixed(0)}:{satPct.toFixed(0)}
          </p>
          <div className="mt-2 relative h-2 bg-surface-border rounded-full overflow-visible">
            <div className="h-full bg-accent rounded-l-full" style={{ width: `${corePct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-loss rounded-sm" style={{ left: '50%' }} />
          </div>
          <p className="text-xs text-faint mt-1">Target 50:50</p>
        </div>
      </div>

      {/* Core + Satellite panels */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 bg-surface border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm text-white">{t.coreAlloc}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gain/10 text-gain border border-gain/20">Core</span>
          </div>
          <p className="text-xs text-faint mb-4">Total: {fmtThbRaw(coreTotal, true)}</p>
          {Object.entries(CORE_TARGETS).map(([ticker, targetPct]) => {
            const valThb = coreRows.find((r) => r.ticker === ticker)?.valThb ?? 0
            const actual = coreTotal > 0 ? (valThb / coreTotal) * 100 : 0
            return (
              <AllocationRow
                key={ticker}
                name={ticker}
                target={targetPct}
                actual={actual}
                valueThb={valThb}
                totalThb={coreTotal}
                t={t}
              />
            )
          })}
        </div>

        <div className="flex-1 bg-surface border border-surface-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm text-white">{t.satelliteAlloc}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Satellite</span>
          </div>
          <p className="text-xs text-faint mb-4">Total: {fmtThbRaw(satTotal, true)}</p>
          {satBuckets.map((b) => {
            const actual = satTotal > 0 ? (b.valThb / satTotal) * 100 : 0
            return (
              <AllocationRow
                key={b.name}
                name={b.name}
                target={b.target}
                actual={actual}
                valueThb={b.valThb}
                totalThb={satTotal}
                t={t}
              />
            )
          })}
        </div>
      </div>

      {/* Action List */}
      <div className="bg-surface border border-surface-border rounded-xl p-4">
        <h3 className="font-semibold text-sm text-white mb-3">{t.actionList}</h3>
        {actions.length === 0 ? (
          <p className="text-sm text-gain flex items-center gap-2">
            <span>✓</span> {t.noActionNeeded}
          </p>
        ) : (
          <div className="space-y-1">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-surface-border/50 last:border-0 hover:bg-surface-raised/40 rounded-lg px-2 transition-colors">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  a.type === 'buy'
                    ? 'bg-gain/10 text-gain border-gain/20'
                    : 'bg-loss/10 text-loss border-loss/20'
                }`}>
                  {a.type === 'buy' ? t.buy : t.trim}
                </span>
                <span className="font-mono font-semibold text-sm text-white">{a.asset}</span>
                <span className="font-mono font-bold text-sm text-white">{fmtThbRaw(a.amtThb, true)}</span>
                <span className="text-xs text-faint flex-1">{a.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
