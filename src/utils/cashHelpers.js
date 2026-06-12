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

/**
 * Interpreta GET /cashes/{id}/status (apertura activa o no).
 */
export function parseCashOpeningStatus(data) {
  if (!data) {
    return { isOpen: false, openingId: null, opening: null }
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
  }
}
