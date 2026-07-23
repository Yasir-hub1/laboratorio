import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Lock, Unlock, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card, CardHeader, CardTitle, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useAuth } from '@/hooks/useAuth'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import {
  cashDisplayName,
  resolveCashId,
  unwrapCashes,
} from '@/utils/cashHelpers'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function getActiveOpening(cash) {
  return (
    cash?.active_opening ??
    cash?.opening_cash ??
    cash?.current_opening ??
    cash?.opening ??
    null
  )
}

function isOpeningActive(record) {
  if (!record) return false
  if (record.closed_at || record.close_date) return false
  if (record.is_open === false || record.is_open === 0 || record.status === 'closed') {
    return false
  }
  return (
    record.is_open === true ||
    record.is_open === 1 ||
    record.status === 'open' ||
    record.status === 1 ||
    true
  )
}

function AmountStat({ label, value, icon: Icon, accentClass }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
        {Icon && <Icon className={cn('h-3.5 w-3.5', accentClass)} aria-hidden />}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {value != null ? formatCurrency(value) : '—'}
      </p>
    </div>
  )
}

export function OpenCashPage() {
  const { setOpeningCash, setCashContext, openingCashId, cashId, cashName, branchName } =
    useAuth()
  const { can } = usePermission()
  const canOpen = can('caja.apertura-cierre.abrir-caja')
  const canClose = can('caja.apertura-cierre.cerrar-caja')
  const canContinue = can('caja.apertura-cierre.continuar-sesion')
  const canViewMovements = can('caja.apertura-cierre.ver-movimientos')
  const canChangeCash = can('caja.apertura-cierre.cambiar-caja')
  const index = useIndexQuery(laboratoryApi.getOpeningCashes, {
    initialOrderBy: 'openning_date',
    initialOrderDir: 'desc',
  })

  const [myCashes, setMyCashes] = useState([])
  const [loadingCashes, setLoadingCashes] = useState(true)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [openModalCash, setOpenModalCash] = useState(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [closingTarget, setClosingTarget] = useState(null)
  const [closingAmount, setClosingAmount] = useState('')
  const [closeNote, setCloseNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [activeOpeningId, setActiveOpeningId] = useState(
    () => openingCashId || storage.getOpeningCashId(),
  )

  const storedOpeningId = activeOpeningId || storage.getOpeningCashId()

  const loadMyCashes = useCallback(async () => {
    setLoadingCashes(true)
    try {
      const list = unwrapCashes(await laboratoryApi.getMyCashes())
      setMyCashes(list)
    } catch (err) {
      toastApiError(err)
      setMyCashes([])
    } finally {
      setLoadingCashes(false)
    }
  }, [])

  const loadSessionDetail = useCallback(async (openingId) => {
    if (!openingId) {
      setSessionDetail(null)
      return
    }
    setLoadingDetail(true)
    try {
      const data = await laboratoryApi.getCashFlowDetail(openingId)
      setSessionDetail(data)
    } catch (err) {
      toastApiError(err)
      setSessionDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    loadMyCashes()
  }, [loadMyCashes])

  useEffect(() => {
    loadSessionDetail(storedOpeningId)
  }, [storedOpeningId, loadSessionDetail])

  const activeSession = useMemo(() => {
    if (!storedOpeningId) return null
    for (const cash of myCashes) {
      const opening = getActiveOpening(cash)
      if (opening && String(opening.id) === String(storedOpeningId) && isOpeningActive(opening)) {
        return { cash, opening }
      }
    }
    const fromDetail = sessionDetail?.opening ?? sessionDetail?.opening_cash
    if (fromDetail && isOpeningActive(fromDetail)) {
      return {
        cash: sessionDetail?.cash ?? { id: cashId, name: cashName },
        opening: fromDetail,
      }
    }
    return null
  }, [myCashes, storedOpeningId, sessionDetail, cashId, cashName])

  const kpis = useMemo(() => {
    const opening = activeSession?.opening
    const d = sessionDetail
    return {
      initial: Number(d?.initial_amount ?? opening?.initial_amount ?? NaN),
      inflow: Number(d?.total_inflow ?? opening?.total_inflow ?? NaN),
      outflow: Number(d?.total_outflow ?? opening?.total_outflow ?? NaN),
      current: Number(d?.current_amount ?? opening?.current_amount ?? NaN),
    }
  }, [activeSession, sessionDetail])

  const columns = useMemo(
    () => [
      {
        id: 'caja',
        header: 'Caja',
        cell: ({ row }) =>
          row.original.cash?.name ??
          row.original.cash_name ??
          `Caja #${row.original.cash_id ?? '—'}`,
      },
      {
        accessorKey: 'opened_at',
        header: 'Apertura',
        cell: ({ row }) =>
          formatDateTime(
            row.original.opened_at ??
              row.original.openning_date ??
              row.original.opening_date ??
              row.original.created_at,
          ),
      },
      {
        accessorKey: 'initial_amount',
        header: 'Monto apertura',
        cell: ({ row }) =>
          formatCurrency(row.original.initial_amount ?? row.original.opening_amount),
      },
      {
        accessorKey: 'final_amount',
        header: 'Monto cierre',
        cell: ({ row }) =>
          row.original.final_amount != null || row.original.closing_amount != null
            ? formatCurrency(row.original.final_amount ?? row.original.closing_amount)
            : '—',
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const open = isOpeningActive(row.original)
          return (
            <Badge variant={open ? 'success' : 'default'}>{open ? 'Abierta' : 'Cerrada'}</Badge>
          )
        },
      },
    ],
    [],
  )

  const activateSession = (cash, opening) => {
    const cid = resolveCashId(cash)
    if (!cid || !opening?.id) {
      toast.error('No se pudo activar la sesión')
      return
    }
    setCashContext({ cashId: cid, cashName: cashDisplayName(cash) })
    storage.setOpeningCashId(String(opening.id))
    setOpeningCash(String(opening.id))
    setActiveOpeningId(String(opening.id))
    toastApiSuccess(`Sesión activa: ${cashDisplayName(cash)}`)
    loadSessionDetail(String(opening.id))
  }

  const openOpenModal = (cash) => {
    setOpenModalCash(cash)
    setOpeningAmount('')
  }

  const handleOpen = async (e) => {
    e.preventDefault()
    const cid = resolveCashId(openModalCash)
    if (!cid) {
      toast.error('Caja inválida')
      return
    }
    if (!openingAmount) {
      toast.error('Ingresa el monto de apertura')
      return
    }
    setSubmitting(true)
    try {
      const result = await laboratoryApi.openCash({
        cash_id: cid,
        initial_amount: Number(openingAmount),
      })
      setCashContext({ cashId: cid, cashName: cashDisplayName(openModalCash) })
      if (result?.id) {
        storage.setOpeningCashId(String(result.id))
        setOpeningCash(String(result.id))
        setActiveOpeningId(String(result.id))
      }
      toastApiSuccess('Caja abierta')
      setOpenModalCash(null)
      setOpeningAmount('')
      await Promise.all([loadMyCashes(), index.reload()])
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const openCloseModal = (cash, opening) => {
    const expected = Number(
      sessionDetail?.current_amount ?? opening?.current_amount ?? NaN,
    )
    setClosingTarget({ cash, opening })
    setClosingAmount(Number.isFinite(expected) ? String(expected) : '')
    setCloseNote('')
    setCloseModalOpen(true)
  }

  const handleClose = async (e) => {
    e.preventDefault()
    const openingId = closingTarget?.opening?.id ?? storedOpeningId
    if (!openingId) {
      toast.error('No hay caja abierta para cerrar')
      return
    }
    if (!closingAmount) {
      toast.error('Ingresa el monto final de cierre')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.closeCash(openingId, {
        final_amount: Number(closingAmount),
        close_note: closeNote || undefined,
      })
      if (String(storedOpeningId) === String(openingId)) {
        storage.setOpeningCashId('')
        setOpeningCash('')
        setActiveOpeningId('')
        setSessionDetail(null)
      }
      toastApiSuccess('Caja cerrada')
      setCloseModalOpen(false)
      setClosingTarget(null)
      setClosingAmount('')
      setCloseNote('')
      await Promise.all([loadMyCashes(), index.reload()])
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if ((loadingCashes || index.loading) && myCashes.length === 0 && index.items.length === 0) {
    return <LoadingScreen />
  }

  const expectedClose = Number(
    sessionDetail?.current_amount ?? closingTarget?.opening?.current_amount ?? NaN,
  )
  const countedClose = Number(closingAmount)
  const closeDiff =
    Number.isFinite(expectedClose) && Number.isFinite(countedClose)
      ? countedClose - expectedClose
      : null

  return (
    <AnimatedPage>
      <PageHeader
        title="Apertura y cierre de caja"
        description="Gestiona tus cajas asignadas, activa la sesión del turno y cierra al finalizar."
        actions={
          canChangeCash ? (
            <Button variant="secondary" asChild>
              <Link to={ROUTES.SELECT_CASH}>Cambiar caja (login)</Link>
            </Button>
          ) : null
        }
      />

      {branchName && (
        <p className="mb-4 text-sm text-muted">
          Sucursal: <span className="text-foreground">{branchName}</span>
        </p>
      )}

      {activeSession && (
        <Card className="mb-6 border-emerald-200/80 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-emerald-600" aria-hidden />
                Sesión activa · {cashDisplayName(activeSession.cash)}
              </CardTitle>
              <p className="mt-1 text-sm text-muted">
                {(activeSession.opening.opened_at ||
                  activeSession.opening.openning_date ||
                  activeSession.opening.created_at) &&
                  formatDateTime(
                    activeSession.opening.opened_at ??
                      activeSession.opening.openning_date ??
                      activeSession.opening.created_at,
                  )}
              </p>
            </div>
            <Badge variant="success">Activa</Badge>
          </CardHeader>

          {loadingDetail ? (
            <p className="px-6 pb-4 text-sm text-muted">Actualizando montos…</p>
          ) : (
            <div className="grid gap-3 px-6 pb-4 sm:grid-cols-2 xl:grid-cols-4">
              <AmountStat
                label="Monto inicial"
                value={Number.isFinite(kpis.initial) ? kpis.initial : null}
              />
              <AmountStat
                label="Ingresos"
                value={Number.isFinite(kpis.inflow) ? kpis.inflow : null}
                icon={ArrowDownLeft}
                accentClass="text-emerald-600"
              />
              <AmountStat
                label="Egresos"
                value={Number.isFinite(kpis.outflow) ? kpis.outflow : null}
                icon={ArrowUpRight}
                accentClass="text-red-500"
              />
              <AmountStat
                label="Saldo"
                value={Number.isFinite(kpis.current) ? kpis.current : null}
                icon={Wallet}
                accentClass="text-emerald-600"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-emerald-200/60 px-6 py-4">
            {canClose ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => openCloseModal(activeSession.cash, activeSession.opening)}
                disabled={loadingDetail}
              >
                <Lock className="h-4 w-4" aria-hidden />
                Cerrar caja
              </Button>
            ) : null}
            {canViewMovements ? (
              <Button type="button" variant="secondary" asChild>
                <Link to={ROUTES.CASH_MOVEMENTS}>Ver movimientos</Link>
              </Button>
            ) : null}
          </div>
        </Card>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-foreground">Mis cajas</h2>
        {myCashes.length === 0 ? (
          <Card>
            <EmptyState
              title="Sin cajas asignadas"
              description="Pide a un administrador que te asigne una caja en Usuarios."
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {myCashes.map((cash) => {
              const cid = resolveCashId(cash)
              const opening = getActiveOpening(cash)
              const open = isOpeningActive(opening)
              const isCurrent =
                open &&
                storedOpeningId &&
                opening?.id != null &&
                String(opening.id) === String(storedOpeningId)

              return (
                <Card key={cid} className={cn(isCurrent && 'ring-2 ring-emerald-400/60')}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{cashDisplayName(cash)}</CardTitle>
                      <p className="mt-1 text-xs text-muted">
                        {open
                          ? `Abierta · ${formatCurrency(opening?.current_amount ?? opening?.initial_amount)}`
                          : 'Cerrada'}
                      </p>
                    </div>
                    <Badge variant={open ? 'success' : 'default'}>
                      {open ? 'Abierta' : 'Cerrada'}
                    </Badge>
                  </CardHeader>
                  <div className="flex flex-wrap gap-2 px-6 pb-6">
                    {!open && canOpen && (
                      <Button type="button" size="sm" onClick={() => openOpenModal(cash)}>
                        <Unlock className="h-3.5 w-3.5" />
                        Abrir
                      </Button>
                    )}
                    {open && !isCurrent && canContinue && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => activateSession(cash, opening)}
                      >
                        Usar sesión
                      </Button>
                    )}
                    {open && canClose && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => openCloseModal(cash, opening)}
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Cerrar
                      </Button>
                    )}
                    {isCurrent && (
                      <Badge variant="success" className="self-center">
                        En uso
                      </Badge>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de aperturas</CardTitle>
        </CardHeader>
        {index.isEmpty ? (
          <EmptyState
            title="Sin aperturas"
            description="Aún no hay registros de apertura de caja."
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            showRowNumbers
          />
        )}
      </Card>

      <Modal
        open={Boolean(openModalCash)}
        onOpenChange={(open) => {
          if (!open) setOpenModalCash(null)
        }}
        title="Abrir caja"
        description={openModalCash ? cashDisplayName(openModalCash) : undefined}
      >
        <form onSubmit={handleOpen} className="space-y-4">
          <Input
            label="Monto inicial (Bs.)"
            name="initial_amount"
            type="number"
            min="0"
            step="0.01"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            required
          />
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpenModalCash(null)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Abriendo…' : 'Abrir caja'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        title="Cerrar caja"
        description="El monto final es el contado físico. Compáralo con el saldo esperado del sistema."
      >
        <form onSubmit={handleClose} className="space-y-4">
          <div className="rounded-lg border border-border bg-surface-muted/40 p-3 text-sm">
            <p className="text-muted">Esperado (sistema)</p>
            <p className="text-lg font-semibold">
              {Number.isFinite(expectedClose) ? formatCurrency(expectedClose) : '—'}
            </p>
            {closeDiff != null && (
              <p
                className={cn(
                  'mt-1 text-xs font-medium',
                  closeDiff === 0
                    ? 'text-emerald-600'
                    : closeDiff > 0
                      ? 'text-amber-600'
                      : 'text-red-600',
                )}
              >
                Diferencia: {formatCurrency(closeDiff)}{' '}
                ({closeDiff === 0 ? 'Cuadrado' : closeDiff > 0 ? 'Sobrante' : 'Faltante'})
              </p>
            )}
          </div>
          <Input
            label="Monto final / contado (Bs.)"
            name="final_amount"
            type="number"
            min="0"
            step="0.01"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
            required
          />
          <Input
            label="Nota de cierre (opcional)"
            name="close_note"
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
          />
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCloseModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={submitting}>
              {submitting ? 'Cerrando…' : 'Confirmar cierre'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AnimatedPage>
  )
}
