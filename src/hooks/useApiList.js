import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { unwrapList } from '@/utils/apiHelpers'
import { buildIndexParams } from '@/utils/indexQuery'

const EMPTY_EXTRA = {}

/**
 * Lista completa para selects/combos (`paginate=false`).
 * @param {(params: object) => Promise<unknown>} apiMethod
 * @param {Array} [deps]
 * @param {object} [extraParams] — filtros adicionales (ej. type en staffs)
 */
export function useApiList(apiMethod, deps = [], extraParams) {
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

  const params = useMemo(
    () => buildIndexParams({ ...resolvedExtraParams, paginate: false }),
    [resolvedExtraParams],
  )

  const paramsKey = useMemo(() => JSON.stringify(params), [params])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const raw = await apiMethod(params)
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
  }, [apiMethod, paramsKey, ...deps])

  const reload = useCallback(async () => {
    setError(null)
    try {
      const raw = await apiMethod(params)
      const { items: list, meta: pagination } = unwrapList(raw)
      setItems(Array.isArray(list) ? list : [])
      setMeta(pagination)
    } catch (err) {
      setError(err.message ?? 'Error al cargar datos')
    }
  }, [apiMethod, params])

  return { items, meta, loading, error, reload, setItems }
}
