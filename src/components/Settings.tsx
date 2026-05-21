import { useRef, useState, useEffect, useCallback } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import type { Holding } from '../types'

interface SettingsProps {
  open: boolean
  onClose: () => void
}

function HoldingRow({
  holding,
  onUpdate,
  onRemove,
  isTHB,
  costLabel,
}: {
  holding: Holding
  onUpdate: (ticker: string, data: Partial<Holding>) => void
  onRemove: (ticker: string) => void
  isTHB: boolean
  costLabel: string
}) {
  const [shares, setShares] = useState(String(holding.shares))
  const [cost, setCost] = useState(String(isTHB ? holding.costThb ?? 0 : holding.costUsd ?? 0))

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function scheduleUpdate(newShares: string, newCost: string) {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const s = parseFloat(newShares) || 0
      const c = parseFloat(newCost) || 0
      onUpdate(holding.ticker, isTHB ? { shares: s, costThb: c } : { shares: s, costUsd: c })
    }, 500)
  }

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3 font-mono font-semibold text-sm text-gray-900">{holding.ticker}</td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          step="0.0001"
          value={shares}
          onChange={(e) => {
            setShares(e.target.value)
            scheduleUpdate(e.target.value, cost)
          }}
          className="w-28 rounded border border-gray-200 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={(e) => {
            setCost(e.target.value)
            scheduleUpdate(shares, e.target.value)
          }}
          className="w-28 rounded border border-gray-200 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
          placeholder={costLabel}
        />
      </td>
      <td className="py-2">
        <button
          onClick={() => onRemove(holding.ticker)}
          className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
          title="Remove"
        >
          ×
        </button>
      </td>
    </tr>
  )
}

