import { useMemo } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { Badge } from '../components/ui/Badge'
import { DualBar } from '../components/ui/DualBar'
import { fmtThbRaw, fmtPctRaw } from '../utils/format'

/** Route a monthly DCA budget into the most underweight buckets first (no selling). */
function allocateDca(
  budget: number,
  buckets: { name: string; actualPct: number; targetPct: number }[],
): { plan: { asset: string; amtThb: number }[]; allOnTarget: boolean } {
  if (budget <= 0) return { plan: [], allOnTarget: false }
  const under = buckets
    .map((b) => ({ name: b.name, gap: Math.max(0, b.targetPct - b.actualPct) }))
    .filter((b) => b.gap > 0)
  const totalGap = under.reduce((s, b) => s + b.gap, 0)
  if (totalGap > 0) {
    return {
      plan: under
        .map((b) => ({ asset: b.name, amtThb: budget * (b.gap / totalGap) }))
        .filter((p) => p.amtThb >= 1)
        .sort((a, b) => b.amtThb - a.amtThb),
      allOnTarget: false,
    }
  }
  const totalTarget = buckets.reduce((s, b) => s + b.targetPct, 0)
  if (totalTarget <= 0) return { plan: [], allOnTarget: true }
  return {
    plan: buckets
      .map((b) => ({ asset: b.name, amtThb: budget * (b.targetPct / totalTarget) }))
      .filter((p) => p.amtThb >= 1)
      .sort((a, b) => b.amtThb - a.amtThb),
    allOnTarget: true,
  }
}

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
    <div className="py-3 border-b border-hairline last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-light text-sm text-ink">{name}</span>
          <span className="tabular text-xs text-ink-mute">target {target}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular text-sm text-ink">{fmtPctRaw(actual)}</span>
          <Badge variant={variant} size="sm">{label}</Badge>
        </div>
      </div>
      <DualBar actual={actual} target={target} tone={tone} />
      {Math.abs(gap) > 3 && (
        <p className="mt-1.5 tabular text-xs text-ink-mute">
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
  const coreCashThb = usePortfolioStore((s) => s.coreCashThb)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const satTargets = usePortfolioStore((s) => s.satTargets)
  const dca = usePortfolioStore((s) => s.dca)

  const { coreRows, coreTotal, satBuckets, satTotal, total, actions } = useMemo(() => {
    const coreRows = core.map((h) => {
      const valThb = h.isTHB
        ? h.shares * (h.navThb ?? mtsGoldNav.value)
        : h.shares * (prices[h.ticker] ?? 0) * fxRate
      return { ticker: h.ticker, valThb, targetPct: h.targetPct ?? 0 }
    })
    const coreEquityThb = coreRows.reduce((s, r) => s + r.valThb, 0)
    const coreTotal = coreEquityThb + coreCashThb

    const satVal = (group: string) =>
      satellite
        .filter((h) => h.satGroup === group)
        .reduce((s, h) => s + h.shares * (prices[h.ticker] ?? 0) * fxRate, 0)

    const coreGrowthThb = satVal('coreGrowth')
    const smallCapAiThb = satVal('smallCapAI')
    const defensiveThb = satVal('defensive')
    const satTotal = coreGrowthThb + smallCapAiThb + defensiveThb + satelliteCashThb

    const satBuckets = [
      { name: t.coreGrowth, target: satTargets.coreGrowth, valThb: coreGrowthThb },
      { name: t.smallCapAI, target: satTargets.smallCapAI, valThb: smallCapAiThb },
      { name: t.defensive, target: satTargets.defensive, valThb: defensiveThb },
      { name: t.cashReserve, target: satTargets.cash, valThb: satelliteCashThb },
    ]

    const total = coreTotal + satTotal

    const actions: { type: 'buy' | 'trim'; asset: string; amtThb: number; reason: string }[] = []

    for (const row of coreRows) {
      const actual = coreTotal > 0 ? (row.valThb / coreTotal) * 100 : 0
      const gap = actual - row.targetPct
      if (row.targetPct > 0 && Math.abs(gap) > 3) {
        const amtThb = Math.abs(gap / 100) * coreTotal
        actions.push({
          type: gap < 0 ? 'buy' : 'trim',
          asset: row.ticker,
          amtThb,
          reason: `${row.ticker} ${gap < 0 ? 'under' : 'over'} target (${actual.toFixed(0)}% vs ${row.targetPct}%)`,
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
  }, [core, satellite, prices, fxRate, mtsGoldNav, satelliteCashThb, coreCashThb, satTargets, t])

  const corePct = total > 0 ? (coreTotal / total) * 100 : 50
  const satPct = 100 - corePct
  const splitGap = Math.abs(corePct - 50)
  const splitTone = splitGap <= 5 ? 'success' : splitGap <= 10 ? 'warning' : 'danger'
  const splitLabel = splitGap <= 5 ? t.onTarget : splitGap <= 10 ? t.warning : t.actionRequired

  const coreDca = allocateDca(
    dca.coreMonthlyThb,
    coreRows.map((r) => ({
      name: r.ticker,
      actualPct: coreTotal > 0 ? (r.valThb / coreTotal) * 100 : 0,
      targetPct: r.targetPct,
    })),
  )
  const satDca = allocateDca(
    dca.satelliteMonthlyThb,
    satBuckets.map((b) => ({
      name: b.name,
      actualPct: satTotal > 0 ? (b.valThb / satTotal) * 100 : 0,
      targetPct: b.target,
    })),
  )
  const hasDcaPlan = coreDca.plan.length > 0 || satDca.plan.length > 0

  return (
    <div className="p-5 sm:p-6 space-y-5 max-w-screen-xl mx-auto">
      <h1 className="font-light text-2xl text-ink tracking-[-0.02em]">{t.rebalanceTracker}</h1>

      {/* Split overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
          <p className="text-[10px] text-ink-mute uppercase tracking-[0.08em] font-normal">{t.corePort}</p>
          <p className="tabular text-[22px] font-light text-ink mt-3 leading-none tracking-[-0.02em]">{fmtThbRaw(coreTotal, true)}</p>
          <p className="tabular text-xs text-ink-mute mt-2">{fmtPctRaw(corePct)} of total</p>
        </div>
        <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
          <p className="text-[10px] text-ink-mute uppercase tracking-[0.08em] font-normal">{t.satellitePort}</p>
          <p className="tabular text-[22px] font-light text-ink mt-3 leading-none tracking-[-0.02em]">{fmtThbRaw(satTotal, true)}</p>
          <p className="tabular text-xs text-ink-mute mt-2">{fmtPctRaw(satPct)} of total</p>
        </div>
        <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-ink-mute uppercase tracking-[0.08em] font-normal">{t.portSplit}</p>
            <Badge variant={splitTone} size="sm">{splitLabel}</Badge>
          </div>
          <p className="tabular text-[22px] font-light text-ink mt-3 leading-none tracking-[-0.02em]">
            {corePct.toFixed(0)}:{satPct.toFixed(0)}
          </p>
          <div className="mt-2 relative h-1.5 rounded-full overflow-visible bg-hairline">
            <div className="h-full bg-primary rounded-l-full" style={{ width: `${corePct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-ink-mute rounded-xs" style={{ left: '50%' }} />
          </div>
          <p className="tabular text-xs text-ink-mute mt-1.5">Target 50:50</p>
        </div>
      </div>

      {/* Core + Satellite panels */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
        <div className="flex-1 bg-canvas rounded-xl border border-hairline shadow-panel p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.coreAlloc}</h3>
            <span className="text-[10px] px-2.5 py-1 rounded-pill font-normal text-gain bg-gain/10 border border-gain/20">
              Core
            </span>
          </div>
          <p className="tabular text-xs text-ink-mute mb-4">Total: {fmtThbRaw(coreTotal, true)}</p>
          {coreRows.map((row) => {
            const actual = coreTotal > 0 ? (row.valThb / coreTotal) * 100 : 0
            return (
              <AllocationRow
                key={row.ticker}
                name={row.ticker}
                target={row.targetPct}
                actual={actual}
                valueThb={row.valThb}
                totalThb={coreTotal}
                t={t}
              />
            )
          })}
        </div>

        <div className="flex-1 bg-canvas rounded-xl border border-hairline shadow-panel p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.satelliteAlloc}</h3>
            <span className="text-[10px] px-2.5 py-1 rounded-pill font-normal text-primary-deep bg-primary-subdued">
              Satellite
            </span>
          </div>
          <p className="tabular text-xs text-ink-mute mb-4">Total: {fmtThbRaw(satTotal, true)}</p>
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
      <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
        <h3 className="font-light text-[15px] text-ink tracking-[-0.01em] mb-4">{t.actionList}</h3>
        {actions.length === 0 ? (
          <p className="text-sm text-gain flex items-center gap-2">
            <span>✓</span> {t.noActionNeeded}
          </p>
        ) : (
          <div>
            {actions.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 px-2 border-b border-hairline last:border-0 transition-colors hover:bg-canvas-soft"
              >
                <span
                  className={`px-2.5 py-0.5 rounded-pill text-xs font-normal border ${
                    a.type === 'buy'
                      ? 'bg-gain/10 text-gain border-gain/25'
                      : 'bg-loss/10 text-loss border-loss/25'
                  }`}
                >
                  {a.type === 'buy' ? t.buy : t.trim}
                </span>
                <span className="font-light text-sm text-ink">{a.asset}</span>
                <span className="tabular font-light text-sm text-ink">{fmtThbRaw(a.amtThb, true)}</span>
                <span className="tabular text-xs text-ink-mute flex-1">{a.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DCA Allocator */}
      {hasDcaPlan && (
        <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
          <h3 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.dcaPlan}</h3>
          <p className="text-xs text-ink-mute mt-1 mb-4">{t.dcaPlanDesc}</p>

          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            {coreDca.plan.length > 0 && (
              <div className="flex-1">
                <p className="text-[10px] text-ink-mute uppercase tracking-widest mb-2">
                  {t.dcaCoreBudget} · {fmtThbRaw(dca.coreMonthlyThb)}
                </p>
                {coreDca.allOnTarget && (
                  <p className="text-xs text-ink-mute mb-2">{t.dcaAllOnTarget}</p>
                )}
                {coreDca.plan.map((p) => (
                  <div key={p.asset} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                    <span className="px-2.5 py-0.5 rounded-pill text-xs font-normal border bg-gain/10 text-gain border-gain/25">
                      {t.addLabel}
                    </span>
                    <span className="font-light text-sm text-ink flex-1">{p.asset}</span>
                    <span className="tabular font-light text-sm text-ink">{fmtThbRaw(p.amtThb, true)}</span>
                  </div>
                ))}
              </div>
            )}

            {satDca.plan.length > 0 && (
              <div className="flex-1">
                <p className="text-[10px] text-ink-mute uppercase tracking-widest mb-2">
                  {t.dcaSatBudget} · {fmtThbRaw(dca.satelliteMonthlyThb)}
                </p>
                {satDca.allOnTarget && (
                  <p className="text-xs text-ink-mute mb-2">{t.dcaAllOnTarget}</p>
                )}
                {satDca.plan.map((p) => (
                  <div key={p.asset} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                    <span className="px-2.5 py-0.5 rounded-pill text-xs font-normal border bg-primary-subdued text-primary-deep border-primary/25">
                      {t.addLabel}
                    </span>
                    <span className="font-light text-sm text-ink flex-1">{p.asset}</span>
                    <span className="tabular font-light text-sm text-ink">{fmtThbRaw(p.amtThb, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
