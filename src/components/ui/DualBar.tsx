interface DualBarProps {
  actual: number
  target: number
  tone?: 'success' | 'warning' | 'danger'
}

export function DualBar({ actual, target, tone = 'success' }: DualBarProps) {
  const barColor = {
    success: '#00A63D',
    warning: '#FE9900',
    danger: '#FF2157',
  }[tone]

  const clampedActual = Math.min(Math.max(actual, 0), 100)
  const clampedTarget = Math.min(Math.max(target, 0), 100)

  return (
    <div className="relative h-1.5 w-full rounded-xs overflow-visible bg-hairline">
      <div
        className="h-full rounded-xs transition-all opacity-80"
        style={{ width: `${clampedActual}%`, backgroundColor: barColor }}
      />
      <div
        className="absolute top-1/2 w-0.5 h-3 rounded-xs bg-ink-mute"
        style={{
          left: `${clampedTarget}%`,
          transform: 'translateX(-50%) translateY(-50%)',
        }}
      />
    </div>
  )
}
