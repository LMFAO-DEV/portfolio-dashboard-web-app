import { useRef, useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import type { SatTargets, PortfolioSnapshot } from '../types'

interface SettingsProps {
  open: boolean
  onClose: () => void
}

const inputCls = 'w-24 rounded-sm border border-hairline-input bg-canvas px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-ink-mute transition-colors'
const sectionHeadCls = 'font-normal text-[10px] text-ink-mute uppercase tracking-widest mb-3'

export function Settings({ open, onClose }: SettingsProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)

  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const satTargets = usePortfolioStore((s) => s.satTargets)
  const updateCoreHolding = usePortfolioStore((s) => s.updateCoreHolding)
  const updateSatelliteHolding = usePortfolioStore((s) => s.updateSatelliteHolding)
  const setSatTargets = usePortfolioStore((s) => s.setSatTargets)
  const importState = usePortfolioStore((s) => s.importState)
  const resetToDefault = usePortfolioStore((s) => s.resetToDefault)
  const driftThresholdPct = usePortfolioStore((s) => s.driftThresholdPct)
  const setDriftThresholdPct = usePortfolioStore((s) => s.setDriftThresholdPct)
  const anthropicApiKey = usePortfolioStore((s) => s.anthropicApiKey)
  const setAnthropicApiKey = usePortfolioStore((s) => s.setAnthropicApiKey)

  const [satInputs, setSatInputs] = useState<SatTargets>({ ...satTargets })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const mtsGoldNav = usePortfolioStore.getState().mtsGoldNav
    const satelliteCashThb = usePortfolioStore.getState().satelliteCashThb
    const coreCashThb = usePortfolioStore.getState().coreCashThb
    const dca = usePortfolioStore.getState().dca
    const transactions = usePortfolioStore.getState().transactions
    const dividends = usePortfolioStore.getState().dividends
    const state = { satellite, core, mtsGoldNav, satelliteCashThb, coreCashThb, dca, satTargets, transactions, dividends }
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Partial<PortfolioSnapshot>
      if (!parsed.satellite && !parsed.core) throw new Error('not a snapshot')
      importState(parsed)
      setImportStatus('success')
    } catch {
      setImportStatus('error')
    }
    setTimeout(() => setImportStatus('idle'), 3000)
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-ink/20 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-canvas z-50 flex flex-col overflow-hidden shadow-panel">
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h2 className="text-lg font-light text-ink">{t.settings}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8">

          {/* Core Target Allocation */}
          <section>
            <h3 className={sectionHeadCls}>Core Target Allocation (%)</h3>
            {core.length === 0 ? (
              <p className="text-xs text-ink-mute">Add core holdings from the portfolio page.</p>
            ) : (
              <div className="space-y-3">
                {core.map((h) => (
                  <div key={h.ticker} className="flex items-center justify-between">
                    <span className="text-sm font-mono text-ink">{h.ticker}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={h.targetPct ?? 0}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0
                        updateCoreHolding(h.ticker, { targetPct: v })
                      }}
                      className={inputCls}
                      placeholder="%"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Satellite Target Allocation */}
          <section>
            <h3 className={sectionHeadCls}>Satellite Target Allocation (%)</h3>
            <div className="space-y-3">
              {(
                [
                  { key: 'coreGrowth', label: 'Core Growth' },
                  { key: 'smallCapAI', label: 'Small Cap AI' },
                  { key: 'defensive', label: 'Defensive' },
                  { key: 'cash', label: 'Cash Reserve' },
                ] as { key: keyof SatTargets; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-ink">{label}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={satInputs[key]}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0
                      const updated = { ...satInputs, [key]: v }
                      setSatInputs(updated)
                      setSatTargets(updated)
                    }}
                    className={inputCls}
                    placeholder="%"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Alert settings */}
          <section>
            <h3 className={sectionHeadCls}>{t.driftThreshold}</h3>
            <div className="flex items-center gap-3">
              <input
                type="range" min="3" max="20" step="1"
                value={driftThresholdPct}
                onChange={(e) => setDriftThresholdPct(Number(e.target.value))}
                className="flex-1"
              />
              <span className="tabular text-sm text-ink w-10 text-right">{driftThresholdPct}%</span>
            </div>
          </section>

          {/* Target price per holding */}
          <section>
            <h3 className={sectionHeadCls}>{t.targetPriceLabel}</h3>
            <div className="space-y-2">
              {[...core, ...satellite].filter((h) => h.shares > 0).map((h) => (
                <div key={h.ticker} className="flex items-center justify-between">
                  <span className="text-sm font-mono text-ink">{h.ticker}</span>
                  <input
                    type="number" min="0" step="0.01"
                    defaultValue={h.targetPrice ?? ''}
                    placeholder={h.isTHB ? '฿' : '$'}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value) || undefined
                      const inCore = core.find((c) => c.ticker === h.ticker)
                      if (inCore) updateCoreHolding(h.ticker, { targetPrice: v })
                      else updateSatelliteHolding(h.ticker, { targetPrice: v })
                    }}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Anthropic API key */}
          <section>
            <h3 className={sectionHeadCls}>{t.anthropicKeyLabel}</h3>
            <input
              type="password"
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
              placeholder="sk-ant-…"
              className={`${inputCls} w-full font-mono`}
            />
            <p className="text-xs text-ink-mute mt-1.5">{t.anthropicKeyHint}</p>
          </section>

          {/* Export / Import */}
          <section className="border-t border-hairline pt-6 space-y-3">
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-pill border border-hairline text-sm text-ink-mute hover:text-ink hover:border-primary/40 transition-colors"
            >
              {t.exportSnapshot}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-pill border border-hairline text-sm text-ink-mute hover:text-ink hover:border-primary/40 transition-colors"
            >
              {importStatus === 'success' ? t.importSuccess : t.importSnapshot}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
            />
            {importStatus === 'error' && (
              <p className="text-xs text-loss">{t.importError}</p>
            )}
          </section>

          {/* Reset */}
          <section className="pb-4">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-pill border border-loss/30 text-sm text-loss hover:bg-loss/5 transition-colors"
              >
                {t.resetToDefault}
              </button>
            ) : (
              <div className="p-4 rounded-lg border border-loss/20 bg-loss/[0.03] space-y-3">
                <p className="text-sm text-loss">{t.resetConfirm}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { resetToDefault(); setShowResetConfirm(false) }}
                    className="flex-1 py-2 rounded-pill text-sm font-normal text-white bg-loss hover:opacity-90 transition-opacity"
                  >
                    {t.resetYes}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 rounded-pill border border-hairline text-sm text-ink-mute hover:text-ink transition-colors"
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
