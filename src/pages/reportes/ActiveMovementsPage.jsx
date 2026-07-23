import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Eye,
  Loader2,
  Scale,
  Wallet,
  X,
} from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  ModalFooter,
  Select,
} from '@/components/ui'
import { usePermission } from '@/hooks/usePermission'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import {
  defaultActiveMovementsRange,
  kindBadgeVariant,
  rangePreset,
  toApiDatetime,
} from '@/utils/activeMovements'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

const PRESETS = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
]

function DetailField({ label, children }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-foreground break-words">{children ?? '—'}</dd>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, tone }) {
  const tones = {
    inflow: 'bg-accent/10 text-accent',
    outflow: 'bg-red-50 text-red-600',
    net: 'bg-primary/10 text-primary',
    count: 'bg-surface-muted text-muted',
  }
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            tones[tone] ?? tones.count,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  )
}

/** Autocomplete paciente/médico vía /reports/active-movements/options */
function OptionsSearchField({ label, type, value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return undefined
    }
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const raw = await laboratoryApi.getActiveMovementsOptions({ type, search: q })
        const list = Array.isArray(raw) ? raw : raw?.data ?? []
        setResults(Array.isArray(list) ? list : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, type])

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (value) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate">{value.label ?? value.name ?? value.id}</span>
          <button
            type="button"
            className="shrink-0 text-muted hover:text-foreground"
            onClick={() => onChange(null)}
            aria-label="Quitar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <Input
        label={label}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading ? (
        <p className="absolute right-3 top-9 text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </p>
      ) : null}
      {open && results.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-surface shadow-card">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => {
                  onChange(item)
                  setQuery('')
                  setOpen(false)
                }}
              >
                {item.label ?? item.name ?? item.id}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function MovementDetailModal({ open, onOpenChange, row }) {
  if (!row) return null
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Detalle del movimiento"
      description={row.transaction_code ?? row.kind_label ?? 'Movimiento'}
      className="max-h-[85vh] max-w-2xl overflow-y-auto"
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Fecha">{formatDateTime(row.occurred_at)}</DetailField>
        <DetailField label="Código">{row.transaction_code ?? '—'}</DetailField>
        <DetailField label="Tipo">
          <Badge variant={kindBadgeVariant(row.kind)}>
            {row.kind_label ?? (row.kind === 'inflow' ? 'Ingreso' : 'Egreso')}
          </Badge>
        </DetailField>
        <DetailField label="Monto">
          <span className="font-semibold tabular-nums">{formatCurrency(row.amount)}</span>
        </DetailField>
        <DetailField label="Sucursal">{row.branch_name ?? '—'}</DetailField>
        <DetailField label="Caja">{row.cash_name ?? '—'}</DetailField>
        <DetailField label="Apertura">
          {[formatDateTime(row.opening_date), row.opening_status_label]
            .filter(Boolean)
            .join(' · ') || '—'}
        </DetailField>
        <DetailField label="Categoría">{row.category_name ?? '—'}</DetailField>
        <DetailField label="Método">{row.payment_method_name ?? '—'}</DetailField>
        <DetailField label="Orden">{row.order_code ?? '—'}</DetailField>
        <DetailField label="Paciente">{row.patient_name ?? '—'}</DetailField>
        <DetailField label="Médico">{row.doctor_name ?? '—'}</DetailField>
        <DetailField label="Seguro">{row.insurance_name ?? '—'}</DetailField>
        <DetailField label="Registrado por">{row.created_by_name ?? '—'}</DetailField>
        <DetailField label="Descripción">{row.description ?? '—'}</DetailField>
      </dl>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function ActiveMovementsPage() {
  const { can } = usePermission()
  const canView = can('reportes.movimientos.ver')
  const canExport = can('reportes.movimientos.exportar')

  const initialRange = useMemo(() => defaultActiveMovementsRange(), [])
  const [datetimeFrom, setDatetimeFrom] = useState(initialRange.from)
  const [datetimeTo, setDatetimeTo] = useState(initialRange.to)
  const [branchId, setBranchId] = useState('')
  const [cashId, setCashId] = useState('')
  const [openingCashId, setOpeningCashId] = useState('')
  const [openingStatus, setOpeningStatus] = useState('all')
  const [kind, setKind] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [insuranceId, setInsuranceId] = useState('')
  const [createdBy, setCreatedBy] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [patient, setPatient] = useState(null)
  const [doctor, setDoctor] = useState(null)

  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState(null)
  const [openings, setOpenings] = useState([])

  const [summary, setSummary] = useState(null)
  const [byCash, setByCash] = useState([])
  const [movements, setMovements] = useState([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [lastPage, setLastPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setMetaLoading(true)
      setMetaError(null)
      try {
        const data = await laboratoryApi.getActiveMovementsMeta()
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

  const branches = meta?.branches ?? []
  const allCashes = meta?.cashes ?? []
  const categories = meta?.categories ?? []
  const paymentMethods = meta?.payment_methods ?? []
  const insurances = meta?.insurances ?? []
  const users = meta?.users ?? []
  const kinds = meta?.kinds ?? [
    { value: 'inflow', label: 'Ingreso' },
    { value: 'outflow', label: 'Egreso' },
  ]
  const openingStatuses = meta?.opening_statuses ?? [
    { value: 'all', label: 'Todas' },
    { value: 'open', label: 'Abiertas' },
    { value: 'closed', label: 'Cerradas' },
  ]

  const filteredCashes = useMemo(() => {
    if (!branchId) return allCashes
    return allCashes.filter((c) => String(c.branch_id) === String(branchId))
  }, [allCashes, branchId])

  const filteredCategories = useMemo(() => {
    if (!kind) return categories
    return categories.filter((c) => c.kind === kind)
  }, [categories, kind])

  const listParams = useMemo(() => {
    const params = {}
    const from = toApiDatetime(datetimeFrom)
    const to = toApiDatetime(datetimeTo, { end: true })
    if (from) params.datetime_from = from
    if (to) params.datetime_to = to
    if (branchId) params.branch_id = branchId
    if (cashId) params.cash_id = cashId
    if (openingCashId) params.opening_cash_id = openingCashId
    if (openingStatus && openingStatus !== 'all') params.opening_status = openingStatus
    if (kind) params.kind = kind
    if (categoryId) params.category_id = categoryId
    if (paymentMethodId) params.payment_method_id = paymentMethodId
    if (insuranceId) params.insurance_id = insuranceId
    if (createdBy) params.created_by = createdBy
    if (patient?.id) params.patient_id = patient.id
    if (doctor?.id) params.doctor_id = doctor.id
    if (debouncedSearch) params.search = debouncedSearch
    return params
  }, [
    datetimeFrom,
    datetimeTo,
    branchId,
    cashId,
    openingCashId,
    openingStatus,
    kind,
    categoryId,
    paymentMethodId,
    insuranceId,
    createdBy,
    patient,
    doctor,
    debouncedSearch,
  ])

  const filterKey = useMemo(() => JSON.stringify(listParams), [listParams])

  useEffect(() => {
    setPage(1)
  }, [filterKey])

  const loadOpenings = useCallback(async () => {
    try {
      const params = {}
      if (branchId) params.branch_id = branchId
      if (cashId) params.cash_id = cashId
      if (openingStatus && openingStatus !== 'all') params.opening_status = openingStatus
      const from = toApiDatetime(datetimeFrom)
      const to = toApiDatetime(datetimeTo, { end: true })
      if (from) params.datetime_from = from
      if (to) params.datetime_to = to
      const raw = await laboratoryApi.getActiveMovementsOpenings(params)
      const list = Array.isArray(raw) ? raw : raw?.data ?? []
      setOpenings(Array.isArray(list) ? list : [])
    } catch {
      setOpenings([])
    }
  }, [branchId, cashId, openingStatus, datetimeFrom, datetimeTo])

  useEffect(() => {
    if (metaLoading || metaError) return undefined
    loadOpenings()
    return undefined
  }, [loadOpenings, metaLoading, metaError])

  const loadReport = useCallback(async () => {
    if (metaLoading || metaError) return
    if (!listParams.datetime_from || !listParams.datetime_to) {
      toastApiError(new Error('Indica el rango Desde / Hasta'))
      return
    }
    setLoading(true)
    try {
      const data = await laboratoryApi.getActiveMovements({
        ...listParams,
        page,
        per_page: perPage,
        order_dir: 'desc',
      })
      setSummary(data?.summary ?? null)
      setByCash(Array.isArray(data?.by_cash) ? data.by_cash : [])
      const paginator = data?.movements ?? {}
      const rows = Array.isArray(paginator.data) ? paginator.data : []
      setMovements(rows)
      setLastPage(Math.max(1, Number(paginator.last_page ?? 1)))
      setTotalRows(Number(paginator.total ?? rows.length))
    } catch (err) {
      toastApiError(err)
      setSummary(null)
      setByCash([])
      setMovements([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [listParams, page, perPage, metaLoading, metaError])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleBranchChange = (value) => {
    setBranchId(value)
    setCashId('')
    setOpeningCashId('')
  }

  const handleCashChange = (value) => {
    setCashId(value)
    setOpeningCashId('')
  }

  const handleOpeningChange = (value) => {
    setOpeningCashId(value)
    if (!value) return
    const opening = openings.find((o) => String(o.id) === String(value))
    if (!opening) return
    if (opening.branch_id) setBranchId(String(opening.branch_id))
    if (opening.cash_id) setCashId(String(opening.cash_id))
  }

  const applyPreset = (id) => {
    const range = rangePreset(id)
    setDatetimeFrom(range.from)
    setDatetimeTo(range.to)
  }

  const handleExport = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      await laboratoryApi.exportActiveMovements(listParams)
      toastApiSuccess('Excel descargado')
    } catch (err) {
      toastApiError(err)
    } finally {
      setExporting(false)
    }
  }

  const byCashColumns = useMemo(
    () => [
      {
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch_name ?? '—',
      },
      {
        header: 'Caja',
        cell: ({ row }) => row.original.cash_name ?? '—',
      },
      {
        header: 'Aperturas',
        cell: ({ row }) => row.original.opening_count ?? 0,
      },
      {
        header: 'Ingresos',
        cell: ({ row }) => (
          <span className="tabular-nums text-accent">
            {formatCurrency(row.original.total_inflow)}
          </span>
        ),
      },
      {
        header: 'Egresos',
        cell: ({ row }) => (
          <span className="tabular-nums text-red-600">
            {formatCurrency(row.original.total_outflow)}
          </span>
        ),
      },
      {
        header: 'Balance',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(row.original.net_balance)}
          </span>
        ),
      },
      {
        header: 'Movs.',
        cell: ({ row }) => row.original.movement_count ?? 0,
      },
    ],
    [],
  )

  const movementColumns = useMemo(() => {
    const cols = [
      {
        header: 'Fecha',
        accessorKey: 'occurred_at',
        cell: ({ row }) => formatDateTime(row.original.occurred_at),
      },
      {
        header: 'Código',
        cell: ({ row }) =>
          row.original.transaction_code ? (
            <span className="font-mono text-xs">{row.original.transaction_code}</span>
          ) : (
            '—'
          ),
      },
      {
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge variant={kindBadgeVariant(row.original.kind)}>
            {row.original.kind_label ??
              (row.original.kind === 'inflow' ? 'Ingreso' : 'Egreso')}
          </Badge>
        ),
      },
      {
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch_name ?? '—',
      },
      {
        header: 'Caja',
        cell: ({ row }) => row.original.cash_name ?? '—',
      },
      {
        header: 'Categoría',
        cell: ({ row }) => row.original.category_name ?? '—',
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
        header: 'Método',
        cell: ({ row }) => row.original.payment_method_name ?? '—',
      },
      {
        header: 'Orden',
        cell: ({ row }) => row.original.order_code ?? '—',
      },
      {
        header: 'Paciente',
        cell: ({ row }) => row.original.patient_name ?? '—',
      },
      {
        header: 'Usuario',
        cell: ({ row }) => row.original.created_by_name ?? '—',
      },
      {
        header: 'Monto',
        cell: ({ row }) => {
          const signed = Number(row.original.signed_amount ?? row.original.amount ?? 0)
          const isOut = row.original.kind === 'outflow' || signed < 0
          return (
            <span
              className={cn(
                'font-semibold tabular-nums',
                isOut ? 'text-red-600' : 'text-accent',
              )}
            >
              {formatCurrency(row.original.amount)}
            </span>
          )
        },
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
              setSelected(row.original)
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Ver</span>
          </Button>
        ),
      })
    }

    return cols
  }, [canView])

  const serverPagination = useMemo(
    () => ({
      pageCount: lastPage,
      pageIndex: Math.max(0, page - 1),
      pageSize: perPage,
      totalRows,
      fromRow: totalRows === 0 ? 0 : (page - 1) * perPage + 1,
      toRow: Math.min(page * perPage, totalRows),
      onPaginationChange: ({ pageIndex, pageSize }) => {
        setPage(pageIndex + 1)
        setPerPage(pageSize)
      },
      searchValue: searchInput,
      onSearchChange: setSearchInput,
      isLoading: loading,
      isRefreshing: loading,
      onRefresh: loadReport,
      canPreviousPage: page > 1,
      canNextPage: page < lastPage,
    }),
    [lastPage, page, perPage, totalRows, searchInput, loading, loadReport],
  )

  if (metaLoading) return <LoadingScreen />

  if (metaError) {
    return (
      <AnimatedPage>
        <PageHeader
          title="Movimientos activos"
          description="Ingresos y egresos vigentes del sistema."
        />
        <Card className="p-6">
          <EmptyState
            title="No se pudo cargar el reporte"
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
          title="Movimientos activos"
          description="Ingresos y egresos vigentes (no anulados), consolidado multi-sucursal."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={loadReport} disabled={loading}>
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
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Input
            label="Desde"
            type="datetime-local"
            value={datetimeFrom}
            onChange={(e) => setDatetimeFrom(e.target.value)}
            required
          />
          <Input
            label="Hasta"
            type="datetime-local"
            value={datetimeTo}
            onChange={(e) => setDatetimeTo(e.target.value)}
            required
          />
          <Select
            label="Sucursal"
            value={branchId}
            onChange={(e) => handleBranchChange(e.target.value)}
          >
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? b.id}
              </option>
            ))}
          </Select>
          <Select label="Caja" value={cashId} onChange={(e) => handleCashChange(e.target.value)}>
            <option value="">Todas</option>
            {filteredCashes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
              </option>
            ))}
          </Select>
          <Select
            label="Apertura"
            value={openingCashId}
            onChange={(e) => handleOpeningChange(e.target.value)}
          >
            <option value="">Todas</option>
            {openings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label ?? o.id}
              </option>
            ))}
          </Select>
          <Select
            label="Estado apertura"
            value={openingStatus}
            onChange={(e) => setOpeningStatus(e.target.value)}
          >
            {openingStatuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            label="Tipo"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value)
              setCategoryId('')
            }}
          >
            <option value="">Todos</option>
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          <Select
            label="Categoría"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Todas</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
              </option>
            ))}
          </Select>
          <Select
            label="Método de pago"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
          >
            <option value="">Todos</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name ?? pm.id}
              </option>
            ))}
          </Select>
          <Select
            label="Seguro"
            value={insuranceId}
            onChange={(e) => setInsuranceId(e.target.value)}
          >
            <option value="">Todos</option>
            {insurances.map((ins) => (
              <option key={ins.id} value={ins.id}>
                {ins.name ?? ins.id}
              </option>
            ))}
          </Select>
          <Select
            label="Registrado por"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.username ?? u.id}
              </option>
            ))}
          </Select>
          <OptionsSearchField
            label="Paciente"
            type="patient"
            value={patient}
            onChange={setPatient}
            placeholder="Buscar paciente (mín. 2 letras)…"
          />
          <OptionsSearchField
            label="Médico"
            type="doctor"
            value={doctor}
            onChange={setDoctor}
            placeholder="Buscar médico (mín. 2 letras)…"
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Los filtros de paciente, médico y seguro aplican únicamente a cobros de órdenes.
        </p>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total ingresos"
          value={formatCurrency(summary?.total_inflow)}
          icon={ArrowDownLeft}
          tone="inflow"
        />
        <KpiCard
          label="Total egresos"
          value={formatCurrency(summary?.total_outflow)}
          icon={ArrowUpRight}
          tone="outflow"
        />
        <KpiCard
          label="Balance neto"
          value={formatCurrency(summary?.net_balance)}
          icon={Scale}
          tone="net"
        />
        <KpiCard
          label="Movimientos"
          value={summary?.movement_count ?? 0}
          icon={Wallet}
          tone="count"
        />
      </div>

      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Totales por caja</h2>
        </div>
        {byCash.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Sin totales por caja para el filtro actual.
          </p>
        ) : (
          <DataTable
            columns={byCashColumns}
            data={byCash}
            enableSearch={false}
            showPagination={false}
            enableRefresh={false}
            getRowId={(row, i) => String(row.cash_id ?? i)}
          />
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Detalle de movimientos</h2>
        </div>
        {movements.length === 0 && !loading ? (
          <EmptyState
            title="Sin movimientos"
            description="No hay ingresos/egresos activos con los filtros seleccionados."
          />
        ) : (
          <DataTable
            columns={movementColumns}
            data={movements}
            serverPagination={serverPagination}
            searchPlaceholder="Buscar en descripción, código u orden…"
            showPagination
            enableRefresh={false}
            getRowId={(row, i) => String(row.id ?? `${row.kind}-${row.transaction_code}-${i}`)}
          />
        )}
      </Card>

      {canView ? (
        <MovementDetailModal
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          row={selected}
        />
      ) : null}
    </AnimatedPage>
  )
}
