import { useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { NetWorthChart } from '../components/NetWorthChart'
import { Skeleton } from '../components/ui/Skeleton'
import { CategoryAssignModal } from '../components/CategoryAssignModal'
import { fmtThb, fmtThbRaw, fmtUsd, fmtPct, fmtPctRaw, fmtTime } from '../utils/format'
import { fxAttribution } from '../utils/calc'
import { copyToClipboard, buildCopyForClaude } from '../utils/copyForClaude'
import type { Holding } from '../types'

const SEG_COLORS = [
  '#533afd', '#00A63D', '#FE9900', '#ea2261',
  '#665efd', '#f96bee', '#64748d',
]

const cellInput = 'w-full min-w-0 rounded border border-hairline-input bg-canvas px-2 py-1 text-xs text-ink focus:outline-none focus:border-primary transition-colors'

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
    <div className={`bg-canvas rounded-xl border border-hairline shadow-panel p-5 ${className}`}>
      <p className="text-[10px] text-ink-mute uppercase tracking-[0.08em] font-normal">{label}</p>
      <div className="mt-3 text-[22px] font-light tabular text-ink truncate leading-none tracking-[-0.02em]">{value}</div>
      {sub && <div className="mt-2 text-xs text-ink-mute">{sub}</div>}
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
  const cls = isPos ? 'text-gain' : isNeg ? 'text-loss' : 'text-ink-mute'
  const arrow = isPos ? '▲' : isNeg ? '▼' : ''
  return (
    <td className={`px-3 py-3 tabular text-sm whitespace-nowrap ${cls}`}>
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
    MSFT: 'bg-blue-500/10 text-blue-700',
    AMZN: 'bg-amber-500/10 text-amber-700',
    META: 'bg-blue-600/10 text-blue-800',
    ORCL: 'bg-red-500/10 text-red-700',
    COST: 'bg-emerald-500/10 text-emerald-700',
    CRWV: 'bg-violet-500/10 text-violet-700',
    NBIS: 'bg-slate-500/10 text-slate-600',
    VOO: 'bg-indigo-500/10 text-indigo-700',
    SCHD: 'bg-teal-500/10 text-teal-700',
    VXUS: 'bg-cyan-500/10 text-cyan-700',
    'MTS-GOLD': 'bg-yellow-500/10 text-yellow-700',
  }
  const cls = colors[ticker] ?? 'bg-ink/8 text-ink'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-normal ${cls}`}>
      {ticker}
    </span>
  )
}

type ComputedRow = Holding & { price?: number; mktValThb: number; pnlThb: number; pnlPct: number }

export function Portfolio({
  prices, fxRate, isLoading, isError, lastUpdated, onCopyStateChange,
}: PortfolioProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)

  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const coreCashThb = usePortfolioStore((s) => s.coreCashThb)
  const categoryConfigs = usePortfolioStore((s) => s.categoryConfigs)
  const positionLimit = usePortfolioStore((s) => s.positionLimit)

  const updateSatelliteHolding = usePortfolioStore((s) => s.updateSatelliteHolding)
  const addSatelliteHolding = usePortfolioStore((s) => s.addSatelliteHolding)
  const removeSatelliteHolding = usePortfolioStore((s) => s.removeSatelliteHolding)
  const updateCoreHolding = usePortfolioStore((s) => s.updateCoreHolding)
  const addCoreHolding = usePortfolioStore((s) => s.addCoreHolding)
  const removeCoreHolding = usePortfolioStore((s) => s.removeCoreHolding)
  const setSatelliteCashThb = usePortfolioStore((s) => s.setSatelliteCashThb)
  const setCoreCashThb = usePortfolioStore((s) => s.setCoreCashThb)

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    shares: '', cost: '', nav: '',
    category_id: null as string | null,
    stop_loss_pct: '', catalyst: '', catalyst_date: '',
  })

  const [addingTo, setAddingTo] = useState<'sat' | 'core' | null>(null)
  const [addForm, setAddForm] = useState({
    ticker: '', shares: '', cost: '', isTHB: false,
    category_id: null as string | null,
  })

  const [editingCash, setEditingCash] = useState<'sat' | 'core' | null>(null)
  const [cashInput, setCashInput] = useState('')

  // Assignment modal for new satellite position
  const [assignModal, setAssignModal] = useState<{ open: boolean; ticker: string } | null>(null)
  // Reassign modal for existing position
  const [reassignModal, setReassignModal] = useState<{ open: boolean; ticker: string } | null>(null)

  // --- Computed rows ---
  const satRows: ComputedRow[] = satellite.map((h) => {
    const price = prices[h.ticker]
    const mktValThb = h.shares && price ? h.shares * price * fxRate : 0
    const pnlThb = h.shares && price && h.costUsd ? (price - h.costUsd) * h.shares * fxRate : 0
    const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
    return { ...h, price, mktValThb, pnlThb, pnlPct }
  })

  const satEquityThb = satRows.reduce((s, r) => s + r.mktValThb, 0)
  const satTotalThb = satEquityThb + satelliteCashThb

  const coreRows: ComputedRow[] = core.map((h) => {
    if (h.isTHB) {
      const nav = prices[h.ticker] ?? h.navThb ?? mtsGoldNav.value
      const cost = h.costThb ?? 0
      const mktValThb = h.shares * nav
      const pnlThb = (nav - cost) * h.shares
      const pnlPct = cost ? ((nav - cost) / cost) * 100 : 0
      return { ...h, price: nav, mktValThb, pnlThb, pnlPct }
    }
    const price = prices[h.ticker]
    const mktValThb = h.shares && price ? h.shares * price * fxRate : 0
    const pnlThb = h.shares && price && h.costUsd ? (price - h.costUsd) * h.shares * fxRate : 0
    const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
    return { ...h, price, mktValThb, pnlThb, pnlPct }
  })

  const coreEquityThb = coreRows.reduce((s, r) => s + r.mktValThb, 0)
  const coreTotalThb = coreEquityThb + coreCashThb
  const totalThb = satTotalThb + coreTotalThb

  const totalCostUsd = [...satellite, ...core].reduce((s, h) => {
    if (h.isTHB) return s + (h.costThb ?? 0) / Math.max(fxRate, 1)
    return s + (h.costUsd ?? 0) * (h.shares ?? 0)
  }, 0)
  const totalPnlThb = [...satRows, ...coreRows].reduce((s, r) => s + r.pnlThb, 0)
  const totalPnlPct = totalCostUsd && fxRate ? (totalPnlThb / (totalCostUsd * fxRate)) * 100 : 0

  const fxAttr = [...satRows, ...coreRows].reduce(
    (acc, r) => {
      if (r.isTHB || !r.shares || !r.price || !r.costUsd || !r.entryFxRate) return acc
      const a = fxAttribution(r.shares, r.costUsd, r.price, r.entryFxRate, fxRate)
      return { assetThb: acc.assetThb + a.assetThb, fxThb: acc.fxThb + a.fxThb, has: true }
    },
    { assetThb: 0, fxThb: 0, has: false },
  )

  const concentrated = totalThb > 0
    ? [...satRows, ...coreRows]
        .filter((r) => r.shares > 0)
        .map((r) => ({ ticker: r.ticker, pct: (r.mktValThb / totalThb) * 100 }))
        .filter((r) => r.pct >= 25)
        .sort((a, b) => b.pct - a.pct)
    : []

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
      color: '#e3e8ee',
    },
  ]

  // Position count for banner
  const activePositionCount = satellite.filter((h) => h.shares > 0).length
  const showPositionCountBanner = activePositionCount > positionLimit

  // Unassigned count
  const unassignedCount = satellite.filter((h) => h.shares > 0 && !h.category_id).length

  // Category lookup helper
  const catById = (id: string | null | undefined) =>
    categoryConfigs.find((c) => c.id === id)

  // --- Handlers ---
  function startEdit(section: 'sat' | 'core', r: ComputedRow) {
    setEditingKey(`${section}:${r.ticker}`)
    setEditForm({
      shares: String(r.shares || ''),
      cost: String(r.isTHB ? (r.costThb ?? '') : (r.costUsd ?? '')),
      nav: String(r.isTHB ? (r.navThb ?? r.price ?? '') : ''),
      category_id: r.category_id ?? null,
      stop_loss_pct: r.stop_loss_pct ? String(r.stop_loss_pct * 100) : '',
      catalyst: r.catalyst ?? '',
      catalyst_date: r.catalyst_date ?? '',
    })
  }

  function saveEdit(section: 'sat' | 'core', ticker: string, isTHB?: boolean) {
    const shares = parseFloat(editForm.shares) || 0
    const cost = parseFloat(editForm.cost) || 0
    const stopLossPct = editForm.stop_loss_pct ? parseFloat(editForm.stop_loss_pct) / 100 : undefined
    if (section === 'sat') {
      updateSatelliteHolding(ticker, {
        shares,
        costUsd: cost,
        category_id: editForm.category_id,
        stop_loss_pct: stopLossPct,
        catalyst: editForm.catalyst || undefined,
        catalyst_date: editForm.catalyst_date || undefined,
      })
    } else if (isTHB) {
      const nav = parseFloat(editForm.nav) || 0
      updateCoreHolding(ticker, { shares, costThb: cost, navThb: nav })
    } else {
      updateCoreHolding(ticker, { shares, costUsd: cost })
    }
    setEditingKey(null)
  }

  function startAdd(section: 'sat' | 'core') {
    setEditingKey(null)
    setAddingTo(section)
    setAddForm({ ticker: '', shares: '', cost: '', isTHB: false, category_id: null })
  }

  function confirmAdd() {
    const ticker = addForm.ticker.trim().toUpperCase()
    if (!ticker) return
    const shares = parseFloat(addForm.shares) || 0
    const cost = parseFloat(addForm.cost) || 0
    if (addingTo === 'sat') {
      if (!addForm.category_id && categoryConfigs.length > 0) {
        // Show assignment modal before saving
        setAssignModal({ open: true, ticker })
        return
      }
      addSatelliteHolding({ ticker, shares, costUsd: cost, category_id: addForm.category_id ?? null })
      setAddingTo(null)
    } else if (addingTo === 'core') {
      addCoreHolding(addForm.isTHB
        ? { ticker, shares, costThb: cost, isTHB: true, navThb: 0 }
        : { ticker, shares, costUsd: cost })
      setAddingTo(null)
    }
  }

  function handleAssignAndAdd(categoryId: string) {
    const ticker = addForm.ticker.trim().toUpperCase()
    const shares = parseFloat(addForm.shares) || 0
    const cost = parseFloat(addForm.cost) || 0
    addSatelliteHolding({ ticker, shares, costUsd: cost, category_id: categoryId })
    setAssignModal(null)
    setAddingTo(null)
  }

  function handleReassign(ticker: string, categoryId: string) {
    updateSatelliteHolding(ticker, { category_id: categoryId })
    setReassignModal(null)
  }

  function startCashEdit(section: 'sat' | 'core') {
    setEditingCash(section)
    setCashInput(String(section === 'sat' ? satelliteCashThb : coreCashThb))
  }

  function saveCashEdit() {
    const v = parseFloat(cashInput) || 0
    if (editingCash === 'sat') setSatelliteCashThb(v)
    else if (editingCash === 'core') setCoreCashThb(v)
    setEditingCash(null)
  }

  async function handleCopy() {
    const text = buildCopyForClaude(satellite, core, satelliteCashThb, mtsGoldNav, prices, fxRate, lang)
    const ok = await copyToClipboard(text)
    if (ok) {
      onCopyStateChange('copied')
      setTimeout(() => onCopyStateChange('idle'), 2000)
    }
  }

  const lastUpdatedTime = lastUpdated ? fmtTime(new Date(lastUpdated)) : '—'

  const Num = ({ v }: { v: React.ReactNode }) =>
    isLoading ? <Skeleton width="w-20" height="h-5" /> : <>{v}</>

  const thClass = 'px-3 py-2.5 text-left text-[10px] text-ink-mute font-normal uppercase tracking-widest whitespace-nowrap'
  const tdBase = 'px-3 py-2.5 text-sm whitespace-nowrap'
  const colHeaders = [t.colTicker, t.colShares, t.colCost, t.colPrice, t.colMktVal, t.colPnl, '']

  // --- Stop-loss helper ---
  function StopLossInfo({ r }: { r: ComputedRow }) {
    if (!r.stop_loss_pct || !r.costUsd || !r.price) {
      return <span className="text-[9px] text-ink-mute/60">{t.stopLossNoSet}</span>
    }
    const stopPrice = r.costUsd * (1 - r.stop_loss_pct)
    const distancePct = ((r.price - stopPrice) / r.price) * 100
    const below = r.price < stopPrice
    const stopColor = below
      ? 'text-loss font-normal'
      : distancePct < 5
        ? 'text-loss'
        : distancePct < 10
          ? 'text-warning'
          : 'text-gain'
    return (
      <span className={`text-[9px] ${stopColor}`}>
        {below
          ? `${t.belowStop} $${stopPrice.toFixed(2)}`
          : `$${stopPrice.toFixed(2)} · ${distancePct.toFixed(1)}% ${t.distanceToStop}`
        }
      </span>
    )
  }

  // --- Catalyst helper ---
  function CatalystTag({ r }: { r: ComputedRow }) {
    if (!r.catalyst) return null
    const today = new Date()
    const daysUntil = r.catalyst_date
      ? Math.floor((new Date(r.catalyst_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null
    const soon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 14
    return (
      <span className={`text-[9px] px-1.5 rounded-sm font-normal w-fit ${
        soon ? 'bg-warning/15 text-warning' : 'bg-canvas-soft text-ink-mute'
      }`}>
        {r.catalyst}{r.catalyst_date ? ` · ${r.catalyst_date}` : ''}
        {soon && ` (${t.catalystSoon})`}
      </span>
    )
  }

  // --- Row renderers ---
  function renderViewRow(section: 'sat' | 'core', r: ComputedRow) {
    const isGold = r.isTHB
    const cat = section === 'sat' ? catById(r.category_id) : undefined
    return (
      <tr key={r.ticker} className="border-b border-hairline transition-colors hover:bg-canvas-soft group">
        <td className={tdBase}>
          <div className="flex flex-col gap-0.5">
            {r.shares > 0
              ? <TickerBadge ticker={r.ticker} />
              : <span className="text-ink-mute text-xs">{r.ticker}</span>
            }
            {section === 'sat' && (
              <div className="flex items-center gap-1 flex-wrap">
                {cat ? (
                  <span
                    className="text-[9px] px-1.5 rounded-sm font-normal w-fit flex items-center gap-1"
                    style={{ backgroundColor: `${cat.colour_hex}18`, color: cat.colour_hex }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cat.colour_hex }} />
                    {cat.label}
                  </span>
                ) : r.shares > 0 ? (
                  <button
                    onClick={() => setReassignModal({ open: true, ticker: r.ticker })}
                    className="text-[9px] px-1.5 rounded-sm font-normal text-warning bg-warning/10 hover:bg-warning/20 transition-colors"
                  >
                    {t.unassigned} — {t.assignCategory}
                  </button>
                ) : null}
              </div>
            )}
            {section === 'sat' && r.shares > 0 && (
              <StopLossInfo r={r} />
            )}
            {section === 'sat' && <CatalystTag r={r} />}
          </div>
        </td>
        <td className={`${tdBase} tabular text-ink-mute`}>
          {r.shares ? <>{r.shares.toFixed(4)}{isGold && <span className="text-ink-mute font-light text-xs ml-1">oz</span>}</> : '—'}
        </td>
        <td className={`${tdBase} tabular text-ink-mute`}>
          {isGold ? fmtThbRaw(r.costThb ?? 0) : fmtUsd(r.costUsd ?? 0)}
        </td>
        <td className={`${tdBase} tabular text-ink`}>
          {isLoading && !isGold
            ? <Skeleton width="w-14" height="h-3" />
            : isGold
              ? <span>{fmtThbRaw(r.price ?? 0)}<span className="text-ink-mute font-light text-xs ml-1">NAV</span></span>
              : fmtUsd(r.price ?? 0)
          }
        </td>
        <td className={`${tdBase} tabular text-ink-mute`}>
          {isLoading && !isGold ? <Skeleton width="w-16" height="h-3" /> : fmtThbRaw(r.mktValThb, true)}
        </td>
        <PnlCell
          value={fmtThb(r.pnlThb)}
          pct={fmtPct(r.pnlPct)}
          isLoading={isLoading && r.shares > 0 && !isGold}
        />
        <td className={`${tdBase} w-20`}>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {section === 'sat' && r.shares > 0 && (
              <button
                onClick={() => setReassignModal({ open: true, ticker: r.ticker })}
                className="w-6 h-6 flex items-center justify-center text-ink-mute hover:text-primary rounded text-xs"
                title={t.reassign}
              >⇄</button>
            )}
            <button
              onClick={() => startEdit(section, r)}
              className="w-6 h-6 flex items-center justify-center text-ink-mute hover:text-primary rounded text-sm"
              title="Edit"
            >✎</button>
            <button
              onClick={() => section === 'sat' ? removeSatelliteHolding(r.ticker) : removeCoreHolding(r.ticker)}
              className="w-6 h-6 flex items-center justify-center text-ink-mute hover:text-loss rounded text-sm"
              title="Remove"
            >×</button>
          </div>
        </td>
      </tr>
    )
  }

  function renderEditRow(section: 'sat' | 'core', r: ComputedRow) {
    const sortedCats = [...categoryConfigs].sort((a, b) => a.sort_order - b.sort_order)
    return (
      <tr key={r.ticker} className="border-b border-hairline bg-primary/[0.02]">
        <td className={tdBase}>
          <div className="flex flex-col gap-1">
            <TickerBadge ticker={r.ticker} />
            {section === 'sat' && (
              <input
                type="text"
                placeholder={t.catalyst}
                value={editForm.catalyst}
                onChange={(e) => setEditForm((f) => ({ ...f, catalyst: e.target.value }))}
                className={`${cellInput} text-[10px]`}
              />
            )}
            {section === 'sat' && (
              <input
                type="date"
                value={editForm.catalyst_date}
                onChange={(e) => setEditForm((f) => ({ ...f, catalyst_date: e.target.value }))}
                className={`${cellInput} text-[10px]`}
              />
            )}
          </div>
        </td>
        <td className={`${tdBase} w-24`}>
          <input
            type="number" min="0" step="0.0001"
            value={editForm.shares}
            onChange={(e) => setEditForm((f) => ({ ...f, shares: e.target.value }))}
            className={cellInput}
            autoFocus
          />
        </td>
        <td className={`${tdBase} w-28`}>
          <input
            type="number" min="0" step="0.01"
            value={editForm.cost}
            onChange={(e) => setEditForm((f) => ({ ...f, cost: e.target.value }))}
            className={cellInput}
            placeholder={r.isTHB ? 'THB' : 'USD'}
          />
        </td>
        <td className={`${tdBase} w-28`}>
          {r.isTHB
            ? <input
                type="number" min="0" step="1"
                value={editForm.nav}
                onChange={(e) => setEditForm((f) => ({ ...f, nav: e.target.value }))}
                className={cellInput}
                placeholder="NAV"
              />
            : section === 'sat'
              ? <div className="flex flex-col gap-1">
                  <select
                    value={editForm.category_id ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value || null }))}
                    className="rounded border border-hairline-input bg-canvas px-2 py-1 text-xs text-ink focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="">{t.unassigned}</option>
                    {sortedCats.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0" max="100" step="1"
                    value={editForm.stop_loss_pct}
                    onChange={(e) => setEditForm((f) => ({ ...f, stop_loss_pct: e.target.value }))}
                    className={`${cellInput} text-[10px]`}
                    placeholder="Stop % (e.g. 15)"
                  />
                </div>
              : <span className="tabular text-xs text-ink-mute">{fmtUsd(r.price ?? 0)}</span>
          }
        </td>
        <td className={`${tdBase} tabular text-xs text-ink-mute`}>{fmtThbRaw(r.mktValThb, true)}</td>
        <PnlCell value={fmtThb(r.pnlThb)} pct={fmtPct(r.pnlPct)} />
        <td className={tdBase}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => saveEdit(section, r.ticker, r.isTHB)}
              className="w-6 h-6 flex items-center justify-center text-gain hover:bg-gain/10 rounded text-sm"
            >✓</button>
            <button
              onClick={() => setEditingKey(null)}
              className="w-6 h-6 flex items-center justify-center text-ink-mute hover:bg-hairline rounded text-sm"
            >✗</button>
          </div>
        </td>
      </tr>
    )
  }

  function renderAddRow(section: 'sat' | 'core') {
    const sortedCats = [...categoryConfigs].sort((a, b) => a.sort_order - b.sort_order)
    return (
      <tr className="border-b border-hairline bg-primary/[0.02]">
        <td className={tdBase}>
          <input
            type="text"
            placeholder="TICKER"
            value={addForm.ticker}
            onChange={(e) => setAddForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
            className="w-20 rounded border border-hairline-input bg-canvas px-2 py-1 text-xs text-ink focus:outline-none focus:border-primary transition-colors uppercase"
            autoFocus
          />
        </td>
        <td className={`${tdBase} w-24`}>
          <input
            type="number" min="0" step="0.0001" placeholder="0"
            value={addForm.shares}
            onChange={(e) => setAddForm((f) => ({ ...f, shares: e.target.value }))}
            className={cellInput}
          />
        </td>
        <td className={`${tdBase} w-28`}>
          <input
            type="number" min="0" step="0.01"
            placeholder={addForm.isTHB ? 'THB/unit' : 'USD/sh'}
            value={addForm.cost}
            onChange={(e) => setAddForm((f) => ({ ...f, cost: e.target.value }))}
            className={cellInput}
          />
        </td>
        <td className={tdBase}>
          {section === 'sat'
            ? <select
                value={addForm.category_id ?? ''}
                onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value || null }))}
                className="rounded border border-hairline-input bg-canvas px-2 py-1 text-xs text-ink focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">{sortedCats.length > 0 ? t.unassigned : t.noCategoriesYet}</option>
                {sortedCats.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            : <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.isTHB}
                  onChange={(e) => setAddForm((f) => ({ ...f, isTHB: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-xs text-ink-mute">THB</span>
              </label>
          }
        </td>
        <td className={tdBase} />
        <td className={tdBase} />
        <td className={tdBase}>
          <div className="flex items-center gap-1">
            <button
              onClick={confirmAdd}
              className="w-6 h-6 flex items-center justify-center text-gain hover:bg-gain/10 rounded text-sm"
            >✓</button>
            <button
              onClick={() => setAddingTo(null)}
              className="w-6 h-6 flex items-center justify-center text-ink-mute hover:bg-hairline rounded text-sm"
            >✗</button>
          </div>
        </td>
      </tr>
    )
  }

  function renderCashRow(section: 'sat' | 'core', cashThb: number, totalThb: number) {
    const isEditing = editingCash === section
    return (
      <tr className="bg-canvas-soft">
        <td className={`${tdBase} text-ink-mute`} colSpan={4}>
          {t.cashReserve}
        </td>
        <td className={`${tdBase} tabular text-ink-mute`}>
          {isEditing ? (
            <input
              type="number" min="0" step="1000"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveCashEdit()}
              className="w-32 rounded border border-hairline-input bg-canvas px-2 py-1 text-xs text-ink focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          ) : (
            <span
              className="cursor-pointer hover:text-ink transition-colors"
              onClick={() => startCashEdit(section)}
              title="Click to edit"
            >
              {fmtThbRaw(cashThb)}
            </span>
          )}
        </td>
        <td className={`${tdBase} tabular text-xs text-ink-mute`}>
          {totalThb ? fmtPctRaw((cashThb / totalThb) * 100) : '—'}
        </td>
        <td className={tdBase}>
          {isEditing && (
            <div className="flex items-center gap-1">
              <button onClick={saveCashEdit} className="w-6 h-6 flex items-center justify-center text-gain hover:bg-gain/10 rounded text-sm">✓</button>
              <button onClick={() => setEditingCash(null)} className="w-6 h-6 flex items-center justify-center text-ink-mute hover:bg-hairline rounded text-sm">✗</button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="p-5 sm:p-6 space-y-5 max-w-screen-xl mx-auto">
      {isError && (
        <div className="bg-warning/8 border border-warning/30 text-warning text-sm px-4 py-2.5 rounded-lg">
          {t.fetchError}
        </div>
      )}

      {/* Position count banner */}
      {showPositionCountBanner && (
        <div className="bg-warning/8 border border-warning/30 text-warning text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
          <span>⚠</span>
          <span>
            {t.positionCountBanner
              .replace('{n}', String(activePositionCount))
              .replace('{limit}', String(positionLimit))}
          </span>
        </div>
      )}

      {/* Unassigned warning */}
      {unassignedCount > 0 && (
        <div className="bg-warning/8 border border-warning/30 text-warning text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-pill bg-warning/20 text-xs font-normal border border-warning/30">
            {unassignedCount}
          </span>
          <span>{t.unassigned} — {t.unassignedDesc}</span>
        </div>
      )}

      {concentrated.length > 0 && (
        <div className="bg-warning/8 border border-warning/30 text-warning text-sm px-4 py-2.5 rounded-lg flex items-start gap-2">
          <span className="shrink-0">⚠</span>
          <span>
            <span className="font-normal">{t.concentrationRisk}:</span>{' '}
            {concentrated.map((c) => `${c.ticker} ${c.pct.toFixed(0)}%`).join(', ')}{' '}
            {concentrated.length > 1 ? t.concentrationDescMulti : t.concentrationDesc}
          </span>
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricTile label={t.totalValue} value={<Num v={fmtThbRaw(totalThb, true)} />} />
        <MetricTile
          label={t.profitLoss}
          value={
            <Num v={
              <span className={totalPnlThb >= 0 ? 'text-gain' : 'text-loss'}>
                {totalPnlThb >= 0 ? '▲ ' : '▼ '}{fmtThb(totalPnlThb)}
              </span>
            } />
          }
          sub={fxAttr.has ? (
            <span className="flex flex-wrap gap-x-2 tabular">
              <span>{t.assetReturn} <span className={fxAttr.assetThb >= 0 ? 'text-gain' : 'text-loss'}>{fmtThb(fxAttr.assetThb)}</span></span>
              <span>· {t.fxReturn} <span className={fxAttr.fxThb >= 0 ? 'text-gain' : 'text-loss'}>{fmtThb(fxAttr.fxThb)}</span></span>
            </span>
          ) : undefined}
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

      {/* Net worth history */}
      <NetWorthChart />

      {/* Satellite section */}
      <div className="flex flex-col xl:flex-row gap-4 sm:gap-5">
        <div className="flex-1 bg-canvas rounded-xl border border-hairline shadow-panel overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-hairline">
            <div>
              <h2 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.satelliteHoldings}</h2>
              <p className="text-xs text-ink-mute mt-0.5 tabular">{fmtThbRaw(satTotalThb, true)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => startAdd('sat')}
                className="text-[10px] px-2.5 py-1 rounded-pill font-normal text-primary-deep bg-primary-subdued hover:bg-primary/15 transition-colors"
              >
                + Add
              </button>
              <span className="text-[10px] px-2.5 py-1 rounded-pill font-normal text-primary-deep bg-primary-subdued">
                Satellite
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline">
                  {colHeaders.map((h, i) => (
                    <th key={i} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satRows.map((r) =>
                  editingKey === `sat:${r.ticker}`
                    ? renderEditRow('sat', r)
                    : renderViewRow('sat', r)
                )}
                {addingTo === 'sat' && renderAddRow('sat')}
                {renderCashRow('sat', satelliteCashThb, satTotalThb)}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weight Distribution */}
        <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5 xl:w-72 shrink-0">
          <h2 className="font-light text-sm text-ink mb-4">{t.weightDist}</h2>
          <div className="flex h-2 rounded-xs overflow-hidden gap-px bg-hairline">
            {weightSegs.map((s) => (
              <div
                key={s.ticker}
                style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                className="flex items-center justify-center overflow-hidden shrink-0"
                title={`${s.ticker}: ${s.pct.toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="mt-4 space-y-2.5">
            {weightSegs.map((s) => (
              <div key={s.ticker} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-ink-mute">{s.ticker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full overflow-hidden bg-hairline">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="tabular text-xs text-ink-mute w-10 text-right">{s.pct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core section */}
      <div className="bg-canvas rounded-xl border border-hairline shadow-panel overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-hairline">
          <div>
            <h2 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.coreHoldings}</h2>
            <p className="text-xs text-ink-mute mt-0.5 tabular">{fmtThbRaw(coreTotalThb, true)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => startAdd('core')}
              className="text-[10px] px-2.5 py-1 rounded-pill font-normal text-gain bg-gain/10 border border-gain/20 hover:bg-gain/15 transition-colors"
            >
              + Add
            </button>
            <span className="text-[10px] px-2.5 py-1 rounded-pill font-normal text-gain bg-gain/10 border border-gain/20">
              Core
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas-soft border-b border-hairline">
                {colHeaders.map((h, i) => (
                  <th key={i} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coreRows.map((r) =>
                editingKey === `core:${r.ticker}`
                  ? renderEditRow('core', r)
                  : renderViewRow('core', r)
              )}
              {addingTo === 'core' && renderAddRow('core')}
              {renderCashRow('core', coreCashThb, coreTotalThb)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs text-ink-mute">
          {t.lastUpdated}: {lastUpdatedTime} · {t.autoEvery15}
        </p>
        <button
          onClick={handleCopy}
          className="w-full sm:w-auto px-4 py-2 rounded-pill border border-hairline text-sm text-ink-mute hover:text-ink hover:border-primary/40 transition-colors"
        >
          {t.btnCopyForClaude}
        </button>
      </div>

      {/* Category assignment modal (new position) */}
      {assignModal?.open && (
        <CategoryAssignModal
          ticker={assignModal.ticker}
          onAssign={handleAssignAndAdd}
          onDismiss={() => setAssignModal(null)}
        />
      )}

      {/* Reassign modal (existing position) */}
      {reassignModal?.open && (
        <CategoryAssignModal
          ticker={reassignModal.ticker}
          onAssign={(catId) => handleReassign(reassignModal.ticker, catId)}
          onDismiss={() => setReassignModal(null)}
        />
      )}
    </div>
  )
}
