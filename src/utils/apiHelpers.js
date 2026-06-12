/** Extrae data de respuestas Laravel { success, data, message } */
export function unwrapData(payload) {
  if (payload == null) return null
  if (payload.success === false) {
    throw new Error(payload.message ?? 'Error en la solicitud')
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function isLaravelPaginator(value) {
  return (
    value &&
    typeof value === 'object' &&
    Array.isArray(value.data) &&
    (value.current_page != null || value.total != null)
  )
}

function paginatorToList(paginator) {
  return {
    items: paginator.data,
    meta: {
      currentPage: paginator.current_page,
      lastPage: paginator.last_page,
      total: paginator.total,
      perPage: paginator.per_page,
      from: paginator.from ?? null,
      to: paginator.to ?? null,
      hasNextPage: paginator.next_page_url != null,
      hasPreviousPage: paginator.prev_page_url != null,
    },
  }
}

/**
 * Normaliza listados del API:
 * - Envelope { success, data: paginator }
 * - Paginator ya desenvuelto por request() → { data: [], current_page, total, ... }
 * - Array plano (paginate=false)
 */
export function unwrapList(payload) {
  if (payload == null) return { items: [], meta: null }

  // Envelope completo { success, data: ... }
  if (Object.prototype.hasOwnProperty.call(payload, 'data') && payload.success !== undefined) {
    const inner = payload.data
    if (isLaravelPaginator(inner)) return paginatorToList(inner)
    if (Array.isArray(inner)) return { items: inner, meta: null }
  }

  // Paginator (típico tras request() → unwrapData)
  if (isLaravelPaginator(payload)) {
    return paginatorToList(payload)
  }

  const data = unwrapData(payload)

  if (isLaravelPaginator(data)) return paginatorToList(data)
  if (Array.isArray(data)) return { items: data, meta: null }

  if (data?.data && Array.isArray(data.data)) {
    return paginatorToList(data)
  }

  if (data && typeof data === 'object' && (data.id != null || data.email != null)) {
    return { items: [data], meta: null }
  }

  return { items: [], meta: null }
}

export function getErrorMessage(error) {
  const data = error?.response?.data

  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.values(data.errors)
      .flatMap((v) => (Array.isArray(v) ? v : [v]))
      .filter(Boolean)
      .map(String)
    if (messages.length) {
      const base = data.message ? `${data.message}: ` : ''
      return `${base}${messages.join(' ')}`
    }
  }

  if (typeof data?.message === 'string' && data.message) {
    return data.message
  }

  const raw = error?.message ?? 'Error de conexión con el servidor'

  if (
    raw.includes('SQLSTATE') ||
    raw.includes('Undefined table') ||
    raw.includes('type_inflows')
  ) {
    return 'Error en la base de datos del servidor al consultar caja. El equipo backend debe ejecutar las migraciones pendientes (tabla type_inflows).'
  }

  return raw
}

export function formatCurrency(value) {
  const n = Number(value ?? 0)
  return `Bs. ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
