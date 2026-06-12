import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, DataTable } from '@/components/ui'
import { useConfirm } from '@/hooks/useConfirmAction'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime, unwrapList } from '@/utils/apiHelpers'
import { ORDER_STATUS, ROUTES } from '@/utils/constants'

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || `#${p.id}`
}

function statusBadge(status) {
  const key = status ?? 0
  const info = ORDER_STATUS[key] ?? { label: String(status), color: 'default' }
  const variant =
    info.color === 'emerald'
      ? 'success'
      : info.color === 'red'
        ? 'danger'
        : info.color === 'amber'
          ? 'warning'
          : 'info'
  return <Badge variant={variant}>{info.label}</Badge>
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { confirm } = useConfirm()
  const [order, setOrder] = useState(null)
  const [samples, setSamples] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [annulling, setAnnulling] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [orderData, samplesData, paymentsData] = await Promise.all([
        laboratoryApi.getLaboratoryOrder(id),
        laboratoryApi.getOrderSamples(id),
        laboratoryApi.getPaymentsByOrder(id),
      ])
      setOrder(orderData)
      const { items: sampleItems } = unwrapList(samplesData)
      setSamples(sampleItems)
      const { items: paymentItems } = unwrapList(paymentsData)
      setPayments(Array.isArray(paymentsData) ? paymentsData : paymentItems)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleAnnul = async () => {
    const ok = await confirm({
      title: 'Anular orden',
      description: '¿Anular esta orden? Esta acción no se puede deshacer.',
      confirmLabel: 'Anular orden',
      variant: 'danger',
    })
    if (!ok) return
    setAnnulling(true)
    try {
      await laboratoryApi.annulLaboratoryOrder(id, {
        annulment_reason: 'Anulación desde sistema',
      })
      toast.success('Orden anulada')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAnnulling(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (!order) {
    return (
      <div>
        <p className="text-muted">Orden no encontrada.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate(ROUTES.ORDERS)}>
          Volver
        </Button>
      </div>
    )
  }

  const isAnnulled = order.status === 4
  const canPreviewResults = order.status === 3

  const paymentColumns = [
    { header: 'Fecha', cell: ({ row }) => formatDateTime(row.original.created_at) },
    {
      header: 'Monto',
      cell: ({ row }) => formatCurrency(row.original.amount ?? row.original.total),
    },
    {
      header: 'Método',
      cell: ({ row }) =>
        row.original.payment_method?.name ?? row.original.payment_method_name ?? '—',
    },
  ]

  const sampleColumns = [
    { header: 'Código', accessorKey: 'code' },
    {
      header: 'Muestra',
      cell: ({ row }) =>
        row.original.sample?.name ?? row.original.sample_name ?? row.original.sample_id,
    },
    {
      header: 'Estado',
      cell: ({ row }) => row.original.status_label ?? row.original.status ?? '—',
    },
  ]

  return (
    <AnimatedPage>
      <PageHeader
        phase="Fase 9-11"
        title={`Orden ${order.code ?? id}`}
        description="Detalle, muestras, pagos y documentos."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.ORDERS}>
              <Button variant="secondary">Volver</Button>
            </Link>
            <Button variant="secondary" onClick={() => setPdfPreview({ type: 'order' })}>
              Vista previa orden
            </Button>
            {canPreviewResults && (
              <Button variant="secondary" onClick={() => setPdfPreview({ type: 'results' })}>
                Vista previa resultados
              </Button>
            )}
            {!isAnnulled && (
              <Button variant="secondary" disabled={annulling} onClick={handleAnnul}>
                {annulling ? 'Anulando...' : 'Anular'}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <p>{statusBadge(order.status)}</p>
            <p>
              <span className="text-muted">Paciente:</span>{' '}
              {personLabel(order.patient) ?? order.patient_name}
            </p>
            <p>
              <span className="text-muted">Médico:</span>{' '}
              {personLabel(order.doctor) ?? order.doctor_name ?? '—'}
            </p>
            <p>
              <span className="text-muted">Seguro:</span>{' '}
              {order.insurance?.name ?? order.insurance_name ?? 'Particular (sin seguro)'}
            </p>
            <p>
              <span className="text-muted">Total:</span>{' '}
              {formatCurrency(order.total ?? order.amount ?? 0)}
            </p>
            <p>
              <span className="text-muted">Registro:</span>{' '}
              {formatDateTime(order.created_at)}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de análisis</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border text-sm">
            {(order.details ?? order.laboratory_order_details ?? []).map((d) => (
              <li key={d.id ?? d.laboratory_analysis_id} className="flex justify-between py-2">
                <span>
                  {d.analysis?.name ?? d.laboratory_analysis?.name ?? d.name ?? 'Análisis'}
                </span>
                <span>
                  {formatCurrency(
                    d.unit_price ?? d.price ?? d.finalPrice ?? d.subtotal ?? 0,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Muestras</CardTitle>
          <CardDescription>Muestras asociadas a la orden</CardDescription>
        </CardHeader>
        <DataTable
          columns={sampleColumns}
          data={samples}
          emptyMessage="Sin muestras"
          enableSearch={false}
          enableColumnVisibility={false}
          onRefresh={load}
          isRefreshing={loading}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagos</CardTitle>
          <CardDescription>Pagos registrados para esta orden</CardDescription>
        </CardHeader>
        <DataTable
          columns={paymentColumns}
          data={payments}
          emptyMessage="Sin pagos"
          enableSearch={false}
          enableColumnVisibility={false}
          onRefresh={load}
          isRefreshing={loading}
        />
      </Card>

      <PdfPreviewModal
        open={!!pdfPreview}
        onOpenChange={(open) => !open && setPdfPreview(null)}
        orderId={id}
        pdfType={pdfPreview?.type ?? 'order'}
        orderCode={order.code}
      />
    </AnimatedPage>
  )
}
