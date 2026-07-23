import { ORDER_WORKFLOW_STATUS } from '@/utils/constants'
import { ORDER_QUEUE_PERMISSIONS } from '@/utils/permissions'

/** Pestañas de Gestionar orden (§4.4). */
export const ORDER_WORKFLOW_TABS = [
  { id: 'all', label: 'Todas', countKey: 'workflow_total' },
  { id: '1', label: 'Pendientes', countKey: '1', pendingAction: 'Recepcionar muestras' },
  { id: '2', label: 'En proceso', countKey: '2', pendingAction: 'Cargar resultados' },
  { id: '3', label: 'En revisión', countKey: '3', pendingAction: 'Validar resultados' },
  { id: '4', label: 'Revisadas', countKey: '4', pendingAction: 'Completar / Anular' },
  { id: '5', label: 'Completadas', countKey: '5', pendingAction: 'Ver resultados' },
  { id: '6', label: 'Anuladas', countKey: '6', pendingAction: '—' },
]

export const WORKFLOW_STEPS = [
  { status: 1, label: 'Pendiente' },
  { status: 2, label: 'En proceso' },
  { status: 3, label: 'En revisión' },
  { status: 4, label: 'Revisada' },
  { status: 5, label: 'Completada' },
]

/** Pasos del flujo interno por cola (prototipo HTML). */
export const FLOW_BY_QUEUE = {
  1: [
    { n: 1, label: 'Cola pendiente' },
    { n: 2, label: 'Muestras requeridas' },
    { n: 3, label: 'Registrar recepción' },
    { n: 4, label: 'Confirmar' },
  ],
  2: [
    { n: 1, label: 'Cola iniciada' },
    { n: 2, label: 'Elegir análisis' },
    { n: 3, label: 'Guardar componentes' },
    { n: 4, label: 'Enviar a revisión' },
  ],
  3: [
    { n: 1, label: 'Cola en revisión' },
    { n: 2, label: 'Ver componentes' },
    { n: 3, label: 'Validar resultados' },
    { n: 4, label: 'Marcar revisada' },
  ],
  4: [
    { n: 1, label: 'Cola revisada' },
    { n: 2, label: 'Verificar resultados' },
    { n: 3, label: 'Completar o anular' },
    { n: 4, label: 'Completada' },
  ],
  5: [
    { n: 1, label: 'Cola completada' },
    { n: 2, label: 'Consultar orden' },
    { n: 3, label: 'Exportar PDF' },
  ],
  6: [
    { n: 1, label: 'Cola anulada' },
    { n: 2, label: 'Motivo y fecha' },
  ],
}

export function formatRefRange(row) {
  const min = row?.valor_ref_min ?? row?.ref_min
  const max = row?.valor_ref_max ?? row?.ref_max
  if (min != null && max != null) return `${min} – ${max}`
  return row?.ref_description ?? '—'
}

export function flattenComponents(analysis) {
  return (analysis?.subgroups ?? []).flatMap((sg) => sg.components ?? [])
}

export function getReceivedSampleIds(receivedSamples) {
  return (receivedSamples ?? []).map((s) => String(s.sample_id ?? s.id ?? ''))
}

export function filterPendingRequired(requiredSamples, receivedSamples) {
  const receivedIds = getReceivedSampleIds(receivedSamples)
  return (requiredSamples ?? []).filter(
    (r) => !receivedIds.includes(String(r.sample_id ?? r.id ?? '')),
  )
}

export function componentStatusLabel(component) {
  if (Number(component?.status) === 2) return 'Validado'
  if (component?.status_label) return component.status_label
  if (component?.result_id) return 'Cargado'
  return 'Sin guardar'
}

export function analysisDisplayName(analysis) {
  return (
    analysis?.analysis_name ??
    analysis?.name ??
    analysis?.analysis?.name ??
    'Análisis'
  )
}

export function allComponentsFilled(analyses, resultValues) {
  if (!analyses?.length) return false
  return analyses.every((analysis) => {
    const saId = analysis.sample_analysis_id ?? analysis.id
    return flattenComponents(analysis).every((c) => {
      const cId = c.component_analysis_id ?? c.id
      const val = resultValues[`${saId}:${cId}`] ?? c.value_obtained
      return String(val ?? '').trim() !== ''
    })
  })
}

export function allAnalysesReviewedInSamples(samples) {
  const analyses = (samples ?? []).flatMap((s) => s.sample_analyses ?? s.analyses ?? [])
  if (!analyses.length) return false
  return analyses.every((sa) => Number(sa.status) >= 3)
}

export function getPendingAction(workflowStatus) {
  const tab = ORDER_WORKFLOW_TABS.find((t) => t.id === String(workflowStatus))
  return tab?.pendingAction ?? '—'
}

