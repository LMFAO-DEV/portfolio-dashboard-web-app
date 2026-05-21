interface DualBarProps {
  actual: number   // 0–100
  target: number   // 0–100
  tone?: 'success' | 'warning' | 'danger'
}

export function DualBar({ actual, target, tone = 'success' }: DualBarProps) {
  const barColor = {
    success: 'bg-green-500',
    warning: 'bg-yellow-400',
    danger: 'bg-red-500',
  }[tone]

  const clampedActual = Math.min(Math.max(actual, 0), 100)
  const clampedTarget = Math.min(Math.max(target, 0), 100)

  return (
    <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-visible">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${clampedActual}%` }}
      />
      {/* target marker */}
      <div
        className="absolute top-0 h-full w-0.5 bg-red-500"
        style={{ left: `${clampedTarget}%`, transform: 'translateX(-50%)' }}
      />
    </div>
  )
}
