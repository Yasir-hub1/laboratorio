import { cn } from '@/utils/cn'

export function Input({ className, label, labelClassName, error, id, ...props }) {
  const inputId = id ?? props.name
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn('text-sm font-medium text-foreground', labelClassName)}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
          'placeholder:text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function Textarea({ className, label, error, id, ...props }) {
  const inputId = id ?? props.name
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
          'placeholder:text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function Select({ className, label, labelClassName, error, id, children, ...props }) {
  const inputId = id ?? props.name
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn('text-sm font-medium text-foreground', labelClassName)}
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
          error && 'border-danger',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
