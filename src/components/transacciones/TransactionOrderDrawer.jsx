import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'
import { PaymentPdfPreviewModal } from '@/components/common/PaymentPdfPreviewModal'
import {
  Badge,
  Button,
  Drawer,
  Input,
  Modal,
  ModalFooter,
  OrderStat,
  OrderStatGrid,
  Select,
  Textarea,
  WorkflowAlert,
} from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDate, formatDateTime, unwrapData } from '@/utils/apiHelpers'
import { buildPaymentPayload } from '@/utils/apiPayload'
import {
  computePaymentPreview,
  isCashPaymentMethod,
  orderPaymentStatusLabel,
  orderPaymentStatusVariant,
  paymentRowStatusLabel,
  paymentRowStatusVariant,
} from '@/utils/transactions'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

export function TransactionOrderDrawer({
  order,
  open,
  onOpenChange,
  context,
  onSuccess,
}) {
  const orderId = order?.id
  const cash = context?.cash ?? {}
  const cashOpen = cash.is_open === true

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState(null)
  const [payMethodId, setPayMethodId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [annulTarget, setAnnulTarget] = useState(null)
  const [annulReason, setAnnulReason] = useState('')
  const [pdfPaymentId, setPdfPaymentId] = useState(null)
  const [pdfPaymentCode, setPdfPaymentCode] = useState(null)

  const orderInfo = detail?.order ?? order
  const payments = detail?.payments ?? []
  const paymentMethods = detail?.payment_methods?.length
    ? detail.payment_methods
    : context?.payment_methods ?? []

  const loadDetail = useCallback(async () => {
    if (!orderId || !open) return
    setLoading(true)
    try {
      const raw = await laboratoryApi.getTransactionOrder(orderId)
      const data = unwrapData(raw) ?? raw
      setDetail(data)
      const due = Number(data?.order?.total_due ?? 0)
      setPayAmount(due > 0 ? String(due) : '')
      setPayMethodId('')
    } catch (err) {
      toastApiError(err)
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [orderId, open])

  useEffect(() => {
    if (open) loadDetail()
    else {
      setDetail(null)
      setPayMethodId('')
      setPayAmount('')
      setAnnulTarget(null)
      setAnnulReason('')
      setPdfPaymentId(null)
      setPdfPaymentCode(null)
    }
  }, [open, loadDetail])

  const selectedMethod = paymentMethods.find(
    (pm) => String(pm.id) === String(payMethodId),
  )
  const totalDue = Number(orderInfo?.total_due ?? 0)
  const preview = useMemo(
    () => computePaymentPreview(payAmount, totalDue),
    [payAmount, totalDue],
  )
  const showChangeBox =
    preview.change > 0 && isCashPaymentMethod(selectedMethod)

  const canRegisterPayment =
    cashOpen &&
    (orderInfo?.can_register_payment === true ||
      (totalDue > 0 && Number(orderInfo?.status) !== 2)) &&
    paymentMethods.length > 0

  const applyMutationResponse = (payload) => {
    const data = unwrapData(payload) ?? payload
    setDetail((prev) => ({
      ...prev,
      order: data.order ?? prev?.order,
      payments: data.payments ?? prev?.payments,
    }))
    onSuccess?.({
      order: data.order,
      payments: data.payments,
      queue_counts: data.queue_counts,
      payment_summary: data.payment_summary,
      payment: data.payment,
    })
    return data
  }

  const handlePay = async () => {
    if (!payMethodId) {
      toast.error('Seleccione un método de pago')
      return
    }
    if (preview.received <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    setSubmitting(true)
    try {
      const raw = await laboratoryApi.createPayment(
        buildPaymentPayload({
          laboratory_order_id: orderId,
          payment_method_id: payMethodId,
          amount: preview.received,
        }),
      )
      const data = applyMutationResponse(raw)
      toastApiSuccess('Pago registrado')
      if (data.payment_summary?.change > 0) {
        toast.info(`Vuelto: ${formatCurrency(data.payment_summary.change)}`)
      }
      const paymentId = data.payment?.id
      const paymentCode = data.payment?.code
      if (paymentId) {
        setPdfPaymentId(paymentId)
        setPdfPaymentCode(paymentCode ?? null)
      }
      const newDue = Number(data.order?.total_due ?? 0)
      setPayAmount(newDue > 0 ? String(newDue) : '')
      setPayMethodId('')
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnnul = async () => {
    if (!annulTarget?.id) return
    if (!annulReason.trim()) {
      toast.error('Ingrese el motivo de anulación')
      return
    }
    setSubmitting(true)
    try {
      const raw = await laboratoryApi.annulPayment(annulTarget.id, {
        annulment_reason: annulReason.trim(),
      })
      applyMutationResponse(raw)
      toastApiSuccess('Pago anulado')
      setAnnulTarget(null)
      setAnnulReason('')
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" disabled={loading} onClick={loadDetail}>
        Actualizar
      </Button>
    </div>
  )

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={`Orden ${orderInfo?.code ?? orderId}`}
        description={orderInfo?.patient_name ?? '—'}
        footer={footer}
        className="max-w-2xl"
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-muted">Cargando detalle…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={orderPaymentStatusVariant(orderInfo?.status)}>
                {orderPaymentStatusLabel(orderInfo)}
              </Badge>
              {orderInfo?.workflow_status_label && (
                <Badge variant="default">{orderInfo.workflow_status_label}</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-5">
              <div>
                <p className="text-[10px] uppercase text-muted">Subtotal</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(orderInfo?.subtotal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted">Descuento</p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(orderInfo?.discount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted">Total</p>
                <p className="text-sm font-bold text-primary tabular-nums">
                  {formatCurrency(orderInfo?.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted">A cuenta</p>
                <p className="text-sm font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(orderInfo?.amount_paid)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted">Saldo</p>
                <p
                  className={cn(
                    'text-sm font-semibold tabular-nums',
                    totalDue > 0 ? 'text-amber-700' : 'text-muted',
                  )}
                >
                  {formatCurrency(orderInfo?.total_due)}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted">
              Subtotal − descuento = total a pagar · A cuenta + saldo = total a pagar
            </p>

            <OrderStatGrid className="sm:grid-cols-2">
              <OrderStat label="Paciente" value={orderInfo?.patient_name} />
              <OrderStat label="Médico" value={orderInfo?.doctor_name ?? '—'} />
              <OrderStat label="Sucursal" value={orderInfo?.branch_name} />
              {/* <OrderStat
                label="Fecha toma"
                value={formatDate(orderInfo?.sample_collection_date)}
              /> */}
              <OrderStat label="Seguro" value={orderInfo?.insurance_name ?? 'Particular'} />
              <OrderStat label="Código" value={orderInfo?.code} />
            </OrderStatGrid>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Historial de pagos</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-muted">Sin pagos registrados.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/40 text-left text-xs uppercase text-muted">
                        <th className="p-2">Fecha</th>
                        <th className="p-2">Método</th>
                        <th className="p-2 text-right">Monto</th>
                        <th className="p-2">Estado</th>
                        <th className="p-2">Caja</th>
                        <th className="p-2">Registrado por</th>
                        <th className="p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const annulled = Number(p.status) === 2
                        return (
                          <tr key={p.id} className="border-b border-border/60 last:border-0">
                            <td className="p-2">{formatDateTime(p.created_at)}</td>
                            <td className="p-2">{p.payment_method_name ?? '—'}</td>
                            <td className="p-2 text-right font-medium tabular-nums">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="p-2">
                              <Badge variant={paymentRowStatusVariant(p.status)}>
                                {paymentRowStatusLabel(p)}
                              </Badge>
                            </td>
                            <td className="p-2 text-xs text-muted">
                              {p.opening_cash_label ?? '—'}
                            </td>
                            <td className="p-2 text-xs">{p.registered_by_name ?? '—'}</td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1">
                                {!annulled && p.can_export_pdf !== false && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      setPdfPaymentId(p.id)
                                      setPdfPaymentCode(p.code ?? null)
                                    }}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    PDF
                                  </Button>
                                )}
                                {!annulled && p.can_annul && cashOpen && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-danger"
                                    onClick={() => setAnnulTarget(p)}
                                  >
                                    Anular
                                  </Button>
                                )}
                                {annulled && p.annulment_reason && (
                                  <span className="text-xs text-muted">{p.annulment_reason}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {pdfPaymentId && (
              <WorkflowAlert variant="info">
                Pago registrado. El comprobante está listo para imprimir o descargar.
              </WorkflowAlert>
            )}

            {canRegisterPayment && totalDue > 0 && (
              <div className="rounded-lg border border-border p-3">
                <h3 className="mb-3 text-sm font-semibold">Cobro rápido</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Método de pago"
                    value={payMethodId}
                    onChange={(e) => setPayMethodId(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name ?? pm.description}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Monto recibido"
                    type="number"
                    min="0"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                {payAmount && (
                  <p className="mt-2 text-xs text-muted">
                    Aplicado: {formatCurrency(preview.applied)}
                    {preview.remaining > 0 && ` · Saldo restante: ${formatCurrency(preview.remaining)}`}
                  </p>
                )}
                {showChangeBox && (
                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                    <strong>Cambio a entregar:</strong> {formatCurrency(preview.change)}
                  </div>
                )}
                <Button
                  type="button"
                  className="mt-3"
                  disabled={submitting || !payMethodId || preview.received <= 0}
                  onClick={handlePay}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cobrando…
                    </>
                  ) : (
                    'Cobrar'
                  )}
                </Button>
              </div>
            )}

            {!cashOpen && totalDue > 0 && (
              <WorkflowAlert variant="warn">
                Caja cerrada. Abra caja para registrar cobros.
              </WorkflowAlert>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={Boolean(annulTarget)}
        onOpenChange={(o) => !o && setAnnulTarget(null)}
        title="Anular pago"
        description="El motivo quedará registrado en el historial."
      >
        <div className="space-y-4">
          <Textarea
            label="Motivo de anulación"
            value={annulReason}
            onChange={(e) => setAnnulReason(e.target.value)}
            required
          />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setAnnulTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" disabled={submitting} onClick={handleAnnul}>
              Confirmar anulación
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      <PaymentPdfPreviewModal
        open={Boolean(pdfPaymentId)}
        onOpenChange={(next) => {
          if (!next) {
            setPdfPaymentId(null)
            setPdfPaymentCode(null)
          }
        }}
        paymentId={pdfPaymentId}
        paymentCode={pdfPaymentCode}
      />
    </>
  )
}
