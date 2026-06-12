import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SelectAccessPage } from '@/pages/auth/SelectAccessPage'
import { SelectCashPage } from '@/pages/auth/SelectCashPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import {
  BranchesPage,
  DoctorsPage,
  InsurancesPage,
  InsuranceCatalogPricesPage,
  InsurancePricesPage,
  PatientsPage,
  SpecialtiesPage,
  StaffPage,
  UsersPage,
} from '@/pages/parametros'
import {
  AnalysesPage,
  AnalysisSubgroupsPage,
  AnalysisGroupsPage,
  ComponentsPage,
  MethodsPage,
  SamplesCatalogPage,
} from '@/pages/analisis'
import {
  CashesPage,
  CashFlowPage,
  InflowsPage,
  OpenCashPage,
  OutflowsPage,
  TypeInflowsPage,
  TypeOutflowsPage,
} from '@/pages/caja'
import {
  OrderDetailPage,
  OrdersPage,
  QuotationsPage,
  ResultsPage,
  SampleReceptionPage,
} from '@/pages/clinico'
import { PaymentsPage } from '@/pages/transacciones'
import { PatientLoginPage, PatientPortalPage } from '@/pages/portal'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'

function postLoginRoute() {
  if (!storage.hasAccessContext()) return ROUTES.SELECT_ACCESS
  if (!storage.hasCashContext()) return ROUTES.SELECT_CASH
  return ROUTES.DASHBOARD
}

function GuestOnly({ children }) {
  if (storage.getToken()) {
    return <Navigate to={postLoginRoute()} replace />
  }
  return children
}

function AccessOnly({ children }) {
  if (!storage.getToken()) return <Navigate to={ROUTES.LOGIN} replace />
  if (storage.hasAccessContext()) {
    return <Navigate to={storage.hasCashContext() ? ROUTES.DASHBOARD : ROUTES.SELECT_CASH} replace />
  }
  return children
}

function CashOnly({ children }) {
  if (!storage.getToken()) return <Navigate to={ROUTES.LOGIN} replace />
  if (!storage.hasAccessContext()) return <Navigate to={ROUTES.SELECT_ACCESS} replace />
  if (storage.hasCashContext()) return <Navigate to={ROUTES.DASHBOARD} replace />
  return children
}

const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: ROUTES.SELECT_ACCESS,
    element: (
      <AccessOnly>
        <SelectAccessPage />
      </AccessOnly>
    ),
  },
  {
    path: ROUTES.SELECT_CASH,
    element: (
      <CashOnly>
        <SelectCashPage />
      </CashOnly>
    ),
  },
  {
    path: ROUTES.PATIENT_LOGIN,
    element: <PatientLoginPage />,
  },
  {
    path: ROUTES.PATIENT_PORTAL,
    element: <PatientPortalPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      // Parámetros
      { path: 'parametros/sucursales', element: <BranchesPage /> },
      { path: 'parametros/seguros', element: <InsurancesPage /> },
      { path: 'parametros/seguros/precios-catalogo', element: <InsuranceCatalogPricesPage /> },
      { path: 'parametros/seguros/:id/precios', element: <InsurancePricesPage /> },
      { path: 'parametros/personal', element: <StaffPage /> },
      { path: 'parametros/medicos', element: <DoctorsPage /> },
      { path: 'parametros/especialidades', element: <SpecialtiesPage /> },
      { path: 'parametros/pacientes', element: <PatientsPage /> },
      { path: 'parametros/usuarios', element: <UsersPage /> },
      // Análisis
      { path: 'analisis/catalogo', element: <AnalysesPage /> },
      { path: 'analisis/catalogo/:analysisId/subgrupos', element: <AnalysisSubgroupsPage /> },
      { path: 'analisis/grupos', element: <AnalysisGroupsPage /> },
      { path: 'analisis/muestras', element: <SamplesCatalogPage /> },
      { path: 'analisis/metodos', element: <MethodsPage /> },
      { path: 'analisis/componentes', element: <ComponentsPage /> },
      // Caja
      { path: 'caja/cajas', element: <CashesPage /> },
      { path: 'caja/apertura', element: <OpenCashPage /> },
      { path: 'caja/flujo', element: <CashFlowPage /> },
      { path: 'caja/ingresos', element: <InflowsPage /> },
      { path: 'caja/egresos', element: <OutflowsPage /> },
      { path: 'caja/tipos-ingreso', element: <TypeInflowsPage /> },
      { path: 'caja/tipos-egreso', element: <TypeOutflowsPage /> },
      // Clínico
      { path: 'clinico/cotizaciones', element: <QuotationsPage /> },
      { path: 'clinico/ordenes', element: <OrdersPage /> },
      { path: 'clinico/ordenes/:id', element: <OrderDetailPage /> },
      { path: 'clinico/muestras', element: <SampleReceptionPage /> },
      { path: 'clinico/resultados', element: <ResultsPage /> },
      // Transacciones
      { path: 'transacciones/pagos', element: <PaymentsPage /> },
      { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.LOGIN} replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
