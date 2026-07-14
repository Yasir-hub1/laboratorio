import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge, Button, Card, CardHeader, CardTitle, DataTable, Select } from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime, unwrapList } from '@/utils/apiHelpers'
import { cn } from '@/utils/cn'
import { toastApiError } from '@/utils/toastApi'

function isOpeningClosed(record) {
  if (!record) return false
  return Boolean(
    record.closed_at ||
      record.close_date ||
      record.status === 'closed' ||
      record.is_open === false ||
      record.is_open === 0,
  )
}

function AmountStat({ label, value, icon: Icon, accentClass, hint }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
        {Icon && <Icon className={cn('h-3.5 w-3.5', accentClass)} aria-hidden />}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {value != null ? formatCurrency(value) : '—'}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

function splitDateTime(value) {
  if (!value) return { date: '—', time: '—' }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { date: String(value), time: '—' }
  return {
    date: d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function CashAuditPage() {
  const [openings, setOpenings] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadOpenings = useCallback(async () => {
    setLoadingList(true)
    try {
      const raw = await laboratoryApi.getOpeningCashes({
        paginate: false,
        order_by: 'openning_date',
        order_dir: 'desc',
      })
      const closed = unwrapList(raw).items.filter(isOpeningClosed)
      setOpenings(closed)
      setSelectedId((prev) => {
        if (prev && closed.some((o) => String(o.id) === String(prev))) return prev
        return closed[0]?.id != null ? String(closed[0].id) : ''
      })
    } catch (err) {
      toastApiError(err)
      setOpenings([])
      setSelectedId('')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const loadDetail = useCallback(async (openingId) => {
    if (!openingId) {
      setDetail(null)
      return
    }
    setLoadingDetail(true)
    try {
      const data = await laboratoryApi.getCashFlowDetail(openingId)
      setDetail(data)
    } catch (err) {
      toastApiError(err)
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    loadOpenings()
  }, [loadOpenings])

  useEffect(() => {
    loadDetail(selectedId)
  }, [selectedId, loadDetail])

  const opening = useMemo(() => {
    const fromList = openings.find((o) => String(o.id) === String(selectedId))
    return detail?.opening ?? detail?.opening_cash ?? fromList ?? null
  }, [openings, selectedId, detail])

  const esperado = Number(opening?.current_amount ?? detail?.current_amount ?? NaN)
  const contado = Number(opening?.final_amount ?? detail?.final_amount ?? NaN)
  const diff =
    Number.isFinite(esperado) && Number.isFinite(contado) ? contado - esperado : null
  const diffLabel =
    diff == null ? null : diff === 0 ? 'Cuadrado' : diff > 0 ? 'Sobrante' : 'Faltante'

  const movements = useMemo(() => {
    const list = Array.isArray(detail?.movements)
      ? detail.movements
      : Array.isArray(detail?.items)
        ? detail.items
        : []
    return list
  }, [detail])

  const movementColumns = useMemo(
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
            <span
              className={cn(
                'font-semibold tabular-nums',
                isOut ? 'text-red-600' : 'text-emerald-600',
              )}
            >
              {isOut ? '−' : '+'}
              {formatCurrency(row.original.amount)}
            </span>
          )
        },
      },
    ],
    [],
  )

  if (loadingList && openings.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Arqueo de caja"
        description="Revisa aperturas cerradas: esperado vs contado y movimientos del turno."
        actions={
          <Button variant="secondary" size="sm" onClick={loadOpenings}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <Select
          label="Apertura cerrada"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="max-w-xl"
        >
          <option value="">Seleccionar…</option>
          {openings.map((o) => {
            const cashName = o.cash?.name ?? o.cash_name ?? `Caja #${o.cash_id ?? '—'}`
            const opened =
              o.opened_at ?? o.openning_date ?? o.opening_date ?? o.created_at
            return (
              <option key={o.id} value={o.id}>
                {cashName} · {formatDateTime(opened)}
              </option>
            )
          })}
        </Select>
      </Card>

      {!selectedId ? (
        <Card>
          <EmptyState
            title="Sin aperturas cerradas"
            description="Cuando cierres una caja, podrás arqueearla aquí."
          />
        </Card>
      ) : loadingDetail ? (
        <LoadingScreen message="Cargando arqueo…" />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AmountStat
              label="Monto inicial"
              value={opening?.initial_amount ?? detail?.initial_amount}
            />
            <AmountStat
              label="Ingresos"
              value={opening?.total_inflow ?? detail?.total_inflow}
              icon={ArrowDownLeft}
              accentClass="text-emerald-600"
            />
            <AmountStat
              label="Egresos"
              value={opening?.total_outflow ?? detail?.total_outflow}
              icon={ArrowUpRight}
              accentClass="text-red-500"
            />
            <AmountStat
              label="Esperado"
              value={Number.isFinite(esperado) ? esperado : null}
              icon={Wallet}
              accentClass="text-primary"
              hint="Saldo sistema (current_amount)"
            />
            <AmountStat
              label="Contado"
              value={Number.isFinite(contado) ? contado : null}
              hint="Monto de cierre (final_amount)"
            />
            <AmountStat
              label="Diferencia"
              value={diff}
              hint={diffLabel ?? undefined}
              accentClass={
                diff == null
                  ? undefined
                  : diff === 0
                    ? 'text-emerald-600'
                    : diff > 0
                      ? 'text-amber-600'
                      : 'text-red-600'
              }
            />
          </div>

          {(opening?.close_note || detail?.close_note) && (
            <Card className="mb-4 p-4">
              <p className="text-xs text-muted">Nota de cierre</p>
              <p className="mt-1 text-sm">{opening?.close_note ?? detail?.close_note}</p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos del turno</CardTitle>
            </CardHeader>
            {movements.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title="Sin movimientos" description="Esta apertura no registró movimientos." />
              </div>
            ) : (
              <DataTable columns={movementColumns} data={movements} />
            )}
          </Card>
        </>
      )}
    </AnimatedPage>
  )
}
