import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, FileSearch, Pencil, RefreshCw } from 'lucide-react'
import { AnnulOrderModal } from '@/components/clinico/AnnulOrderModal'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import {
  Badge,
  Button,
  Card,
  Input,
  OrderStat,
  OrderStatGrid,
  Textarea,
  WorkflowAlert,
} from '@/components/ui'
import { useConfirm } from '@/hooks/useConfirmAction'
import { usePermission } from '@/hooks/usePermission'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatDate, formatDateTime, unwrapData } from '@/utils/apiHelpers'
import {
  buildReceiveMultipleSamplesPayload,
  buildSaveOrderResultsPayload,
  buildUpdateResultValidationsPayload,
  buildWorkflowTransitionPayload,
  pickDefined,
} from '@/utils/apiPayload'
import { ROUTES } from '@/utils/constants'
import {
  allAnalysesReviewedInSamples,
  allComponentsFilled,
  analysesWithoutComponents,
  analysisDisplayName,
  canStayOnWorkflowForm,
  collectSaveEntries,
  componentStatusLabel,
  filterPendingRequired,
  flattenComponents,
  formatRefRange,
  getWorkflowLabel,
  orderDetailPath,
} from '@/utils/orderWorkflow'
import { ORDER_QUEUE_PERMISSIONS } from '@/utils/permissions'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name || p.name || [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || '—'
}

function catalogSampleName(sample) {
  return (
    sample?.catalog_sample?.name ??
    sample?.catalogSample?.name ??
    sample?.sample_name ??
    sample?.name ??
    sample?.sample_type ??
    'Muestra'
  )
}

function analysisTags(analyses) {
  if (!analyses?.length) return null
  return analyses.map((a, i) => {
    const label = typeof a === 'string' ? a : a?.name ?? a?.analysis_name ?? '—'
    return (
      <span
        key={i}
        className="mr-1 mt-0.5 inline-block rounded bg-surface-muted px-1.5 py-0.5 text-xs text-muted"
      >
        {label}
      </span>
    )
  })
}

function statusBadgeVariant(ws) {
  if (ws === 5) return 'success'
  if (ws === 6) return 'danger'
  if (ws === 1) return 'warning'
  return 'info'
}

const emptyResultDraft = (component) => ({
  value_obtained: component?.value_obtained ?? '',
  valor_ref_min: component?.valor_ref_min ?? '',
  valor_ref_max: component?.valor_ref_max ?? '',
  unit_measurement: component?.unit_measurement ?? '',
})

/**
 * Página completa «Gestionar orden» — reemplaza el drawer para el flujo operativo.
 * Ruta: /atencion/gestionar-orden/:id/gestionar (§2 de la especificación).
 */
