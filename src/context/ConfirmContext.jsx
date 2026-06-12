import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Button, Modal, ModalFooter } from '@/components/ui'

const ConfirmContext = createContext(null)

const INITIAL = {
  open: false,
  title: '',
  description: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'danger',
}

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {'danger'|'primary'} [options.variant]
 * @returns {Promise<boolean>}
 */
function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  }
  return ctx
}

function useConfirmAction() {
  const { confirm } = useConfirm()

  const confirmDelete = useCallback(
    (label) => {
      const name = label ? `"${label}"` : 'este registro'
      return confirm({
        title: 'Eliminar registro',
        description: `¿Eliminar ${name}? Esta acción no se puede deshacer.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
    },
    [confirm],
  )

  const confirmDeactivate = useCallback(
    (label) => {
      const name = label ? `"${label}"` : 'este registro'
      return confirm({
        title: 'Desactivar registro',
        description: `¿Desactivar ${name}? El registro quedará inactivo en el sistema.`,
        confirmLabel: 'Desactivar',
        variant: 'danger',
      })
    },
    [confirm],
  )

  return { confirm, confirmDelete, confirmDeactivate }
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(INITIAL)
  const resolveRef = useRef(null)

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({
        ...INITIAL,
        ...options,
        open: true,
      })
    })
  }, [])

  const finish = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false }))
    const resolve = resolveRef.current
    resolveRef.current = null
    resolve?.(result)
  }, [])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={state.open}
        onOpenChange={(open) => {
          if (!open) finish(false)
        }}
        title={state.title}
        description={state.description}
        className="max-w-md"
      >
        <ModalFooter className="mt-2">
          <Button type="button" variant="secondary" onClick={() => finish(false)}>
            {state.cancelLabel}
          </Button>
          <Button
            type="button"
            variant={state.variant === 'primary' ? 'primary' : 'danger'}
            onClick={() => finish(true)}
          >
            {state.confirmLabel}
          </Button>
        </ModalFooter>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export { useConfirm, useConfirmAction }
