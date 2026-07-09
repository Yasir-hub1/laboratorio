import { Card, CardHeader, CardTitle } from '@/components/ui'
import { formatRefRange } from '@/utils/orderWorkflow'
import { formatComponentUnit } from '@/utils/portalOrders'
import { cn } from '@/utils/cn'

function ComponentRow({ component, className }) {
  const value = component.value_obtained ?? '—'
  const unit = formatComponentUnit(component)
  const reference = formatRefRange(component)

  return (
    <div
      className={cn(
        'grid gap-3 border-b border-border/50 px-4 py-3.5 last:border-0 sm:grid-cols-4 sm:items-center sm:gap-4 sm:px-4 sm:py-3',
        className,
      )}
    >
      <div className="min-w-0 sm:col-span-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:sr-only">
          Componente
        </p>
        <p className="font-medium text-foreground">{component.name}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:contents">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:hidden">
            Resultado
          </p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground sm:mt-0 sm:text-sm sm:font-medium">
            {value}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:hidden">
            Unidad
          </p>
          <p className="mt-0.5 text-sm text-muted sm:mt-0">{unit}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:hidden">
            Referencia
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-muted sm:mt-0">{reference}</p>
        </div>
      </div>
    </div>
  )
}

export function PortalResultsTable({ analyses, accentClass = 'bg-emerald-500/10 text-emerald-700' }) {
  if (!analyses?.length) return null

  return (
    <div className="space-y-4">
      {analyses.map((analysis, index) => (
        <Card
          key={analysis.sample_analysis_id ?? analysis.analysis_name}
          className="overflow-hidden border-white/60"
        >
          <CardHeader className="border-b border-border/60 bg-surface-muted/40 px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1 ring-inset',
                  accentClass,
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base leading-snug sm:text-[1.05rem]">
                  {analysis.analysis_name}
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted">
                  {(analysis.components ?? []).length}{' '}
                  {(analysis.components ?? []).length === 1 ? 'componente' : 'componentes'}
                </p>
              </div>
            </div>
          </CardHeader>

          {/* Desktop table header */}
          <div className="hidden border-b border-border/60 bg-surface-muted/20 sm:grid sm:grid-cols-4 sm:gap-4 sm:px-4 sm:py-2.5">
            {['Componente', 'Resultado', 'Unidad', 'Referencia'].map((label) => (
              <p
                key={label}
                className="text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {label}
              </p>
            ))}
          </div>

          <div className="divide-y divide-border/40 sm:divide-y-0">
            {(analysis.components ?? []).map((component) => (
              <ComponentRow key={component.id ?? component.name} component={component} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
