import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, FileSearch, FileText } from 'lucide-react'
import { AnnulOrderModal } from '@/components/clinico/AnnulOrderModal'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Can } from '@/components/auth/Can'
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { usePermission } from '@/hooks/usePermission'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import {
  ORDER_PAYMENT_STATUS,
  ORDER_WORKFLOW_STATUS,
  ROUTES,
} from '@/utils/constants'
import {
  doctorDisplayName,
  genderLabel,
  getWorkflowLabel,
  orderWorkflowPath,
} from '@/utils/orderWorkflow'
import { canManageOrderQueue } from '@/utils/permissions'
import { toastApiError } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function personLabel(p) {
  if (!p) return '—'
  return (
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') ||
    '—'
  )
}

function badgeVariant(color) {
  if (color === 'emerald') return 'success'
  if (color === 'red') return 'danger'
  if (color === 'amber') return 'warning'
  return 'info'
}

function PaymentStatusBadge({ status }) {
  const info = ORDER_PAYMENT_STATUS[status] ?? { label: String(status ?? '—'), color: 'default' }
  return <Badge variant={badgeVariant(info.color)}>{info.label}</Badge>
}

function WorkflowStatusBadge({ order }) {
  const key = order?.workflow_status
  const info = ORDER_WORKFLOW_STATUS[key] ?? { color: 'default' }
  return <Badge variant={badgeVariant(info.color)}>{getWorkflowLabel(order)}</Badge>
}

