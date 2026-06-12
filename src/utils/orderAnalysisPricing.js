import { laboratoryApi } from '@/services/laboratoryApi'
import { unwrapData, unwrapList } from '@/utils/apiHelpers'
import {
  getCatalogDefaultPrice,
  getInsurancePrice,
  getReferenceDefaultPrice,
  insuranceAnalysisName,
  insuranceAnalysisRowId,
  isParticularInsuranceSelection,
} from '@/utils/insurancePrices'

/**
 * @typedef {{ id: string, name: string, finalPrice: number, referencePrice?: number | null }} OrderAnalysisOption
 * @typedef {{ id: string, name: string, analyses: OrderAnalysisOption[] }} OrderAnalysisGroup
 */

export function normalizeCatalogAnalysisForOrder(row) {
  const id = String(insuranceAnalysisRowId(row) ?? '')
  return {
    id,
    name: insuranceAnalysisName(row),
    finalPrice: getCatalogDefaultPrice(row) ?? Number(row.price ?? 0) ?? 0,
    referencePrice: null,
  }
}

export function normalizeInsuranceAnalysisForOrder(row) {
  const id = String(insuranceAnalysisRowId(row) ?? '')
  const finalPrice = getInsurancePrice(row) ?? 0
  return {
    id,
    name: insuranceAnalysisName(row),
    finalPrice,
    referencePrice: getReferenceDefaultPrice(row) ?? getCatalogDefaultPrice(row),
  }
}

function extractGroupRows(raw) {
  const unwrapped = unwrapData(raw)
  if (Array.isArray(unwrapped)) return unwrapped
  const { items } = unwrapList(raw)
  if (items.length) return items
  if (Array.isArray(raw?.data)) return raw.data
  return []
}

function normalizeGroupNode(group, insuranceMode) {
  const groupName =
    group.analysis_group_name ??
    group.analysis_group?.name ??
    group.group_name ??
    group.name ??
    'Sin grupo'
  const groupId =
    group.analysis_group_id ?? group.analysis_group?.id ?? group.id ?? groupName

  const rawAnalyses =
    group.analyses ??
    group.laboratory_analyses ??
    group.items ??
    group.analysis_prices ??
    []

  const analyses = (Array.isArray(rawAnalyses) ? rawAnalyses : [])
    .map((row) =>
      insuranceMode ? normalizeInsuranceAnalysisForOrder(row) : normalizeCatalogAnalysisForOrder(row),
    )
    .filter((row) => row.id && (!insuranceMode || row.finalPrice > 0))

  return {
    id: String(groupId),
    name: groupName,
    analyses,
  }
}

function groupFlatAnalyses(rows, insuranceMode) {
  const map = new Map()

  for (const row of rows) {
    const option = insuranceMode
      ? normalizeInsuranceAnalysisForOrder(row)
      : normalizeCatalogAnalysisForOrder(row)
    if (!option.id) continue
    if (insuranceMode && option.finalPrice <= 0) continue

    const groupId = row.analysis_group_id ?? row.analysis_group?.id ?? 'ungrouped'
    const groupName =
      row.analysis_group_name ?? row.analysis_group?.name ?? 'Otros análisis'

    const key = String(groupId)
    if (!map.has(key)) {
      map.set(key, { id: key, name: groupName, analyses: [] })
    }
    map.get(key).analyses.push(option)
  }

  return [...map.values()].filter((g) => g.analyses.length > 0)
}

/**
 * Normaliza respuesta de prices-by-group (agrupado o plano).
 * @returns {OrderAnalysisGroup[]}
 */
export function normalizeAnalysisGroupsFromResponse(raw, { insuranceMode = false } = {}) {
  const rows = extractGroupRows(raw)
  if (!rows.length) return []

  const first = rows[0]
  const isNestedGroup =
    Array.isArray(first?.analyses) ||
    Array.isArray(first?.laboratory_analyses) ||
    Array.isArray(first?.items) ||
    Array.isArray(first?.analysis_prices)

  if (isNestedGroup) {
    return rows.map((g) => normalizeGroupNode(g, insuranceMode)).filter((g) => g.analyses.length > 0)
  }

  return groupFlatAnalyses(rows, insuranceMode)
}

export function flattenAnalysisGroups(groups) {
  return (groups ?? []).flatMap((g) => g.analyses ?? [])
}

/**
 * Carga análisis agrupados para nueva orden:
 * - Particular → GET /laboratory-analyses/prices-by-group
 * - Con seguro → GET /insurances/{id}/analysis-prices-by-group
 *
 * @returns {Promise<OrderAnalysisGroup[]>}
 */
export async function fetchAnalysisGroupsForOrder(insuranceId, { insurances = [] } = {}) {
  if (isParticularInsuranceSelection(insuranceId, insurances)) {
    const raw = await laboratoryApi.getLaboratoryAnalysisPricesByGroup()
    return normalizeAnalysisGroupsFromResponse(raw, { insuranceMode: false })
  }

  const raw = await laboratoryApi.getInsuranceAnalysisPricesByGroup(insuranceId)
  return normalizeAnalysisGroupsFromResponse(raw, { insuranceMode: true })
}

/** @deprecated Use fetchAnalysisGroupsForOrder + flattenAnalysisGroups */
export async function fetchAnalysesForOrder(insuranceId, options = {}) {
  const groups = await fetchAnalysisGroupsForOrder(insuranceId, options)
  return flattenAnalysisGroups(groups)
}

export function buildOrderDetailLines(selectedIds, analyses) {
  return Object.keys(selectedIds).map((id) => ({
    laboratory_analysis_id: id,
    name: analyses.find((a) => String(a.id) === String(id))?.name,
  }))
}

export function orderDetailsSubtotal(analyses, selectedIds) {
  return Object.keys(selectedIds).reduce((sum, id) => {
    const row = analyses.find((a) => String(a.id) === String(id))
    return sum + Number(row?.finalPrice ?? 0)
  }, 0)
}

export function orderDetailsTotal(details) {
  return details.reduce((sum, d) => sum + Number(d.finalPrice ?? d.unit_price ?? d.price ?? 0), 0)
}

export function applyOrderDiscount(subtotal, discount) {
  const sub = Math.max(0, Number(subtotal) || 0)
  const disc = Math.max(0, Number(discount) || 0)
  return Math.max(0, sub - disc)
}
