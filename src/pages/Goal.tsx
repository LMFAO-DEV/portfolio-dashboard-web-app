import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { calcFV, calcRequiredPmt, calcMilestoneYear, buildScenarioSeries } from '../utils/calc'

const SCENARIO_SPREAD = 3 // ± percentage points for bull / bear
import { fmtThbRaw, fmtThb } from '../utils/format'

const MILESTONES = [1_000_000, 2_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000]

interface GoalProps {
  prices: Record<string, number>
  fxRate: number
}

function LabelledSlider({
  label, value, min, max, step, display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  function startEdit() {
    setRaw(String(value))
    setEditing(true)
  }

  function commitEdit() {
    const parsed = Number(raw.replace(/,/g, ''))
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed))
      onChange(clamped)
    }
    setEditing(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-ink-mute uppercase tracking-widest">{label}</label>
        {editing ? (
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="tabular text-sm text-ink px-2 py-0.5 rounded-xs border border-primary bg-canvas-soft w-28 text-right outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            title="Click to type a value"
            className="tabular text-sm text-ink px-2 py-0.5 rounded-xs border border-hairline bg-canvas-soft hover:border-primary hover:bg-canvas transition-colors cursor-text"
          >
            {display}
          </button>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-ink-mute">
        <span>{min >= 1_000_000 ? `฿${(min / 1_000_000).toFixed(0)}M` : min >= 1000 ? `฿${(min / 1000).toFixed(0)}K` : `${min}`}</span>
        <span>{max >= 1_000_000 ? `฿${(max / 1_000_000).toFixed(0)}M` : max >= 1000 ? `฿${(max / 1000).toFixed(0)}K` : `${max}`}</span>
      </div>
    </div>
  )
}

function fmtThbSlider(v: number): string {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`
  return `฿${v}`
}

function fmtThbYAxis(v: number): string {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(0)}M`
  if (v >= 1000) return `฿${(v / 1000).toFixed(0)}K`
  return `฿${v}`
}

export function Goal({ prices, fxRate }: GoalProps) {
  const lang = usePortfolioStore((s) => s.lang)
  const t = useStrings(lang)
  const satellite = usePortfolioStore((s) => s.satellite)
  const core = usePortfolioStore((s) => s.core)
  const mtsGoldNav = usePortfolioStore((s) => s.mtsGoldNav)
  const satelliteCashThb = usePortfolioStore((s) => s.satelliteCashThb)
  const dca = usePortfolioStore((s) => s.dca)

  const liveTotal = useMemo(() => {
    const sat = satellite.reduce((s, h) => {
      if (!h.shares) return s
      return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
    }, 0) + satelliteCashThb
    const cor = core.reduce((s, h) => {
      if (!h.shares) return s
      if (h.isTHB) return s + h.shares * mtsGoldNav.value
      return s + h.shares * (prices[h.ticker] ?? 0) * fxRate
    }, 0)
    return sat + cor
  }, [satellite, core, prices, fxRate, satelliteCashThb, mtsGoldNav])

  const defaultDca = dca.coreMonthlyThb + dca.satelliteMonthlyThb

  const [target, setTarget] = useState(15_000_000)
  const [current, setCurrent] = useState(() => liveTotal || 1_800_000)
  const [monthly, setMonthly] = useState(defaultDca || 35000)
  const [rate, setRate] = useState(9)
  const [years, setYears] = useState(20)
  const [inflation, setInflation] = useState(3)
  const [realAdjusted, setRealAdjusted] = useState(false)

  const projected = calcFV(current, monthly, rate, years)
  const meetsTarget = projected >= target
  const progressPct = Math.min((projected / target) * 100, 100)
  const requiredPmt = calcRequiredPmt(target, current, rate, years)
  const extraPmt = Math.max(0, requiredPmt - monthly)

  const currentYear = new Date().getFullYear()

  const milestoneData = MILESTONES.map((m) => {
    const y = calcMilestoneYear(current, monthly, rate, years, m)
    return { milestone: m, year: y }
  })

  const chartData = buildScenarioSeries(
    current, monthly, rate, years, SCENARIO_SPREAD, realAdjusted ? inflation : 0,
  )

  const DCA_YEARS = [5, 10, 15, 20, 25]

  return (
    <div className="p-5 sm:p-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: Sliders */}
        <div className="lg:w-80 shrink-0">
          <h1 className="font-light text-2xl text-ink tracking-[-0.02em] mb-6">{t.goalCalc}</h1>
          <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-6 space-y-6">
            <LabelledSlider
              label={t.targetAmount}
              value={target}
              min={1_000_000}
              max={50_000_000}
              step={100_000}
              display={fmtThbSlider(target)}
              onChange={setTarget}
            />
            <LabelledSlider
              label={t.currentValue}
              value={current}
              min={0}
              max={50_000_000}
              step={10_000}
              display={fmtThbSlider(current)}
              onChange={setCurrent}
            />
            <LabelledSlider
              label={t.monthlyDca}
              value={monthly}
              min={1_000}
              max={200_000}
              step={1_000}
              display={fmtThbSlider(monthly)}
              onChange={setMonthly}
            />
            <LabelledSlider
              label={t.annualReturn}
              value={rate}
              min={5}
              max={25}
              step={0.5}
              display={`${rate}%`}
              onChange={setRate}
            />
            <LabelledSlider
              label={t.timeHorizon}
              value={years}
              min={1}
              max={30}
              step={1}
              display={`${years} yr`}
              onChange={setYears}
            />
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex-1 space-y-4">

          {/* Result card */}
          <div
            className={`bg-canvas rounded-xl border shadow-panel p-6 border-l-4 ${meetsTarget ? 'border-l-gain border-hairline' : 'border-l-loss border-hairline'}`}
          >
            <p className="text-[10px] text-ink-mute uppercase tracking-[0.08em] font-normal mb-2">{t.projectedValue}</p>
            <p className={`text-3xl font-light tabular ${meetsTarget ? 'text-gain' : 'text-loss'}`}>
              {fmtThbRaw(projected, true)}
            </p>
            <div className="mt-4 h-2 rounded-full overflow-hidden bg-hairline">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: meetsTarget ? '#00A63D' : '#FF2157',
                }}
              />
            </div>
            <p className="tabular text-xs text-ink-mute mt-1.5">{progressPct.toFixed(0)}% of target</p>
            {meetsTarget ? (
              <p className="mt-2 text-sm font-light text-gain">
                {t.meetsTarget} · {t.surplus} {fmtThb(projected - target)}
              </p>
            ) : (
              <div className="mt-2 space-y-0.5 text-sm text-loss">
                <p>{t.missing} {fmtThbRaw(target - projected, true)} {t.ofTarget} {fmtThbSlider(target)}</p>
                {extraPmt > 0 && <p className="font-light">+{fmtThbSlider(Math.ceil(extraPmt))}{t.extraMonthly}</p>}
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
            <h3 className="font-light text-[15px] text-ink tracking-[-0.01em] mb-4">{t.milestones}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {milestoneData.map(({ milestone, year }) => {
                const reached = year === 0
                const withinHorizon = year !== null && year > 0
                const borderColor = reached ? 'border-l-gain' : withinHorizon ? 'border-l-primary' : 'border-l-hairline'
                return (
                  <div
                    key={milestone}
                    className={`rounded-md border border-hairline border-l-2 ${borderColor} p-2.5 text-center bg-canvas-soft`}
                  >
                    <p className={`tabular text-xs font-normal ${reached ? 'text-gain' : withinHorizon ? 'text-primary' : 'text-ink-mute'}`}>
                      {milestone >= 1_000_000 ? `฿${milestone / 1_000_000}M` : `฿${milestone / 1000}K`}
                    </p>
                    <p className={`text-xs mt-0.5 ${reached ? 'text-gain' : withinHorizon ? 'text-primary' : 'text-ink-mute'}`}>
                      {reached
                        ? t.alreadyReached
                        : withinHorizon
                          ? `${currentYear + year!}`
                          : t.notReached}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Growth chart */}
          <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-light text-[15px] text-ink tracking-[-0.01em]">{t.growthChart}</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-ink-mute">
                  {t.inflationLabel}
                  <input
                    type="number" min="0" max="10" step="0.5"
                    value={inflation}
                    onChange={(e) => setInflation(Number(e.target.value) || 0)}
                    className="tabular w-14 rounded-xs border border-hairline bg-canvas-soft px-1.5 py-0.5 text-right text-ink outline-none focus:border-primary"
                  />%
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink-mute cursor-pointer">
                  <input
                    type="checkbox"
                    checked={realAdjusted}
                    onChange={(e) => setRealAdjusted(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                  />
                  {t.realToggle}
                </label>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ee" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748d', fontFamily: 'Inter' }} axisLine={{ stroke: '#e3e8ee' }} tickLine={false} />
                <YAxis tickFormatter={fmtThbYAxis} tick={{ fontSize: 11, fill: '#64748d', fontFamily: 'Inter' }} width={52} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => fmtThbRaw(Number(v), true)}
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
                <Legend wrapperStyle={{ fontSize: 12, color: '#64748d', fontFamily: 'Inter' }} />
                <ReferenceLine
                  y={target}
                  stroke="#FF2157"
                  strokeDasharray="4 4"
                  label={{ value: t.targetLine, position: 'insideTopRight', fontSize: 10, fill: '#FF2157', fontFamily: 'Inter' }}
                />
                <Line type="monotone" dataKey="bull" name={t.scenarioBull} stroke="#00A63D" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="base" name={t.scenarioBase} stroke="#00A63D" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bear" name={t.scenarioBear} stroke="#FE9900" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="invested" name={t.invested} stroke="#533afd" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* DCA Reference Table */}
          <div className="bg-canvas rounded-xl border border-hairline shadow-panel p-5">
            <h3 className="font-light text-[15px] text-ink tracking-[-0.01em] mb-4">{t.dcaTable}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left pb-2 text-[10px] text-ink-mute font-normal uppercase tracking-widest">{t.yearsCol}</th>
                  <th className="text-right pb-2 text-[10px] text-ink-mute font-normal uppercase tracking-widest">{t.requiredDca}</th>
                </tr>
              </thead>
              <tbody>
                {DCA_YEARS.map((y) => {
                  const pmt = calcRequiredPmt(target, current, rate, y)
                  return (
                    <tr
                      key={y}
                      className="border-b border-hairline transition-colors hover:bg-canvas-soft"
                    >
                      <td className="py-2.5 text-ink-mute">{y} yr</td>
                      <td className={`py-2.5 text-right tabular font-light ${pmt < 0 ? 'text-ink-mute' : pmt <= monthly ? 'text-gain' : 'text-ink'}`}>
                        {pmt < 0 ? '—' : fmtThbSlider(Math.ceil(pmt))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
