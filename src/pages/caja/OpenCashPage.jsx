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
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import {
  cashDisplayName,
  mergeActiveOpeningDisplay,
  parseCashOpeningStatus,
} from '@/utils/cashHelpers'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'
import { toastApiError } from '@/utils/toastApi'

function isOpeningActive(record) {
  return record.is_open || record.status === 'open' || record.status === 1 || !record.closed_at
}

function AmountStat({ label, value, icon: Icon, accentClass }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
        {Icon && <Icon className={`h-3.5 w-3.5 ${accentClass ?? ''}`} aria-hidden />}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">
        {value != null ? formatCurrency(value) : '—'}
      </p>
    </div>
  )
}

export function OpenCashPage() {
  const { setOpeningCash, cashId, cashName, branchName } = useAuth()
  const index = useIndexQuery(laboratoryApi.getOpeningCashes)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cashStatus, setCashStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)

  const storedOpeningId = storage.getOpeningCashId()
  const sessionCashId = cashId ?? storage.getCashId()

  const activeOpening = useMemo(() => {
    if (storedOpeningId) {
      const match = index.items.find((r) => String(r.id) === String(storedOpeningId))
      if (match && isOpeningActive(match)) return match
    }
    return index.items.find(isOpeningActive) ?? null
  }, [index.items, storedOpeningId])

  const hasActiveOpening = Boolean(
    cashStatus?.isOpen || (activeOpening && isOpeningActive(activeOpening)),
  )

  const openingDisplay = useMemo(
    () => mergeActiveOpeningDisplay(activeOpening, cashStatus),
    [activeOpening, cashStatus],
  )

  const loadCashStatus = useCallback(async () => {
    if (!sessionCashId) {
      setCashStatus(null)
      return
    }

    setLoadingStatus(true)
    try {
      const raw = await laboratoryApi.getCashStatus(sessionCashId)
      setCashStatus(parseCashOpeningStatus(raw))
    } catch (err) {
      toastApiError(err)
      setCashStatus(null)
    } finally {
      setLoadingStatus(false)
    }
  }, [sessionCashId])

  useEffect(() => {
    loadCashStatus()
  }, [loadCashStatus, index.items])

  useEffect(() => {
    const openingId = openingDisplay.id ?? activeOpening?.id
    if (openingId && hasActiveOpening) {
      storage.setOpeningCashId(String(openingId))
      setOpeningCash(String(openingId))
    }
  }, [activeOpening, hasActiveOpening, openingDisplay.id, setOpeningCash])

  const columns = useMemo(
    () => [
      // { accessorKey: 'id', header: 'ID' },
      {
        accessorKey: 'opened_at',
        header: 'Apertura',
        cell: ({ row }) => formatDateTime(row.original.opened_at ?? row.original.created_at),
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

  const handleOpen = async (e) => {
    e.preventDefault()
    if (!sessionCashId) {
      toast.error('Selecciona una caja en el inicio de sesión')
      return
    }
    if (!openingAmount) {
      toast.error('Ingresa el monto de apertura')
      return
    }
    setSubmitting(true)
    try {
      const result = await laboratoryApi.openCash({
        cash_id: sessionCashId,
        initial_amount: Number(openingAmount),
      })
      if (result?.id) {
        storage.setOpeningCashId(String(result.id))
        setOpeningCash(String(result.id))
      }
      toast.success('Caja abierta')
      setOpeningAmount('')
      await Promise.all([index.reload(), loadCashStatus()])
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const openCloseModal = () => {
    setClosingAmount(
      openingDisplay.currentAmount != null ? String(openingDisplay.currentAmount) : '',
    )
    setCloseModalOpen(true)
  }

  const handleClose = async (e) => {
    e.preventDefault()
    const openingId = openingDisplay.id ?? activeOpening?.id ?? storedOpeningId
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
      })
      storage.setOpeningCashId('')
      setOpeningCash('')
      toast.success('Caja cerrada')
      setClosingAmount('')
      setCloseModalOpen(false)
      await Promise.all([index.reload(), loadCashStatus()])
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Apertura y cierre de caja"
        description="Usa la caja seleccionada al iniciar sesión. Puedes cambiarla en el menú de sesión."
        actions={
          <Button variant="secondary" asChild>
            <Link to={ROUTES.SELECT_CASH}>Cambiar caja</Link>
          </Button>
        }
      />

      {!sessionCashId ? (
        <Card className="mb-6 p-4 text-sm text-amber-800">
          No hay caja en sesión.{' '}
          <Link to={ROUTES.SELECT_CASH} className="link-primary font-medium">
            Selecciona una caja
          </Link>{' '}
          para continuar.
        </Card>
      ) : (
        <div className="mb-6 rounded-lg border border-border bg-surface-muted/40 px-4 py-3 text-sm">
          <p>
            <span className="text-muted">Caja en sesión:</span>{' '}
            <span className="font-medium">{cashName ?? `Caja #${sessionCashId}`}</span>
          </p>
          {branchName && (
            <p className="text-muted">
              Sucursal: <span className="text-foreground">{branchName}</span>
            </p>
          )}
        </div>
      )}

      {sessionCashId && hasActiveOpening && (
        <Card className="mb-6 border-emerald-200/80 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-emerald-600" aria-hidden />
                Caja aperturada
              </CardTitle>
              <p className="mt-1 text-sm text-muted">
                {/* Apertura #{openingDisplay.id ?? '—'} */}
                {openingDisplay.openedAt &&
                  ` · ${formatDateTime(openingDisplay.openedAt)}`}
              </p>
            </div>
            <Badge variant="success">Activa</Badge>
          </CardHeader>

          {loadingStatus ? (
            <p className="px-6 pb-4 text-sm text-muted">Actualizando montos…</p>
          ) : (
            <div className="grid gap-3 px-6 pb-4 sm:grid-cols-2 xl:grid-cols-4">
              <AmountStat label="Monto inicial" value={openingDisplay.initialAmount} />
              <AmountStat
                label="Monto actual"
                value={openingDisplay.currentAmount}
                icon={Wallet}
                accentClass="text-emerald-600"
              />
              <AmountStat
                label="Total ingresos"
                value={openingDisplay.totalInflow}
                icon={ArrowDownLeft}
                accentClass="text-emerald-600"
              />
              <AmountStat
                label="Total salidas"
                value={openingDisplay.totalOutflow}
                icon={ArrowUpRight}
                accentClass="text-red-500"
              />
            </div>
          )}

          <div className="border-t border-emerald-200/60 px-6 py-4">
            <Button type="button" variant="danger" onClick={openCloseModal} disabled={loadingStatus}>
              <Lock className="h-4 w-4" aria-hidden />
              Cerrar caja
            </Button>
          </div>
        </Card>
      )}

      {sessionCashId && !hasActiveOpening && (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unlock className="h-4 w-4 text-emerald-600" />
              Abrir caja
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleOpen} className="space-y-4 px-6 pb-6">
            <p className="text-sm text-muted">
              {cashDisplayName({ id: sessionCashId, name: cashName })}
            </p>
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
            <Button type="submit" disabled={submitting}>
              Abrir caja
            </Button>
          </form>
        </Card>
      )}

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
            showRowNumbers={true}
          />
        )}
      </Card>

      <Modal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        title="Cerrar caja"
        description="Confirma el monto final de la caja. Se precarga con el monto actual del sistema."
      >
        <form onSubmit={handleClose} className="space-y-4">
          <div className="rounded-lg border border-border bg-surface-muted/40 p-3 text-sm">
            <p className="text-muted">Monto actual en sistema</p>
            <p className="text-lg font-semibold">
              {openingDisplay.currentAmount != null
                ? formatCurrency(openingDisplay.currentAmount)
                : '—'}
            </p>
          </div>
          <Input
            label="Monto final / arqueo (Bs.)"
            name="final_amount"
            type="number"
            min="0"
            step="0.01"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
            required
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