export function getWorkflowLabel(row) {
  return (
    row?.workflow_status_label ??
    ORDER_WORKFLOW_STATUS[row?.workflow_status]?.label ??
    (row?.workflow_status != null ? String(row.workflow_status) : '—')
  )
}

export function getQueueCount(counts, tabId) {
  if (!counts) return null
  if (tabId === 'all') return counts.workflow_total ?? null
  const ws = counts.workflow_status ?? {}
  return ws[tabId] ?? ws[String(tabId)] ?? null
}

export function orderAnalysesLabel(row) {
  const details = row?.details ?? row?.laboratory_order_details ?? []
  if (!details.length) return '—'
  const names = details
    .map(
      (d) =>
        d.analysis?.name ??
        d.laboratory_analysis?.name ??
        d.name ??
        d.laboratory_analysis_name,
    )
    .filter(Boolean)
  if (names.length <= 2) return names.join(', ')
  return `${names.length} análisis`
}

export function flattenResultComponents(summary) {
  const rows = []
  for (const analysis of summary?.analyses ?? []) {
    for (const subgroup of analysis.subgroups ?? []) {
      for (const component of subgroup.components ?? []) {
        rows.push({
          ...component,
          analysisName: analysis.name ?? analysis.analysis?.name,
          subgroupName: subgroup.name,
          sample_analysis_id:
            component.sample_analysis_id ?? analysis.sample_analysis_id ?? analysis.id,
        })
      }
    }
  }
  return rows
}

export function collectSaveEntries(summary, values) {
  const bySample = new Map()

  for (const analysis of summary?.analyses ?? []) {
    const sampleAnalysisId = analysis.sample_analysis_id ?? analysis.id
    if (!sampleAnalysisId) continue

    for (const subgroup of analysis.subgroups ?? []) {
      for (const component of subgroup.components ?? []) {
        const componentId = component.component_analysis_id ?? component.id
        const key = `${sampleAnalysisId}:${componentId}`
        const draft = values[key] ?? {}
        const value =
          typeof draft === 'object' && draft != null && !Array.isArray(draft)
            ? draft.value_obtained
            : draft
        if (value == null || String(value).trim() === '') continue

        if (!bySample.has(sampleAnalysisId)) {
          bySample.set(sampleAnalysisId, [])
        }
        const row = {
          component_analysis_id: componentId,
          value_obtained: value,
        }
        if (typeof draft === 'object' && draft != null) {
          if (draft.valor_ref_min != null && draft.valor_ref_min !== '') {
            row.valor_ref_min = draft.valor_ref_min
          }
          if (draft.valor_ref_max != null && draft.valor_ref_max !== '') {
            row.valor_ref_max = draft.valor_ref_max
          }
          if (draft.unit_measurement != null && draft.unit_measurement !== '') {
            row.unit_measurement = draft.unit_measurement
          }
        }
        bySample.get(sampleAnalysisId).push(row)
      }
    }
  }

  return [...bySample.entries()].map(([sample_analysis_id, results]) => ({
    sample_analysis_id,
    results,
  }))
}

export function doctorDisplayName(doctor) {
  if (!doctor) return null
  return (
    doctor.full_name ||
    doctor.name ||
    [doctor.first_name, doctor.last_name].filter(Boolean).join(' ') ||
    null
  )
}

/** Formato listado: `Nombre (CI)` — paciente o médico. */
export function personNameWithCi(person, fallbackName) {
  if (!person && !fallbackName) return '—'
  const name =
    (person &&
      (person.full_name ||
        person.name ||
        [person.first_name, person.last_name].filter(Boolean).join(' '))) ||
    fallbackName ||
    null
  const ci = person?.ci != null ? String(person.ci).trim() : ''
  if (name && ci) return `${name} (${ci})`
  return name || '—'
}

export function genderLabel(gender) {
  const g = String(gender ?? '').trim().toUpperCase()
  if (g === 'M' || g === 'MASCULINO' || g === 'MALE') return 'Masculino'
  if (g === 'F' || g === 'FEMENINO' || g === 'FEMALE') return 'Femenino'
  return gender ? String(gender) : '—'
}

/** Tras transición: ¿puede quedarse en el formulario del estado destino? */
export function canStayOnWorkflowForm(workflowStatus, canFn) {
  const perm = ORDER_QUEUE_PERMISSIONS[Number(workflowStatus)]
  return perm ? Boolean(canFn?.(perm)) : false
}

export function orderWorkflowPath(orderId) {
  return `/atencion/gestionar-orden/${orderId}/gestionar`
}

export function orderDetailPath(orderId) {
  return `/atencion/gestionar-orden/${orderId}`
}

export function analysesWithoutComponents(summary) {
  return (summary?.analyses ?? []).filter((a) => flattenComponents(a).length === 0)
}
