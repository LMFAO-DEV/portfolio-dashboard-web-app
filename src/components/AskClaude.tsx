import { useState, useEffect, useMemo } from 'react'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { copyToClipboard } from '../utils/copyForClaude'

type TopicKey =
  | 'analyze'
  | 'entry'
  | 'exit'
  | 'rebalance'
  | 'goal'
  | 'compare'
  | 'custom'

const SKILL_HINTS: Record<TopicKey, string> = {
  analyze: 'PORTFOLIO_ANALYSIS',
  entry: 'TRADING_SIGNALS',
  exit: 'TRADING_SIGNALS',
  rebalance: 'PORTFOLIO_ANALYSIS',
  goal: 'GOAL_PLANNING',
  compare: 'TRADING_SIGNALS',
  custom: '',
}

const FRAMING: Record<TopicKey, string> = {
  analyze: 'review the portfolio holistically.',
  entry: 'analyze entry point for the following request.',
  exit: 'assess exit / take-profit decision.',
  rebalance: 'review rebalance needs.',
  goal: 'evaluate the goal plan.',
  compare: 'compare the two positions named in the question.',
  custom: '',
}

interface AskClaudeProps {
  open: boolean
  onClose: () => void
  prices: Record<string, number>
  fxRate: number
}

export function AskClaude({ open, onClose, prices, fxRate }: AskClaudeProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const dca = usePortfolioStore((s) => s.dca)

  const [topic, setTopic] = useState<TopicKey | null>(() => {
    try { return (localStorage.getItem('ask-claude-topic') as TopicKey) || null } catch { return null }
  })
  const [question, setQuestion] = useState('')
  const [ctx, setCtx] = useState(() => {
    try {
      const saved = localStorage.getItem('ask-claude-ctx')
      return saved ? JSON.parse(saved) : { satellite: true, core: true, goal: true, rebalance: true }
    } catch {
      return { satellite: true, core: true, goal: true, rebalance: true }
    }
  })
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  useEffect(() => {
    if (topic) localStorage.setItem('ask-claude-topic', topic)
  }, [topic])

  useEffect(() => {
    localStorage.setItem('ask-claude-ctx', JSON.stringify(ctx))
  }, [ctx])

  const topics: { key: TopicKey; label: string; placeholder: string }[] = [
    { key: 'analyze', label: t.topicAnalyze, placeholder: t.placeholderAnalyze },
    { key: 'entry', label: t.topicEntry, placeholder: t.placeholderEntry },
    { key: 'exit', label: t.topicExit, placeholder: t.placeholderExit },
    { key: 'rebalance', label: t.topicRebalance, placeholder: t.placeholderRebalance },
    { key: 'goal', label: t.topicGoal, placeholder: t.placeholderGoal },
    { key: 'compare', label: t.topicCompare, placeholder: t.placeholderCompare },
    { key: 'custom', label: t.topicCustom, placeholder: t.placeholderCustom },
  ]

  const placeholder = topic ? topics.find((x) => x.key === topic)?.placeholder ?? '' : t.placeholderCustom

  const prompt = useMemo(() => {
    if (!topic) return ''
    const lines: string[] = []

    if (topic !== 'custom') {
      const skill = SKILL_HINTS[topic]
      lines.push(`Using ${skill} skill — ${FRAMING[topic]}`)
      lines.push('')
    }

    if (ctx.satellite) {
      const satTotal = satellite.reduce((s, h) => {
        if (!h.shares) return s
        return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
      }, 0) + satelliteCashThb

      lines.push(`Satellite holdings (${satellite.filter((h) => h.shares > 0).length} positions, total ฿${satTotal.toFixed(0)}):`)
      for (const h of satellite) {
        if (!h.shares || h.shares === 0) continue
        const price = prices[h.ticker] ?? 0
        const val = h.shares * price * fxRate
        const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
        const sign = pnlPct >= 0 ? '+' : '−'
        lines.push(`${h.ticker.padEnd(6)} ${h.shares.toFixed(2)} sh | cost $${(h.costUsd ?? 0).toFixed(2)} | px $${price.toFixed(2)} | ${sign}${Math.abs(pnlPct).toFixed(2)}% | ฿${val.toFixed(0)}`)
      }
      lines.push(`Cash available: ฿${satelliteCashThb.toFixed(0)}`)
      lines.push('')
    }

    if (ctx.core) {
      const coreTotal = core.reduce((s, h) => {
        if (!h.shares) return s
        if (h.isTHB) return s + h.shares * mtsGoldNav.value
        return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
      }, 0)
      lines.push(`Core holdings (total ฿${coreTotal.toFixed(0)}):`)
      for (const h of core) {
        if (h.isTHB) {
          lines.push(`Gold NAV ฿${mtsGoldNav.value.toFixed(0)} (updated ${mtsGoldNav.updatedAt})`)
          continue
        }
        if (!h.shares || h.shares === 0) continue
        const price = prices[h.ticker] ?? 0
        const val = h.shares * price * fxRate
        const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
        const sign = pnlPct >= 0 ? '+' : '−'
        lines.push(`${h.ticker.padEnd(6)} ${h.shares.toFixed(2)} sh | cost $${(h.costUsd ?? 0).toFixed(2)} | px $${price.toFixed(2)} | ${sign}${Math.abs(pnlPct).toFixed(2)}% | ฿${val.toFixed(0)}`)
      }
      lines.push('')
    }

    if (ctx.goal) {
      const total = dca.coreMonthlyThb + dca.satelliteMonthlyThb
      lines.push(`Goal: DCA ฿${total.toLocaleString()}/mo · expected return unknown`)
      lines.push('')
    }

    if (ctx.rebalance) {
      const satTotal = satellite.reduce((s, h) => s + h.shares * (prices[h.ticker] ?? 0) * fxRate, 0) + satelliteCashThb
      const coreTotal = core.reduce((s, h) => {
        if (h.isTHB) return s + h.shares * mtsGoldNav.value
        return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
      }, 0)
      const total = satTotal + coreTotal
      const corePct = total ? Math.round((coreTotal / total) * 100) : 0
      const satPct = 100 - corePct
      lines.push(`Rebalance: Core/Satellite ${corePct}%/${satPct}% (target 50:50)`)
      lines.push('')
    }

    lines.push(`Question: ${question}`)

    return lines.join('\n')
  }, [topic, question, ctx, satellite, core, satelliteCashThb, mtsGoldNav, prices, fxRate, dca])

  async function handleCopy() {
    if (!prompt) return
    const ok = await copyToClipboard(prompt)
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  if (!open) return null

  const skill = topic ? SKILL_HINTS[topic] : ''
  const charCount = prompt.length

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface border-l border-surface-border z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-lg font-semibold text-white">{t.askClaude}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-muted hover:text-white rounded-lg hover:bg-surface-raised text-xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex h-full">
            {/* Left / form */}
            <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">
              {/* Topic chips */}
              <div>
                <p className="text-xs font-semibold text-faint uppercase tracking-wide mb-2">{t.selectTopic}</p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((tp) => (
                    <button
                      key={tp.key}
                      onClick={() => setTopic(tp.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        topic === tp.key
                          ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20'
                          : 'bg-surface-raised text-muted border-surface-border hover:border-accent/40 hover:text-white'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs font-semibold text-faint uppercase tracking-wide mb-1.5">
                  {t.yourQuestion}
                </label>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-faint"
                />
              </div>

              {/* Context toggles */}
              <div>
                <p className="text-xs font-semibold text-faint uppercase tracking-wide mb-2">{t.contextToggles}</p>
                <div className="space-y-2">
                  {([
                    ['satellite', t.ctxSatellite],
                    ['core', t.ctxCore],
                    ['goal', t.ctxGoal],
                    ['rebalance', t.ctxRebalance],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={ctx[key]}
                        onChange={(e) => setCtx({ ...ctx, [key]: e.target.checked })}
                        className="w-4 h-4 rounded border-surface-border accent-accent"
                      />
                      <span className="text-sm text-muted group-hover:text-white transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Prompt preview (mobile) */}
              {prompt && (
                <div className="md:hidden">
                  <p className="text-xs font-semibold text-faint uppercase tracking-wide mb-1">{t.promptPreview}</p>
                  <pre className="text-xs text-muted bg-surface-raised border border-surface-border rounded-lg p-3 whitespace-pre-wrap font-mono overflow-auto max-h-60">
                    {prompt}
                  </pre>
                </div>
              )}
            </div>

            {/* Right: preview (desktop) */}
            {prompt && (
              <div className="hidden md:flex flex-col w-64 border-l border-surface-border bg-surface-raised/50">
                <p className="px-4 pt-4 pb-2 text-xs font-semibold text-faint uppercase tracking-wide">
                  {t.promptPreview}
                </p>
                <pre className="flex-1 px-4 pb-4 text-xs text-muted whitespace-pre-wrap font-mono overflow-auto">
                  {prompt}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border px-5 py-3 flex items-center justify-between gap-3">
          <span className="text-xs text-faint font-mono">
            {charCount} {t.chars}{skill ? ` · ${skill}` : ''}
          </span>
          <button
            onClick={handleCopy}
            disabled={!topic || !question.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copyState === 'copied'
                ? 'bg-gain text-page'
                : topic && question.trim()
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-surface-raised text-faint cursor-not-allowed border border-surface-border'
            }`}
          >
            {copyState === 'copied' ? t.copySuccess : t.copyPrompt}
          </button>
        </div>
      </div>
    </>
  )
}
