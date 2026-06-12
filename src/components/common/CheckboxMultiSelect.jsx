import { cn } from '@/utils/cn'

/**
 * Selección múltiple por checkboxes (roles, sucursales, etc.).
 */
export function CheckboxMultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  required = false,
  className,
  emptyMessage = 'Sin opciones disponibles.',
  countLabel = 'seleccionado',
}) {
  const selectedSet = new Set(value.map(String))

  const toggle = (id) => {
    const key = String(id)
    const next = selectedSet.has(key)
      ? value.filter((v) => String(v) !== key)
      : [...value, key]
    onChange(next)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-danger"> *</span>}
      </p>
      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface-muted/30 p-2">
          {options.map((opt) => {
            const id = String(opt.id)
            const checked = selectedSet.has(id)
            return (
              <label
                key={id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm transition-colors',
                  checked && 'border-primary/40 bg-primary/5',
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  checked={checked}
                  onChange={() => toggle(id)}
                />
                <span className="flex-1">{opt.name}</span>
              </label>
            )
          })}
        </div>
      )}
      {value.length > 0 && (
        <p className="text-xs text-muted">
          {value.length} {countLabel}
          {value.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
