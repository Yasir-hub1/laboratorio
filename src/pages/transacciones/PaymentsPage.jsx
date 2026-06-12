import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import {
  Button,
  DataTable,
  Input,
  Modal,
  ModalFooter,
  Select,
} from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { buildPaymentPayload } from '@/utils/apiPayload'

export function PaymentsPage() {
  const {
    items: payments,
    error,
    reload,
    serverPagination,
    isEmpty,
  } = useIndexQuery(laboratoryApi.getPayments)

  const { items: orders } = useApiList(laboratoryApi.getLaboratoryOrders, [])
  const { items: paymentMethods } = useApiList(laboratoryApi.getPaymentMethods, [])

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    laboratory_order_id: '',
    payment_method_id: '',
    amount: '',
    reference: '',
  })

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const openCreate = () => {
    setModalOpen(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await laboratoryApi.createPayment(buildPaymentPayload(form))
      toast.success('Pago registrado')
      setModalOpen(false)
      setForm({
        laboratory_order_id: '',
        payment_method_id: '',
        amount: '',
        reference: '',
      })
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'Orden',
        cell: ({ row }) =>
          row.original.laboratory_order?.code ??
          row.original.order_code ??
          row.original.laboratory_order_id,
      },
      {
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        header: 'Monto',
        cell: ({ row }) => formatCurrency(row.original.amount ?? row.original.total),
      },
      {
        header: 'Método',
        cell: ({ row }) =>
          row.original.payment_method?.name ?? row.original.payment_method_name ?? '—',
      },
    ],
    [],
  )

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 12"
        title="Pagos"
        description="Consulta y registro de pagos de órdenes de laboratorio."
        actions={<Button onClick={openCreate}>Registrar pago</Button>}
      />

      {isEmpty ? (
        <EmptyState
          title="Sin pagos"
          description="Registra el primer pago de una orden."
          actionLabel="Registrar pago"
          onAction={openCreate}
        />
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          serverPagination={serverPagination}
        />
      )}

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Nuevo pago"
        description="Asocia el pago a una orden de laboratorio."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Orden"
            value={form.laboratory_order_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, laboratory_order_id: e.target.value }))
            }
            required
          >
            <option value="">Seleccionar...</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code ?? `#${o.id}`}
              </option>
            ))}
          </Select>
          <Select
            label="Método de pago"
            value={form.payment_method_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, payment_method_id: e.target.value }))
            }
            required
          >
            <option value="">Seleccionar...</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name ?? pm.description}
              </option>
            ))}
          </Select>
          <Input
            label="Monto"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
          />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Registrar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AnimatedPage>
  )
}
