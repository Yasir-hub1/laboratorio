import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { buildCashInflowPayload } from '@/utils/apiPayload'
import { storage } from '@/utils/storage'

export function InflowsPage() {
  const openingId = storage.getOpeningCashId()
  const index = useIndexQuery(
    laboratoryApi.getCashInflows,
    {
      enabled: !!openingId,
      extraParams: openingId ? { opening_cash_id: openingId } : {},
    },
    [openingId],
  )
  const { items: typeInflows } = useApiList(laboratoryApi.getTypeInflows, [])
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    type_inflow_id: '',
    amount: '',
    description: '',
  })

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const columns = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Fecha',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        accessorKey: 'type_inflow',
        header: 'Tipo',
        cell: ({ row }) =>
          row.original.type_inflow?.name ?? row.original.type_name ?? '—',
      },
      {
        accessorKey: 'amount',
        header: 'Monto',
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: 'payment_method',
        header: 'Método pago',
        cell: ({ row }) =>
          row.original.payment_method?.name ?? row.original.payment_method_name ?? '—',
      },
      { accessorKey: 'description', header: 'Descripción' },
    ],
    [],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await laboratoryApi.createCashInflow(buildCashInflowPayload(form))
      toast.success('Ingreso registrado')
      setModalOpen(false)
      setForm({ type_inflow_id: '', amount: '', description: '' })
      index.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!openingId) {
    return (
      <AnimatedPage>
        <PageHeader
          title="Ingresos de caja"
          description="Registra entradas de efectivo en la caja activa."
        />
        <Card>
          <EmptyState
            title="Sin caja abierta"
            description="Abre una caja antes de registrar ingresos."
          />
        </Card>
      </AnimatedPage>
    )
  }

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 7"
        title="Ingresos de caja"
        description="Registra entradas de efectivo en la caja activa."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo ingreso
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin ingresos"
            description="Registra el primer ingreso de la sesión de caja."
            actionLabel="Nuevo ingreso"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
          />
        )}
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Nuevo ingreso">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipo de ingreso"
            name="type_inflow_id"
            value={form.type_inflow_id}
            onChange={(e) => setForm((f) => ({ ...f, type_inflow_id: e.target.value }))}
            required
          >
            <option value="">Seleccionar...</option>
            {typeInflows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Input
            label="Monto (Bs.)"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <Input
            label="Descripción"
            name="description"
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
