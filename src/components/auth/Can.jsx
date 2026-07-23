import { usePermission } from '@/hooks/usePermission'

/** Render condicional según permiso(s). */
export function Can({ permission, anyOf, children, fallback = null }) {
  const { can, canAny } = usePermission()

  const allowed = anyOf?.length
    ? canAny(anyOf)
    : permission
      ? can(permission)
      : true

  if (!allowed) return fallback
  return children
}
