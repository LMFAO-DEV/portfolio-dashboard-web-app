import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'

interface CategoryAssignModalProps {
  ticker: string
  onAssign: (categoryId: string) => void
  onDismiss: () => void
}

export function CategoryAssignModal({ ticker, onAssign, onDismiss }: CategoryAssignModalProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const categoryConfigs = usePortfolioStore((s) => s.categoryConfigs)

  const sorted = [...categoryConfigs].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="bg-canvas rounded-2xl border border-hairline shadow-panel w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-light text-lg text-ink tracking-[-0.02em] mb-1">
          {t.assignCategory}
        </h2>
        <p className="text-sm text-ink-mute mb-5">
          {t.whichCategory.replace('{ticker}', ticker)}
        </p>

        <div className="space-y-2">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => onAssign(c.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-hairline hover:border-primary/40 hover:bg-primary/[0.02] transition-colors text-left group"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.colour_hex }} />
              <span className="flex-1 text-sm text-ink font-light">{c.label}</span>
              <span className="tabular text-xs text-ink-mute">{c.target_pct}%</span>
            </button>
          ))}

          {sorted.length === 0 && (
            <p className="text-sm text-ink-mute py-2">{t.noCategoriesYet}</p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="mt-5 w-full py-2 rounded-pill border border-hairline text-sm text-ink-mute hover:text-ink transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  )
}
