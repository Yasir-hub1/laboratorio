import { unwrapList } from '@/utils/apiHelpers'
import { resolveEntityId } from '@/utils/entityId'

export function unwrapCashes(raw) {
  return unwrapList(raw).items
}

export function cashDisplayName(cash) {
  return cash?.name ?? cash?.description ?? `Caja #${cash?.id ?? '—'}`
}

/** Usuarios asignados a una caja (GET /cashes/branch/{id}). */
export function cashAssignedUsers(cash) {
  if (!cash) return []
  return cash.users ?? cash.assigned_users ?? cash.cash_users ?? []
}

export function isUserAssignedToCash(cash, userId) {
  if (!cash || !userId) return false
  const key = String(userId)
  return cashAssignedUsers(cash).some((u) => {
    const uid = resolveEntityId(u) ?? u.user_id ?? u.id
    return uid != null && String(uid) === key
  })
}

export function resolveCashId(cash) {
  return resolveEntityId(cash) ?? (cash?.cash_id != null ? String(cash.cash_id) : undefined)
}

function parseAmount(value) {
  if (value == null || value === '') return null
  const amount = Number(value)
  return Number.isNaN(amount) ? null : amount
}

/**
 * Interpreta GET /cashes/{id}/status (apertura activa o no).
 */
export function parseCashOpeningStatus(data) {
  if (!data) {
    return {
      isOpen: false,
      openingId: null,
      opening: null,
      currentAmount: null,
      initialAmount: null,
      totalInflow: null,
      totalOutflow: null,
    }
  }

  const opening =
    data.opening_cash ??
    data.opening ??
    data.active_opening ??
    data.current_opening ??
    (typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : null)

  const openingId =
    data.opening_cash_id ??
    opening?.id ??
    data.id ??
    null

  const isOpen = Boolean(
    data.is_open === true ||
      data.is_open === 1 ||
      data.has_active_opening === true ||
      data.has_active_opening === 1 ||
      data.has_opening === true ||
      data.status === 'open' ||
      data.status === 1 ||
      (opening &&
        (opening.is_open === true ||
          opening.is_open === 1 ||
          opening.closed_at == null ||
          opening.status === 'open')),
  )

  return {
    isOpen,
    openingId: openingId != null && openingId !== '' ? String(openingId) : null,
    opening,
    currentAmount: parseAmount(data.current_amount ?? opening?.current_amount),
    initialAmount: parseAmount(
      data.initial_amount ?? opening?.initial_amount ?? opening?.opening_amount,
    ),
    totalInflow: parseAmount(data.total_inflow ?? opening?.total_inflow),
    totalOutflow: parseAmount(data.total_outflow ?? opening?.total_outflow),
  }
}

/** Combina datos de apertura activa (listado + status en vivo). */
export function mergeActiveOpeningDisplay(activeOpening, cashStatus) {
  const opening = cashStatus?.opening ?? activeOpening

  return {
    id: cashStatus?.openingId ?? activeOpening?.id ?? opening?.id ?? null,
    openedAt:
      opening?.opened_at ?? opening?.created_at ?? activeOpening?.opened_at ?? null,
    initialAmount: parseAmount(
      cashStatus?.initialAmount ??
        opening?.initial_amount ??
        opening?.opening_amount ??
        activeOpening?.initial_amount,
    ),
    currentAmount: parseAmount(
      cashStatus?.currentAmount ?? opening?.current_amount ?? activeOpening?.current_amount,
    ),
    totalInflow: parseAmount(
      cashStatus?.totalInflow ?? opening?.total_inflow ?? activeOpening?.total_inflow,
    ),
    totalOutflow: parseAmount(
      cashStatus?.totalOutflow ?? opening?.total_outflow ?? activeOpening?.total_outflow,
    ),
  }
}
