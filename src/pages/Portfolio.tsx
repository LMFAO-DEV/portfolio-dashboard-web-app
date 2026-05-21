import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { Skeleton } from '../components/ui/Skeleton'
import { fmtThb, fmtThbRaw, fmtUsd, fmtPct, fmtPctRaw, fmtTime } from '../utils/format'
import { copyToClipboard, buildCopyForClaude } from '../utils/copyForClaude'

const SEG_COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#64748b',
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
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <div className="mt-1 text-xl font-bold font-mono text-gray-900 truncate">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function PnlCell({ value, pct }: { value: string; pct: string }) {
  const isPos = value.startsWith('+')
  const isNeg = value.startsWith('−')
  const cls = isPos ? 'text-green-700' : isNeg ? 'text-red-600' : 'text-gray-700'
  return (
    <td className={`px-3 py-2 font-mono text-sm whitespace-nowrap ${cls}`}>
      <div>{value}</div>
      <div className="text-xs opacity-75">{pct}</div>
    </td>
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
      color: '#64748b',
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

  return (
    <div className="p-4 space-y-4 max-w-screen-xl mx-auto">
      {/* Error banner */}
      {isError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg">
          {t.fetchError}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile
          label={t.totalValue}
          value={<Num v={fmtThbRaw(totalThb, true)} />}
        />
        <MetricTile
          label={t.profitLoss}
          value={
            <Num v={
              <span className={totalPnlThb >= 0 ? 'text-green-700' : 'text-red-600'}>
                {fmtThb(totalPnlThb)}
              </span>
            } />
          }
        />
        <MetricTile
          label={t.pnlPct}
          value={
            <Num v={
              <span className={totalPnlPct >= 0 ? 'text-green-700' : 'text-red-600'}>
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
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-sm text-gray-900">{t.satelliteHoldings}</h2>
            <p className="text-xs text-gray-400">{fmtThbRaw(satTotalThb, true)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[t.colTicker, t.colShares, t.colCost, t.colPrice, t.colMktVal, t.colPnl].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satRows.map((r) => {
                  const rowBg = !isLoading && r.shares > 0
                    ? r.pnlThb > 0 ? 'bg-[#d8ecd8]' : r.pnlThb < 0 ? 'bg-[#f4d6cf]' : ''
                    : ''
                  return (
                    <tr key={r.ticker} className={`border-b border-gray-50 last:border-0 ${rowBg}`}>
                      <td className="px-3 py-2 font-mono font-bold text-gray-900">{r.ticker}</td>
                      <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">
                        {r.shares ? r.shares.toFixed(4) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                        {fmtUsd(r.costUsd ?? 0)}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-gray-900 whitespace-nowrap">
                        {isLoading ? <Skeleton width="w-16" height="h-4" /> : fmtUsd(r.price ?? 0)}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">
                        {isLoading ? <Skeleton width="w-20" height="h-4" /> : fmtThbRaw(r.mktValThb, true)}
                      </td>
                      <PnlCell
                        value={isLoading ? '—' : fmtThb(r.pnlThb)}
                        pct={isLoading ? '—' : fmtPct(r.pnlPct)}
                      />
                    </tr>
                  )
                })}
                {/* Cash row */}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-700 text-sm" colSpan={4}>
                    {t.cashReserve}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-700">{fmtThbRaw(satelliteCashThb)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 font-mono">
                    {satTotalThb ? fmtPctRaw((satelliteCashThb / satTotalThb) * 100) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 xl:w-72 shrink-0">
          <h2 className="font-semibold text-sm text-gray-900 mb-3">{t.weightDist}</h2>
          {/* Stacked bar */}
          <div className="flex h-7 rounded-lg overflow-hidden border border-gray-100">
            {weightSegs.map((s) => (
              <div
                key={s.ticker}
                style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                className="flex items-center justify-center text-white text-xs font-medium overflow-hidden shrink-0"
                title={`${s.ticker}: ${s.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 space-y-1.5">
            {weightSegs.map((s) => (
              <div key={s.ticker} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-gray-700 font-mono font-medium">{s.ticker}</span>
                </div>
                <span className="text-gray-500 font-mono">{s.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Holdings Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900">{t.coreHoldings}</h2>
          <p className="text-xs text-gray-400">{fmtThbRaw(coreTotalThb, true)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {[t.colTicker, t.colShares, t.colCost, t.colPrice, t.colMktVal, t.colPnl].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coreRows.map((r) => {
                const isGold = r.isTHB
                const rowBg = !isLoading && r.shares > 0
                  ? r.pnlThb > 0 ? 'bg-[#d8ecd8]' : r.pnlThb < 0 ? 'bg-[#f4d6cf]' : ''
                  : ''
                return (
                  <tr key={r.ticker} className={`border-b border-gray-50 last:border-0 ${rowBg}`}>
                    <td className="px-3 py-2 font-mono font-bold text-gray-900">{r.ticker}</td>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {r.shares ? r.shares.toFixed(isGold ? 0 : 4) : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-500">
                      {isGold ? fmtThbRaw(r.costThb ?? 0) : fmtUsd(r.costUsd ?? 0)}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold text-gray-900">
                      {isLoading && !isGold
                        ? <Skeleton width="w-14" height="h-3" />
                        : isGold
                          ? <span title={`NAV ${t.lastUpdated} ${mtsGoldNav.updatedAt}`}>{fmtThbRaw(r.price ?? 0)} <span className="text-gray-400 font-normal">NAV</span></span>
                          : fmtUsd(r.price ?? 0)}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {isLoading && !isGold
                        ? <Skeleton width="w-16" height="h-3" />
                        : fmtThbRaw(r.mktValThb, true)}
                    </td>
                    <PnlCell
                      value={isLoading && !isGold ? '—' : fmtThb(r.pnlThb)}
                      pct={isLoading && !isGold ? '—' : fmtPct(r.pnlPct)}
                    />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: last updated + Copy for Claude */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-gray-400">
          {t.lastUpdated}: {lastUpdatedTime} · {t.autoEvery15}
        </p>
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
        >
          {t.btnCopyForClaude}
        </button>
      </div>
    </div>
  )
}
