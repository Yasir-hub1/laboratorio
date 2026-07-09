import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'

export function InsuranceProtectedRoute({ children }) {
  if (!storage.hasInsuranceSession()) {
    return <Navigate to={ROUTES.INSURANCE_LOGIN} replace />
  }
  return children ?? <Outlet />
}

export function InsuranceGuestOnly({ children }) {
  if (storage.hasInsuranceSession()) {
    return <Navigate to={ROUTES.INSURANCE_PORTAL} replace />
  }
  return children
}
