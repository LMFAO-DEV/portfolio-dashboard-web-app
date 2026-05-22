interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export function Skeleton({ className = '', width = 'w-20', height = 'h-4' }: SkeletonProps) {
  return (
    <span
      className={`inline-block animate-pulse rounded bg-surface-border ${width} ${height} ${className}`}
    />
  )
}

export function SkeletonText({ className = '' }: { className?: string }) {
  return <Skeleton className={className} width="w-24" height="h-5" />
}

export function SkeletonNum({ className = '' }: { className?: string }) {
  return <Skeleton className={className} width="w-16" height="h-4" />
}
