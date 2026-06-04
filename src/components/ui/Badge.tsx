interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  children: React.ReactNode
  size?: 'sm' | 'base'
}

export function Badge({ variant, children, size = 'base' }: BadgeProps) {
  const colors = {
    success: 'bg-gain/10 text-gain border border-gain/25',
    warning: 'bg-warning/10 text-warning border border-warning/25',
    danger: 'bg-loss/10 text-loss border border-loss/25',
    neutral: 'bg-hairline/60 text-ink-mute border border-hairline',
  }
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center rounded-pill font-normal ${sizing} ${colors[variant]}`}>
      {children}
    </span>
  )
}
