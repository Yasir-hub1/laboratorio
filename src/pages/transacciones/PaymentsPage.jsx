import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, Card, DataTable, Input, Select } from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { ROUTES } from '@/utils/constants'
import {
  openPaymentPdfInNewTab,
  paymentRowStatusLabel,
  paymentRowStatusVariant,
} from '@/utils/transactions'
import { cn } from '@/utils/cn'

const actionBtnBase =
  'h-8 w-full min-w-0 shrink-0 gap-1.5 px-2.5 text-xs font-semibold shadow-none sm:w-auto'

function PaymentRowActions({ payment, orderId }) {
  const showPdf = payment.can_export_pdf !== false && Number(payment.status) !== 2

  if (!showPdf && !orderId) {
    return <span className="text-xs text-muted">—</span>
  }

  return (
    <div
      className="flex w-full min-w-[8.5rem] flex-col gap-1.5 sm:min-w-[11rem] sm:flex-row sm:items-center sm:justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {showPdf && (
        <Button
          type="button"
          size="sm"
          className={cn(
            actionBtnBase,
            'border border-primary/30 bg-primary/10 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground',
          )}
          onClick={() => openPaymentPdfInNewTab(payment.id)}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">PDF</span>
        </Button>
      )}
      {orderId && (
        <Button
          type="button"
          size="sm"
          asChild
          className={cn(
            actionBtnBase,
            'border border-accent/35 bg-accent/10 text-accent hover:border-accent hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <Link
            to={`${ROUTES.TRANSACTION_MANAGEMENT}?orderId=${orderId}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Orden</span>
          </Link>
        </Button>
      )}
    </div>
  )
}

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [insuranceFilter, setInsuranceFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [registeredByFilter, setRegisteredByFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const listParams = useMemo(() => {
    const params = {}
    if (statusFilter) params.status = Number(statusFilter)
    if (methodFilter) params.payment_method_id = methodFilter
    if (insuranceFilter) params.insurance_id = insuranceFilter
    if (createdByFilter) params.created_by = createdByFilter
    if (registeredByFilter.trim()) params.registered_by = registeredByFilter.trim()
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return params
  }, [
    statusFilter,
    methodFilter,
    insuranceFilter,
    createdByFilter,
    registeredByFilter,
    dateFrom,
    dateTo,
  ])

  const index = useIndexQuery(
    laboratoryApi.getPayments,
    {
      initialOrderBy: 'created_at',
      initialOrderDir: 'desc',
      initialPerPage: 20,
      extraParams: listParams,
    },
    [listParams],
  )

  const { items: paymentMethods } = useApiList(laboratoryApi.getPaymentMethods, [])
  const { items: insurances } = useApiList(laboratoryApi.getInsurances, [])
  const { items: users } = useApiList(laboratoryApi.getUsers, [])

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const columns = useMemo(
    () => [
      {
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        header: 'Código orden',
        cell: ({ row }) => row.original.order_code ?? row.original.laboratory_order?.code ?? '—',
      },
      {
        header: 'Paciente',
        cell: ({ row }) => row.original.patient_name ?? '—',
      },
      {
        header: 'Monto',
        cell: ({ row }) => (
          <span className="font-semibold tabular-nums">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        header: 'Método',
        cell: ({ row }) => row.original.payment_method_name ?? '—',
      },
      {
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={paymentRowStatusVariant(row.original.status)}>
            {paymentRowStatusLabel(row.original)}
          </Badge>
        ),
      },
      {
        header: 'Caja',
        cell: ({ row }) => row.original.opening_cash_label ?? '—',
      },
      {
        header: 'Registrado por',
        cell: ({ row }) => row.original.registered_by_name ?? '—',
      },
      {
        header: 'Seguro',
        cell: ({ row }) => row.original.insurance_name ?? '—',
      },
      {
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch_name ?? '—',
      },
      {
        id: 'annulment',
        header: 'Motivo anulación',
        cell: ({ row }) =>
          Number(row.original.status) === 2 ? row.original.annulment_reason ?? '—' : '—',
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        meta: { className: 'w-[9.5rem] sm:w-48' },
        cell: ({ row }) => (
          <PaymentRowActions
            payment={row.original}
            orderId={row.original.order_id ?? row.original.laboratory_order_id}
          />
        ),
      },
    ],
    [],
  )

  return (
    <AnimatedPage>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          className="mb-0"
          title="Pagos"
          description="Consulta global de cobros realizados y anulados."
        />
        <Button type="button" variant="secondary" onClick={index.reload}>
          Actualizar
        </Button>
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
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="1">Activo</option>
            <option value="2">Anulado</option>
          </Select>
          <Select
            label="Método de pago"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name ?? pm.description}
              </option>
            ))}
          </Select>
          <Select
            label="Seguro"
            value={insuranceFilter}
            onChange={(e) => setInsuranceFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {insurances.map((ins) => (
              <option key={ins.id} value={ins.id}>
                {ins.name ?? ins.description}
              </option>
            ))}
          </Select>
          <Input
            label="Registrado por"
            placeholder="Buscar por nombre de usuario…"
            value={registeredByFilter}
            onChange={(e) => setRegisteredByFilter(e.target.value)}
          />
          <Select
            label="Usuario exacto"
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.username ?? u.email ?? `#${u.id}`}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {index.isEmpty ? (
        <EmptyState
          title="Sin pagos"
          description="No hay pagos que coincidan con los filtros seleccionados."
        />
      ) : (
        <DataTable
          columns={columns}
          data={index.items}
          serverPagination={index.serverPagination}
          searchPlaceholder="Buscar por código de orden…"
          showPagination={index.serverPagination.totalRows > 10}
        />
      )}
    </AnimatedPage>
  )
}
