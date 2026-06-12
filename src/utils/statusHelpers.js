/** Estado activo/inactivo según respuestas Laravel (bool, int, string). */
export function isActiveStatus(status) {
  if (status === true || status === 1 || status === '1') return true
  if (typeof status === 'string') {
    const s = status.toLowerCase()
    return s === 'active' || s === 'activo' || s === 'enabled'
  }
  return false
}

export function statusLabel(row) {
  const active = isActiveStatus(row?.status ?? row?.is_active ?? row?.state)
  return active ? 'Activo' : 'Inactivo'
}
