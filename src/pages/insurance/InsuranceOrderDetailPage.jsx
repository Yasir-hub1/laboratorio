import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { InsurancePdfPreviewModal } from '@/components/insurance/InsurancePdfPreviewModal'
import { PortalResultsTable } from '@/components/portal/PortalResultsTable'
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { insurancePortalApi } from '@/services/insurancePortalApi'
import { ROUTES } from '@/utils/constants'
import {
  getOrderPatientName,
  getOrderStudyNames,
} from '@/utils/insurancePortal'
import { formatPortalOrderDate, getPortalOrderHeaderDate } from '@/utils/portalOrders'

export function InsuranceOrderDetailPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfOpen, setPdfOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    try {
      const [orderData, resultsData] = await Promise.all([
        insurancePortalApi.getOrder(orderId),
        insurancePortalApi.getOrderResults(orderId),
      ])
      setOrder(orderData)
      setResults(resultsData)
    } catch (err) {
      setError(err.message ?? 'No se pudo cargar la orden')
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const studyNames = getOrderStudyNames(order)
  const hasResults = results?.has_results === true
  const analyses = results?.analyses ?? []
  const orderCode = order?.code ?? results?.order?.code
  const patientName = getOrderPatientName(order)
  const insuranceNumber = order?.insurance_number ?? results?.order?.insurance_number
  const orderDateLabel = formatPortalOrderDate(getPortalOrderHeaderDate(order, results?.order))

  if (loading) {
    return (
      <AnimatedPage>
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm">Cargando orden…</p>
        </div>
      </AnimatedPage>
    )
  }

  if (error || !order) {
    return (
      <AnimatedPage>
        <Link
          to={ROUTES.INSURANCE_PORTAL}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Órdenes del seguro
        </Link>
        <Card className="border-red-200/60 bg-red-50/50 p-6 text-center">
          <p className="text-sm text-red-700">{error ?? 'Orden no encontrada'}</p>
        </Card>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <Link
        to={ROUTES.INSURANCE_PORTAL}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Órdenes del seguro
      </Link>

      <PageHeader
        title={`Orden ${order.code}`}
        description={[
          `Paciente: ${patientName}`,
          insuranceNumber ? `Nº seguro ${insuranceNumber}` : null,
          orderDateLabel !== '—' ? orderDateLabel : null,
          order.branch?.name,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          hasResults ? (
            <Button type="button" onClick={() => setPdfOpen(true)} className="gap-1.5">
              <FileDown className="h-4 w-4" aria-hidden />
              Ver PDF
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="success">{order.workflow_status_label ?? 'Completada'}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Estudios solicitados</CardTitle>
          <CardDescription>
            {studyNames.length > 0
              ? studyNames.join(', ')
              : 'Sin detalle de estudios disponible.'}
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Resultados</h2>

        {!hasResults && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted">
              Los resultados de esta orden aún no están disponibles.
            </p>
          </Card>
        )}

        {hasResults && <PortalResultsTable analyses={analyses} />}
      </section>

      <InsurancePdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        orderId={orderId}
        orderCode={orderCode}
      />
    </AnimatedPage>
  )
}
