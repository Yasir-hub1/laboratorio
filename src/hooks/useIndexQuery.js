import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { unwrapList } from '@/utils/apiHelpers'
import {
  buildIndexParams,
  queryFromSortingState,
  sortingStateFromQuery,
} from '@/utils/indexQuery'

const EMPTY_EXTRA = {}

/**
 * Listado paginado en servidor (search, sort, page, per_page).
 * @param {(params: object) => Promise<unknown>} apiMethod
 * @param {object} [options]
 */
export function useIndexQuery(
  apiMethod,
  {
    initialPage = 1,
    initialPerPage = 10,
    initialOrderBy = 'updated_at',
    initialOrderDir = 'desc',
    initialState,
    debounceMs = 400,
    extraParams,
    enabled = true,
  } = {},
  deps = [],
) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(initialPage)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [orderBy, setOrderBy] = useState(initialOrderBy)
  const [orderDir, setOrderDir] = useState(initialOrderDir)
  const [state, setState] = useState(initialState)

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const extraParamsRef = useRef(extraParams ?? EMPTY_EXTRA)
  extraParamsRef.current = extraParams ?? EMPTY_EXTRA

  const extraKey = useMemo(
    () => JSON.stringify(extraParams ?? EMPTY_EXTRA),
    [extraParams],
  )

  const resolvedExtraParams = useMemo(
    () => ({ ...(extraParams ?? EMPTY_EXTRA) }),
    [extraKey],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), debounceMs)
    return () => window.clearTimeout(timer)
  }, [searchInput, debounceMs])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, perPage, orderBy, orderDir, state, extraKey])

  const queryParams = useMemo(
    () =>
      buildIndexParams({
        ...resolvedExtraParams,
        page,
        per_page: perPage,
        search: debouncedSearch,
        order_by: orderBy,
        order_dir: orderDir,
        paginate: true,
        state,
      }),
    [page, perPage, debouncedSearch, orderBy, orderDir, state, resolvedExtraParams],
  )

  const queryKey = useMemo(() => JSON.stringify(queryParams), [queryParams])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const raw = await apiMethod(queryParams)
        if (cancelled) return
        const { items: list, meta: pagination } = unwrapList(raw)
        setItems(Array.isArray(list) ? list : [])
        setMeta(pagination)
      } catch (err) {
        if (cancelled) return
        setError(err.message ?? 'Error al cargar datos')
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMethod, queryKey, enabled, ...deps])

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const raw = await apiMethod(queryParams)
      const { items: list, meta: pagination } = unwrapList(raw)
      setItems(Array.isArray(list) ? list : [])
      setMeta(pagination)
    } catch (err) {
      setError(err.message ?? 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [apiMethod, queryParams, enabled])

  const sorting = useMemo(
    () => sortingStateFromQuery(orderBy, orderDir),
    [orderBy, orderDir],
  )

  const onSortingChange = useCallback(
    (updater) => {
      const current = sortingStateFromQuery(orderBy, orderDir)
      const next = typeof updater === 'function' ? updater(current) : updater
      const parsed = queryFromSortingState(next, {
        order_by: initialOrderBy,
        order_dir: initialOrderDir,
      })
      setOrderBy(parsed.order_by)
      setOrderDir(parsed.order_dir)
    },
    [orderBy, orderDir, initialOrderBy, initialOrderDir],
  )

  const onPaginationChange = useCallback(({ pageIndex, pageSize }) => {
    setPage(pageIndex + 1)
    setPerPage(pageSize)
  }, [])

  const onSearchChange = useCallback((value) => {
    setSearchInput(typeof value === 'string' ? value : String(value ?? ''))
  }, [])

  const serverPagination = useMemo(() => {
    const totalRows = meta?.total ?? 0
    const lastPage = Math.max(1, meta?.lastPage ?? 1)
    const currentPage = page
    return {
      pageCount: lastPage,
      pageIndex: Math.max(0, currentPage - 1),
      pageSize: perPage,
      totalRows,
      fromRow: meta?.from ?? (totalRows === 0 ? 0 : (currentPage - 1) * perPage + 1),
      toRow: meta?.to ?? Math.min(currentPage * perPage, totalRows),
      onPaginationChange,
      sorting,
      onSortingChange,
      searchValue: searchInput,
      onSearchChange,
      isLoading: loading,
      isRefreshing: loading,
      onRefresh: reload,
      canPreviousPage: meta?.hasPreviousPage ?? currentPage > 1,
      canNextPage: meta?.hasNextPage ?? currentPage < lastPage,
    }
  }, [
    meta,
    page,
    perPage,
    loading,
    onPaginationChange,
    sorting,
    onSortingChange,
    searchInput,
    onSearchChange,
    reload,
  ])

  const isEmpty =
    !loading &&
    !error &&
    items.length === 0 &&
    (meta?.total ?? 0) === 0 &&
    !debouncedSearch

  return {
    items,
    meta,
    loading,
    error,
    reload,
    setItems,
    searchInput,
    setSearchInput,
    page,
    setPage,
    perPage,
    setPerPage,
    orderBy,
    setOrderBy,
    orderDir,
    setOrderDir,
    state,
    setState,
    serverPagination,
    isEmpty,
    queryParams,
  }
}
