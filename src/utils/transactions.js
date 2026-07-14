import { config } from '@/config/env'
import { storage } from '@/utils/storage'

export const FINANCIAL_QUEUE_TABS = [
  { id: 'all', label: 'Todas', countKey: 'all_total' },
  { id: 'por_cobrar', label: 'Por cobrar', countKey: 'por_cobrar', queue: 'por_cobrar' },
  { id: 'pagadas', label: 'Pagadas', countKey: 'pagadas', queue: 'pagadas' },
  {
    id: 'anuladas_incompletas',
    label: 'Anuladas / Incompletas',
    countKey: 'anuladas_incompletas',
    queue: 'anuladas_incompletas',
  },
]

export function getFinancialQueueCount(counts, tabId) {
  if (!counts) return null
  const tab = FINANCIAL_QUEUE_TABS.find((t) => t.id === tabId)
  if (!tab) return null
  return counts[tab.countKey] ?? 0
}

export function orderPaymentStatusVariant(status) {
  const s = Number(status)
  if (s === 3) return 'success'
  if (s === 2) return 'danger'
  return 'warning'
}

export function orderPaymentStatusLabel(row) {
  return row?.status_label ?? (Number(row?.status) === 3 ? 'Pagada' : Number(row?.status) === 2 ? 'Anulado' : 'Pendiente de pago')
}

export function paymentRowStatusVariant(status) {
  return Number(status) === 2 ? 'danger' : 'success'
}

export function paymentRowStatusLabel(row) {
  return row?.status_label ?? (Number(row?.status) === 2 ? 'Anulado' : 'Activo')
}

export function isCashPaymentMethod(method) {
  const name = String(method?.name ?? method?.description ?? '').toLowerCase()
  return name.includes('efectivo') || name.includes('cash')
}

export function computePaymentPreview(received, totalDue) {
  const amount = Math.max(0, Number(received) || 0)
  const due = Math.max(0, Number(totalDue) || 0)
  const applied = Math.min(amount, due)
  const change = Math.max(0, amount - applied)
  const remaining = Math.max(0, due - applied)
  return { received: amount, applied, change, remaining }
}

export function extractPageTotals(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.page_totals) return raw.page_totals
  if (raw.data?.page_totals) return raw.data.page_totals
  const inner = raw.data
  if (inner && typeof inner === 'object' && !Array.isArray(inner) && inner.page_totals) {
    return inner.page_totals
  }
  return null
}

export function buildPaymentPdfUrl(paymentId) {
  const token = storage.getToken()
  const branchId = storage.getBranchId()
  const roleId = storage.getRoleId()
  const base = config.apiUrl.replace(/\/$/, '')
  const params = new URLSearchParams()
  if (branchId) params.set('branch_id', branchId)
  if (roleId) params.set('role_id', roleId)
  if (token) params.set('token', token)
  const qs = params.toString()
  /** @deprecated Prefer PaymentPdfPreviewModal + GET /payments/{id}/pdf-data */
  return `${base}/payments/${paymentId}/pdf${qs ? `?${qs}` : ''}`
}

/** @deprecated Prefer PaymentPdfPreviewModal (plantilla HTML + pdf-data). */
export function openPaymentPdfInNewTab(paymentId) {
  if (!paymentId) return false
  const opened = window.open(buildPaymentPdfUrl(paymentId), '_blank')
  return Boolean(opened)
}

export function isOrderFinanciallyDimmed(row) {
  return Number(row?.status) === 2 || Number(row?.workflow_status) === 6
}