export function Settings({ open, onClose }: SettingsProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)

  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const dca = usePortfolioStore((s) => s.dca)

  const updateSatelliteHolding = usePortfolioStore((s) => s.updateSatelliteHolding)
  const addSatelliteHolding = usePortfolioStore((s) => s.addSatelliteHolding)
  const removeSatelliteHolding = usePortfolioStore((s) => s.removeSatelliteHolding)
  const updateCoreHolding = usePortfolioStore((s) => s.updateCoreHolding)
  const addCoreHolding = usePortfolioStore((s) => s.addCoreHolding)
  const removeCoreHolding = usePortfolioStore((s) => s.removeCoreHolding)
  const setMtsGoldNav = usePortfolioStore((s) => s.setMtsGoldNav)
  const setSatelliteCashThb = usePortfolioStore((s) => s.setSatelliteCashThb)
  const setDca = usePortfolioStore((s) => s.setDca)
  const resetToDefault = usePortfolioStore((s) => s.resetToDefault)

  const [navInput, setNavInput] = useState(String(mtsGoldNav.value))
  const [cashInput, setCashInput] = useState(String(satelliteCashThb))
  const [coreDcaInput, setCoreDcaInput] = useState(String(dca.coreMonthlyThb))
  const [satDcaInput, setSatDcaInput] = useState(String(dca.satelliteMonthlyThb))
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [newSatTicker, setNewSatTicker] = useState('')
  const [newCoreTicker, setNewCoreTicker] = useState('')

  // Sync local inputs when store changes from outside
  useEffect(() => { setNavInput(String(mtsGoldNav.value)) }, [mtsGoldNav.value])
  useEffect(() => { setCashInput(String(satelliteCashThb)) }, [satelliteCashThb])

  const navStale = useCallback(() => {
    if (!mtsGoldNav.updatedAt) return false
    const diff = (Date.now() - new Date(mtsGoldNav.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    return diff > 30
  }, [mtsGoldNav.updatedAt])

  function handleExport() {
    const state = {
      satellite,
      core,
      mtsGoldNav,
      satelliteCashThb,
      dca,
    }
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    resetToDefault()
    setShowResetConfirm(false)
  }

  function addSatHolding() {
    const ticker = newSatTicker.trim().toUpperCase()
    if (!ticker) return
    addSatelliteHolding({ ticker, shares: 0, costUsd: 0 })
    setNewSatTicker('')
  }

  function addCoreHolding_() {
    const ticker = newCoreTicker.trim().toUpperCase()
    if (!ticker) return
    addCoreHolding({ ticker, shares: 0, costUsd: 0 })
    setNewCoreTicker('')
  }

  if (!open) return null

  const nonGoldCore = core.filter((h) => !h.isTHB)
  const goldCore = core.find((h) => h.isTHB)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Slide-over */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t.settings}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8">

          {/* Satellite Holdings */}
          <section>
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">
              {t.satelliteHoldingsEdit}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left pb-1 font-medium">Ticker</th>
                    <th className="text-left pb-1 font-medium">{t.sharesLabel}</th>
                    <th className="text-left pb-1 font-medium">{t.costPerShare}</th>
                    <th className="pb-1" />
                  </tr>
                </thead>
                <tbody>
                  {satellite.map((h) => (
                    <HoldingRow
                      key={h.ticker}
                      holding={h}
                      onUpdate={updateSatelliteHolding}
                      onRemove={removeSatelliteHolding}
                      isTHB={false}
                      costLabel="USD"
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newSatTicker}
                onChange={(e) => setNewSatTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addSatHolding()}
                placeholder="TICKER"
                className="rounded border border-gray-200 px-2 py-1 text-sm font-mono w-28 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <button
                onClick={addSatHolding}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded px-3 py-1"
              >
                {t.addTicker}
              </button>
            </div>
          </section>

          {/* Core Holdings */}
          <section>
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">
              {t.coreHoldingsEdit}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left pb-1 font-medium">Ticker</th>
                    <th className="text-left pb-1 font-medium">{t.sharesLabel}</th>
                    <th className="text-left pb-1 font-medium">{t.costPerShare}</th>
                    <th className="pb-1" />
                  </tr>
                </thead>
                <tbody>
                  {nonGoldCore.map((h) => (
                    <HoldingRow
                      key={h.ticker}
                      holding={h}
                      onUpdate={updateCoreHolding}
                      onRemove={removeCoreHolding}
                      isTHB={false}
                      costLabel="USD"
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newCoreTicker}
                onChange={(e) => setNewCoreTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addCoreHolding_()}
                placeholder="TICKER"
                className="rounded border border-gray-200 px-2 py-1 text-sm font-mono w-28 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <button
                onClick={addCoreHolding_}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded px-3 py-1"
              >
                {t.addTicker}
              </button>
            </div>
          </section>

          {/* Cash Reserve */}
          <section>
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">
              {t.cashReserveThb}
            </h3>
            <input
              type="number"
              min="0"
              step="1000"
              value={cashInput}
              onChange={(e) => {
                setCashInput(e.target.value)
                const v = parseFloat(e.target.value)
                if (isFinite(v)) setSatelliteCashThb(v)
              }}
              className="w-40 rounded border border-gray-200 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </section>

          {/* MTS-GOLD NAV */}
          <section>
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-1">
              {t.mtsGoldNav}
            </h3>
            {goldCore && (
              <p className="text-xs text-gray-500 mb-2">
                {t.lastNavUpdate}: {mtsGoldNav.updatedAt}
                {navStale() && (
                  <span className="ml-2 text-amber-600 font-medium">⚠ {t.navStale}</span>
                )}
              </p>
            )}
            <input
              type="number"
              min="0"
              step="1"
              value={navInput}
              onChange={(e) => {
                setNavInput(e.target.value)
                const v = parseFloat(e.target.value)
                if (isFinite(v)) setMtsGoldNav({ value: v, updatedAt: new Date().toISOString().slice(0, 10) })
              }}
              className="w-40 rounded border border-gray-200 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </section>

          {/* DCA Settings */}
          <section>
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide mb-3">
              {t.dcaSettings}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.coreDca}</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={coreDcaInput}
                  onChange={(e) => {
                    setCoreDcaInput(e.target.value)
                    const v = parseFloat(e.target.value)
                    if (isFinite(v)) setDca({ ...dca, coreMonthlyThb: v })
                  }}
                  className="w-40 rounded border border-gray-200 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t.satelliteDca}</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={satDcaInput}
                  onChange={(e) => {
                    setSatDcaInput(e.target.value)
                    const v = parseFloat(e.target.value)
                    if (isFinite(v)) setDca({ ...dca, satelliteMonthlyThb: v })
                  }}
                  className="w-40 rounded border border-gray-200 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
          </section>

          {/* Export */}
          <section className="border-t border-gray-100 pt-6">
            <button
              onClick={handleExport}
              className="w-full py-2 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t.exportSnapshot}
            </button>
          </section>

          {/* Reset */}
          <section className="pb-4">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2 rounded border border-red-200 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                {t.resetToDefault}
              </button>
            ) : (
              <div className="p-3 border border-red-200 rounded bg-red-50 space-y-3">
                <p className="text-sm text-red-700">{t.resetConfirm}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-1.5 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    {t.resetYes}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 rounded border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
