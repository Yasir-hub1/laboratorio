import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge, Button, Card, DataTable, Input, Modal, ModalFooter, Select } from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency } from '@/utils/apiHelpers'
import { buildCashInflowPayload, buildCashOutflowPayload } from '@/utils/apiPayload'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function splitDateTime(value) {
  if (!value) return { date: '—', time: '—' }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: String(value), time: '—' }
  return {
    date: d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function CashMovementsPage() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canInflow = can('caja.movimientos.ingresar')
  const canOutflow = can('caja.movimientos.egresar')
  const canAnnul = can('caja.movimientos.anular')
  const openingId = storage.getOpeningCashId()
  const [filtersMeta, setFiltersMeta] = useState(null)
  const [movements, setMovements] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [kindFilter, setKindFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    kind: 'inflow',
    category_id: '',
    amount: '',
    description: '',
  })

  const loadFilters = useCallback(async () => {
    try {
      const data = await laboratoryApi.getCashMovementFilters()
      setFiltersMeta(data)
    } catch (err) {
      toastApiError(err)
    }
  }, [])

  const loadMovements = useCallback(async () => {
    if (!openingId) {
      setMovements([])
      setDetail(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params = {}
      if (methodFilter) params.payment_method_id = methodFilter
      const data = await laboratoryApi.getCashFlowDetail(openingId, params)
      setDetail(data)
      const list = Array.isArray(data?.movements)
        ? data.movements
        : Array.isArray(data?.items)
          ? data.items
          : []
      setMovements(list)
    } catch (err) {
      toastApiError(err)
      setMovements([])
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [openingId, methodFilter])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  useEffect(() => {
    loadMovements()
  }, [loadMovements])

  const categories = useMemo(() => {
    const all = filtersMeta?.categories ?? []
    if (!form.kind) return all
    return all.filter((c) => !c.kind || c.kind === form.kind)
  }, [filtersMeta, form.kind])

  const filterCategories = useMemo(() => {
    const all = filtersMeta?.categories ?? []
    if (!kindFilter) return all
    return all.filter((c) => !c.kind || c.kind === kindFilter)
  }, [filtersMeta, kindFilter])

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const kind = m.kind ?? m.movement_type
      if (kindFilter && kind !== kindFilter) return false
      if (categoryFilter) {
        const catId = String(m.type_id ?? m.type_inflow_id ?? m.type_outflow_id ?? m.category_id ?? '')
        const catName = String(m.type ?? m.category ?? '')
        const match =
          catId === String(categoryFilter) ||
          catName === categoryFilter ||
          String(m.type_inflow?.id ?? '') === String(categoryFilter) ||
          String(m.type_outflow?.id ?? '') === String(categoryFilter)
        if (!match) return false
      }
      if (statusFilter) {
        const st = String(m.status ?? (m.is_annulled ? '2' : '1'))
        if (st !== String(statusFilter)) return false
      }
      if (dateFrom || dateTo) {
        const raw = m.date ?? m.created_at
        if (!raw) return false
        const day = String(raw).slice(0, 10)
        if (dateFrom && day < dateFrom) return false
        if (dateTo && day > dateTo) return false
      }
      return true
    })
  }, [movements, kindFilter, categoryFilter, statusFilter, dateFrom, dateTo])

  const columns = useMemo(
    () => [
      {
        id: 'fecha',
        header: 'Fecha',
        cell: ({ row }) => splitDateTime(row.original.date ?? row.original.created_at).date,
      },
      {
        id: 'hora',
        header: 'Hora',
        cell: ({ row }) => splitDateTime(row.original.date ?? row.original.created_at).time,
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => {
          const kind = row.original.kind ?? row.original.movement_type
          const isOut = kind === 'outflow'
          return (
            <Badge variant={isOut ? 'warning' : 'success'}>{isOut ? 'Egreso' : 'Ingreso'}</Badge>
          )
        },
      },
      {
        id: 'categoria',
        header: 'Categoría',
        cell: ({ row }) =>
          row.original.type ??
          row.original.category ??
          row.original.type_inflow?.name ??
          row.original.type_outflow?.name ??
          '—',
      },
      {
        id: 'metodo',
        header: 'Método',
        cell: ({ row }) => {
          const kind = row.original.kind ?? row.original.movement_type
          if (kind === 'outflow') return '—'
          return row.original.payment_method ?? row.original.payment_method_name ?? '—'
        },
      },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ row }) => row.original.description || '—',
      },
      {
        id: 'monto',
        header: 'Monto',
        cell: ({ row }) => {
          const kind = row.original.kind ?? row.original.movement_type
          const isOut = kind === 'outflow'
          return (
            <span className={cn('font-semibold tabular-nums', isOut ? 'text-red-600' : 'text-emerald-600')}>
              {isOut ? '−' : '+'}
              {formatCurrency(row.original.amount)}
            </span>
          )
        },
      },
      {
        id: 'usuario',
        header: 'Usuario',
        cell: ({ row }) =>
          row.original.user_name ?? row.original.created_by_name ?? row.original.user?.name ?? '—',
      },
      {
        id: 'caja',
        header: 'Caja',
        cell: ({ row }) => row.original.cash_name ?? detail?.cash?.name ?? '—',
      },
      {
        id: 'estado',
        header: 'Estado',
        cell: ({ row }) => {
          const annulled =
            Number(row.original.status) === 2 ||
            row.original.is_annulled === true ||
            row.original.annulled === true
          return (
            <Badge variant={annulled ? 'danger' : 'success'}>
              {annulled ? 'Anulado' : 'Activo'}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => {
          const m = row.original
          const annulled =
            Number(m.status) === 2 || m.is_annulled === true || m.annulled === true
          if (annulled || !canAnnul) return '—'
          const kind = m.kind ?? m.movement_type
          return (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-danger"
              onClick={async () => {
                try {
                  if (kind === 'outflow') await laboratoryApi.annulCashOutflow(m.id)
                  else await laboratoryApi.annulCashInflow(m.id)
                  toastApiSuccess('Movimiento anulado')
                  loadMovements()
                } catch (err) {
                  toastApiError(err)
                }
              }}
            >
              Anular
            </Button>
          )
        },
      },
    ],
    [detail, loadMovements, canAnnul],
  )

  const openCreate = (kind = 'inflow') => {
    setForm({ kind, category_id: '', amount: '', description: '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!openingId) {
      toast.error('No hay sesión de caja activa')
      return
    }
    setSubmitting(true)
    try {
      if (form.kind === 'inflow') {
        await laboratoryApi.createCashInflow(
          buildCashInflowPayload({
            type_inflow_id: form.category_id,
            amount: form.amount,
            description: form.description,
          }),
        )
        toastApiSuccess('Ingreso registrado')
      } else {
        await laboratoryApi.createCashOutflow(
          buildCashOutflowPayload({
            type_outflow_id: form.category_id,
            amount: form.amount,
            description: form.description,
          }),
        )
        toastApiSuccess('Egreso registrado')
      }
      setModalOpen(false)
      loadMovements()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!openingId) {
    return (
      <AnimatedPage>
        <PageHeader
          title="Movimientos de caja"
          description="Ingresos y egresos de la sesión activa."
        />
        <Card>
          <EmptyState
            title="Sin sesión de caja"
            description="Abre o selecciona una sesión en Apertura / Cierre."
            actionLabel="Ir a apertura"
            onAction={() => navigate(ROUTES.OPEN_CASH)}
          />
          <div className="px-6 pb-6">
            <Button asChild variant="secondary">
              <Link to={ROUTES.OPEN_CASH}>Apertura / Cierre</Link>
            </Button>
          </div>
        </Card>
      </AnimatedPage>
    )
  }

  if (loading && movements.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Movimientos de caja"
        description="Ingresos y egresos unificados de la sesión activa."
        actions={
          <div className="flex flex-wrap gap-2">
            {canOutflow ? (
              <Button variant="secondary" onClick={() => openCreate('outflow')}>
                <Plus className="h-4 w-4" />
                Egreso
              </Button>
            ) : null}
            {canInflow ? (
              <Button onClick={() => openCreate('inflow')}>
                <Plus className="h-4 w-4" />
                Ingreso
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          <Select label="Tipo" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
            <option value="">Todos</option>
            {(filtersMeta?.kinds ?? [
              { value: 'inflow', label: 'Ingreso' },
              { value: 'outflow', label: 'Egreso' },
            ]).map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
          <Select
            label="Categoría"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {filterCategories.map((c) => (
              <option key={`${c.kind}-${c.id}`} value={c.id}>
                {c.name}
                {c.kind ? ` (${c.kind === 'inflow' ? 'Ing.' : 'Egr.'})` : ''}
              </option>
            ))}
          </Select>
          <Select
            label="Método de pago"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {(filtersMeta?.payment_methods ?? []).map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </Select>
          <Select
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {(filtersMeta?.statuses ?? [
              { value: '1', label: 'Activo' },
              { value: '2', label: 'Anulado' },
            ]).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {filteredMovements.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="Registra un ingreso o egreso en esta sesión."
            actionLabel={canInflow ? 'Nuevo ingreso' : undefined}
            onAction={canInflow ? () => openCreate('inflow') : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredMovements}
            searchPlaceholder="Buscar movimiento…"
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={form.kind === 'inflow' ? 'Nuevo ingreso' : 'Nuevo egreso'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipo"
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({ ...f, kind: e.target.value, category_id: '' }))
            }
          >
            <option value="inflow">Ingreso</option>
            <option value="outflow">Egreso</option>
          </Select>
          <Select
            label="Categoría"
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            required
          >
            <option value="">Seleccionar…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Monto (Bs.)"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              Guardar
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AnimatedPage>
  )
}
