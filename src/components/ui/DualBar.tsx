interface DualBarProps {
  actual: number   // 0–100
  target: number   // 0–100
  tone?: 'success' | 'warning' | 'danger'
}

export function DualBar({ actual, target, tone = 'success' }: DualBarProps) {
  const barColor = {
    success: 'bg-gain',
    warning: 'bg-yellow-400',
    danger: 'bg-loss',
  }[tone]

  const clampedActual = Math.min(Math.max(actual, 0), 100)
  const clampedTarget = Math.min(Math.max(target, 0), 100)

  return (
    <div className="relative h-2 w-full rounded-full bg-surface-border overflow-visible">
      <div
        className={`h-full rounded-full transition-all ${barColor} opacity-80`}
        style={{ width: `${clampedActual}%` }}
      />
      {/* target marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-muted rounded-sm"
        style={{ left: `${clampedTarget}%`, transform: 'translateX(-50%) translateY(-50%)' }}
      />
    </div>
  )
}
