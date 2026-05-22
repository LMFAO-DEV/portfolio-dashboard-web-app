import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { Skeleton } from '../components/ui/Skeleton'
import { fmtThb, fmtThbRaw, fmtUsd, fmtPct, fmtPctRaw, fmtTime } from '../utils/format'
import { copyToClipboard, buildCopyForClaude } from '../utils/copyForClaude'

const SEG_COLORS = [
  '#3861fb', '#16c784', '#f59e0b', '#8b5cf6',
  '#0ea5e9', '#ea3943', '#64748b',
]

interface PortfolioProps {
  prices: Record<string, number>
  fxRate: number
  isLoading: boolean
  isError: boolean
  lastUpdated: string
  onCopyStateChange: (state: 'idle' | 'copied') => void
}

function MetricTile({
  label, value, sub, className = '',
}: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-surface-border rounded-xl p-4 ${className}`}>
      <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
      <div className="mt-1.5 text-xl font-bold font-mono text-white truncate">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-faint">{sub}</div>}
    </div>
  )
}

function PnlCell({ value, pct, isLoading }: { value: string; pct: string; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <td className="px-3 py-3 whitespace-nowrap">
        <Skeleton width="w-16" height="h-4" />
      </td>
    )
  }
  const isPos = value.startsWith('+')
  const isNeg = value.startsWith('−')
  const cls = isPos ? 'text-gain' : isNeg ? 'text-loss' : 'text-muted'
  const arrow = isPos ? '▲' : isNeg ? '▼' : ''
  return (
    <td className={`px-3 py-3 font-mono text-sm whitespace-nowrap ${cls}`}>
      <div className="flex items-center gap-1">
        {arrow && <span className="text-xs">{arrow}</span>}
        <span>{value}</span>
      </div>
      <div className="text-xs opacity-70 mt-0.5">{pct}</div>
    </td>
  )
}

function TickerBadge({ ticker }: { ticker: string }) {
  const colors: Record<string, string> = {
    MSFT: 'bg-blue-500/15 text-blue-400',
    AMZN: 'bg-amber-500/15 text-amber-400',
    META: 'bg-blue-600/15 text-blue-300',
    ORCL: 'bg-red-500/15 text-red-400',
    COST: 'bg-emerald-500/15 text-emerald-400',
    CRWV: 'bg-violet-500/15 text-violet-400',
    NBIS: 'bg-slate-500/15 text-slate-400',
    VOO: 'bg-indigo-500/15 text-indigo-400',
    SCHD: 'bg-teal-500/15 text-teal-400',
    VXUS: 'bg-cyan-500/15 text-cyan-400',
    'MTS-GOLD': 'bg-yellow-500/15 text-yellow-400',
  }
  const cls = colors[ticker] ?? 'bg-white/10 text-white'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${cls}`}>
      {ticker}
    </span>
  )
}

