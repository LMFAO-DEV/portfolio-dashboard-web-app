import { useState } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import type { CategoryConfig } from '../types'

const PRESET_COLORS = [
  '#533afd', '#00A63D', '#FE9900', '#ea2261',
  '#0ea5e9', '#8b5cf6', '#f97316', '#06b6d4',
  '#ec4899', '#14b8a6', '#84cc16', '#f59e0b',
]

function generateId() {
  return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

interface CategorySetupProps {
  onComplete: () => void
}

export function CategorySetup({ onComplete }: CategorySetupProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const categoryConfigs = usePortfolioStore((s) => s.categoryConfigs)
  const addCategoryConfig = usePortfolioStore((s) => s.addCategoryConfig)
  const updateCategoryConfig = usePortfolioStore((s) => s.updateCategoryConfig)
  const removeCategoryConfig = usePortfolioStore((s) => s.removeCategoryConfig)
  const reorderCategoryConfigs = usePortfolioStore((s) => s.reorderCategoryConfigs)
  const setCategorySetupDone = usePortfolioStore((s) => s.setCategorySetupDone)

  const [name, setName] = useState('')
  const [targetPct, setTargetPct] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editTarget, setEditTarget] = useState('')
  const [editColor, setEditColor] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const totalTarget = categoryConfigs.reduce((s, c) => s + c.target_pct, 0)
  const sumOk = Math.abs(totalTarget - 100) < 0.01

  const sorted = [...categoryConfigs].sort((a, b) => a.sort_order - b.sort_order)

  function handleAdd() {
    const label = name.trim()
    const pct = parseFloat(targetPct)
    if (!label || isNaN(pct) || pct < 0 || pct > 100) return
    addCategoryConfig({
      id: generateId(),
      label,
      target_pct: pct,
      colour_hex: color,
      sort_order: categoryConfigs.length,
    })
    setName('')
    setTargetPct('')
    setColor(PRESET_COLORS[categoryConfigs.length % PRESET_COLORS.length])
  }

  function startEdit(c: CategoryConfig) {
    setEditingId(c.id)
    setEditName(c.label)
    setEditTarget(String(c.target_pct))
    setEditColor(c.colour_hex)
  }

  function saveEdit(id: string) {
    const label = editName.trim()
    const pct = parseFloat(editTarget)
    if (!label || isNaN(pct)) return
    updateCategoryConfig(id, { label, target_pct: pct, colour_hex: editColor })
    setEditingId(null)
  }

  function handleDragStart(id: string) {
    setDragId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    setDragOver(id)
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDragOver(null)
      return
    }
    const arr = [...sorted]
    const fromIdx = arr.findIndex((c) => c.id === dragId)
    const toIdx = arr.findIndex((c) => c.id === targetId)
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
    reorderCategoryConfigs(arr.map((c, i) => ({ ...c, sort_order: i })))
    setDragId(null)
    setDragOver(null)
  }

  function handleComplete() {
    setCategorySetupDone(true)
    onComplete()
  }

  const inputCls = 'rounded border border-hairline-input bg-canvas px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-primary transition-colors'

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-start py-12 px-5">
        <div className="w-full max-w-xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-light text-2xl text-ink tracking-[-0.02em]">{t.categorySetup}</h1>
            <p className="text-sm text-ink-mute mt-2">{t.categorySetupDesc}</p>
          </div>

          {/* Add form */}
          <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5 mb-5">
            <h2 className="font-light text-sm text-ink mb-4">{t.categoryAdd}</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={t.categoryName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className={`${inputCls} flex-1`}
              />
              <input
                type="number"
                placeholder={t.categoryTarget}
                value={targetPct}
                onChange={(e) => setTargetPct(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                min="0" max="100" step="1"
                className={`${inputCls} w-24`}
              />
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? '#1a1a2e' : 'transparent',
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                disabled={!name.trim() || !targetPct}
                className="px-4 py-1.5 rounded-pill text-sm font-normal bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Category list */}
          {sorted.length > 0 && (
            <div className="bg-canvas rounded-xl border border-hairline shadow-panel overflow-hidden mb-5">
              <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
                <span className="text-[10px] text-ink-mute uppercase tracking-widest">
                  {t.categoriesLabel}
                </span>
                <span className={`text-xs tabular font-normal px-2 py-0.5 rounded-pill border ${
                  sumOk
                    ? 'bg-gain/10 text-gain border-gain/25'
                    : 'bg-warning/10 text-warning border-warning/25'
                }`}>
                  {t.targetSum}: {totalTarget.toFixed(0)}%
                </span>
              </div>

              {sorted.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(c.id)}
                  onDragOver={(e) => handleDragOver(e, c.id)}
                  onDrop={() => handleDrop(c.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  className={`flex items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 cursor-grab transition-colors ${
                    dragOver === c.id ? 'bg-primary/[0.04]' : 'hover:bg-canvas-soft'
                  }`}
                >
                  <span className="text-ink-mute text-sm cursor-grab select-none">⠿</span>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.colour_hex }} />

                  {editingId === c.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(c.id); if (e.key === 'Escape') setEditingId(null) }}
                        className={`${inputCls} flex-1 text-xs`}
                      />
                      <input
                        type="number" min="0" max="100" step="1"
                        value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className={`${inputCls} w-16 text-xs`}
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.slice(0, 6).map((pc) => (
                          <button
                            key={pc}
                            onClick={() => setEditColor(pc)}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: pc, borderColor: editColor === pc ? '#1a1a2e' : 'transparent' }}
                          />
                        ))}
                      </div>
                      <button onClick={() => saveEdit(c.id)} className="text-gain text-sm w-6 h-6 flex items-center justify-center hover:bg-gain/10 rounded">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-ink-mute text-sm w-6 h-6 flex items-center justify-center hover:bg-hairline rounded">✗</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-ink font-light">{c.label}</span>
                      <span className="tabular text-sm text-ink-mute w-12 text-right">{c.target_pct}%</span>
                      <button
                        onClick={() => startEdit(c)}
                        className="text-ink-mute text-xs hover:text-primary transition-colors"
                      >
                        {t.categoryEdit}
                      </button>
                      <button
                        onClick={() => removeCategoryConfig(c.id)}
                        className="text-ink-mute text-xs hover:text-loss transition-colors"
                      >
                        {t.categoryDelete}
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* Cash reserve — auto-calculated, shown for reference */}
              <div className="flex items-center gap-3 px-5 py-3 bg-canvas-soft border-t border-hairline">
                <span className="w-3 h-3 rounded-full bg-hairline shrink-0" />
                <span className="flex-1 text-sm text-ink-mute font-light">{t.cashReserve}</span>
                <span className="tabular text-xs text-ink-mute">auto-calculated</span>
              </div>
            </div>
          )}

          {/* Target sum warning */}
          {sorted.length > 0 && !sumOk && (
            <div className="mb-5 px-4 py-2.5 rounded-lg bg-warning/8 border border-warning/30 text-sm text-warning flex items-center gap-2">
              <span>⚠</span>
              <span>{t.targetSumWarn} (currently {totalTarget.toFixed(0)}%)</span>
            </div>
          )}

          {sumOk && sorted.length > 0 && (
            <div className="mb-5 px-4 py-2.5 rounded-lg bg-gain/8 border border-gain/30 text-sm text-gain">
              {t.targetSumOk}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleComplete}
              disabled={!sumOk || sorted.length === 0}
              className="flex-1 py-2.5 rounded-pill bg-primary text-white text-sm font-normal disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {t.categorySetupDone}
            </button>
            <button
              onClick={() => { setCategorySetupDone(true); onComplete() }}
              className="px-5 py-2.5 rounded-pill border border-hairline text-sm text-ink-mute hover:text-ink hover:border-primary/40 transition-colors"
            >
              {t.categorySetupSkip}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
