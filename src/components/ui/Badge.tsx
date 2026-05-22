interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  children: React.ReactNode
  size?: 'sm' | 'base'
}

export function Badge({ variant, children, size = 'base' }: BadgeProps) {
  const colors = {
    success: 'bg-gain/10 text-gain border border-gain/20',
    warning: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
    danger: 'bg-loss/10 text-loss border border-loss/20',
    neutral: 'bg-white/5 text-muted border border-surface-border',
  }
  const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs font-medium'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizing} ${colors[variant]}`}>
      {children}
    </span>
  )
}
