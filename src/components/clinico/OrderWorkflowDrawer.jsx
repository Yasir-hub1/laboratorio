import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  Textarea,
  WorkflowFlowBar,
  OrderStatGrid,
  OrderStat,
  WorkflowAlert,
} from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatDate, formatDateTime, unwrapData } from '@/utils/apiHelpers'
import {
  buildReceiveMultipleSamplesPayload,
  buildSaveOrderResultsPayload,
  buildValidateOrderResultsPayload,
  buildWorkflowTransitionPayload,
} from '@/utils/apiPayload'
import {
  getWorkflowLabel,
  collectSaveEntries,
  formatRefRange,
  flattenComponents,
  filterPendingRequired,
  componentStatusLabel,
  analysisDisplayName,
  allAnalysesReviewedInSamples,
} from '@/utils/orderWorkflow'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ')
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

export function OrderWorkflowDrawer({ order, open, onOpenChange, onSuccess }) {
  const orderId = order?.id
  const ws = Number(order?.workflow_status)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState(null)
  const [sampleForms, setSampleForms] = useState({})
  const [resultValues, setResultValues] = useState({})
  const [selectedResults, setSelectedResults] = useState({})
  const [selectAllValidate, setSelectAllValidate] = useState(false)
  const [annulReason, setAnnulReason] = useState('')
  const [showAnnul, setShowAnnul] = useState(false)
  const [pdfPreview, setPdfPreview] = useState(false)

  const checks = detail?.checks ?? {}
  const orderInfo = detail?.order ?? order
  const receivedSamples = detail?.received_samples ?? []
  const requiredSamples = detail?.required_samples ?? []
  const pendingSamples = useMemo(
    () => filterPendingRequired(requiredSamples, receivedSamples),
    [requiredSamples, receivedSamples],
  )
  const analyses = detail?.analyses ?? []
  const closureSamples = detail?.samples ?? []

  const loadDetail = useCallback(async () => {
    if (!orderId || !open) return
    setLoading(true)
    try {
      let raw
      if (ws === 1) {
        raw = await laboratoryApi.getReceptionSummary(orderId)
      } else if (ws === 2 || ws === 3) {
        raw = await laboratoryApi.getResultsEntrySummary(orderId)
      } else if (ws === 4) {
        raw = await laboratoryApi.getClosureSummary(orderId)
      } else {
        raw = await laboratoryApi.getLaboratoryOrder(orderId)
      }
      const data = unwrapData(raw) ?? raw
      setDetail(data)

      if (ws === 2) {
        const initial = {}
        for (const analysis of data?.analyses ?? []) {
          const saId = analysis.sample_analysis_id ?? analysis.id
          for (const component of flattenComponents(analysis)) {
            const cId = component.component_analysis_id ?? component.id
            initial[`${saId}:${cId}`] =
              component.value_obtained ?? component.value ?? component.result ?? ''
          }
        }
        setResultValues(initial)
      }

      if (ws === 1) {
        const pending = filterPendingRequired(
          data?.required_samples,
          data?.received_samples,
        )
        const forms = {}
        for (const sample of pending) {
          const sid = sample.sample_id ?? sample.id
          forms[sid] = {
            sample_id: sid,
            code: sample.suggested_code ?? '',
            volume: '',
            note: '',
          }
        }
        setSampleForms(forms)
      }

      setSelectedResults({})
      setSelectAllValidate(false)
    } catch (err) {
      toastApiError(err)
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [orderId, open, ws])

  useEffect(() => {
    if (open) {
      loadDetail()
    } else {
      setDetail(null)
      setSampleForms({})
      setResultValues({})
      setSelectedResults({})
      setSelectAllValidate(false)
      setAnnulReason('')
      setShowAnnul(false)
    }
  }, [open, loadDetail])

  const flowStep = useMemo(() => {
    if (ws === 1) {
      if (pendingSamples.length === 0 && requiredSamples.length > 0) return 4
      if (receivedSamples.length > 0) return 3
      return 2
    }
    if (ws === 2 || ws === 3) {
      if (!analyses.length) return 2
      const hasMissing = analyses.some((a) =>
        flattenComponents(a).some((c) => {
          const saId = a.sample_analysis_id ?? a.id
          const cId = c.component_analysis_id ?? c.id
          const val = resultValues[`${saId}:${cId}`] ?? c.value_obtained
          return !String(val ?? '').trim()
        }),
      )
      if (ws === 2) {
        if (checks.can_send_to_review) return 4
        return hasMissing ? 3 : 3
      }
      if (checks.can_mark_reviewed) return 4
      return 3
    }
    if (ws === 4) {
      const reviewed =
        checks.all_analyses_reviewed ?? allAnalysesReviewedInSamples(closureSamples)
      const canComplete = checks.can_complete ?? reviewed
      if (canComplete) return 4
      if (reviewed) return 3
      return 2
    }
    if (ws === 5) return 3
    if (ws === 6) return 2
    return 1
  }, [
    ws,
    pendingSamples,
    requiredSamples,
    receivedSamples,
    analyses,
    resultValues,
    checks,
    closureSamples,
  ])

  const pendingResultIds = useMemo(() => {
    const ids = []
    for (const analysis of analyses) {
      for (const component of flattenComponents(analysis)) {
        if (component.result_id && Number(component.status) !== 2) {
          ids.push(component.result_id)
        }
      }
    }
    return ids
  }, [analyses])

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
        buildReceiveMultipleSamplesPayload({
          laboratory_order_id: orderId,
          samples,
        }),
      )
      toastApiSuccess('Recepción registrada')
      await loadDetail()
      onSuccess?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTransition = async (nextStatus) => {
    setSubmitting(true)
    try {
      await laboratoryApi.transitionLaboratoryOrder(
        orderId,
        buildWorkflowTransitionPayload(nextStatus),
      )
      toastApiSuccess('Estado actualizado')
      onOpenChange(false)
      onSuccess?.(nextStatus)
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveResults = async () => {
    const entries = collectSaveEntries(detail, resultValues)
    if (!entries.length) {
      toast.error('Ingresa al menos un resultado')
      return
    }
    setSubmitting(true)
    try {
      const res = await laboratoryApi.saveOrderResults(
        orderId,
        buildSaveOrderResultsPayload(entries),
        { includeChecks: true },
      )
      toastApiSuccess('Resultados guardados')
      setDetail((prev) => ({ ...prev, checks: res?.checks ?? prev?.checks }))
      await loadDetail()
      onSuccess?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleValidate = async (validateAll = false) => {
    if (!validateAll) {
      const ids = Object.keys(selectedResults).filter((id) => selectedResults[id])
      if (!ids.length) {
        toast.error('Seleccione al menos un componente pendiente')
        return
      }
    }
    setSubmitting(true)
    try {
      const payload = validateAll
        ? buildValidateOrderResultsPayload({ validate_all: true })
        : buildValidateOrderResultsPayload({
            result_ids: Object.keys(selectedResults).filter((id) => selectedResults[id]),
          })
      await laboratoryApi.validateOrderResults(orderId, payload, { includeChecks: true })
      toastApiSuccess('Resultados validados')
      await loadDetail()
      onSuccess?.()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectAllValidate = (checked) => {
    setSelectAllValidate(checked)
    const next = {}
    if (checked) {
      for (const id of pendingResultIds) next[id] = true
    }
    setSelectedResults(next)
  }

  const handleComplete = async () => {
    setSubmitting(true)
    try {
      await laboratoryApi.completeLaboratoryOrder(orderId)
      toastApiSuccess('Orden completada')
      onOpenChange(false)
      onSuccess?.(5)
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAnnul = async () => {
    if (!annulReason.trim()) {
      toast.error('Ingrese el motivo de anulación')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.annulLaboratoryOrder(orderId, { annulment_reason: annulReason.trim() })
      toastApiSuccess('Orden anulada')
      onOpenChange(false)
      onSuccess?.(6)
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const patientName =
    orderInfo?.patient_name ??
    personLabel(orderInfo?.patient ?? order?.patient)

  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      {ws === 1 && (
        <>
          <Button
            type="button"
            disabled={submitting || pendingSamples.length === 0}
            onClick={handleReceive}
          >
            Registrar recepción
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting || !checks.can_confirm_started}
            onClick={() => handleTransition(2)}
          >
            Confirmar
          </Button>
        </>
      )}
      {ws === 2 && (
        <>
          <Button type="button" disabled={submitting || !analyses.length} onClick={handleSaveResults}>
            Guardar todos
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting || !checks.can_send_to_review}
            onClick={() => handleTransition(3)}
          >
            Enviar a revisión (3)
          </Button>
        </>
      )}
      {ws === 3 && (
        <>
          <label className="mr-1 inline-flex items-center gap-1.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={selectAllValidate}
              disabled={pendingResultIds.length === 0}
              onChange={(e) => handleSelectAllValidate(e.target.checked)}
            />
            Seleccionar todos ({pendingResultIds.length})
          </label>
          <Button
            type="button"
            disabled={
              submitting || !Object.keys(selectedResults).some((k) => selectedResults[k])
            }
            onClick={() => handleValidate(false)}
          >
            Validar seleccionados
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting || pendingResultIds.length === 0}
            onClick={() => handleValidate(true)}
          >
            Validar todos
          </Button>
          <Button
            type="button"
            disabled={submitting || !checks.can_mark_reviewed}
            onClick={() => handleTransition(4)}
          >
            Marcar revisada (4)
          </Button>
        </>
      )}
      {ws === 4 && (
        <>
          <Button
            type="button"
            disabled={submitting || !checks.can_complete}
            onClick={handleComplete}
          >
            Completar orden
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={submitting}
            onClick={() => setShowAnnul(true)}
          >
            Anular orden 
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPdfPreview(true)}>
            Vista previa PDF
          </Button>
        </>
      )}
      {ws === 5 && (
        <Button type="button" onClick={() => setPdfPreview(true)}>
          Exportar PDF de resultados
        </Button>
      )}
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
        description={patientName}
        footer={footer}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          <WorkflowFlowBar workflowStatus={ws} activeStep={flowStep} />

          {loading ? (
            <p className="py-8 text-center text-sm text-muted">Cargando detalle…</p>
          ) : (
            <>
              {/* Resumen orden */}
              <OrderStatGrid>
                <OrderStat label="Paciente" value={patientName} />
                <OrderStat label="Código" value={orderInfo?.code} />
                {/* {(ws === 1 || ws === 4 || ws === 5 || ws === 6) && (
                  <OrderStat
                    label="Fecha toma"
                    value={formatDate(orderInfo?.sample_collection_date)}
                  />
                )} */}
                {(ws === 4 || ws === 5 || ws === 6) && (
                  <OrderStat
                    label="Sucursal"
                    value={orderInfo?.branch?.name ?? orderInfo?.branch_name}
                  />
                )}
                <OrderStat
                  label={ws === 4 || ws === 5 || ws === 6 ? 'Estado lab.' : 'Estado'}
                  value={getWorkflowLabel(orderInfo ?? order)}
                />
                {(ws === 2 || ws === 3) && (
                  <OrderStat label="Estudios" value={String(analyses.length)} />
                )}
              </OrderStatGrid>

              {/* ws=1 Recepción */}
              {ws === 1 && (
                <div className="space-y-3">
                  <WorkflowAlert variant="info">
                    {requiredSamples.length} requerido(s), {receivedSamples.length} recibido(s).
                    {pendingSamples.length > 0 &&
                      ' Precargue código sugerido o deje vacío para generación automática.'}
                  </WorkflowAlert>

                  {receivedSamples.map((s) => (
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
                        <Badge variant="success">Recibida</Badge>
                      </div>
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
                            {s.received_date
                              ? formatDateTime(s.received_date)
                              : formatDate(s.received_at) ?? '—'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}

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
                            <p className="text-sm font-semibold">
                              {sample.sample_name ?? sample.name}
                            </p>
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
                      Todas las muestras recepcionadas. Confirme para pasar a{' '}
                      <strong>Iniciada (2)</strong>.
                    </WorkflowAlert>
                  )}
                </div>
              )}

              {/* ws=2 / ws=3 Resultados */}
              {(ws === 2 || ws === 3) && (
                <div className="space-y-3">
                  {!analyses.length ? (
                    <WorkflowAlert variant="warn">
                      Sin estudios. Complete la recepción en <strong>Pendiente (1)</strong> y
                      confirme transición a Iniciada.
                    </WorkflowAlert>
                  ) : (
                    <>
                      <WorkflowAlert variant="info">
                        {analyses.length} estudio(s),{' '}
                        {analyses.reduce((n, a) => n + flattenComponents(a).length, 0)} componente(s).
                        {ws === 2 && ' Guarde todos los valores antes de enviar a revisión.'}
                        {ws === 3 && ' Valide componentes cargados antes de marcar revisada.'}
                      </WorkflowAlert>

                      {analyses.map((analysis) => {
                        const saId = analysis.sample_analysis_id ?? analysis.id
                        const st = Number(analysis.status)
                        const badgeVariant =
                          st >= 3 ? 'success' : st >= 2 ? 'info' : 'default'
                        return (
                          <div
                            key={saId}
                            className="overflow-hidden rounded-xl border border-border"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-primary/5 px-3 py-2.5">
                              <div>
                                <h3 className="text-sm font-semibold">
                                  {analysisDisplayName(analysis)}
                                </h3>
                                <p className="mt-0.5 text-xs text-muted">
                                  Muestra:{' '}
                                  <strong>{analysis.sample_code ?? '—'}</strong> (
                                  {analysis.sample_name ?? '—'})
                                </p>
                              </div>
                              <Badge variant={badgeVariant}>
                                {analysis.status_label ?? 'En proceso'}
                              </Badge>
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
                                    <table className="w-full min-w-[480px] border-collapse text-sm">
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
                                          const cId =
                                            component.component_analysis_id ?? component.id
                                          const key = `${saId}:${cId}`
                                          const validated = Number(component.status) === 2
                                          const val =
                                            resultValues[key] ?? component.value_obtained ?? ''
                                          const missing = !String(val).trim()
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
                                                      disabled={validated}
                                                      checked={Boolean(
                                                        selectedResults[component.result_id],
                                                      )}
                                                      onChange={(e) =>
                                                        setSelectedResults((prev) => ({
                                                          ...prev,
                                                          [component.result_id]: e.target.checked,
                                                        }))
                                                      }
                                                    />
                                                  )}
                                                </td>
                                              )}
                                              <td className="p-2 font-medium">
                                                {component.name ?? '—'}
                                              </td>
                                              <td className="p-2 text-xs text-muted">
                                                {formatRefRange(component)}
                                              </td>
                                              <td className="p-2 text-muted">
                                                {component.unit_measurement ?? '—'}
                                              </td>
                                              <td className="p-2">
                                                {ws === 2 ? (
                                                  <Input
                                                    className="min-w-[5rem]"
                                                    value={resultValues[key] ?? ''}
                                                    placeholder="Ej. 14.2"
                                                    onChange={(e) =>
                                                      setResultValues((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                      }))
                                                    }
                                                  />
                                                ) : (
                                                  <strong>{component.value_obtained ?? '—'}</strong>
                                                )}
                                              </td>
                                              <td className="p-2">
                                                <Badge
                                                  variant={validated ? 'success' : 'default'}
                                                  className="text-[10px]"
                                                >
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

                      {ws === 2 && checks.can_send_to_review && (
                        <WorkflowAlert variant="success">
                          Todos los componentes tienen valor. Puede enviar a{' '}
                          <strong>En revisión (3)</strong>.
                        </WorkflowAlert>
                      )}
                      {ws === 3 && checks.can_mark_reviewed && (
                        <WorkflowAlert variant="success">
                          Todo validado. Puede marcar como <strong>Revisada (4)</strong>.
                        </WorkflowAlert>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ws=4 Cierre */}
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
                  {/* {checks.can_complete && (
                    <WorkflowAlert variant="success">
                      Puede completar la orden (→ ws=5). Visible en portales tras completar.
                    </WorkflowAlert>
                  )} */}
                  {Number(orderInfo?.total_due ?? 0) > 0 && (
                    <WorkflowAlert variant="warn">
                      Saldo pendiente: <strong>{orderInfo.total_due}</strong>.
                    </WorkflowAlert>
                  )}

                  {closureSamples.map((sample) => {
                    const sampleLabel = sample.sample_name ?? catalogSampleName(sample)
                    return (
                      <div
                        key={sample.id ?? sample.code}
                        className="overflow-hidden rounded-lg border border-border"
                      >
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
                                    {sa.analysis_name ??
                                      sa.name ??
                                      sa.catalog_analysis?.name ??
                                      'Estudio'}
                                  </strong>
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                    {sa.status_label ?? (saOk ? 'Revisado' : 'Pendiente')}
                                  </span>
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border text-left text-muted">
                                      <th className="py-1 pr-2">Componente</th>
                                      <th className="py-1 pr-2">Valor</th>
                                      <th className="py-1">Validado</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {comps.length ? (
                                      comps.map((c) => (
                                        <tr key={c.id ?? c.component_analysis_id} className="border-b border-border/50">
                                          <td className="py-1 pr-2">{c.name ?? c.component_name ?? '—'}</td>
                                          <td className="py-1 pr-2 font-semibold">
                                            {c.value_obtained ?? '—'}
                                          </td>
                                          <td className="py-1">
                                            {Number(c.status) === 2 ? '✓' : '—'}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={3} className="py-1 text-muted">
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

                  {showAnnul && (
                    <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/5 p-3">
                      <Textarea
                        label="Motivo de anulación (obligatorio)"
                        value={annulReason}
                        placeholder="Ej. Error en selección de estudios"
                        onChange={(e) => setAnnulReason(e.target.value)}
                        required
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setShowAnnul(false)}>
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={submitting}
                          onClick={handleAnnul}
                        >
                          Confirmar anulación
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ws=5 Completada */}
              {ws === 5 && (
                <div className="space-y-3">
                  <WorkflowAlert variant="success">
                    Orden <strong>Completada</strong> (ws=5). Visible en portales de paciente y
                    seguro.
                  </WorkflowAlert>
                </div>
              )}

              {/* ws=6 Anulada */}
              {ws === 6 && (
                <div className="space-y-3">
                  <WorkflowAlert variant="danger">
                    Orden <strong>Anulada</strong> (ws=6) — no disponible en portales.
                  </WorkflowAlert>
                  <OrderStatGrid className="sm:grid-cols-3">
                    <OrderStat
                      label="Motivo"
                      value={orderInfo?.annulment_reason ?? '—'}
                    />
                    <OrderStat
                      label="Anulada el"
                      value={formatDateTime(orderInfo?.annulled_at)}
                    />
                    <OrderStat
                      label="Status financiero"
                      value={
                        orderInfo?.status === 2
                          ? 'Anulado (2)'
                          : String(orderInfo?.status ?? '—')
                      }
                    />
                  </OrderStatGrid>
                </div>
              )}
            </>
          )}
        </div>
      </Drawer>

      <PdfPreviewModal
        open={pdfPreview}
        onOpenChange={setPdfPreview}
        orderId={orderId}
        orderCode={orderInfo?.code ?? order?.code}
        pdfType="results"
      />
    </>
  )
}