export function OrderWorkflowPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermission()
  const { confirm } = useConfirm()

  const [order, setOrder] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [redirectTo, setRedirectTo] = useState(null)

  // Fase 1 — Recepción
  const [sampleForms, setSampleForms] = useState({})
  const [editingSampleId, setEditingSampleId] = useState(null)
  const [editSampleForm, setEditSampleForm] = useState({})

  // Fase 2 — Resultados
  const [editingResults, setEditingResults] = useState(false)
  const [resultDrafts, setResultDrafts] = useState({})

  // Fase 3 — Validación
  const [editingValidation, setEditingValidation] = useState(false)
  const [validationDrafts, setValidationDrafts] = useState({})

  const [pdfPreview, setPdfPreview] = useState(false)
  const [annulOpen, setAnnulOpen] = useState(false)

  const ws = Number(order?.workflow_status)

  const loadSummary = useCallback(
    async (currentOrder) => {
      const wsValue = Number(currentOrder?.workflow_status)
      if (wsValue === 1) {
        const raw = await laboratoryApi.getReceptionSummary(id)
        const data = unwrapData(raw) ?? raw
        setDetail(data)
        const pending = filterPendingRequired(data?.required_samples, data?.received_samples)
        const forms = {}
        for (const sample of pending) {
          const sid = sample.sample_id ?? sample.id
          forms[sid] = { sample_id: sid, code: sample.suggested_code ?? '', volume: '', note: '' }
        }
        setSampleForms(forms)
        setEditingSampleId(null)
      } else if (wsValue === 2 || wsValue === 3) {
        const raw = await laboratoryApi.getResultsEntrySummary(id)
        const data = unwrapData(raw) ?? raw
        setDetail(data)
        setResultDrafts({})
        setValidationDrafts({})
        setEditingValidation(false)
        if (wsValue === 2) {
          const allFilled = allComponentsFilled(data?.analyses, {})
          setEditingResults(!(data?.checks?.can_send_to_review || allFilled))
        } else {
          setEditingResults(false)
        }
      } else if (wsValue === 4) {
        const raw = await laboratoryApi.getClosureSummary(id)
        const data = unwrapData(raw) ?? raw
        setDetail(data)
      } else {
        setDetail(null)
      }
    },
    [id],
  )

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) return
      if (!silent) setLoading(true)
      try {
        const raw = await laboratoryApi.getLaboratoryOrder(id)
        const data = unwrapData(raw) ?? raw
        if (!data) {
          setNotFound(true)
          return
        }
        setOrder(data)
        setNotFound(false)
        const wsValue = Number(data?.workflow_status)
        const permName = ORDER_QUEUE_PERMISSIONS[wsValue]
        if (!permName || !can(permName)) {
          setRedirectTo(
            can('atencion.gestion-ordenes.ver') ? orderDetailPath(id) : ROUTES.ORDER_MANAGEMENT,
          )
          return
        }
        setRedirectTo(null)
        await loadSummary(data)
      } catch (err) {
        toastApiError(err)
        setNotFound(true)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [id, can, loadSummary],
  )

  useEffect(() => {
    load()
  }, [load])

  const checks = detail?.checks ?? {}
  const receivedSamples = detail?.received_samples ?? []
  const requiredSamples = detail?.required_samples ?? []
  const pendingSamples = useMemo(
    () => filterPendingRequired(requiredSamples, receivedSamples),
    [requiredSamples, receivedSamples],
  )
  const analyses = detail?.analyses ?? []
  const closureSamples = detail?.samples ?? []
  const closureOrderInfo = ws === 4 ? (detail?.order ?? order) : order
  const allComponentsFlat = useMemo(() => analyses.flatMap((a) => flattenComponents(a)), [analyses])
  const missingComponentAnalyses = useMemo(() => analysesWithoutComponents(detail), [detail])

  const patientName =
    order?.patient_name ?? personLabel(order?.patient) ?? '—'

  const hasResultChanges = useMemo(() => {
    for (const analysis of analyses) {
      const saId = analysis.sample_analysis_id ?? analysis.id
      for (const component of flattenComponents(analysis)) {
        const cId = component.component_analysis_id ?? component.id
        const key = `${saId}:${cId}`
        const draft = resultDrafts[key]
        if (!draft) continue
        const base = emptyResultDraft(component)
        if (
          String(draft.value_obtained ?? '') !== String(base.value_obtained) ||
          String(draft.valor_ref_min ?? '') !== String(base.valor_ref_min) ||
          String(draft.valor_ref_max ?? '') !== String(base.valor_ref_max) ||
          String(draft.unit_measurement ?? '') !== String(base.unit_measurement)
        ) {
          return true
        }
      }
    }
    return false
  }, [analyses, resultDrafts])

  const hasValidationChanges = useMemo(() => {
    return Object.entries(validationDrafts).some(([resultId, val]) => {
      const comp = allComponentsFlat.find((c) => String(c.result_id) === String(resultId))
      if (!comp) return false
      return Boolean(val) !== (Number(comp.status) === 2)
    })
  }, [validationDrafts, allComponentsFlat])

  // ——— Navegación tras transición (§0.6) ———
  const afterTransition = useCallback(
    async (nextWs, { successMessage } = {}) => {
      const permName = ORDER_QUEUE_PERMISSIONS[nextWs]
      if (permName && can(permName)) {
        if (successMessage) toastApiSuccess(successMessage)
        await load()
      } else {
        toast.info('No tienes permiso para gestionar la siguiente fase. Te llevamos al listado.')
        navigate(`${ROUTES.ORDER_MANAGEMENT}?tab=${nextWs}`)
      }
    },
    [can, load, navigate],
  )

  const runTransition = useCallback(
    async (nextWs, { title, description, confirmLabel, successMessage } = {}) => {
      const staysOnForm = canStayOnWorkflowForm(nextWs, can)
      const fullDescription = staysOnForm
        ? description
        : `${description} No tienes permiso para gestionar esa cola; serás redirigido al listado.`
      const ok = await confirm({
        title,
        description: fullDescription,
        confirmLabel: confirmLabel ?? 'Confirmar',
        variant: 'primary',
      })
      if (!ok) return
      setSubmitting(true)
      try {
        await laboratoryApi.transitionLaboratoryOrder(id, buildWorkflowTransitionPayload(nextWs))
        await afterTransition(nextWs, { successMessage })
      } catch (err) {
        toastApiError(err)
      } finally {
        setSubmitting(false)
      }
    },
    [id, can, confirm, afterTransition],
  )

  // ——— Fase 1: Recepción ———
  const handleReceive = async () => {
    const samples = pendingSamples
      .map((sample) => {
        const sid = sample.sample_id ?? sample.id
        const form = sampleForms[sid]
        if (!form) return null
        return {
          sample_id: sid,
          code: form.code?.trim() || null,
          volume: form.volume?.trim() || null,
          note: form.note?.trim() || null,
        }
      })
      .filter(Boolean)

    if (!samples.length) {
      toast.error('No hay muestras pendientes por recepcionar')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.receiveMultipleSamples(
        buildReceiveMultipleSamplesPayload({ laboratory_order_id: id, samples }),
      )
      toastApiSuccess('Recepción registrada')
      await load({ silent: true })
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const startEditSample = (sample) => {
    setEditingSampleId(sample.id)
    setEditSampleForm({
      code: sample.code ?? '',
      volume: sample.volume ?? '',
      note: sample.note ?? '',
    })
  }

  const handleSaveEditSample = async (sample) => {
    const changed =
      (editSampleForm.code ?? '') !== (sample.code ?? '') ||
      (editSampleForm.volume ?? '') !== (sample.volume ?? '') ||
      (editSampleForm.note ?? '') !== (sample.note ?? '')
    if (!changed) {
      setEditingSampleId(null)
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.updateLaboratorySample(
        sample.id,
        pickDefined({
          code: editSampleForm.code?.trim(),
          volume: editSampleForm.volume?.trim(),
          note: editSampleForm.note?.trim(),
        }),
      )
      toastApiSuccess('Muestra actualizada')
      setEditingSampleId(null)
      await load({ silent: true })
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmReception = () =>
    runTransition(2, {
      title: 'Confirmar recepción',
      description: 'La orden pasará a En proceso.',
      confirmLabel: 'Confirmar',
      successMessage: 'Orden confirmada',
    })

  // ——— Fase 2: Resultados ———
  const getResultDraft = (saId, cId, component) =>
    resultDrafts[`${saId}:${cId}`] ?? emptyResultDraft(component)

  const updateResultDraft = (saId, cId, component, field, value) => {
    const key = `${saId}:${cId}`
    setResultDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? emptyResultDraft(component)), [field]: value },
    }))
  }

  const handleSaveResults = async () => {
    const entries = collectSaveEntries(detail, resultDrafts)
    if (!entries.length) {
      toast.error('No hay cambios para guardar')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.saveOrderResults(id, buildSaveOrderResultsPayload(entries), {
        includeChecks: true,
      })
      toastApiSuccess('Resultados guardados')
      setResultDrafts({})
      await load({ silent: true })
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEditResults = () => {
    setResultDrafts({})
    const allFilled = allComponentsFilled(analyses, {})
    setEditingResults(!(checks.can_send_to_review || allFilled))
  }

  const handleSendToReview = () =>
    runTransition(3, {
      title: 'Enviar a revisión',
      description: 'Los resultados pasarán a la fase de revisión.',
      confirmLabel: 'Enviar a revisión',
      successMessage: 'Orden enviada a revisión',
    })

  // ——— Fase 3: Validación ———
  const handleUpdateValidations = async () => {
    const entries = Object.entries(validationDrafts)
      .filter(([resultId, val]) => {
        const comp = allComponentsFlat.find((c) => String(c.result_id) === String(resultId))
        return comp && Boolean(val) !== (Number(comp.status) === 2)
      })
      .map(([result_id, validated]) => ({ result_id, validated }))

    if (!entries.length) {
      toast.error('No hay cambios para actualizar')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.updateResultValidations(id, buildUpdateResultValidationsPayload(entries))
      toastApiSuccess('Validaciones actualizadas')
      setValidationDrafts({})
      setEditingValidation(false)
      await load({ silent: true })
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEditValidation = () => {
    setValidationDrafts({})
    setEditingValidation(false)
  }

  const handleBackToProceso = () =>
    runTransition(2, {
      title: 'Volver a En proceso',
      description: 'La orden regresará a En proceso y podrá editar los resultados nuevamente.',
      confirmLabel: 'Volver a En proceso',
      successMessage: 'Orden actualizada',
    })

  const handleMarkReviewed = () =>
    runTransition(4, {
      title: 'Marcar revisada',
      description: 'La orden pasará a Revisada.',
      confirmLabel: 'Marcar revisada',
      successMessage: 'Orden marcada como revisada',
    })

  // ——— Fase 4: Cierre ———
  const handleBackToReview = () =>
    runTransition(3, {
      title: 'Volver a En revisión',
      description: 'La orden regresará a En revisión.',
      confirmLabel: 'Volver a En revisión',
      successMessage: 'Orden actualizada',
    })

  const handleComplete = async () => {
    const staysOnForm = canStayOnWorkflowForm(5, can)
    const ok = await confirm({
      title: 'Completar orden',
      description: staysOnForm
        ? 'La orden quedará Completada y visible en los portales de paciente y seguro.'
        : 'La orden quedará Completada. No tienes permiso para gestionar Completadas; serás redirigido al listado.',
      confirmLabel: 'Completar orden',
      variant: 'primary',
    })
    if (!ok) return
    setSubmitting(true)
    try {
      await laboratoryApi.completeLaboratoryOrder(id)
      await afterTransition(5, { successMessage: 'Orden completada' })
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnnulSuccess = () => afterTransition(6)

  if (loading) return <LoadingScreen />
  if (redirectTo) return <Navigate to={redirectTo} replace />
  if (notFound || !order) {
    return (
      <AnimatedPage>
        <Card className="p-6 text-center">
          <p className="text-sm text-muted">Orden no encontrada.</p>
          <Button className="mt-4" variant="secondary" onClick={() => navigate(ROUTES.ORDER_MANAGEMENT)}>
            Volver al listado
          </Button>
        </Card>
      </AnimatedPage>
    )
  }

  const canExportPdf = can('atencion.gestion-ordenes.exportar-pdf')
  const canAnnul = can('atencion.gestion-ordenes.anular')

  return (
    <AnimatedPage>
      <PageHeader
        title={`Orden ${order.code ?? id}`}
        description={patientName}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant(ws)}>{getWorkflowLabel(order)}</Badge>
            {ws === 4 && canExportPdf && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                onClick={() => setPdfPreview(true)}
              >
                <FileSearch className="h-4 w-4" aria-hidden />
                Vista previa PDF
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={loading}
              onClick={() => load()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Actualizar
            </Button>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" asChild>
              <Link to={ROUTES.ORDER_MANAGEMENT}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Volver al listado
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <OrderStatGrid className="mb-4">
          {/* <OrderStat label="Paciente" value={patientName} />
          <OrderStat label="Código" value={order.code} /> */}
          {(ws === 4 || ws === 5 || ws === 6) && (
            <OrderStat label="Sucursal" value={closureOrderInfo?.branch?.name ?? closureOrderInfo?.branch_name} />
          )}
          {(ws === 2 || ws === 3) && <OrderStat label="Estudios" value={String(analyses.length)} />}
        </OrderStatGrid>

        {/* ——— Fase 1: Pendiente ——— */}
        {ws === 1 && (
          <div className="space-y-3">
            <WorkflowAlert variant="info">
              {requiredSamples.length} requerido(s), {receivedSamples.length} recibido(s).
              {pendingSamples.length > 0 &&
                ' Precargue código sugerido o deje vacío para generación automática.'}
            </WorkflowAlert>

            {receivedSamples.map((s) => {
              const editing = editingSampleId === s.id
              return (
                <div
                  key={s.id ?? s.code ?? s.sample_id}
                  className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/30"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold">✓ {catalogSampleName(s)}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        Código: <strong>{s.code ?? '—'}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Recibida</Badge>
                      {!editing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2"
                          onClick={() => startEditSample(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Editar
                        </Button>
                      )}
                    </div>
                  </div>
                  {editing ? (
                    <div className="grid gap-3 p-3 sm:grid-cols-2">
                      <Input
                        label="Código de barras"
                        value={editSampleForm.code ?? ''}
                        onChange={(e) =>
                          setEditSampleForm((prev) => ({ ...prev, code: e.target.value }))
                        }
                      />
                      <Input
                        label="Volumen"
                        value={editSampleForm.volume ?? ''}
                        onChange={(e) =>
                          setEditSampleForm((prev) => ({ ...prev, volume: e.target.value }))
                        }
                      />
                      <div className="sm:col-span-2">
                        <Textarea
                          label="Nota"
                          value={editSampleForm.note ?? ''}
                          rows={2}
                          onChange={(e) =>
                            setEditSampleForm((prev) => ({ ...prev, note: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={submitting}
                          onClick={() => handleSaveEditSample(s)}
                        >
                          Guardar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSampleId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="grid gap-1 px-3 py-2.5 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Volumen</dt>
                        <dd className="font-medium">{s.volume || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Nota</dt>
                        <dd className="font-medium">{s.note || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Fecha recepción</dt>
                        <dd className="font-medium">
                          {s.received_date ? formatDateTime(s.received_date) : formatDate(s.received_at) ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Recepcionado por</dt>
                        <dd className="font-medium">
                          {s.received_by?.full_name ?? s.received_by_name ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              )
            })}

            {pendingSamples.map((sample) => {
              const sid = sample.sample_id ?? sample.id
              const form = sampleForms[sid] ?? {}
              return (
                <div
                  key={sid}
                  className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/20"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-amber-100 bg-surface-muted/50 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold">{sample.sample_name ?? sample.name}</p>
                      <div className="mt-1">{analysisTags(sample.analyses)}</div>
                    </div>
                    <Badge variant="warning">Pendiente</Badge>
                  </div>
                  <div className="grid gap-3 p-3 sm:grid-cols-2">
                    <Input
                      label="Código de barras"
                      value={form.code ?? ''}
                      placeholder="Auto"
                      onChange={(e) =>
                        setSampleForms((prev) => ({
                          ...prev,
                          [sid]: { ...form, sample_id: sid, code: e.target.value },
                        }))
                      }
                    />
                    <Input
                      label="Volumen"
                      value={form.volume ?? ''}
                      placeholder="5 ml"
                      onChange={(e) =>
                        setSampleForms((prev) => ({
                          ...prev,
                          [sid]: { ...form, sample_id: sid, volume: e.target.value },
                        }))
                      }
                    />
                    <div className="sm:col-span-2">
                      <Textarea
                        label="Nota"
                        value={form.note ?? ''}
                        rows={2}
                        onChange={(e) =>
                          setSampleForms((prev) => ({
                            ...prev,
                            [sid]: { ...form, sample_id: sid, note: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            {pendingSamples.length === 0 && requiredSamples.length > 0 && (
              <WorkflowAlert variant="success">
                Todas las muestras recepcionadas. Confirme para pasar a <strong>En proceso</strong>.
              </WorkflowAlert>
            )}
          </div>
        )}

        {/* ——— Fase 2 / 3: Resultados y validación ——— */}
        {(ws === 2 || ws === 3) && (
          <div className="space-y-3">
            {!analyses.length ? (
              <WorkflowAlert variant="warn">
                Sin estudios cargados. Complete la recepción en la fase Pendiente y confirme la
                transición.
              </WorkflowAlert>
            ) : (
              <>
                <WorkflowAlert variant="info">
                  {analyses.length} estudio(s),{' '}
                  {analyses.reduce((n, a) => n + flattenComponents(a).length, 0)} componente(s).
                  {ws === 2 &&
                    (editingResults
                      ? ' Edite los valores y guarde antes de enviar a revisión.'
                      : ' Resultados cargados. Puede editar nuevamente si es necesario.')}
                  {ws === 3 && ' Valide los componentes cargados antes de marcar revisada.'}
                </WorkflowAlert>

                {missingComponentAnalyses.length > 0 && (
                  <WorkflowAlert variant="warn">
                    {missingComponentAnalyses.length} estudio(s) sin componentes activos — no
                    bloquean el envío.
                  </WorkflowAlert>
                )}

                {ws === 2 && !editingResults && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setEditingResults(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Editar resultados
                    </Button>
                  </div>
                )}

                {ws === 3 && !editingValidation && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setEditingValidation(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Editar validación
                    </Button>
                  </div>
                )}

                {analyses.map((analysis) => {
                  const saId = analysis.sample_analysis_id ?? analysis.id
                  const st = Number(analysis.status)
                  const badgeVariant = st >= 3 ? 'success' : st >= 2 ? 'info' : 'default'
                  return (
                    <div key={saId} className="overflow-hidden rounded-xl border border-border">
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-primary/5 px-3 py-2.5">
                        <div>
                          <h3 className="text-sm font-semibold">{analysisDisplayName(analysis)}</h3>
                          <p className="mt-0.5 text-xs text-muted">
                            Muestra: <strong>{analysis.sample_code ?? '—'}</strong> (
                            {analysis.sample_name ?? '—'})
                          </p>
                        </div>
                        <Badge variant={badgeVariant}>{analysis.status_label ?? 'En proceso'}</Badge>
                      </div>

                      {(analysis.subgroups ?? []).map((subgroup) => (
                        <div key={subgroup.id ?? subgroup.name} className="px-3 py-2">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                            {subgroup.name ?? 'Subgrupo'}
                          </h4>
                          {!subgroup.components?.length ? (
                            <p className="text-xs text-muted">Sin componentes.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[560px] border-collapse text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-surface-muted/50 text-left text-xs uppercase text-muted">
                                    {ws === 3 && <th className="w-8 p-2" />}
                                    <th className="p-2">Componente</th>
                                    <th className="p-2">Referencia</th>
                                    <th className="p-2">Unidad</th>
                                    <th className="p-2">Valor</th>
                                    <th className="p-2">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subgroup.components.map((component) => {
                                    const cId = component.component_analysis_id ?? component.id
                                    const key = `${saId}:${cId}`
                                    const validated = Number(component.status) === 2
                                    const draft = getResultDraft(saId, cId, component)
                                    const val = ws === 2 && editingResults ? draft.value_obtained : component.value_obtained
                                    const missing = !String(val ?? '').trim()

                                    return (
                                      <tr
                                        key={key}
                                        className={cn(
                                          'border-b border-border/60',
                                          validated && 'bg-emerald-50/40',
                                          !validated && missing && ws === 2 && 'bg-amber-50/30',
                                        )}
                                      >
                                        {ws === 3 && (
                                          <td className="p-2">
                                            {component.result_id && (
                                              <input
                                                type="checkbox"
                                                disabled={!editingValidation}
                                                checked={
                                                  validationDrafts[component.result_id] ?? validated
                                                }
                                                onChange={(e) =>
                                                  setValidationDrafts((prev) => ({
                                                    ...prev,
                                                    [component.result_id]: e.target.checked,
                                                  }))
                                                }
                                              />
                                            )}
                                          </td>
                                        )}
                                        <td className="p-2 font-medium">{component.name ?? '—'}</td>
                                        <td className="p-2 text-xs text-muted">
                                          {ws === 2 && editingResults ? (
                                            <div className="flex gap-1">
                                              <Input
                                                className="h-8 w-16 px-1.5 text-xs"
                                                placeholder="Mín"
                                                value={draft.valor_ref_min ?? ''}
                                                onChange={(e) =>
                                                  updateResultDraft(saId, cId, component, 'valor_ref_min', e.target.value)
                                                }
                                              />
                                              <Input
                                                className="h-8 w-16 px-1.5 text-xs"
                                                placeholder="Máx"
                                                value={draft.valor_ref_max ?? ''}
                                                onChange={(e) =>
                                                  updateResultDraft(saId, cId, component, 'valor_ref_max', e.target.value)
                                                }
                                              />
                                            </div>
                                          ) : (
                                            formatRefRange(component)
                                          )}
                                        </td>
                                        <td className="p-2 text-muted">
                                          {ws === 2 && editingResults ? (
                                            <Input
                                              className="h-8 w-20 px-1.5 text-xs"
                                              value={draft.unit_measurement ?? ''}
                                              onChange={(e) =>
                                                updateResultDraft(saId, cId, component, 'unit_measurement', e.target.value)
                                              }
                                            />
                                          ) : (
                                            component.unit_measurement ?? '—'
                                          )}
                                        </td>
                                        <td className="p-2">
                                          {ws === 2 && editingResults ? (
                                            <Input
                                              className="min-w-[5rem]"
                                              value={draft.value_obtained ?? ''}
                                              placeholder="Ej. 14.2"
                                              onChange={(e) =>
                                                updateResultDraft(saId, cId, component, 'value_obtained', e.target.value)
                                              }
                                            />
                                          ) : (
                                            <strong>{component.value_obtained ?? '—'}</strong>
                                          )}
                                        </td>
                                        <td className="p-2">
                                          <Badge variant={validated ? 'success' : 'default'} className="text-[10px]">
                                            {componentStatusLabel(component)}
                                          </Badge>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}

                {ws === 2 && checks.can_send_to_review && !hasResultChanges && (
                  <WorkflowAlert variant="success">
                    Todos los componentes tienen valor. Puede enviar a <strong>En revisión</strong>.
                  </WorkflowAlert>
                )}
                {ws === 3 && checks.can_mark_reviewed && !hasValidationChanges && (
                  <WorkflowAlert variant="success">
                    Todo validado. Puede marcar como <strong>Revisada</strong>.
                  </WorkflowAlert>
                )}
              </>
            )}
          </div>
        )}

        {/* ——— Fase 4: Revisada / Cierre ——— */}
        {ws === 4 && (
          <div className="space-y-3">
            <WorkflowAlert variant="info">
              Verifique muestras y resultados validados antes de completar o anular.
            </WorkflowAlert>

            {!(checks.all_analyses_reviewed ?? allAnalysesReviewedInSamples(closureSamples)) && (
              <WorkflowAlert variant="warn">
                Hay estudios sin revisar. No debería estar en estado Revisada.
              </WorkflowAlert>
            )}
            {Number(closureOrderInfo?.total_due ?? 0) > 0 && (
              <WorkflowAlert variant="warn">
                Saldo pendiente: <strong>{closureOrderInfo.total_due}</strong>.
              </WorkflowAlert>
            )}

            {closureSamples.map((sample) => {
              const sampleLabel = sample.sample_name ?? catalogSampleName(sample)
              return (
                <div key={sample.id ?? sample.code} className="overflow-hidden rounded-lg border border-border">
                  <div className="border-b border-border bg-surface-muted/50 px-3 py-2 text-sm font-semibold">
                    {sampleLabel} · <span className="font-mono text-xs">{sample.code ?? '—'}</span>
                  </div>
                  <div className="space-y-3 p-3">
                    {(sample.sample_analyses ?? sample.analyses ?? []).map((sa) => {
                      const comps = sa.results ?? []
                      const saOk = Number(sa.status) >= 3
                      return (
                        <div key={sa.id}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <strong className="text-sm">
                              {sa.analysis_name ?? sa.name ?? sa.catalog_analysis?.name ?? 'Estudio'}
                            </strong>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              {sa.status_label ?? (saOk ? 'Revisado' : 'Pendiente')}
                            </span>
                          </div>
                          <table className="w-full table-fixed text-xs">
                            <thead>
                              <tr className="border-b border-border text-left text-muted">
                                <th className="w-[44%] py-1 pr-2">Componente</th>
                                <th className="w-[22%] py-1 pr-2">Valor</th>
                                <th className="w-[20%] py-1 pr-2">Unidad</th>
                                <th className="w-[14%] py-1">Validado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comps.length ? (
                                comps.map((c) => (
                                  <tr key={c.id ?? c.component_analysis_id} className="border-b border-border/50">
                                    <td className="truncate py-1 pr-2">{c.name ?? c.component_name ?? '—'}</td>
                                    <td className="truncate py-1 pr-2 font-semibold">{c.value_obtained ?? '—'}</td>
                                    <td className="truncate py-1 pr-2">{c.unit_measurement ?? '—'}</td>
                                    <td className="py-1">{c.validated || Number(c.status) === 2 ? '✓' : '—'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="py-1 text-muted">
                                    Sin componentes
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ——— Fase 5: Completada ——— */}
        {ws === 5 && (
          <div className="space-y-3">
            <WorkflowAlert variant="success">
              Orden <strong>Completada</strong>. Visible en los portales de paciente y seguro.
            </WorkflowAlert>
          </div>
        )}

        {/* ——— Fase 6: Anulada ——— */}
        {ws === 6 && (
          <div className="space-y-3">
            <WorkflowAlert variant="danger">
              Orden <strong>Anulada</strong> — no disponible en portales.
            </WorkflowAlert>
            <OrderStatGrid className="sm:grid-cols-3">
              <OrderStat label="Motivo" value={order?.annulment_reason ?? '—'} />
              <OrderStat label="Anulada el" value={formatDateTime(order?.annulled_at)} />
              <OrderStat
                label="Status financiero"
                value={order?.status === 2 ? 'Anulado' : String(order?.status ?? '—')}
              />
            </OrderStatGrid>
          </div>
        )}
      </Card>

      {/* ——— Pie de acciones ——— */}
      {ws !== 6 && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {ws === 1 && (
              <>
                <Button type="button" disabled={submitting || pendingSamples.length === 0} onClick={handleReceive}>
                  Registrar recepción
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting || !checks.can_confirm_started}
                  onClick={handleConfirmReception}
                >
                  Confirmar
                </Button>
              </>
            )}

            {ws === 2 && analyses.length > 0 && (
              <>
                {editingResults && (
                  <>
                    <Button type="button" disabled={submitting || !hasResultChanges} onClick={handleSaveResults}>
                      Guardar resultados
                    </Button>
                    <Button type="button" variant="ghost" disabled={submitting} onClick={handleCancelEditResults}>
                      Cancelar edición
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting || !checks.can_send_to_review || hasResultChanges}
                  onClick={handleSendToReview}
                >
                  Enviar a revisión
                </Button>
              </>
            )}

            {ws === 3 && analyses.length > 0 && (
              <>
                <Button
                  type="button"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={submitting}
                  onClick={handleBackToProceso}
                >
                  Volver a En proceso
                </Button>
                {editingValidation && (
                  <>
                    <Button
                      type="button"
                      disabled={submitting || !hasValidationChanges}
                      onClick={handleUpdateValidations}
                    >
                      Actualizar
                    </Button>
                    <Button type="button" variant="ghost" disabled={submitting} onClick={handleCancelEditValidation}>
                      Cancelar
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting || !checks.can_mark_reviewed || hasValidationChanges || editingValidation}
                  onClick={handleMarkReviewed}
                >
                  Marcar revisada
                </Button>
              </>
            )}

            {ws === 4 && (
              <>
                <Button
                  type="button"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={submitting}
                  onClick={handleBackToReview}
                >
                  Volver a En revisión
                </Button>
                <Button type="button" disabled={submitting || !checks.can_complete} onClick={handleComplete}>
                  Completar orden
                </Button>
                {canAnnul && (
                  <Button type="button" variant="danger" disabled={submitting} onClick={() => setAnnulOpen(true)}>
                    Anular orden
                  </Button>
                )}
              </>
            )}

            {ws === 5 && canExportPdf && (
              <Button type="button" className="gap-1.5" onClick={() => setPdfPreview(true)}>
                <FileSearch className="h-4 w-4" aria-hidden />
                Exportar PDF de resultados
              </Button>
            )}
          </div>
        </Card>
      )}

      <PdfPreviewModal
        open={pdfPreview}
        onOpenChange={setPdfPreview}
        orderId={id}
        orderCode={order?.code}
        pdfType="results"
      />

      <AnnulOrderModal
        open={annulOpen}
        onOpenChange={setAnnulOpen}
        orderId={id}
        orderCode={order?.code}
        onSuccess={handleAnnulSuccess}
      />
    </AnimatedPage>
  )
}
