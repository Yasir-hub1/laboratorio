import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  FileDown,
  FlaskConical,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { PatientPdfPreviewModal } from '@/components/portal/PatientPdfPreviewModal'
import { PortalResultsTable } from '@/components/portal/PortalResultsTable'
import { Badge, Button, Card } from '@/components/ui'
import { patientPortalApi } from '@/services/patientPortalApi'
import { formatDateTime } from '@/utils/apiHelpers'
import { ROUTES } from '@/utils/constants'
import { getOrderStudyNames } from '@/utils/patientPortal'
import { getPortalOrderHeaderDate } from '@/utils/portalOrders'
import { cn } from '@/utils/cn'

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-32 rounded-lg bg-surface-muted" />
      <div className="glass-card rounded-2xl border p-5">
        <div className="h-6 w-48 rounded-md bg-surface-muted" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-14 rounded-xl bg-surface-muted/80" />
          <div className="h-14 rounded-xl bg-surface-muted/80" />
        </div>
      </div>
      <div className="h-24 rounded-2xl bg-surface-muted/70" />
      <div className="h-40 rounded-2xl bg-surface-muted/60" />
    </div>
  )
}

function InfoTile({ icon: Icon, label, value, className }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-surface-muted/25 px-3.5 py-3 sm:px-4 sm:py-3.5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/15">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">{value}</p>
        </div>
      </div>
    </div>
  )
}

function formatOrderDateDisplay(order, resultsOrder) {
  const raw = getPortalOrderHeaderDate(order, resultsOrder)
  if (!raw) return 'Sin fecha registrada'
  return formatDateTime(raw)
}

export function PatientOrderDetailPage() {
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
        patientPortalApi.getOrder(orderId),
        patientPortalApi.getOrderResults(orderId),
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
  const orderDateLabel = formatOrderDateDisplay(order, results?.order)
  const branchName = order?.branch?.name ?? '—'
  const statusLabel = order?.workflow_status_label ?? 'Completada'
  const componentCount = analyses.reduce(
    (sum, analysis) => sum + (analysis.components?.length ?? 0),
    0,
  )

  if (loading) {
    return (
      <AnimatedPage>
        <DetailSkeleton />
      </AnimatedPage>
    )
  }

  if (error || !order) {
    return (
      <AnimatedPage>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 gap-2">
          <Link to={ROUTES.PATIENT_PORTAL}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Mis órdenes
          </Link>
        </Button>
        <Card className="border-red-200/60 bg-red-50/50 px-4 py-8 text-center sm:px-6">
          <p className="text-sm font-medium text-red-700">{error ?? 'Orden no encontrada'}</p>
          <Button asChild variant="secondary" size="sm" className="mt-4">
            <Link to={ROUTES.PATIENT_PORTAL}>Volver al listado</Link>
          </Button>
        </Card>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage className={cn(hasResults && 'pb-24 sm:pb-8')}>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 h-11 gap-2 sm:h-9">
        <Link to={ROUTES.PATIENT_PORTAL}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Mis órdenes
        </Link>
      </Button>

      {/* Resumen de la orden */}
      <section className="glass-card mb-5 overflow-hidden rounded-2xl border sm:mb-6">
        <div className="border-b border-border/50 bg-emerald-500/[0.06] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80">
                Detalle de orden
              </p>
              <h1 className="mt-1 break-all text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {order.code}
              </h1>
            </div>
            <Badge variant="success" className="w-fit shrink-0 self-start text-sm">
              {statusLabel}
            </Badge>
          </div>

          <div className="mt-4 hidden sm:block">
            <Button
              type="button"
              onClick={() => setPdfOpen(true)}
              disabled={!hasResults}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              {hasResults ? 'Ver PDF de resultados' : 'PDF no disponible'}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
          <InfoTile icon={Calendar} label="Fecha de orden" value={orderDateLabel} />
          <InfoTile icon={Building2} label="Sucursal" value={branchName} />
        </div>
      </section>

      {/* Estudios */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-emerald-600" aria-hidden />
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            Estudios solicitados
          </h2>
          {studyNames.length > 0 && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
              {studyNames.length}
            </span>
          )}
        </div>

        {studyNames.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {studyNames.map((name) => (
              <li key={name}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-foreground">
                  <FlaskConical className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                  {name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="px-4 py-5 text-sm text-muted">Sin detalle de estudios disponible.</Card>
        )}
      </section>

      {/* Resultados */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">Resultados</h2>
            <p className="mt-1 text-sm text-muted">
              {hasResults
                ? `${analyses.length} ${analyses.length === 1 ? 'estudio' : 'estudios'} · ${componentCount} ${componentCount === 1 ? 'valor' : 'valores'}`
                : 'Consulta los valores cuando el laboratorio los publique.'}
            </p>
          </div>
        </div>

        {!hasResults && (
          <Card className="px-4 py-10 text-center sm:px-8 sm:py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-muted">
              <FlaskConical className="h-7 w-7" aria-hidden />
            </span>
            <p className="text-base font-semibold text-foreground">Resultados pendientes</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Los resultados de esta orden aún no están disponibles. Vuelve más tarde o consulta
              directamente en el laboratorio.
            </p>
          </Card>
        )}

        {hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PortalResultsTable analyses={analyses} />
          </motion.div>
        )}
      </section>

      {/* PDF sticky en móvil */}
      {hasResults && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-20 border-t border-white/60 bg-white/85 p-4 backdrop-blur-xl sm:hidden',
            'pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.12)]',
          )}
        >
          <Button
            type="button"
            onClick={() => setPdfOpen(true)}
            className="h-12 w-full gap-2"
          >
            <FileDown className="h-4 w-4" aria-hidden />
            Descargar PDF de resultados
          </Button>
        </div>
      )}

      <PatientPdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        orderId={orderId}
        orderCode={orderCode}
      />
    </AnimatedPage>
  )
}
