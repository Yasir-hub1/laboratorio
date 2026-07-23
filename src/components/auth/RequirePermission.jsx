import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { ROUTES } from '@/utils/constants'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

/**
 * Guard de ruta por permiso.
 * Sin permiso → redirige a /dashboard (no 404).
 */
export function RequirePermission({ permission, anyOf, children, fallback = null }) {
  const { sessionReady } = useAuth()
  const { can, canAny } = usePermission()

  if (!sessionReady) return <LoadingScreen />

  const allowed = anyOf?.length
    ? canAny(anyOf)
    : permission
      ? can(permission)
      : true

  if (!allowed) {
    if (fallback != null) return fallback
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}
