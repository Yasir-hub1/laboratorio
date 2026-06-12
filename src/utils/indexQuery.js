/** Query params estándar para endpoints index del backend. */
export function buildIndexParams({
  page = 1,
  per_page = 10,
  search,
  order_by = 'updated_at',
  order_dir = 'desc',
  paginate = true,
  state,
  ...extra
} = {}) {
  const params = { ...extra }

  if (paginate === false) {
    params.paginate = false
    const q = String(search ?? '').trim()
    if (q) params.search = q
    if (order_by) {
      params.order_by = order_by
      params.order_dir = order_dir ?? 'desc'
    }
    return finalizeIndexParams(params, state)
  }

  params.per_page = per_page
  params.paginate = true
  params.order_by = order_by
  params.order_dir = order_dir ?? 'desc'

  if (page > 1) {
    params.page = page
  }

  const q = String(search ?? '').trim()
  if (q) {
    params.search = q
  } else if (page <= 1) {
    // Backend espera search=%20 en la primera página sin filtro
    params.search = ' '
  }

  return finalizeIndexParams(params, state)
}

function finalizeIndexParams(params, state) {
  if (state !== undefined && state !== null && state !== '') {
    params.state = state
  }
  return params
}

export function sortingStateFromQuery(orderBy, orderDir) {
  if (!orderBy) return []
  return [{ id: orderBy, desc: orderDir === 'desc' }]
}

export function queryFromSortingState(sorting, fallback = {}) {
  const first = sorting?.[0]
  if (!first) {
    return {
      order_by: fallback.order_by,
      order_dir: fallback.order_dir ?? 'desc',
    }
  }
  return {
    order_by: first.id,
    order_dir: first.desc ? 'desc' : 'asc',
  }
}
