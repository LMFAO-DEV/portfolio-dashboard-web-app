import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { fmtThbRaw, fmtThb, fmtPct } from '../utils/format'

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`
  return `฿${v}`
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(d)
}

type ChartPoint = {
  date: string
  portfolio: number
  voo?: number
  cash?: number
}

export function NetWorthChart() {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const history = usePortfolioStore((s) => s.history)
  const [showBenchmark, setShowBenchmark] = useState(false)

  const { data, change, changePct, hasBenchmark } = useMemo(() => {
    if (history.length < 2) {
      return {
        data: history.map((p): ChartPoint => ({ date: p.date, portfolio: p.totalThb })),
        change: 0, changePct: 0, hasBenchmark: false,
      }
    }

    const base = history[0]
    const last = history[history.length - 1]
    const change = last.totalThb - base.totalThb
    const changePct = base.totalThb > 0 ? (change / base.totalThb) * 100 : 0

    // VOO benchmark: hypothetical "put base totalThb into VOO on day 0"
    const baseVoo = base.vooUsd
    const hasBenchmark = !!baseVoo && history.some((p, i) => i > 0 && p.vooUsd != null)

    const data: ChartPoint[] = history.map((p) => ({
      date: p.date,
      portfolio: p.totalThb,
      ...(hasBenchmark && baseVoo && p.vooUsd != null
        ? { voo: base.totalThb * (p.vooUsd / baseVoo) }
        : {}),
      cash: base.totalThb, // flat THB cash — no return
    }))

    return { data, change, changePct, hasBenchmark }
  }, [history])

  // Latest vs benchmark on the last point
  const lastPoint = data[data.length - 1]
  const vooDiff = lastPoint?.voo != null ? lastPoint.portfolio - lastPoint.voo : null

  return (
    <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.netWorthHistory}</h2>
          {data.length >= 2 && (
            <p className={`tabular text-xs mt-0.5 ${change >= 0 ? 'text-gain' : 'text-loss'}`}>
              {change >= 0 ? '▲' : '▼'} {fmtThb(change)} ({fmtPct(changePct)}) {t.sinceStart}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {vooDiff != null && showBenchmark && (
            <span className={`tabular text-xs ${vooDiff >= 0 ? 'text-gain' : 'text-loss'}`}>
              {vooDiff >= 0 ? '▲' : '▼'} {fmtThb(vooDiff)} vs VOO
            </span>
          )}
          {(hasBenchmark || data.length >= 2) && (
            <label className="flex items-center gap-1.5 text-xs text-ink-mute cursor-pointer">
              <input
                type="checkbox"
                checked={showBenchmark}
                onChange={(e) => setShowBenchmark(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
              />
              Benchmark
            </label>
          )}
        </div>
      </div>

      {data.length < 2 ? (
        <p className="text-sm text-ink-mute py-8 text-center">{t.netWorthEmpty}</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ee" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtShortDate}
                tick={{ fontSize: 11, fill: '#64748d', fontFamily: 'Inter' }}
                axisLine={{ stroke: '#e3e8ee' }}
                tickLine={false}
                minTickGap={32}
              />
              <YAxis
                tickFormatter={fmtAxis}
                tick={{ fontSize: 11, fill: '#64748d', fontFamily: 'Inter' }}
                width={56}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(v) => fmtThbRaw(Number(v), true)}
                labelFormatter={(label) => fmtShortDate(String(label))}
                labelStyle={{ fontSize: 11, color: '#64748d', fontFamily: 'Inter' }}
                contentStyle={{
                  fontSize: 12,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e3e8ee',
                  borderRadius: '8px',
                  color: '#0d253d',
                  boxShadow: 'rgba(0,55,112,0.08) 0 8px 24px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748d', fontFamily: 'Inter' }} />
              <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="#533afd" strokeWidth={2} dot={false} />
              {showBenchmark && hasBenchmark && (
                <Line type="monotone" dataKey="voo" name={t.benchmarkVoo} stroke="#00A63D" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
              )}
              {showBenchmark && (
                <Line type="monotone" dataKey="cash" name={t.benchmarkCash} stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 3" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>

          {showBenchmark && !hasBenchmark && (
            <p className="text-xs text-ink-mute mt-2 text-center">{t.benchmarkHint}</p>
          )}
        </>
      )}
    </div>
  )
}
