import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { can, canAny, canMenu, canModule, crudPermissionFlags } from '@/utils/permissions'

export function usePermission() {
  const { permissions } = useAuth()

  return useMemo(() => {
    const list = permissions ?? []
    return {
      permissions: list,
      can: (name) => can(list, name),
      canAny: (names) => canAny(list, names),
      canMenu: (prefix) => canMenu(list, prefix),
      canModule: (moduleName) => canModule(list, moduleName),
    }
  }, [permissions])
}

export function useCrudPermission(prefix) {
  const { permissions } = useAuth()
  return useMemo(() => crudPermissionFlags(permissions ?? [], prefix), [permissions, prefix])
}
