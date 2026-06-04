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
  | 'screen'
  | 'custom'

const SKILL_HINTS: Record<TopicKey, string> = {
  analyze: 'portfolio-analysis',
  entry: 'trading-signals',
  exit: 'trading-signals',
  rebalance: 'portfolio-analysis',
  goal: 'portfolio-analysis',
  compare: 'stock-screener',
  screen: 'stock-screener',
  custom: '',
}

const FRAMING: Record<TopicKey, string> = {
  analyze:
    'Run full portfolio analysis — all 5 steps: snapshot table → 5 health checks → per-position rating (Hold/Trim/Sell) → Core/Satellite balance check → DCA recommendation.',
  entry:
    'Run the full decision tree. Check market condition filter first (VIX + S&P vs 200 SMA). Output: entry zone | stop loss | profit ladder | signal confidence (HIGH/MEDIUM/LOW). Pick formula A (pullback), B (breakout), or C (reversal).',
  exit:
    'Assess exit/take-profit decision using the exit framework. Check partial exit signals and full exit signals. Output profit ladder recommendation + whether to trail or close.',
  rebalance:
    'Run Step 4 (Core vs Satellite balance check) and Step 5 (DCA recommendation). Flag any bucket drifted beyond ±10% from target.',
  goal:
    'Run Step 5 (DCA recommendation). Calculate required monthly DCA to reach the goal. Apply universal DCA rules (pause conditions, increase conditions).',
  compare:
    'Use the comparison template (A vs B). Run screening process for both stocks and check portfolio fit against my current holdings. Output verdict: Add / Watch / Avoid for each.',
  screen:
    'Run full screening process — Steps 1-5: theme first → find winner → fundamental check (classify Tier 1/2/3) → technical check → portfolio fit. Output: tier | fundamental scorecard | red flags | portfolio fit | verdict.',
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
    { key: 'rebalance', label: t.topicRebalance, placeholder: t.placeholderRebalance },
    { key: 'goal', label: t.topicGoal, placeholder: t.placeholderGoal },
    { key: 'entry', label: t.topicEntry, placeholder: t.placeholderEntry },
    { key: 'exit', label: t.topicExit, placeholder: t.placeholderExit },
    { key: 'screen', label: t.topicScreen, placeholder: t.placeholderScreen },
    { key: 'compare', label: t.topicCompare, placeholder: t.placeholderCompare },
    { key: 'custom', label: t.topicCustom, placeholder: t.placeholderCustom },
  ]

  const placeholder = topic ? topics.find((x) => x.key === topic)?.placeholder ?? '' : t.placeholderCustom

  const prompt = useMemo(() => {
    if (!topic) return ''
    const lines: string[] = []

    const skill = SKILL_HINTS[topic]
    const isPortfolioAnalysis = ['analyze', 'rebalance', 'goal'].includes(topic)
    const isScreener = ['compare', 'screen'].includes(topic)

    // --- Skill header ---
    if (skill) {
      lines.push(`[${skill}]`)
      lines.push('')
      lines.push(FRAMING[topic])
      lines.push('')
    }

    // --- Compute totals ---
    const satMarketThb = satellite.reduce((s, h) => {
      if (!h.shares) return s
      return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
    }, 0)
    const satTotalThb = satMarketThb + satelliteCashThb
    const coreTotal = core.reduce((s, h) => {
      if (!h.shares) return s
      if (h.isTHB) return s + h.shares * mtsGoldNav.value
      return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
    }, 0)
    const grandTotal = satTotalThb + coreTotal
    const corePct = grandTotal ? Math.round((coreTotal / grandTotal) * 100) : 0
    const satPct = 100 - corePct

    // --- portfolio-analysis context ---
    if (isPortfolioAnalysis) {
      lines.push(`## Portfolio Structure`)
      lines.push(`Type: Core + Satellite`)
      lines.push(`Target split: Core 50% / Satellite 50%  (actual: Core ${corePct}% / Sat ${satPct}%)`)
      lines.push(`Core buckets target: VOO 50% / SCHD 35% / VXUS 10% / MTS-GOLD 5%`)
      lines.push(`Satellite buckets target: Core Growth 60% / Small Cap AI 20% / Cash 20%`)
      lines.push(`Monthly DCA: Core ฿${dca.coreMonthlyThb.toLocaleString()} / Satellite ฿${dca.satelliteMonthlyThb.toLocaleString()}`)
      lines.push(`Total portfolio: ฿${grandTotal.toFixed(0)}`)
      lines.push('')
    }

    // --- Satellite holdings ---
    if (ctx.satellite) {
      if (isPortfolioAnalysis) {
        lines.push(`## Satellite Holdings — total ฿${satTotalThb.toFixed(0)}`)
        lines.push(`| Ticker | Shares | Cost/sh | Price | P&L% | Value (THB) | Group |`)
        lines.push(`|--------|--------|---------|-------|------|-------------|-------|`)
        for (const h of satellite) {
          if (!h.shares || h.shares === 0) continue
          const price = prices[h.ticker] ?? 0
          const val = h.shares * price * fxRate
          const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
          const sign = pnlPct >= 0 ? '+' : '-'
          const groupLabel = h.satGroup === 'smallCapAI' ? 'Small Cap AI' : h.satGroup === 'defensive' ? 'Defensive' : 'Core Growth'
          lines.push(`| ${h.ticker} | ${h.shares.toFixed(2)} | $${(h.costUsd ?? 0).toFixed(2)} | $${price.toFixed(2)} | ${sign}${Math.abs(pnlPct).toFixed(1)}% | ฿${val.toFixed(0)} | ${groupLabel} |`)
        }
        lines.push(`| CASH | — | — | — | — | ฿${satelliteCashThb.toFixed(0)} | Cash |`)
      } else if (isScreener) {
        const satTickers = satellite.filter((h) => h.shares > 0).map((h) => h.ticker)
        lines.push(`Satellite holdings: ${satTickers.join(', ')} + Cash ฿${satelliteCashThb.toFixed(0)}`)
      } else {
        // trading-signals — compact
        lines.push(`Satellite holdings (total ฿${satTotalThb.toFixed(0)}):`)
        for (const h of satellite) {
          if (!h.shares || h.shares === 0) continue
          const price = prices[h.ticker] ?? 0
          const val = h.shares * price * fxRate
          const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
          const sign = pnlPct >= 0 ? '+' : '−'
          lines.push(`${h.ticker.padEnd(6)} ${h.shares.toFixed(2)} sh | cost $${(h.costUsd ?? 0).toFixed(2)} | px $${price.toFixed(2)} | ${sign}${Math.abs(pnlPct).toFixed(1)}% | ฿${val.toFixed(0)}`)
        }
        lines.push(`Cash: ฿${satelliteCashThb.toFixed(0)}`)
      }
      lines.push('')
    }

    // --- Core holdings ---
    if (ctx.core) {
      if (isPortfolioAnalysis) {
        lines.push(`## Core Holdings — total ฿${coreTotal.toFixed(0)}`)
        lines.push(`| Ticker | Shares | Cost/sh | Price | P&L% | Value (THB) | Target% |`)
        lines.push(`|--------|--------|---------|-------|------|-------------|---------|`)
        const coreTargetMap: Record<string, string> = { VOO: '50%', SCHD: '35%', VXUS: '10%' }
        for (const h of core) {
          if (h.isTHB) {
            const val = h.shares * mtsGoldNav.value
            const pnlPct = h.costThb && mtsGoldNav.value ? ((mtsGoldNav.value - h.costThb) / h.costThb) * 100 : 0
            const sign = pnlPct >= 0 ? '+' : '-'
            lines.push(`| MTS-GOLD | ${h.shares} | ฿${(h.costThb ?? 0).toFixed(0)} | ฿${mtsGoldNav.value.toFixed(0)} | ${sign}${Math.abs(pnlPct).toFixed(1)}% | ฿${val.toFixed(0)} | 5% |`)
            continue
          }
          if (!h.shares || h.shares === 0) {
            lines.push(`| ${h.ticker} | 0 | — | — | — | — | ${coreTargetMap[h.ticker] ?? '—'} |`)
            continue
          }
          const price = prices[h.ticker] ?? 0
          const val = h.shares * price * fxRate
          const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
          const sign = pnlPct >= 0 ? '+' : '-'
          lines.push(`| ${h.ticker} | ${h.shares.toFixed(2)} | $${(h.costUsd ?? 0).toFixed(2)} | $${price.toFixed(2)} | ${sign}${Math.abs(pnlPct).toFixed(1)}% | ฿${val.toFixed(0)} | ${coreTargetMap[h.ticker] ?? '—'} |`)
        }
      } else if (isScreener) {
        const coreTickers = core.filter((h) => !h.isTHB && h.shares > 0).map((h) => h.ticker)
        lines.push(`Core holdings: ${coreTickers.join(', ')}, MTS-GOLD`)
      } else {
        // trading-signals — compact
        lines.push(`Core holdings (total ฿${coreTotal.toFixed(0)}):`)
        for (const h of core) {
          if (h.isTHB) {
            lines.push(`MTS-GOLD  1 unit | nav ฿${mtsGoldNav.value.toFixed(0)} (${mtsGoldNav.updatedAt})`)
            continue
          }
          if (!h.shares || h.shares === 0) continue
          const price = prices[h.ticker] ?? 0
          const val = h.shares * price * fxRate
          const pnlPct = h.costUsd && price ? ((price - h.costUsd) / h.costUsd) * 100 : 0
          const sign = pnlPct >= 0 ? '+' : '−'
          lines.push(`${h.ticker.padEnd(6)} ${h.shares.toFixed(2)} sh | cost $${(h.costUsd ?? 0).toFixed(2)} | px $${price.toFixed(2)} | ${sign}${Math.abs(pnlPct).toFixed(1)}% | ฿${val.toFixed(0)}`)
        }
      }
      lines.push('')
    }

    // --- DCA / Goal context ---
    if (ctx.goal && (isPortfolioAnalysis || topic === 'custom')) {
      const totalDca = dca.coreMonthlyThb + dca.satelliteMonthlyThb
      lines.push(`DCA: Core ฿${dca.coreMonthlyThb.toLocaleString()}/mo + Satellite ฿${dca.satelliteMonthlyThb.toLocaleString()}/mo = ฿${totalDca.toLocaleString()}/mo total`)
      lines.push('')
    }

    // --- Rebalance status ---
    if (ctx.rebalance && (isPortfolioAnalysis || topic === 'custom')) {
      lines.push(`Core/Satellite actual: ${corePct}% / ${satPct}%  (target 50:50)`)
      lines.push('')
    }

    lines.push(`Question: ${question}`)

    return lines.join('\n')
  }, [topic, question, ctx, satellite, core, satelliteCashThb, mtsGoldNav, prices, fxRate, dca])

  const skill = topic ? SKILL_HINTS[topic] : ''
  const charCount = prompt.length

  async function handleCopy() {
    if (!prompt) return
    const ok = await copyToClipboard(prompt)
    if (ok) {
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-ink/20 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-canvas z-50 flex flex-col overflow-hidden shadow-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
          <h2 className="text-lg font-light text-ink">{t.askClaude}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink-mute hover:text-ink transition-colors text-xl"
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
                <p className="text-[10px] text-ink-mute uppercase tracking-widest mb-3">{t.selectTopic}</p>
                <div className="flex flex-wrap gap-2">
                  {topics.map((tp) => (
                    <button
                      key={tp.key}
                      onClick={() => setTopic(tp.key)}
                      className={`px-3 py-1.5 rounded-pill text-xs font-normal transition-all ${
                        topic === tp.key
                          ? 'bg-primary text-white'
                          : 'border border-hairline text-ink-mute hover:text-ink hover:border-primary/40'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-[10px] text-ink-mute uppercase tracking-widest mb-2">
                  {t.yourQuestion}
                </label>
                <textarea
                  rows={4}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-sm border border-hairline-input bg-canvas px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-ink placeholder:text-ink-mute transition-colors"
                />
              </div>

              {/* Context toggles */}
              <div>
                <p className="text-[10px] text-ink-mute uppercase tracking-widest mb-3">{t.contextToggles}</p>
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
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="text-sm text-ink-mute group-hover:text-ink transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Prompt preview (mobile) */}
              {prompt && (
                <div className="md:hidden">
                  <p className="text-[10px] text-ink-mute uppercase tracking-widest mb-2">{t.promptPreview}</p>
                  <pre className="text-xs text-ink-mute rounded-md border border-hairline bg-canvas-soft p-3 whitespace-pre-wrap overflow-auto max-h-60">
                    {prompt}
                  </pre>
                </div>
              )}
            </div>

            {/* Right: preview (desktop) */}
            {prompt && (
              <div className="hidden md:flex flex-col w-64 border-l border-hairline">
                <p className="px-4 pt-4 pb-2 text-[10px] text-ink-mute uppercase tracking-widest">
                  {t.promptPreview}
                </p>
                <pre className="flex-1 px-4 pb-4 text-xs text-ink-mute whitespace-pre-wrap overflow-auto">
                  {prompt}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between gap-3 border-t border-hairline">
          <span className="text-xs text-ink-mute">
            {charCount} {t.chars}{skill ? ` · ${skill}` : ''}
          </span>
          <button
            onClick={handleCopy}
            disabled={!topic || !question.trim()}
            className={`px-4 py-2 rounded-pill text-sm font-normal transition-colors ${
              copyState === 'copied'
                ? 'bg-gain text-white'
                : topic && question.trim()
                  ? 'bg-primary text-white hover:bg-primary-deep'
                  : 'text-ink-mute border border-hairline cursor-not-allowed'
            }`}
          >
            {copyState === 'copied' ? t.copySuccess : t.copyPrompt}
          </button>
        </div>
      </div>
    </>
  )
}
