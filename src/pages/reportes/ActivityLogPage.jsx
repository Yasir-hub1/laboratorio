import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, Card, DataTable, Input, Modal, ModalFooter, Select } from '@/components/ui'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { usePermission } from '@/hooks/usePermission'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatDateTime } from '@/utils/apiHelpers'
import {
  activityEventBadgeVariant,
  activityEventLabel,
  activityLogNameLabel,
  activityModuleLabel,
  activitySubjectLabel,
  formatActivityProperties,
  logNamesForModule,
  mergeActivityEvents,
  mergeActivityModules,
  mergeLogNames,
} from '@/utils/activityLog'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function DetailField({ label, children }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-foreground break-words">{children}</dd>
    </div>
  )
}

function EventBadges({ row }) {
  if (row?.is_group && Array.isArray(row.events) && row.events.length > 0) {
    return (
      <div className="flex flex-wrap gap-1">
        {row.events.map((step) => (
          <Badge
            key={step.id ?? `${step.event}-${step.description}`}
            variant={activityEventBadgeVariant(step.event)}
            className="font-normal"
          >
            {activityEventLabel(step.event, step.event_label)}
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <Badge variant={activityEventBadgeVariant(row?.event)}>
      {activityEventLabel(row?.event, row?.event_label)}
    </Badge>
  )
}

function ActivityDetailModal({ open, onOpenChange, row, detail, loading }) {
  if (!row) return null

  const isGroup = Boolean(row.is_group)
  const steps = isGroup ? (row.events ?? []) : null

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isGroup ? 'Detalle de transacción' : 'Detalle del evento'}
      description={
        isGroup
          ? `Código ${row.transaction_code ?? '—'} · ${steps?.length ?? 0} pasos`
          : activityEventLabel(detail?.event ?? row.event, detail?.event_label ?? row.event_label)
      }
      className="max-h-[85vh] max-w-2xl overflow-y-auto"
    >
      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando detalle…
        </p>
      ) : isGroup ? (
        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Código">{row.transaction_code ?? '—'}</DetailField>
            <DetailField label="Usuario">
              {row.causer_name ?? row.causer_id ?? '—'}
            </DetailField>
            <DetailField label="Sucursal">
              {row.branch_name ?? row.branch_id ?? '—'}
            </DetailField>
            <DetailField label="Módulo">
              {activityModuleLabel(row.module, row.module_label)}
            </DetailField>
            <DetailField label="Batch UUID">
              <span className="font-mono text-xs">{row.batch_uuid ?? '—'}</span>
            </DetailField>
            <DetailField label="Fecha">{formatDateTime(row.created_at)}</DetailField>
          </dl>

          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Timeline</p>
            <ol className="relative space-y-0 border-l border-border pl-4">
              {(steps ?? []).map((step, idx) => (
                <li key={step.id ?? idx} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[1.15rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-surface" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={activityEventBadgeVariant(step.event)}>
                      {activityEventLabel(step.event, step.event_label)}
                    </Badge>
                    <span className="text-xs text-muted">
                      {formatDateTime(step.created_at ?? row.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {step.description ?? activityEventLabel(step.event, step.event_label)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Sucursal: {step.branch_name ?? step.branch_id ?? '—'}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Fecha">
              {formatDateTime(detail?.created_at ?? row.created_at)}
            </DetailField>
            <DetailField label="Código">
              {detail?.transaction_code ?? row.transaction_code ?? '—'}
            </DetailField>
            <DetailField label="Sucursal">
              {detail?.branch_name ??
                detail?.branch_id ??
                row.branch_name ??
                row.branch_id ??
                '—'}
            </DetailField>
            <DetailField label="Usuario">
              {detail?.causer_name ??
                detail?.causer_id ??
                row.causer_name ??
                row.causer_id ??
                '—'}
            </DetailField>
            <DetailField label="Módulo">
              {activityModuleLabel(
                detail?.module ?? row.module,
                detail?.module_label ?? row.module_label,
              )}
            </DetailField>
            <DetailField label="Entidad">
              {activityLogNameLabel(detail?.log_name ?? row.log_name)}
            </DetailField>
            <DetailField label="Evento">
              <Badge
                variant={activityEventBadgeVariant(detail?.event ?? row.event)}
              >
                {activityEventLabel(
                  detail?.event ?? row.event,
                  detail?.event_label ?? row.event_label,
                )}
              </Badge>
            </DetailField>
            <DetailField label="Registro">
              {activitySubjectLabel(detail ?? row)}
            </DetailField>
            <DetailField label="Batch UUID">
              <span className="font-mono text-xs">
                {detail?.batch_uuid ?? row.batch_uuid ?? '—'}
              </span>
            </DetailField>
            <DetailField label="Descripción">
              {detail?.description ?? row.description ?? '—'}
            </DetailField>
          </dl>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-foreground">Propiedades</p>
            <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-surface-muted/40 p-3 text-xs leading-relaxed text-foreground">
              {formatActivityProperties(detail?.properties ?? row.properties)}
            </pre>
          </div>
        </div>
      )}

      <ModalFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function ActivityLogPage() {
  const { can } = usePermission()
  const canView = can('reportes.bitacora.ver')
  const canExport = can('reportes.bitacora.exportar')

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [logNameFilter, setLogNameFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [causerFilter, setCauserFilter] = useState('')

  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState(null)

  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setMetaLoading(true)
      setMetaError(null)
      try {
        const data = await laboratoryApi.getActivityLogsMeta()
        if (!cancelled) setMeta(data)
      } catch (err) {
        if (!cancelled) {
          setMetaError(err.message ?? 'No se pudieron cargar los metadatos')
          toastApiError(err)
        }
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const modules = useMemo(() => mergeActivityModules(meta?.modules), [meta])
  const allLogNames = useMemo(
    () => mergeLogNames(modules, meta?.log_names),
    [modules, meta],
  )
  const events = useMemo(() => mergeActivityEvents(meta?.events), [meta])
  const branches = meta?.branches ?? []
  const users = meta?.users ?? []

  const entityOptions = useMemo(() => {
    const names = moduleFilter ? logNamesForModule(moduleFilter) : allLogNames
    const known = new Set(names)
    // Si meta tiene log_names del módulo vía modules, ya están en logNamesForModule
    if (moduleFilter) {
      const mod = modules.find((m) => m.id === moduleFilter)
      ;(mod?.log_names ?? []).forEach((n) => known.add(n))
    }
    return Array.from(known).sort()
  }, [moduleFilter, allLogNames, modules])

  useEffect(() => {
    if (logNameFilter && !entityOptions.includes(logNameFilter)) {
      setLogNameFilter('')
    }
  }, [entityOptions, logNameFilter])

  const listParams = useMemo(() => {
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (branchFilter) params.branch_id = branchFilter
    if (moduleFilter) params.module = moduleFilter
    if (logNameFilter) params.log_name = logNameFilter
    if (eventFilter) params.event = eventFilter
    if (causerFilter) params.causer_id = causerFilter
    return params
  }, [
    dateFrom,
    dateTo,
    branchFilter,
    moduleFilter,
    logNameFilter,
    eventFilter,
    causerFilter,
  ])

  const index = useIndexQuery(
    laboratoryApi.getActivityLogs,
    {
      initialOrderBy: 'created_at',
      initialOrderDir: 'desc',
      initialPerPage: 20,
      extraParams: listParams,
      enabled: !metaLoading && !metaError,
    },
    [listParams, metaLoading, metaError],
  )

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const openDetail = useCallback(
    async (row) => {
      if (!canView || !row) return
      setSelected(row)
      setDetail(null)

      if (row.is_group) {
        setDetailLoading(false)
        return
      }

      setDetailLoading(true)
      try {
        const data = await laboratoryApi.getActivityLog(row.id)
        setDetail(data)
      } catch (err) {
        toastApiError(err)
        setSelected(null)
      } finally {
        setDetailLoading(false)
      }
    },
    [canView],
  )

  const handleExport = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      const params = { ...listParams }
      const search = String(index.searchInput ?? '').trim()
      if (search) params.search = search
      await laboratoryApi.exportActivityLogs(params)
      toastApiSuccess('Excel descargado')
    } catch (err) {
      toastApiError(err)
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo(() => {
    const cols = [
      {
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        header: 'Código',
        cell: ({ row }) =>
          row.original.transaction_code ? (
            <span className="font-mono text-xs font-semibold">
              {row.original.transaction_code}
            </span>
          ) : (
            '—'
          ),
      },
      {
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch_name ?? row.original.branch_id ?? '—',
      },
      {
        header: 'Usuario',
        cell: ({ row }) => row.original.causer_name ?? row.original.causer_id ?? '—',
      },
      {
        header: 'Módulo',
        cell: ({ row }) =>
          activityModuleLabel(row.original.module, row.original.module_label),
      },
      {
        header: 'Entidad',
        cell: ({ row }) => activityLogNameLabel(row.original.log_name),
      },
      {
        id: 'event',
        header: 'Evento',
        enableSorting: false,
        cell: ({ row }) => <EventBadges row={row.original} />,
      },
      {
        header: 'Descripción',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-sm">
            {row.original.description ?? '—'}
          </span>
        ),
      },
      {
        header: 'Registro',
        cell: ({ row }) => (
          <span className="text-xs text-muted">{activitySubjectLabel(row.original)}</span>
        ),
      },
    ]

    if (canView) {
      cols.push({
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        meta: { className: 'w-20' },
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={(e) => {
              e.stopPropagation()
              openDetail(row.original)
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Ver</span>
          </Button>
        ),
      })
    }

    return cols
  }, [canView, openDetail])

  if (metaLoading) return <LoadingScreen />

  if (metaError) {
    return (
      <AnimatedPage>
        <PageHeader title="Bitácora" description="Historial de acciones del sistema." />
        <Card className="p-6">
          <EmptyState
            title="No se pudo cargar la bitácora"
            description={metaError}
            actionLabel="Reintentar"
            onAction={() => window.location.reload()}
          />
        </Card>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          className="mb-0"
          title="Bitácora"
          description="Historial global de acciones y sesiones del sistema (todas las sucursales)."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={index.reload}>
            Actualizar
          </Button>
          {canExport ? (
            <Button type="button" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Excel
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Input
            label="Desde"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="Hasta"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Select
            label="Sucursal"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? b.id}
              </option>
            ))}
          </Select>
          <Select
            label="Módulo"
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value)
              setLogNameFilter('')
            }}
          >
            <option value="">Todos</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select
            label="Entidad"
            value={logNameFilter}
            onChange={(e) => setLogNameFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {entityOptions.map((name) => (
              <option key={name} value={name}>
                {activityLogNameLabel(name)}
              </option>
            ))}
          </Select>
          <Select
            label="Evento"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {events.map((ev) => (
              <option key={ev} value={ev}>
                {activityEventLabel(ev)}
              </option>
            ))}
          </Select>
          <Select
            label="Usuario"
            value={causerFilter}
            onChange={(e) => setCauserFilter(e.target.value)}
            className={cn('sm:col-span-2 lg:col-span-1')}
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.username ?? u.email ?? u.id}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {index.isEmpty ? (
        <EmptyState
          title="Sin registros"
          description="No hay eventos de bitácora con los filtros seleccionados."
        />
      ) : (
        <DataTable
          columns={columns}
          data={index.items}
          serverPagination={index.serverPagination}
          searchPlaceholder="Buscar en descripción, entidad o evento…"
          showPagination
        />
      )}

      <ActivityDetailModal
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setDetail(null)
          }
        }}
        row={selected}
        detail={detail}
        loading={detailLoading}
      />
    </AnimatedPage>
  )
}
