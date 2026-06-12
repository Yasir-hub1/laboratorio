import { cn } from '@/utils/cn'

const colors = {
  default: 'bg-surface-muted text-muted ring-1 ring-border',
  success: 'bg-accent-soft text-accent ring-1 ring-accent/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200/60',
  info: 'bg-primary-soft text-primary ring-1 ring-primary/20',
  primary: 'bg-primary-soft text-primary ring-1 ring-primary/20',
}

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors[variant] ?? colors.default,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
