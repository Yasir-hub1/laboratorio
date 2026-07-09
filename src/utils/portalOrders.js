import { formatDate } from '@/utils/apiHelpers'

/** Fecha de orden para listados (filtro y display por created_at). */
export function getPortalOrderListDate(order) {
  return order?.created_at ?? order?.sample_collection_date ?? null
}

/** Fecha de orden en pantalla de detalle/resultados. */
export function getPortalOrderHeaderDate(order, resultsOrder) {
  return resultsOrder?.created_at ?? order?.created_at ?? order?.sample_collection_date ?? null
}

export function formatComponentUnit(component) {
  const unit = component?.unit_measurement
  if (unit == null || unit === '') return '—'
  return unit
}

export function hasPortalDateFilters(dateFrom, dateTo) {
  return Boolean(dateFrom || dateTo)
}

export function buildPortalDateParams(dateFrom, dateTo) {
  const params = {}
  if (dateFrom) params.date_from = dateFrom
  if (dateTo) params.date_to = dateTo
  return params
}

export function formatPortalOrderDate(value) {
  return formatDate(value)
}
