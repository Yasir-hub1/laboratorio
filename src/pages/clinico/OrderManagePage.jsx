import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Can } from '@/components/auth/Can'
import { OrderRowActions } from '@/components/clinico/OrderRowActions'
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
  Select,
  Tabs,
  WorkflowProgressBar,
} from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { usePermission } from '@/hooks/usePermission'
import { laboratoryApi } from '@/services/laboratoryApi'
import { ORDER_WORKFLOW_STATUS, ROUTES } from '@/utils/constants'
import {
  getPendingAction,
  getQueueCount,
  getWorkflowLabel,
  ORDER_WORKFLOW_TABS,
  orderAnalysesLabel,
  personNameWithCi,
} from '@/utils/orderWorkflow'
import { ORDER_QUEUE_PERMISSIONS } from '@/utils/permissions'
import { resolveEntityId } from '@/utils/entityId'
import { toastApiError } from '@/utils/toastApi'

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

function doctorOptionLabel(doctor) {
  return personNameWithCi(doctor)
}

export function OrderManagePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = usePermission()
  const initialTab = searchParams.get('tab') ?? 'all'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [queueCounts, setQueueCounts] = useState(null)
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [insuranceId, setInsuranceId] = useState('')

  const { items: doctors } = useApiList(laboratoryApi.getDoctors, [], { status: 1 })
  const { items: insurances } = useApiList(laboratoryApi.getInsurances, [], { status: 1 })

  const allowedTabs = useMemo(() => {
    return ORDER_WORKFLOW_TABS.filter((tab) => {
      if (tab.id === 'all') return true
      return can(ORDER_QUEUE_PERMISSIONS[Number(tab.id)])
    })
  }, [can])

  useEffect(() => {
    if (!allowedTabs.some((t) => t.id === activeTab)) {
      setActiveTab(allowedTabs[0]?.id ?? 'all')
    }
  }, [allowedTabs, activeTab])

  const listParams = useMemo(() => {
    const params = { state: 1 }
    if (activeTab !== 'all') params.workflow_status = Number(activeTab)
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (doctorId) params.doctor_id = doctorId
    if (insuranceId) params.insurance_id = insuranceId
    return params
  }, [activeTab, dateFrom, dateTo, doctorId, insuranceId])

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
      setQueueCounts(raw)
    } catch (err) {
      toastApiError(err)
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

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    const next = new URLSearchParams(searchParams)
    if (tabId === 'all') next.delete('tab')
    else next.set('tab', tabId)
    setSearchParams(next, { replace: true })
  }

  const handleListChanged = useCallback(() => {
    index.reload()
    loadCounts()
  }, [index, loadCounts])

  const tabItems = useMemo(
    () =>
      allowedTabs.map((tab) => {
        const count = getQueueCount(queueCounts, tab.id)
        return {
          id: tab.id,
          label: count != null && !loadingCounts ? `${tab.label} (${count})` : tab.label,
        }
      }),
    [allowedTabs, queueCounts, loadingCounts],
  )

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
        cell: ({ row }) =>
          personNameWithCi(row.original.patient, row.original.patient_name),
      },
      {
        id: 'workflow_status',
        header: 'Estado del flujo',
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
          personNameWithCi(row.original.doctor, row.original.doctor_name),
      },
      {
        id: 'insurance',
        header: 'Seguro',
        cell: ({ row }) =>
          row.original.insurance_name ?? row.original.insurance?.name ?? 'Particular',
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => (
          <OrderRowActions order={row.original} onChanged={handleListChanged} />
        ),
      },
    ],
    [handleListChanged],
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
          <Can permission="atencion.nueva-orden.crear">
            <Button asChild>
              <Link to={ROUTES.ORDER_RECEPTION}>+ Nueva orden</Link>
            </Button>
          </Can>
        }
      />

      <Card className="mb-4 p-4">
        <Tabs items={tabItems} value={activeTab} onChange={handleTabChange} />
      </Card>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              label="Doctor"
              name="doctor_id"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Todos</option>
              {doctors.map((d) => {
                const id = String(resolveEntityId(d) ?? d.id)
                return (
                  <option key={id} value={id}>
                    {doctorOptionLabel(d)}
                  </option>
                )
              })}
            </Select>
            <Select
              label="Seguro"
              name="insurance_id"
              value={insuranceId}
              onChange={(e) => setInsuranceId(e.target.value)}
            >
              <option value="">Todos</option>
              {insurances.map((ins) => {
                const id = String(resolveEntityId(ins) ?? ins.id)
                return (
                  <option key={id} value={id}>
                    {ins.name ?? id}
                  </option>
                )
              })}
            </Select>
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
          searchPlaceholder="Buscar por código o paciente…"
          showPagination={index.serverPagination.totalRows > 10}
        />
      )}
    </AnimatedPage>
  )
}
