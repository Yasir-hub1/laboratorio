import { useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { formatCurrency } from '@/utils/apiHelpers'
import { cn } from '@/utils/cn'

function filterGroupsBySearch(groups, search) {
  const q = search.trim().toLowerCase()
  if (!q) return groups

  return groups
    .map((group) => {
      const groupMatch = group.name.toLowerCase().includes(q)
      const analyses = (group.analyses ?? []).filter(
        (a) =>
          groupMatch ||
          a.name.toLowerCase().includes(q) ||
          group.name.toLowerCase().includes(q),
      )
      return analyses.length ? { ...group, analyses } : null
    })
    .filter(Boolean)
}

export function AnalysisGroupCatalog({
  groups,
  selected,
  onToggle,
  search,
  onSearchChange,
  collapsedGroups,
  onToggleGroup,
}) {
  const filtered = useMemo(() => filterGroupsBySearch(groups, search), [groups, search])

  if (!filtered.length) {
    return (
      <div className="rounded-lg border border-border px-4 py-6 text-center text-sm text-muted">
        {search.trim()
          ? 'Sin resultados para esa búsqueda.'
          : 'No hay análisis disponibles en el catálogo.'}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-surface-muted/40 p-2.5">
        <input
          type="search"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Filtrar análisis por nombre o grupo…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {filtered.map((group) => {
        const isOpen = !collapsedGroups.has(group.id)
        const selectedCount = (group.analyses ?? []).filter((a) =>
          Boolean(selected[String(a.id)]),
        ).length

        return (
          <div key={group.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 bg-surface-muted/30 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-muted hover:bg-surface-muted"
              onClick={() => onToggleGroup(group.id)}
            >
              <span>{group.name}</span>
              <span className="flex items-center gap-1.5 normal-case tracking-normal">
                {selectedCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {selectedCount} selec.
                  </span>
                )}
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted">
                  {group.analyses.length}
                </span>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
                />
              </span>
            </button>
            {isOpen && (
              <div>
                {group.analyses.map((analysis) => {
                  const id = String(analysis.id)
                  const checked = Boolean(selected[id])
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2.5 border-t border-border px-3 py-2.5 text-left transition-colors hover:bg-primary/5',
                        checked && 'bg-primary/5',
                      )}
                      onClick={() => onToggle(id)}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold',
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-surface',
                        )}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      <span className="flex-1 text-sm font-medium">{analysis.name}</span>
                      <span className="shrink-0 text-sm font-semibold text-accent">
                        {formatCurrency(analysis.finalPrice)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SelectedAnalysesTable({ analyses, selected, groupMap, onRemove }) {
  const rows = useMemo(
    () =>
      Object.keys(selected)
        .map((id) => {
          const analysis = analyses.find((a) => String(a.id) === String(id))
          if (!analysis) return null
          return { ...analysis, groupName: groupMap?.[id] }
        })
        .filter(Boolean),
    [analyses, selected, groupMap],
  )

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        Aún no hay análisis seleccionados.
        <br />
        Márquelos en el catálogo de arriba.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted/40 text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-3 py-2 font-semibold">Análisis</th>
            <th className="px-3 py-2 font-semibold">Grupo</th>
            <th className="px-3 py-2 text-right font-semibold">Precio</th>
            <th className="w-11 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-b-0">
              <td className="px-3 py-2.5 font-medium">{row.name}</td>
              <td className="px-3 py-2.5">
                {row.groupName ? (
                  <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-xs text-muted">
                    {row.groupName}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                {formatCurrency(row.finalPrice)}
              </td>
              <td className="px-2 py-2.5 text-center">
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
                  title="Quitar"
                  onClick={() => onRemove(String(row.id))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mapa analysisId → groupName para la tabla de seleccionados. */
export function buildAnalysisGroupMap(groups) {
  const map = {}
  for (const group of groups ?? []) {
    for (const analysis of group.analyses ?? []) {
      map[String(analysis.id)] = group.name
    }
  }
  return map
}
