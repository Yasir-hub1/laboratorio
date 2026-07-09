import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { TransactionOrderDrawer } from '@/components/transacciones/TransactionOrderDrawer'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, Card, DataTable, Input, Tabs } from '@/components/ui'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDate, unwrapData } from '@/utils/apiHelpers'
import { storage } from '@/utils/storage'
import {
  extractPageTotals,
  FINANCIAL_QUEUE_TABS,
  getFinancialQueueCount,
  isOrderFinanciallyDimmed,
  orderPaymentStatusLabel,
  orderPaymentStatusVariant,
} from '@/utils/transactions'
import { cn } from '@/utils/cn'

function patchOrderInList(items, order) {
  if (!order?.id) return items
  const idx = items.findIndex((o) => String(o.id) === String(order.id))
  if (idx < 0) return items
  const next = [...items]
  next[idx] = { ...next[idx], ...order }
  return next
}

export function TransactionManagePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'all'
  const deepLinkOrderId = searchParams.get('orderId')

  const [activeTab, setActiveTab] = useState(initialTab)
  const [context, setContext] = useState(null)
  const [loadingContext, setLoadingContext] = useState(true)
  const [pageTotals, setPageTotals] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const listParams = useMemo(() => {
    const params = {}
    const tab = FINANCIAL_QUEUE_TABS.find((t) => t.id === activeTab)
    if (tab?.queue) params.financial_queue = tab.queue
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return params
  }, [activeTab, dateFrom, dateTo])

  const fetchOrders = useCallback(async (params) => {
    const raw = await laboratoryApi.getTransactionOrders(params)
    setPageTotals(extractPageTotals(unwrapData(raw) ?? raw) ?? extractPageTotals(raw))
    return raw
  }, [])

  const index = useIndexQuery(
    fetchOrders,
    {
      initialOrderBy: 'created_at',
      initialOrderDir: 'desc',
      initialPerPage: 20,
      extraParams: listParams,
    },
    [listParams],
  )

  const loadContext = useCallback(async () => {
    setLoadingContext(true)
    try {
      const cashId = storage.getCashId()
      const params = cashId ? { cash_id: cashId } : {}
      const raw = await laboratoryApi.getTransactionsContext(params)
      console.log('raw', raw)
      const data = unwrapData(raw) ?? raw
      setContext(data)
      if (data?.cash?.is_open && data.cash.opening_cash_id) {
        storage.setOpeningCashId(String(data.cash.opening_cash_id))
      }
    } catch (err) {
      toast.error(err.message ?? 'No se pudo cargar el contexto')
    } finally {
      setLoadingContext(false)
    }
  }, [])

  useEffect(() => {
    loadContext()
  }, [loadContext])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  useEffect(() => {
    if (!deepLinkOrderId || index.loading) return
    const found = index.items.find((o) => String(o.id) === String(deepLinkOrderId))
    const order = found ?? { id: deepLinkOrderId }
    setSelectedOrder(order)
    setDrawerOpen(true)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('orderId')
      return next
    }, { replace: true })
  }, [deepLinkOrderId, index.items, index.loading, setSearchParams])

  const tabItems = useMemo(
    () =>
      FINANCIAL_QUEUE_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        // count: loadingContext ? null : getFinancialQueueCount(context?.queue_counts, tab.id),
      })),
    [context, loadingContext],
  )

  const handleRowClick = (order) => {
    setSelectedOrder(order)
    setDrawerOpen(true)
  }

  const handleDrawerSuccess = ({ order, queue_counts }) => {
    if (order) index.setItems((items) => patchOrderInList(items, order))
    if (queue_counts) {
      setContext((prev) => ({ ...prev, queue_counts }))
    }
    if (pageTotals && order) {
      setPageTotals((prev) => {
        if (!prev) return prev
        return {
          total_amount: Number(prev.total_amount ?? 0),
          amount_paid: Number(prev.amount_paid ?? 0),
          total_due: Number(prev.total_due ?? 0),
        }
      })
    }
  }

  const handleRefresh = () => {
    loadContext()
    index.reload()
  }

  const columns = useMemo(
    () => [
      {
        header: 'Código',
        accessorKey: 'code',
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.code ?? row.original.id ?? '—'}</span>
        ),
      },
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) => row.original.patient_name ?? '—',
      },
      {
        id: 'doctor',
        header: 'Médico',
        cell: ({ row }) => row.original.doctor_name ?? '—',
      },
      // {
      //   id: 'sample_date',
      //   header: 'Fecha toma',
      //   cell: ({ row }) => formatDate(row.original.sample_collection_date) ?? '—',
      // },
      {
        id: 'total',
        header: 'Total',
        cell: ({ row }) => formatCurrency(row.original.total_amount),
      },
      {
        id: 'paid',
        header: 'A cuenta',
        cell: ({ row }) => (
          <span className="font-medium text-emerald-700 tabular-nums">
            {formatCurrency(row.original.amount_paid)}
          </span>
        ),
      },
      {
        id: 'due',
        header: 'Saldo',
        cell: ({ row }) => {
          const due = Number(row.original.total_due ?? 0)
          return (
            <span
              className={cn(
                'font-medium tabular-nums',
                due > 0 ? 'text-amber-700' : 'text-muted',
              )}
            >
              {formatCurrency(due)}
            </span>
          )
        },
      },
      {
        id: 'status',
        header: 'Estado pago',
        cell: ({ row }) => (
          <Badge variant={orderPaymentStatusVariant(row.original.status)}>
            {orderPaymentStatusLabel(row.original)}
          </Badge>
        ),
      },
      {
        id: 'insurance',
        header: 'Seguro',
        cell: ({ row }) => row.original.insurance_name ?? 'Particular',
      },
      {
        id: 'branch',
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch_name ?? '—',
      },
    ],
    [],
  )

  if (index.loading && index.items.length === 0 && loadingContext) {
    return <LoadingScreen />
  }

  const cashLabel = context?.cash?.label
  const cashOpen = context?.cash?.is_open === true

  return (
    <AnimatedPage>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          className="mb-0"
          title="Gestionar Transacciones"
          description="Cobros, saldos e historial financiero por orden."
        />
        <div className="flex flex-wrap items-center gap-2">
          {cashLabel && (
            <Badge variant={cashOpen ? 'success' : 'danger'} className="px-3 py-1">
              {cashLabel}
            </Badge>
          )}
          <Button type="button" variant="secondary" onClick={handleRefresh}>
            Actualizar
          </Button>
        </div>
      </div>

      <Card className="mb-4 p-4">
        <Tabs
          items={tabItems}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab)
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (tab === 'all') next.delete('tab')
              else next.set('tab', tab)
              return next
            })
          }}
        />
      </Card>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      </Card>

      {index.isEmpty ? (
        <EmptyState
          title="Sin órdenes en esta cola"
          description="No hay órdenes que coincidan con el filtro financiero."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            onRowClick={handleRowClick}
            selectedRowId={drawerOpen ? selectedOrder?.id : null}
            getRowClassName={(row) =>
              isOrderFinanciallyDimmed(row) ? 'opacity-60' : undefined
            }
            searchPlaceholder="Buscar por código, paciente o seguro…"
            showPagination={index.serverPagination.totalRows > 10}
          />
          {pageTotals && (
            <Card className="mt-3 flex flex-wrap gap-6 p-4 text-sm">
              <div>
                <span className="text-muted">Total página: </span>
                <strong className="tabular-nums">
                  {formatCurrency(pageTotals.total_amount)}
                </strong>
              </div>
              <div>
                <span className="text-muted">Cobrado página: </span>
                <strong className="text-emerald-700 tabular-nums">
                  {formatCurrency(pageTotals.amount_paid)}
                </strong>
              </div>
              <div>
                <span className="text-muted">Saldo página: </span>
                <strong className="text-amber-700 tabular-nums">
                  {formatCurrency(pageTotals.total_due)}
                </strong>
              </div>
            </Card>
          )}
        </>
      )}

      <TransactionOrderDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setSelectedOrder(null)
        }}
        context={context}
        onSuccess={handleDrawerSuccess}
      />
    </AnimatedPage>
  )
}
