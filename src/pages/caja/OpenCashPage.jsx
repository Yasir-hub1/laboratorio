import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card, CardHeader, CardTitle, DataTable } from '@/components/ui'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useAuth } from '@/hooks/useAuth'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { cashDisplayName } from '@/utils/cashHelpers'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'
import { toastApiError } from '@/utils/toastApi'

function isOpeningActive(record) {
  return record.is_open || record.status === 'open' || record.status === 1 || !record.closed_at
}

export function OpenCashPage() {
  const { setOpeningCash, cashId, cashName, branchName } = useAuth()
  const index = useIndexQuery(laboratoryApi.getOpeningCashes)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const storedOpeningId = storage.getOpeningCashId()
  const activeOpening = useMemo(() => {
    if (storedOpeningId) {
      const match = index.items.find((r) => String(r.id) === String(storedOpeningId))
      if (match) return match
    }
    return index.items.find(isOpeningActive) ?? null
  }, [index.items, storedOpeningId])

  const sessionCashId = cashId ?? storage.getCashId()

  useEffect(() => {
    if (activeOpening?.id) {
      storage.setOpeningCashId(String(activeOpening.id))
      setOpeningCash(String(activeOpening.id))
    }
  }, [activeOpening, setOpeningCash])

  const columns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
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
      index.reload()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = async (e) => {
    e.preventDefault()
    const openingId = activeOpening?.id ?? storedOpeningId
    if (!openingId) {
      toast.error('No hay caja abierta para cerrar')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.closeCash(openingId, {
        final_amount: closingAmount ? Number(closingAmount) : undefined,
      })
      storage.setOpeningCashId('')
      setOpeningCash('')
      toast.success('Caja cerrada')
      setClosingAmount('')
      index.reload()
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
        // phase="Fase 7"
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

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Unlock className="h-4 w-4 text-emerald-600" />
              Abrir caja
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleOpen} className="space-y-4">
            <p className="text-sm text-muted">
              {sessionCashId
                ? cashDisplayName({ id: sessionCashId, name: cashName })
                : 'Sin caja'}
            </p>
            <Input
              label="Monto inicial (Bs.)"
              name="initial_amount"
              type="number"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              disabled={Boolean(activeOpening) || !sessionCashId}
              required
            />
            <Button
              type="submit"
              disabled={submitting || Boolean(activeOpening) || !sessionCashId}
            >
              Abrir caja
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-red-600" />
              Cerrar caja
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleClose} className="space-y-4">
            <Input
              label="Monto final / arqueo (Bs.)"
              name="final_amount"
              type="number"
              min="0"
              step="0.01"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              disabled={!activeOpening && !storedOpeningId}
            />
            <Button
              type="submit"
              variant="danger"
              disabled={submitting || (!activeOpening && !storedOpeningId)}
            >
              Cerrar caja
            </Button>
          </form>
        </Card>
      </div>

      {activeOpening && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Sesión activa — ID {activeOpening.id}
          {activeOpening.initial_amount != null &&
            ` · Apertura: ${formatCurrency(activeOpening.initial_amount)}`}
        </div>
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
          />
        )}
      </Card>
    </AnimatedPage>
  )
}
