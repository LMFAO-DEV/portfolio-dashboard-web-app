import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { usePortfolioStore } from '../store/portfolio'
import { useStrings } from '../i18n/strings'
import { calcFV, calcRequiredPmt, calcMilestoneYear, buildGrowthSeries } from '../utils/calc'
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-muted">{label}</label>
        <span className="text-sm font-mono font-bold text-white bg-surface-border px-2 py-0.5 rounded">{display}</span>
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
      <div className="flex justify-between text-xs text-faint font-mono">
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

  const chartData = buildGrowthSeries(current, monthly, rate, years)

  const DCA_YEARS = [5, 10, 15, 20, 25]

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: Sliders */}
        <div className="lg:w-80 shrink-0">
          <h1 className="font-bold text-lg text-white mb-5">{t.goalCalc}</h1>
          <div className="bg-surface border border-surface-border rounded-xl p-5 space-y-5">
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
          <div className={`rounded-xl p-5 border ${meetsTarget ? 'bg-gain/5 border-gain/20' : 'bg-loss/5 border-loss/20'}`}>
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{t.projectedValue}</p>
            <p className={`text-3xl font-bold font-mono ${meetsTarget ? 'text-gain' : 'text-loss'}`}>
              {fmtThbRaw(projected, true)}
            </p>
            <div className="mt-4 h-2 bg-surface-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${meetsTarget ? 'bg-gain' : 'bg-loss'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-1.5 font-mono">{progressPct.toFixed(0)}% of target</p>
            {meetsTarget ? (
              <p className="mt-2 text-sm font-medium text-gain">
                {t.meetsTarget} · {t.surplus} {fmtThb(projected - target)}
              </p>
            ) : (
              <div className="mt-2 space-y-0.5 text-sm text-loss">
                <p>{t.missing} {fmtThbRaw(target - projected, true)} {t.ofTarget} {fmtThbSlider(target)}</p>
                {extraPmt > 0 && <p className="font-medium">+{fmtThbSlider(Math.ceil(extraPmt))}{t.extraMonthly}</p>}
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <h3 className="font-semibold text-sm text-white mb-3">{t.milestones}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {milestoneData.map(({ milestone, year }) => {
                const reached = year === 0
                const withinHorizon = year !== null && year > 0
                return (
                  <div
                    key={milestone}
                    className={`rounded-lg p-2.5 text-center border ${
                      reached
                        ? 'bg-gain/10 border-gain/20 text-gain'
                        : withinHorizon
                          ? 'bg-accent/10 border-accent/20 text-accent'
                          : 'bg-surface-raised border-surface-border text-faint'
                    }`}
                  >
                    <p className="text-xs font-mono font-bold">
                      {milestone >= 1_000_000 ? `฿${milestone / 1_000_000}M` : `฿${milestone / 1000}K`}
                    </p>
                    <p className="text-xs mt-0.5">
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
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <h3 className="font-semibold text-sm text-white mb-3">{t.growthChart}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b2f45" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#808a9d' }} axisLine={{ stroke: '#2b2f45' }} tickLine={false} />
                <YAxis tickFormatter={fmtThbYAxis} tick={{ fontSize: 11, fill: '#808a9d' }} width={52} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => fmtThbRaw(Number(v), true)}
                  labelStyle={{ fontSize: 11, color: '#808a9d' }}
                  contentStyle={{ fontSize: 12, backgroundColor: '#1e2130', border: '1px solid #2b2f45', borderRadius: '8px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#808a9d' }} />
                <ReferenceLine
                  y={target}
                  stroke="#ea3943"
                  strokeDasharray="4 4"
                  label={{ value: t.targetLine, position: 'insideTopRight', fontSize: 10, fill: '#ea3943' }}
                />
                <Line type="monotone" dataKey="projected" name={t.projected} stroke="#16c784" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="invested" name={t.invested} stroke="#3861fb" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* DCA Reference Table */}
          <div className="bg-surface border border-surface-border rounded-xl p-4">
            <h3 className="font-semibold text-sm text-white mb-3">{t.dcaTable}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs text-faint">
                  <th className="text-left pb-2 font-medium uppercase tracking-wide">{t.yearsCol}</th>
                  <th className="text-right pb-2 font-medium uppercase tracking-wide">{t.requiredDca}</th>
                </tr>
              </thead>
              <tbody>
                {DCA_YEARS.map((y) => {
                  const pmt = calcRequiredPmt(target, current, rate, y)
                  return (
                    <tr key={y} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-raised/50 transition-colors">
                      <td className="py-2.5 text-muted">{y} yr</td>
                      <td className={`py-2.5 text-right font-mono font-medium ${pmt < 0 ? 'text-faint' : pmt <= monthly ? 'text-gain' : 'text-white'}`}>
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
