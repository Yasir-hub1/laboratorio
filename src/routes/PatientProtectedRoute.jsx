import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'

export function PatientProtectedRoute({ children }) {
  if (!storage.hasPatientSession()) {
    return <Navigate to={ROUTES.PATIENT_LOGIN} replace />
  }
  return children ?? <Outlet />
}

export function PatientGuestOnly({ children }) {
  if (storage.hasPatientSession()) {
    return <Navigate to={ROUTES.PATIENT_PORTAL} replace />
  }
  return children
}
