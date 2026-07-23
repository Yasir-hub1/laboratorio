/** Helpers del reporte Movimientos activos. */

/**
 * input datetime-local `YYYY-MM-DDTHH:mm` → API `YYYY-MM-DD HH:mm:ss`
 * @param {string} value
 * @param {{ end?: boolean }} [opts]
 */
export function toApiDatetime(value, { end = false } = {}) {
  if (!value) return undefined
  const normalized = String(value).trim().replace(' ', 'T')
  const match = normalized.match(
    /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/,
  )
  if (!match) return undefined
  const [, date, hh = end ? '23' : '00', mm = end ? '59' : '00', ss] = match
  const seconds = ss ?? (end ? '59' : '00')
  return `${date} ${hh}:${mm}:${seconds}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Valor para input datetime-local */
export function toDatetimeLocalValue(date, { end = false } = {}) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hh = end ? '23' : pad(d.getHours())
  const mm = end ? '59' : pad(d.getMinutes())
  if (end) return `${y}-${m}-${day}T23:59`
  return `${y}-${m}-${day}T${hh}:${mm}`
}

export function defaultActiveMovementsRange() {
  const now = new Date()
  return {
    from: toDatetimeLocalValue(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0)),
    to: toDatetimeLocalValue(new Date(now.getFullYear(), now.getMonth(), now.getDate()), {
      end: true,
    }),
  }
}

export function rangePreset(preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  if (preset === 'today') {
    return defaultActiveMovementsRange()
  }
  if (preset === 'yesterday') {
    const yday = new Date(y, m, d - 1)
    return {
      from: toDatetimeLocalValue(new Date(yday.getFullYear(), yday.getMonth(), yday.getDate(), 0, 0)),
      to: toDatetimeLocalValue(yday, { end: true }),
    }
  }
  if (preset === 'week') {
    const day = now.getDay() || 7 // lunes=1 … domingo=7
    const monday = new Date(y, m, d - (day - 1))
    return {
      from: toDatetimeLocalValue(
        new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0),
      ),
      to: toDatetimeLocalValue(now, { end: true }),
    }
  }
  if (preset === 'month') {
    return {
      from: toDatetimeLocalValue(new Date(y, m, 1, 0, 0)),
      to: toDatetimeLocalValue(now, { end: true }),
    }
  }
  return defaultActiveMovementsRange()
}

export function kindBadgeVariant(kind) {
  if (kind === 'inflow') return 'success'
  if (kind === 'outflow') return 'danger'
  return 'default'
}
