import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import {
  cashAssignedUsers,
  cashDisplayName,
  isUserAssignedToCash,
  resolveCashId,
  unwrapCashes,
} from '@/utils/cashHelpers'
import { resolveEntityId } from '@/utils/entityId'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

function personLabel(p) {
  if (!p) return ''
  return (
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') ||
    p.email ||
    ''
  )
}

function resolveUserBranchIds(user) {
  if (!user) return []
  const ids = new Set()
  if (user.branch_id != null) ids.add(String(user.branch_id))
  if (user.branch?.id != null) ids.add(String(user.branch.id))
  ;(user.branches ?? []).forEach((b) => {
    const id = resolveEntityId(b) ?? (typeof b === 'string' || typeof b === 'number' ? b : b?.id)
    if (id != null) ids.add(String(id))
  })
  return [...ids]
}

/**
 * Asigna o quita cajas del usuario (POST /cashes/assign-user, action assign|remove).
 */
export function AssignCashModal({ open, onOpenChange, user }) {
  const [cashes, setCashes] = useState([])
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const userId = resolveEntityId(user)
  const branchIds = useMemo(() => resolveUserBranchIds(user), [user])

  const loadCashes = useCallback(async () => {
    if (branchIds.length === 0) {
      setCashes([])
      return
    }
    setLoading(true)
    try {
      const lists = await Promise.all(
        branchIds.map((branchId) => laboratoryApi.getCashesByBranch(branchId)),
      )
      const merged = new Map()
      lists.flatMap(unwrapCashes).forEach((cash) => {
        const id = resolveCashId(cash)
        if (id) merged.set(id, cash)
      })
      setCashes([...merged.values()])
    } catch (err) {
      toastApiError(err)
      setCashes([])
    } finally {
      setLoading(false)
    }
  }, [branchIds])

  useEffect(() => {
    if (open && branchIds.length > 0) loadCashes()
    if (!open) setCashes([])
  }, [open, branchIds, loadCashes])

  const handleToggle = async (cash) => {
    const cashId = resolveCashId(cash)
    if (!userId || !cashId) {
      toast.error('Usuario o caja sin ID válido')
      return
    }

    const assigned = isUserAssignedToCash(cash, userId)
    setTogglingId(cashId)
    try {
      await laboratoryApi.assignCashUser({
        user_id: userId,
        cash_id: cashId,
        action: assigned ? 'remove' : 'assign',
      })
      toastApiSuccess(assigned ? 'Caja quitada del usuario' : 'Caja asignada al usuario')
      await loadCashes()
    } catch (err) {
      toastApiError(err)
    } finally {
      setTogglingId(null)
    }
  }

  const userName = user?.name ?? user?.username ?? user?.email ?? 'Usuario'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Asignar cajas"
      description={`Cajas de las sucursales del usuario · ${userName}`}
      className="max-w-lg"
    >
      {branchIds.length === 0 ? (
        <p className="text-sm text-muted">
          Este usuario no tiene sucursales asignadas. Edítalo y selecciona al menos una sucursal.
        </p>
      ) : loading ? (
        <LoadingScreen message="Cargando cajas…" />
      ) : cashes.length === 0 ? (
        <p className="text-sm text-muted">
          No hay cajas en las sucursales asignadas. Créalas en Caja → Cajas.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {cashes.map((cash) => {
            const id = resolveCashId(cash)
            const assigned = isUserAssignedToCash(cash, userId)
            const busy = togglingId === id
            const users = cashAssignedUsers(cash)

            return (
              <li
                key={id}
                className={cn(
                  'rounded-lg border border-border p-3 text-sm',
                  assigned && 'border-primary/30 bg-primary/5',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{cashDisplayName(cash)}</p>
                    {cash.branch?.name && (
                      <p className="text-xs text-muted">{cash.branch.name}</p>
                    )}
                    {users.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        Asignados:{' '}
                        {users
                          .map((u) => personLabel(u) ?? u.name ?? u.email)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={assigned ? 'secondary' : 'default'}
                    disabled={busy}
                    onClick={() => handleToggle(cash)}
                  >
                    {busy ? '…' : assigned ? 'Quitar' : 'Asignar'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
