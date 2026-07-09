import { Badge } from './Badge'
import { cn } from '@/utils/cn'
import { FLOW_BY_QUEUE } from '@/utils/orderWorkflow'

export function Tabs({ items, value, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const active = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface text-muted hover:border-primary/30 hover:text-foreground',
            )}
          >
            <span>{item.label}</span>
            {item.count != null && (
              <Badge variant={active ? 'info' : 'default'} className="min-w-[1.25rem] justify-center">
                {item.count}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function WorkflowStepper({ workflowStatus }) {
  const ws = Number(workflowStatus)
  const isAnnulled = ws === 6

  const steps = [
    { status: 1, label: 'Pendiente' },
    { status: 2, label: 'En proceso' },
    { status: 3, label: 'En revisión' },
    { status: 4, label: 'Revisada' },
    { status: 5, label: 'Completada' },
  ]

  if (isAnnulled) {
    return (
      <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
        Orden anulada
      </p>
    )
  }

  return (
    <ol className="flex flex-wrap gap-1 text-[11px]">
      {steps.map((step) => {
        const active = ws === step.status
        const done = ws > step.status
        return (
          <li
            key={step.status}
            className={cn(
              'rounded-full px-2 py-0.5',
              active && 'bg-primary text-primary-foreground',
              done && !active && 'bg-primary/15 text-primary',
              !active && !done && 'bg-surface-muted text-muted',
            )}
          >
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}

export function WorkflowProgressBar({ workflowStatus }) {
  const ws = Number(workflowStatus)
  const isAnnulled = ws === 6

  return (
    <div className="flex items-center gap-0.5" title={isAnnulled ? 'Anulada' : `Estado ${ws}`}>
      {[1, 2, 3, 4, 5].map((step) => {
        const filled = !isAnnulled && ws >= step
        return (
          <span
            key={step}
            className={cn(
              'h-2 flex-1 rounded-sm',
              isAnnulled ? 'bg-danger/70' : filled ? 'bg-primary' : 'bg-border',
            )}
          />
        )
      })}
    </div>
  )
}

export function WorkflowFlowBar({ workflowStatus, activeStep = 1 }) {
  const steps = FLOW_BY_QUEUE[workflowStatus] ?? []
  if (!steps.length) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {steps.map((step) => {
        const done = step.n < activeStep
        const active = step.n === activeStep
        return (
          <span
            key={step.n}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
              active && 'bg-primary text-primary-foreground',
              done && !active && 'bg-primary/15 text-primary',
              !active && !done && 'bg-surface-muted text-muted',
            )}
          >
            {step.label}
          </span>
        )
      })}
    </div>
  )
}

export function OrderStatGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>{children}</div>
  )
}

export function OrderStat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value ?? '—'}</p>
    </div>
  )
}

export function WorkflowAlert({ variant = 'info', children, className }) {
  const styles = {
    info: 'border-primary/20 bg-primary/5 text-primary',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    danger: 'border-danger/30 bg-danger/5 text-danger',
  }
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        styles[variant] ?? styles.info,
        className,
      )}
    >
      {children}
    </div>
  )
}
