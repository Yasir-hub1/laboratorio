import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge, Button, Card, DataTable, Input, Select } from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime, unwrapList } from '@/utils/apiHelpers'
import { useAuth } from '@/hooks/useAuth'
import { toastApiError } from '@/utils/toastApi'

function isOpeningOpen(record) {
  if (!record) return false
  if (record.closed_at || record.close_date) return false
  if (record.is_open === false || record.is_open === 0 || record.status === 'closed') return false
  return (
    record.is_open === true ||
    record.is_open === 1 ||
    record.status === 'open' ||
    record.status === 1 ||
    true
  )
}

export function CashFlowPage() {
  const { branchName } = useAuth()
  const [summary, setSummary] = useState(null)
  const [openings, setOpenings] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cashFilter, setCashFilter] = useState('')
  const [cashes, setCashes] = useState([])

  const loadCashes = useCallback(async () => {
    try {
      const raw = await laboratoryApi.getCashes({ paginate: false })
      setCashes(unwrapList(raw).items)
    } catch {
      setCashes([])
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        paginate: true,
        per_page: 50,
      }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (cashFilter) params.cash_id = cashFilter

      const data = await laboratoryApi.getCashFlowGeneral(params)
      const s = data?.summary ?? data?.totals ?? data ?? {}
      setSummary({
        total_initial_amount: Number(s.total_initial_amount ?? 0),
        total_inflow: Number(s.total_inflow ?? s.total_inflows ?? 0),
        total_outflow: Number(s.total_outflow ?? s.total_outflows ?? 0),
        total_current_amount: Number(
          s.total_current_amount ?? s.balance ?? s.total_current ?? 0,
        ),
      })

      const openingsRaw = data?.openings ?? data?.items ?? []
      const list = Array.isArray(openingsRaw)
        ? openingsRaw
        : unwrapList(openingsRaw).items
      setOpenings(list)
    } catch (err) {
      toastApiError(err)
      setSummary(null)
      setOpenings([])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, cashFilter])

  useEffect(() => {
    loadCashes()
  }, [loadCashes])

  useEffect(() => {
    loadData()
  }, [loadData])

  const columns = useMemo(
    () => [
      {
        id: 'caja',
        header: 'Caja',
        cell: ({ row }) =>
          row.original.cash?.name ?? row.original.cash_name ?? `Caja #${row.original.cash_id ?? '—'}`,
      },
      {
        id: 'fecha',
        header: 'Fecha apertura',
        cell: ({ row }) =>
          formatDateTime(
            row.original.opened_at ??
              row.original.openning_date ??
              row.original.opening_date ??
              row.original.created_at,
          ),
      },
      {
        id: 'usuario',
        header: 'Usuario',
        cell: ({ row }) =>
          row.original.opening_user?.name ??
          row.original.openingUser?.name ??
          row.original.user?.name ??
          row.original.user_name ??
          '—',
      },
      {
        id: 'inicial',
        header: 'Inicial',
        cell: ({ row }) => formatCurrency(row.original.initial_amount),
      },
      {
        id: 'ingresos',
        header: 'Ingresos',
        cell: ({ row }) => formatCurrency(row.original.total_inflow ?? 0),
      },
      {
        id: 'egresos',
        header: 'Egresos',
        cell: ({ row }) => formatCurrency(row.original.total_outflow ?? 0),
      },
      {
        id: 'saldo',
        header: 'Saldo',
        cell: ({ row }) =>
          formatCurrency(row.original.current_amount ?? row.original.final_amount),
      },
      {
        id: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
          const open = isOpeningOpen(row.original)
          return (
            <Badge variant={open ? 'success' : 'default'}>{open ? 'Abierta' : 'Cerrada'}</Badge>
          )
        },
      },
    ],
    [],
  )

  const kpis = [
    {
      label: 'Total inicial',
      value: summary?.total_initial_amount,
      icon: Wallet,
      color: 'text-primary',
    },
    {
      label: 'Ingresos',
      value: summary?.total_inflow,
      icon: ArrowDownLeft,
      color: 'text-emerald-600',
    },
    {
      label: 'Egresos',
      value: summary?.total_outflow,
      icon: ArrowUpRight,
      color: 'text-red-600',
    },
    {
      label: 'Saldo',
      value: summary?.total_current_amount,
      icon: Wallet,
      color: 'text-primary',
    },
  ]

  if (loading && !summary) return <LoadingScreen message="Cargando flujo de caja…" />

  return (
    <AnimatedPage>
      <PageHeader
        title="Flujo de caja"
        description={`Resumen de aperturas${branchName ? ` · ${branchName}` : ''}.`}
        actions={
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            label="Caja"
            value={cashFilter}
            onChange={(e) => setCashFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {cashes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(stat.value ?? 0)}
                </p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        {openings.length === 0 ? (
          <EmptyState
            title="Sin aperturas"
            description="No hay aperturas en el rango seleccionado."
          />
        ) : (
          <DataTable columns={columns} data={openings} />
        )}
      </Card>
    </AnimatedPage>
  )
}
