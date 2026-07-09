import { Calendar, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/utils/cn'

export function PortalOrderDateFilters({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  className,
}) {
  const hasFilter = Boolean(dateFrom || dateTo)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>Registrada entre</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
        <Input
          type="date"
          label="Desde"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          aria-label="Fecha desde"
          className="min-w-0 w-full"
        />
        <Input
          type="date"
          label="Hasta"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          min={dateFrom || undefined}
          aria-label="Fecha hasta"
          className="min-w-0 w-full"
        />
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-11 w-full gap-1.5 text-muted hover:text-foreground sm:col-span-2 sm:h-9 sm:w-auto sm:justify-self-start"
          >
            <X className="h-4 w-4" aria-hidden />
            Limpiar fechas
          </Button>
        )}
      </div>
    </div>
  )
}