function groupLineItemsBySample(lineItems = []) {
  const map = new Map()
  for (const item of lineItems) {
    const key = item.sample_name ?? item.sample?.name ?? 'Sin tipo de muestra'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return [...map.entries()]
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can, permissions } = usePermission()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pdfPreview, setPdfPreview] = useState(null)
  const [annulOpen, setAnnulOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await laboratoryApi.getOrderDetailSummary(id)
      setSummary(data)
    } catch (err) {
      toastApiError(err)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const order = summary?.order ?? summary
  const ws = Number(order?.workflow_status)
  const isAnnulled = Number(order?.status) === 2 || ws === 6
  const canPreviewResults = ws === 5
  const canManage = canManageOrderQueue(permissions, ws) && ws !== 5
  const lineItems = summary?.line_items ?? order?.line_items ?? order?.details ?? []
  const payments = summary?.payments ?? []
  const reception = summary?.reception ?? {}
  const receivedSamples = reception?.received_samples ?? []
  const results = summary?.results ?? summary?.analyses ?? null
  const groupedItems = useMemo(() => groupLineItemsBySample(lineItems), [lineItems])

  if (loading) return <LoadingScreen />
  if (!order) {
    return (
      <div>
        <p className="text-muted">Orden no encontrada.</p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => navigate(ROUTES.ORDER_MANAGEMENT)}
        >
          Volver
        </Button>
      </div>
    )
  }

  const totalAmount = order.total_amount ?? order.total ?? 0
  const amountPaid = order.amount_paid ?? 0
  const totalDue = order.total_due ?? Math.max(0, Number(totalAmount) - Number(amountPaid))

  return (
    <AnimatedPage>
      <PageHeader
        title={order.code ? `Orden ${order.code}` : `Orden #${order.id}`}
        description={`${personLabel(order.patient)} · ${doctorDisplayName(order.doctor) ?? 'Sin médico'}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to={ROUTES.ORDER_MANAGEMENT}>
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </Link>
            </Button>
            {canManage && (
              <Button asChild>
                <Link to={orderWorkflowPath(order.id)}>Gestionar</Link>
              </Button>
            )}
            <Can permission="atencion.gestion-ordenes.exportar-pdf">
              <Button variant="secondary" onClick={() => setPdfPreview('order')}>
                <FileText className="h-4 w-4" />
                Comprobante
              </Button>
            </Can>
            {canPreviewResults && (
              <Can permission="atencion.gestion-ordenes.exportar-pdf">
                <Button variant="secondary" onClick={() => setPdfPreview('results')}>
                  <FileSearch className="h-4 w-4" />
                  Informe PDF
                </Button>
              </Can>
            )}
            {ws === 4 && can('atencion.gestion-ordenes.anular') && !isAnnulled && (
              <Button variant="danger" onClick={() => setAnnulOpen(true)}>
                <Ban className="h-4 w-4" />
                Anular
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-xs text-muted self-center">Operativo:</span>
        <WorkflowStatusBadge order={order} />
        <span className="text-xs text-muted self-center">Financiero:</span>
        <PaymentStatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Paciente y orden</CardTitle>
          </CardHeader>
          <dl className="grid gap-3 px-6 pb-6 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted">Paciente</dt>
              <dd className="font-medium">{personLabel(order.patient)}</dd>
            </div>
            <div>
              <dt className="text-muted">CI</dt>
              <dd>{order.patient?.ci ?? order.patient?.document_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Género</dt>
              <dd>{genderLabel(order.patient?.gender)}</dd>
            </div>
            <div>
              <dt className="text-muted">Médico</dt>
              <dd>{doctorDisplayName(order.doctor) ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Seguro</dt>
              <dd>{order.insurance?.name ?? order.insurance_name ?? 'Particular'}</dd>
            </div>
            <div>
              <dt className="text-muted">Fecha</dt>
              <dd>{formatDateTime(order.created_at ?? order.date)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totales</CardTitle>
          </CardHeader>
          <dl className="space-y-2 px-6 pb-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold">{formatCurrency(totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Pagado</dt>
              <dd>{formatCurrency(amountPaid)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-muted">Saldo</dt>
              <dd className="font-semibold">{formatCurrency(totalDue)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Análisis</CardTitle>
          <CardDescription>Agrupados por tipo de muestra</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          {groupedItems.length === 0 ? (
            <p className="text-sm text-muted">Sin ítems.</p>
          ) : (
            groupedItems.map(([sampleName, items]) => {
              const subtotal = items.reduce(
                (acc, it) => acc + Number(it.price ?? it.amount ?? it.total ?? 0),
                0,
              )
              return (
                <div key={sampleName} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{sampleName}</p>
                    <p className="text-sm tabular-nums">{formatCurrency(subtotal)}</p>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {items.map((it, idx) => (
                      <li key={it.id ?? idx} className="flex justify-between gap-2 text-muted">
                        <span>
                          {it.analysis_name ??
                            it.analysis?.name ??
                            it.laboratory_analysis?.name ??
                            'Análisis'}
                        </span>
                        <span className="tabular-nums text-foreground">
                          {formatCurrency(it.price ?? it.amount ?? it.total ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
          <div className="flex justify-end border-t border-border pt-3 text-sm font-semibold">
            Total orden: {formatCurrency(totalAmount)}
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Recepción de muestras</CardTitle>
        </CardHeader>
        <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
          {receivedSamples.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay tubos recepcionados.</p>
          ) : (
            receivedSamples.map((s) => (
              <div
                key={s.id ?? s.code}
                className="rounded-lg border border-border bg-surface-muted/30 p-3 text-sm"
              >
                <p className="font-medium">
                  {s.sample_name ?? s.catalog_sample?.name ?? s.name ?? 'Muestra'}
                </p>
                <p className="mt-1 text-muted">
                  Código: <span className="text-foreground font-mono">{s.code ?? '—'}</span>
                </p>
                <p className="text-muted">
                  Fecha: {formatDateTime(s.received_date ?? s.created_at)}
                </p>
                <p className="text-muted">
                  Recepcionó:{' '}
                  {personLabel(s.received_by ?? s.received_by_user) !== '—'
                    ? personLabel(s.received_by ?? s.received_by_user)
                    : (s.received_by_name ?? '—')}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      {canPreviewResults && results && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Resultados</CardTitle>
            <CardDescription>Solo disponibles en órdenes completadas</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 text-sm text-muted">
            Los resultados detallados están disponibles en el informe PDF.
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Pagos</CardTitle>
        </CardHeader>
        {payments.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted">Sin pagos registrados.</p>
        ) : (
          <ul className="divide-y divide-border px-6 pb-6">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">
                    {p.payment_method?.name ?? p.payment_method_name ?? 'Pago'}
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(p.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(p.amount ?? p.total)}
                  </p>
                  <PaymentStatusBadge status={p.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAnnulled && (order.annulment_reason || summary?.annulment_reason) && (
        <Card className={cn('mt-4 border-red-200 bg-red-50/40')}>
          <CardHeader>
            <CardTitle className="text-base text-red-800">Anulación</CardTitle>
          </CardHeader>
          <p className="px-6 pb-6 text-sm text-red-900">
            {order.annulment_reason ?? summary?.annulment_reason}
          </p>
        </Card>
      )}

      <PdfPreviewModal
        open={Boolean(pdfPreview)}
        onOpenChange={(open) => {
          if (!open) setPdfPreview(null)
        }}
        orderId={order.id}
        orderCode={order.code}
        pdfType={pdfPreview === 'results' ? 'results' : 'order'}
      />

      <AnnulOrderModal
        open={annulOpen}
        onOpenChange={setAnnulOpen}
        orderId={order.id}
        orderCode={order.code}
        onSuccess={() => {
          load()
        }}
      />
    </AnimatedPage>
  )
}