export function Portfolio({
  prices, fxRate, isLoading, isError, lastUpdated, onCopyStateChange,
}: PortfolioProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)

  // Satellite calculations
  const satRows = satellite.map((h) => {
    const price = prices[h.ticker]
    const mktValThb = h.shares && price ? h.shares * price * fxRate : 0
    const pnlThb = h.shares && price && h.costUsd
      ? (price - h.costUsd) * h.shares * fxRate : 0
    const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
    return { ...h, price, mktValThb, pnlThb, pnlPct }
  })

  const satEquityThb = satRows.reduce((s, r) => s + r.mktValThb, 0)
  const satTotalThb = satEquityThb + satelliteCashThb

  // Core calculations
  const coreRows = core.map((h) => {
    if (h.isTHB) {
      const nav = mtsGoldNav.value
      const cost = h.costThb ?? 0
      const mktValThb = h.shares * nav
      const pnlThb = (nav - cost) * h.shares
      const pnlPct = cost ? ((nav - cost) / cost) * 100 : 0
      return { ...h, price: nav, mktValThb, pnlThb, pnlPct }
    }
    const price = prices[h.ticker]
    const mktValThb = h.shares && price ? h.shares * price * fxRate : 0
    const pnlThb = h.shares && price && h.costUsd
      ? (price - h.costUsd) * h.shares * fxRate : 0
    const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
    return { ...h, price, mktValThb, pnlThb, pnlPct }
  })

  const coreTotalThb = coreRows.reduce((s, r) => s + r.mktValThb, 0)
  const totalThb = satTotalThb + coreTotalThb
  const totalCostUsd = [...satellite, ...core].reduce((s, h) => {
    if (h.isTHB) return s + (h.costThb ?? 0) / Math.max(fxRate, 1)
    return s + (h.costUsd ?? 0) * (h.shares ?? 0)
  }, 0)
  const totalPnlThb = [...satRows, ...coreRows].reduce((s, r) => s + r.pnlThb, 0)
  const totalPnlPct = totalCostUsd && fxRate ? (totalPnlThb / (totalCostUsd * fxRate)) * 100 : 0

  // Weight segments for stacked bar
  const weightSegs = [
    ...satRows
      .filter((r) => r.shares > 0)
      .map((r, i) => ({
        ticker: r.ticker,
        pct: satTotalThb > 0 ? (r.mktValThb / satTotalThb) * 100 : 0,
        color: SEG_COLORS[i % SEG_COLORS.length],
      })),
    {
      ticker: t.cashReserve,
      pct: satTotalThb > 0 ? (satelliteCashThb / satTotalThb) * 100 : 0,
      color: '#2b2f45',
    },
  ]

  const lastUpdatedTime = lastUpdated ? fmtTime(new Date(lastUpdated)) : '—'

  async function handleCopy() {
    const text = buildCopyForClaude(satellite, core, satelliteCashThb, mtsGoldNav, prices, fxRate, lang)
    const ok = await copyToClipboard(text)
    if (ok) {
      onCopyStateChange('copied')
      setTimeout(() => onCopyStateChange('idle'), 2000)
    }
  }

  const Num = ({ v }: { v: React.ReactNode }) =>
    isLoading ? <Skeleton width="w-20" height="h-5" /> : <>{v}</>

  const thClass = 'px-3 py-2.5 text-left text-xs font-medium text-faint uppercase tracking-wide whitespace-nowrap'
  const tdBase = 'px-3 py-3 text-sm whitespace-nowrap'

  return (
    <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
      {/* Error banner */}
      {isError && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm px-4 py-2.5 rounded-xl">
          {t.fetchError}
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          label={t.totalValue}
          value={<Num v={fmtThbRaw(totalThb, true)} />}
        />
        <MetricTile
          label={t.profitLoss}
          value={
            <Num v={
              <span className={totalPnlThb >= 0 ? 'text-gain' : 'text-loss'}>
                {totalPnlThb >= 0 ? '▲ ' : '▼ '}{fmtThb(totalPnlThb)}
              </span>
            } />
          }
        />
        <MetricTile
          label={t.pnlPct}
          value={
            <Num v={
              <span className={totalPnlPct >= 0 ? 'text-gain' : 'text-loss'}>
                {fmtPct(totalPnlPct)}
              </span>
            } />
          }
        />
        <MetricTile
          label={t.fxRate}
          value={<Num v={fxRate ? fxRate.toFixed(2) : '—'} />}
          sub={lastUpdated ? `${t.lastUpdated} ${lastUpdatedTime}` : undefined}
        />
      </div>

      {/* Satellite + Weight side by side */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Satellite Holdings Table */}
        <div className="flex-1 bg-surface border border-surface-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-white">{t.satelliteHoldings}</h2>
              <p className="text-xs text-faint mt-0.5">{fmtThbRaw(satTotalThb, true)}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-accent/15 text-accent border border-accent/20 font-medium">Satellite</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/50">
                  {[t.colTicker, t.colShares, t.colCost, t.colPrice, t.colMktVal, t.colPnl].map((h) => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satRows.map((r) => (
                  <tr
                    key={r.ticker}
                    className="border-b border-surface-border/50 last:border-0 hover:bg-surface-raised/60 transition-colors"
                  >
                    <td className={`${tdBase} font-mono font-bold`}>
                      {r.shares > 0
                        ? <TickerBadge ticker={r.ticker} />
                        : <span className="text-faint font-mono text-xs">{r.ticker}</span>
                      }
                    </td>
                    <td className={`${tdBase} font-mono text-muted`}>
                      {r.shares ? r.shares.toFixed(4) : '—'}
                    </td>
                    <td className={`${tdBase} font-mono text-faint`}>
                      {fmtUsd(r.costUsd ?? 0)}
                    </td>
                    <td className={`${tdBase} font-mono font-semibold text-white`}>
                      {isLoading ? <Skeleton width="w-16" height="h-4" /> : fmtUsd(r.price ?? 0)}
                    </td>
                    <td className={`${tdBase} font-mono text-muted`}>
                      {isLoading ? <Skeleton width="w-20" height="h-4" /> : fmtThbRaw(r.mktValThb, true)}
                    </td>
                    <PnlCell
                      value={fmtThb(r.pnlThb)}
                      pct={fmtPct(r.pnlPct)}
                      isLoading={isLoading && r.shares > 0}
                    />
                  </tr>
                ))}
                {/* Cash row */}
                <tr className="border-t border-surface-border bg-surface-raised/40">
                  <td className={`${tdBase} text-muted font-medium`} colSpan={4}>
                    {t.cashReserve}
                  </td>
                  <td className={`${tdBase} font-mono text-muted`}>{fmtThbRaw(satelliteCashThb)}</td>
                  <td className={`${tdBase} text-xs text-faint font-mono`}>
                    {satTotalThb ? fmtPctRaw((satelliteCashThb / satTotalThb) * 100) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight Distribution */}
        <div className="bg-surface border border-surface-border rounded-xl p-4 xl:w-72 shrink-0">
          <h2 className="font-semibold text-sm text-white mb-3">{t.weightDist}</h2>
          {/* Stacked bar */}
          <div className="flex h-6 rounded-lg overflow-hidden border border-surface-border gap-px">
            {weightSegs.map((s) => (
              <div
                key={s.ticker}
                style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                className="flex items-center justify-center overflow-hidden shrink-0"
                title={`${s.ticker}: ${s.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 space-y-2">
            {weightSegs.map((s) => (
              <div key={s.ticker} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-muted font-mono font-medium">{s.ticker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <span className="text-xs text-faint font-mono w-10 text-right">{s.pct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Holdings Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-white">{t.coreHoldings}</h2>
            <p className="text-xs text-faint mt-0.5">{fmtThbRaw(coreTotalThb, true)}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-gain/10 text-gain border border-gain/20 font-medium">Core</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-raised/50">
                {[t.colTicker, t.colShares, t.colCost, t.colPrice, t.colMktVal, t.colPnl].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coreRows.map((r) => {
                const isGold = r.isTHB
                return (
                  <tr
                    key={r.ticker}
                    className="border-b border-surface-border/50 last:border-0 hover:bg-surface-raised/60 transition-colors"
                  >
                    <td className={`${tdBase} font-mono font-bold`}>
                      {r.shares > 0
                        ? <TickerBadge ticker={r.ticker} />
                        : <span className="text-faint font-mono text-xs">{r.ticker}</span>
                      }
                    </td>
                    <td className={`${tdBase} font-mono text-muted`}>
                      {r.shares ? r.shares.toFixed(isGold ? 0 : 4) : '—'}
                    </td>
                    <td className={`${tdBase} font-mono text-faint`}>
                      {isGold ? fmtThbRaw(r.costThb ?? 0) : fmtUsd(r.costUsd ?? 0)}
                    </td>
                    <td className={`${tdBase} font-mono font-semibold text-white`}>
                      {isLoading && !isGold
                        ? <Skeleton width="w-14" height="h-3" />
                        : isGold
                          ? <span title={`NAV ${t.lastUpdated} ${mtsGoldNav.updatedAt}`}>
                              {fmtThbRaw(r.price ?? 0)}
                              <span className="text-faint font-normal text-xs ml-1">NAV</span>
                            </span>
                          : fmtUsd(r.price ?? 0)}
                    </td>
                    <td className={`${tdBase} font-mono text-muted`}>
                      {isLoading && !isGold
                        ? <Skeleton width="w-16" height="h-3" />
                        : fmtThbRaw(r.mktValThb, true)}
                    </td>
                    <PnlCell
                      value={fmtThb(r.pnlThb)}
                      pct={fmtPct(r.pnlPct)}
                      isLoading={isLoading && !isGold}
                    />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-faint">
          {t.lastUpdated}: {lastUpdatedTime} · {t.autoEvery15}
        </p>
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-surface-border text-sm text-muted hover:text-white hover:bg-surface-raised transition-colors font-medium"
        >
          {t.btnCopyForClaude}
        </button>
      </div>
    </div>
  )
}
