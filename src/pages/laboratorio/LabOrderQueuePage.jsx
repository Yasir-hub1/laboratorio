import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, DataTable } from '@/components/ui'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDate } from '@/utils/apiHelpers'
import { ORDER_WORKFLOW_STATUS, ROUTES } from '@/utils/constants'

function personLabel(p) {
  if (!p) return '—'
  return (p.full_name ?? p.name ?? [p.first_name, p.last_name].filter(Boolean).join(' ')) || `#${p.id}`
}

function workflowBadge(row) {
  const key = row.workflow_status
  const label =
    row.workflow_status_label ?? ORDER_WORKFLOW_STATUS[key]?.label ?? String(key ?? '—')
  return <Badge variant="info">{label}</Badge>
}

/**
 * Cola de órdenes por workflow_status (vistas LABORATORIO 3.1–3.6).
 */
export function LabOrderQueuePage({
  title,
  description,
  workflowStatus,
  emptyTitle,
  emptyDescription,
  nextRoute,
  nextLabel,
}) {
  const index = useIndexQuery(
    laboratoryApi.getLaboratoryOrders,
    {
      initialOrderBy: 'created_at',
      initialOrderDir: 'desc',
      extraParams: { workflow_status: workflowStatus, state: 1 },
    },
    [workflowStatus],
  )

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

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
          row.original.patient?.full_name ??
          personLabel(row.original.patient) ??
          row.original.patient_name ??
          '—',
      },
      {
        id: 'doctor',
        header: 'Doctor',
        cell: ({ row }) =>
          row.original.doctor?.full_name ??
          personLabel(row.original.doctor) ??
          row.original.doctor_name ??
          '—',
      },
      {
        id: 'date',
        header: 'Fecha',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: 'workflow',
        header: 'Estado',
        cell: ({ row }) => workflowBadge(row.original),
      },
      {
        id: 'total',
        header: 'Total',
        cell: ({ row }) => formatCurrency(row.original.total_amount ?? row.original.total ?? 0),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={ROUTES.ORDER_DETAIL.replace(':id', row.original.id)}
            className="link-primary text-sm whitespace-nowrap"
          >
            Ver detalle
          </Link>
        ),
      },
    ],
    [],
  )

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title={title}
        description={description}
        actions={
          nextRoute && nextLabel ? (
            <Button variant="secondary" asChild>
              <Link to={nextRoute}>{nextLabel}</Link>
            </Button>
          ) : null
        }
      />

      {index.isEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <DataTable
          columns={columns}
          data={index.items}
          serverPagination={index.serverPagination}
          enableSearch={false}
        />
      )}
    </AnimatedPage>
  )
}
