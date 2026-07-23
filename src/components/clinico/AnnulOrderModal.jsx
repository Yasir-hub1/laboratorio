import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Modal, ModalFooter, Textarea } from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { storage } from '@/utils/storage'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

/**
 * Modal reutilizable para anular una orden (listado y fase Revisada del workflow).
 * POST /laboratory-orders/{id}/annular — requiere motivo y caja abierta.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string|number} props.orderId
 * @param {string} [props.orderCode]
 * @param {() => void} [props.onSuccess]
 */
export function AnnulOrderModal({ open, onOpenChange, orderId, orderCode, onSuccess }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hasOpenCash = Boolean(storage.getOpeningCashId())

  const handleOpenChange = (next) => {
    if (!next) setReason('')
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toastApiError({ message: 'Ingrese el motivo de anulación' })
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.annulLaboratoryOrder(orderId, { annulment_reason: reason.trim() })
      toastApiSuccess('Orden anulada')
      setReason('')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={`Anular orden${orderCode ? ` ${orderCode}` : ''}`}
      description="Esta acción anula la orden y sus pagos activos. No se puede deshacer."
      className="max-w-lg"
    >
      <div className="space-y-3">
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <p className="font-semibold">Al anular esta orden:</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            <li>El estado financiero pasará a <strong>Anulado</strong>.</li>
            <li>El estado de workflow pasará a <strong>Anulada</strong>.</li>
            <li>Los pagos activos de la orden serán anulados.</li>
            <li>El ingreso de caja asociado será anulado (afecta el total de la apertura).</li>
          </ul>
        </div>

        {!hasOpenCash && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              No tienes una caja abierta. Abre una caja antes de anular, o la operación puede
              ser rechazada por el servidor.
            </p>
          </div>
        )}

        <Textarea
          label="Motivo de anulación (obligatorio)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ej. Error en la selección de estudios"
          rows={3}
          required
        />
      </div>

      <ModalFooter>
        <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={submitting || !reason.trim()}
          onClick={handleConfirm}
        >
          {submitting ? 'Anulando…' : 'Confirmar anulación'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
