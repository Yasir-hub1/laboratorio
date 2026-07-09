import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { OrderWorkflowDrawer } from '@/components/clinico/OrderWorkflowDrawer'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, Card, DataTable, Input, Tabs, WorkflowProgressBar } from '@/components/ui'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatDate, unwrapData } from '@/utils/apiHelpers'
import { ORDER_WORKFLOW_STATUS, ROUTES } from '@/utils/constants'
import {
  getPendingAction,
  getQueueCount,
  getWorkflowLabel,
  ORDER_WORKFLOW_TABS,
  orderAnalysesLabel,
} from '@/utils/orderWorkflow'

function statusBadgeVariant(color) {
  if (color === 'emerald') return 'success'
  if (color === 'red') return 'danger'
  if (color === 'amber') return 'warning'
  return 'info'
}

function workflowStatusBadge(row) {
  const key = row.workflow_status
  const label = getWorkflowLabel(row)
  const info = ORDER_WORKFLOW_STATUS[key] ?? { color: 'default' }
  return <Badge variant={statusBadgeVariant(info.color)}>{label}</Badge>
}

export function OrderManagePage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'all'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [queueCounts, setQueueCounts] = useState(null)
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const listParams = useMemo(() => {
    const params = { state: 1 }
    if (activeTab !== 'all') params.workflow_status = Number(activeTab)
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return params
  }, [activeTab, dateFrom, dateTo])

  const index = useIndexQuery(
    laboratoryApi.getLaboratoryOrders,
    {
      initialOrderBy: 'created_at',
      initialOrderDir: 'desc',
      extraParams: listParams,
    },
    [listParams],
  )

  const loadCounts = useCallback(async () => {
    setLoadingCounts(true)
    try {
      const raw = await laboratoryApi.getLaboratoryOrderQueueCounts()
      setQueueCounts(unwrapData(raw) ?? raw)
    } catch (err) {
      toast.error(err.message ?? 'No se pudieron cargar los contadores')
    } finally {
      setLoadingCounts(false)
    }
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const tabItems = useMemo(
    () =>
      ORDER_WORKFLOW_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        // count: loadingCounts ? null : getQueueCount(queueCounts, tab.id),
      })),
    [queueCounts, loadingCounts],
  )

  const handleRowClick = (order) => {
    setSelectedOrder(order)
    setDrawerOpen(true)
  }

  const handleDrawerSuccess = (nextStatus) => {
    index.reload()
    loadCounts()
    if (nextStatus != null) {
      setActiveTab(String(nextStatus))
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'Código',
        accessorKey: 'code',
        cell: ({ row }) => row.original.code ?? row.original.id ?? '—',
      },
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => row.original.patient_name ?? row.original.patient?.full_name ?? '—',
      },
      {
        id: 'branch',
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch?.name ?? row.original.branch_name ?? '—',
      },
      // {
      //   id: 'sample_date',
      //   header: 'Fecha toma',
      //   cell: ({ row }) => formatDate(row.original.sample_collection_date) ?? '—',
      // },
      {
        id: 'workflow_status',
        header: 'Estado',
        cell: ({ row }) => workflowStatusBadge(row.original),
      },
      {
        id: 'progress',
        header: 'Progreso',
        enableSorting: false,
        cell: ({ row }) => (
          <WorkflowProgressBar workflowStatus={row.original.workflow_status} />
        ),
      },
      {
        id: 'analyses',
        header: 'Análisis',
        cell: ({ row }) => orderAnalysesLabel(row.original),
      },
      {
        id: 'pending_action',
        header: 'Acción pendiente',
        cell: ({ row }) => (
          <span className="text-sm text-muted">
            {getPendingAction(row.original.workflow_status)}
          </span>
        ),
      },
      {
        id: 'doctor',
        header: 'Doctor',
        cell: ({ row }) =>
          row.original.doctor?.full_name ?? row.original.doctor_name ?? '—',
      },
      {
        id: 'insurance',
        header: 'Seguro',
        cell: ({ row }) =>
          row.original.insurance_name ?? row.original.insurance?.name ?? 'Particular',
      },
    ],
    [],
  )

  if (index.loading && index.items.length === 0 && loadingCounts) {
    return <LoadingScreen />
  }

  const totalLabel = index.serverPagination?.totalRows ?? index.items.length

  return (
    <AnimatedPage>
      <PageHeader
        title="Gestionar orden"
        description="Flujo operativo y laboratorio: recepción de muestras, resultados, validación y cierre."
        actions={
          <Button asChild>
            <Link to={ROUTES.ORDER_RECEPTION}>+ Nueva orden</Link>
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <Tabs items={tabItems} value={activeTab} onChange={setActiveTab} />
      </Card>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          </div>
          <p className="text-sm text-muted whitespace-nowrap">
            {totalLabel} orden{totalLabel === 1 ? '' : 'es'}
          </p>
        </div>
      </Card>

      {index.isEmpty ? (
        <EmptyState
          title="Sin órdenes en esta cola"
          description="No hay órdenes que coincidan con el filtro seleccionado."
        />
      ) : (
        <DataTable
          columns={columns}
          data={index.items}
          serverPagination={index.serverPagination}
          onRowClick={handleRowClick}
          selectedRowId={drawerOpen ? selectedOrder?.id : null}
          searchPlaceholder="Buscar por código o paciente…"
          showPagination={index.serverPagination.totalRows > 10}
        />
      )}

      <OrderWorkflowDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setSelectedOrder(null)
        }}
        onSuccess={handleDrawerSuccess}
      />
    </AnimatedPage>
  )
}
