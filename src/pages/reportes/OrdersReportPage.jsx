import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, Card, DataTable, Input, Select } from '@/components/ui'
import { usePermission } from '@/hooks/usePermission'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { ORDER_WORKFLOW_STATUS } from '@/utils/constants'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function Kpi({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </Card>
  )
}

function workflowBadge(status, label) {
  const info = ORDER_WORKFLOW_STATUS[Number(status)] ?? { color: 'default', label }
  const variant =
    info.color === 'emerald'
      ? 'success'
      : info.color === 'red'
        ? 'danger'
        : info.color === 'amber'
          ? 'warning'
          : 'info'
  return <Badge variant={variant}>{label ?? info.label ?? status}</Badge>
}

export function OrdersReportPage() {
  const { can } = usePermission()
  const canExport = can('reportes.ordenes.exportar')

  const [dateFrom, setDateFrom] = useState(todayIso)
  const [dateTo, setDateTo] = useState(todayIso)
  const [branchId, setBranchId] = useState('')
  const [insuranceId, setInsuranceId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [patientId, setPatientId] = useState('')
  const [workflowStatus, setWorkflowStatus] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState(null)

  const [summary, setSummary] = useState(null)
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [lastPage, setLastPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

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
        const data = await laboratoryApi.getLaboratoryOrdersReportMeta()
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
  const insurances = meta?.insurances ?? []
  const doctors = meta?.doctors ?? []
  const patients = meta?.patients ?? []
  const workflowOptions = useMemo(() => {
    if (Array.isArray(meta?.workflow_statuses) && meta.workflow_statuses.length) {
      return meta.workflow_statuses.map((w) => ({
        value: String(w.value ?? w.workflow_status ?? w.id),
        label: w.label ?? ORDER_WORKFLOW_STATUS[Number(w.value ?? w.workflow_status)]?.label,
      }))
    }
    return Object.entries(ORDER_WORKFLOW_STATUS).map(([value, info]) => ({
      value,
      label: info.label,
    }))
  }, [meta])

  const listParams = useMemo(() => {
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (branchId) params.branch_id = branchId
    if (insuranceId) params.insurance_id = insuranceId
    if (doctorId) params.doctor_id = doctorId
    if (patientId) params.patient_id = patientId
    if (workflowStatus) params.workflow_status = Number(workflowStatus)
    if (debouncedSearch) params.search = debouncedSearch
    return params
  }, [
    dateFrom,
    dateTo,
    branchId,
    insuranceId,
    doctorId,
    patientId,
    workflowStatus,
    debouncedSearch,
  ])

  const filterKey = useMemo(() => JSON.stringify(listParams), [listParams])

  useEffect(() => {
    setPage(1)
  }, [filterKey])

  const loadReport = useCallback(async () => {
    if (metaLoading || metaError) return
    setLoading(true)
    try {
      const data = await laboratoryApi.getLaboratoryOrdersReport({
        ...listParams,
        paginate: true,
        page,
        per_page: perPage,
        order_by: 'created_at',
        order_dir: 'desc',
      })
      setSummary(data?.summary ?? null)
      const paginator = data?.orders ?? {}
      const rows = Array.isArray(paginator.data) ? paginator.data : Array.isArray(data?.orders) ? data.orders : []
      setOrders(rows)
      setLastPage(Math.max(1, Number(paginator.last_page ?? 1)))
      setTotalRows(Number(paginator.total ?? rows.length))
    } catch (err) {
      toastApiError(err)
      setSummary(null)
      setOrders([])
      setTotalRows(0)
    } finally {
      setLoading(false)
    }
  }, [listParams, page, perPage, metaLoading, metaError])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleExport = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      await laboratoryApi.exportLaboratoryOrdersReport(listParams)
      toastApiSuccess('Excel descargado')
    } catch (err) {
      toastApiError(err)
    } finally {
      setExporting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        header: 'Código',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">
            {row.original.code ?? '—'}
          </span>
        ),
      },
      {
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch_name ?? '—',
      },
      {
        header: 'Paciente',
        cell: ({ row }) => {
          const name = row.original.patient_name ?? '—'
          const ci = row.original.patient_ci
          return ci ? `${name} (${ci})` : name
        },
      },
      {
        header: 'Médico',
        cell: ({ row }) => row.original.doctor_name ?? '—',
      },
      {
        header: 'Seguro',
        cell: ({ row }) => row.original.insurance_name ?? 'Particular',
      },
      {
        header: 'Estado',
        cell: ({ row }) =>
          workflowBadge(
            row.original.workflow_status,
            row.original.workflow_status_label ?? row.original.status_label,
          ),
      },
      {
        header: 'Total',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(row.original.total_amount ?? row.original.total)}
          </span>
        ),
      },
      {
        header: 'Pagado',
        cell: ({ row }) => formatCurrency(row.original.total_paid),
      },
      {
        header: 'Saldo',
        cell: ({ row }) => formatCurrency(row.original.total_due),
      },
    ],
    [],
  )

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
        <PageHeader title="Reporte de órdenes" description="Consulta y exportación de órdenes." />
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
          title="Reporte de órdenes"
          description="Listado filtrable por fecha de creación, con exportación Excel."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={loadReport} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
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
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Todas autorizadas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? b.id}
              </option>
            ))}
          </Select>
          <Select
            label="Estado del proceso"
            value={workflowStatus}
            onChange={(e) => setWorkflowStatus(e.target.value)}
          >
            <option value="">Todos</option>
            {workflowOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
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
          {doctors.length > 0 ? (
            <Select
              label="Médico"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Todos</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? d.full_name ?? d.label ?? d.id}
                </option>
              ))}
            </Select>
          ) : null}
          {patients.length > 0 ? (
            <Select
              label="Paciente"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">Todos</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.full_name ?? p.label ?? p.id}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          El rango de fechas filtra por fecha de creación de la orden (`created_at`).
        </p>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi label="Órdenes" value={summary?.orders_count ?? 0} />
        <Kpi label="Subtotal" value={formatCurrency(summary?.total_subtotal)} />
        <Kpi label="Descuento" value={formatCurrency(summary?.total_discount)} />
        <Kpi label="Total" value={formatCurrency(summary?.total_amount)} />
        <Kpi label="Pagado" value={formatCurrency(summary?.total_paid)} />
        <Kpi label="Saldo" value={formatCurrency(summary?.total_due)} />
      </div>

      {Array.isArray(summary?.by_workflow) && summary.by_workflow.length > 0 ? (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Por estado</p>
          <div className="flex flex-wrap gap-2">
            {summary.by_workflow.map((row) => (
              <Badge key={row.workflow_status ?? row.label} variant="default" className="font-normal">
                {row.label ?? ORDER_WORKFLOW_STATUS[row.workflow_status]?.label}: {row.count ?? 0}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      {orders.length === 0 && !loading ? (
        <EmptyState
          title="Sin órdenes"
          description="No hay órdenes con los filtros seleccionados."
        />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          serverPagination={serverPagination}
          searchPlaceholder="Buscar por código o paciente…"
          showPagination
          enableRefresh={false}
          getRowId={(row, i) => String(row.id ?? row.code ?? i)}
        />
      )}
    </AnimatedPage>
  )
}
