import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'

/**
 * Guard de sesión staff.
 * requireCash = false por defecto (caja opcional tras select-access).
 */
export function ProtectedRoute({ children, requireAccess = true, requireCash = false }) {
  const { isAuthenticated, hasSelectedAccess, hasSelectedCash, sessionReady } = useAuth()
  const location = useLocation()

  const accessReady = hasSelectedAccess && storage.hasAccessContext()
  const cashReady = hasSelectedCash && storage.hasCashContext()

  if (!sessionReady) return <LoadingScreen />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (requireAccess && !accessReady) {
    return <Navigate to={ROUTES.SELECT_ACCESS} replace />
  }

  if (requireAccess && requireCash && accessReady && !cashReady) {
    return <Navigate to={ROUTES.SELECT_CASH} replace />
  }

  return children
}
