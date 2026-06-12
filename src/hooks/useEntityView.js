import { useCallback, useState } from 'react'
import { resolveEntityId } from '@/utils/entityId'
import { toastApiError } from '@/utils/toastApi'

/**
 * Carga detalle vía GET /resource/{id} al abrir el modal de ver.
 */
export function useEntityView(fetchById) {
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openView = useCallback(
    async (row) => {
      setViewOpen(true)
      setSelected(row)
      setDetailLoading(true)
      try {
        const id = resolveEntityId(row)
        if (!id) throw new Error('No se encontró el identificador del registro')
        const detail = await fetchById(id)
        setSelected(detail ?? row)
      } catch (err) {
        toastApiError(err)
        setViewOpen(false)
      } finally {
        setDetailLoading(false)
      }
    },
    [fetchById],
  )

  const refreshSelected = useCallback(async () => {
    const id = resolveEntityId(selected)
    if (!id) return
    setDetailLoading(true)
    try {
      const detail = await fetchById(id)
      setSelected(detail ?? selected)
    } catch (err) {
      toastApiError(err)
    } finally {
      setDetailLoading(false)
    }
  }, [fetchById, selected])

  return {
    viewOpen,
    setViewOpen,
    selected,
    setSelected,
    detailLoading,
    openView,
    refreshSelected,
  }
}
