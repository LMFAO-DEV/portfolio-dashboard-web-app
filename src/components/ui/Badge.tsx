interface BadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'neutral'
  children: React.ReactNode
  size?: 'sm' | 'base'
}

export function Badge({ variant, children, size = 'base' }: BadgeProps) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-700',
  }
  const sizing = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs font-medium'
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizing} ${colors[variant]}`}>
      {children}
    </span>
  )
}
