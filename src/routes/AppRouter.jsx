import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom'
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
  CashAuditPage,
  CashCategoriesPage,
  CashFlowPage,
  CashMovementsPage,
  OpenCashPage,
} from '@/pages/caja'
import {
  OrderDetailPage,
  OrderManagePage,
  OrderReceptionPage,
  QuotationsPage,
} from '@/pages/clinico'
import { PaymentsPage, TransactionManagePage } from '@/pages/transacciones'
import { PatientLoginPage, PatientOrderDetailPage, PatientOrdersPage } from '@/pages/portal'
import {
  InsuranceLoginPage,
  InsuranceOrderDetailPage,
  InsuranceOrdersPage,
} from '@/pages/insurance'
import { LandingPage } from '@/pages/LandingPage'
import { PatientPortalLayout } from '@/components/portal/PatientPortalLayout'
import { InsurancePortalLayout } from '@/components/insurance/InsurancePortalLayout'
import { PatientGuestOnly, PatientProtectedRoute } from '@/routes/PatientProtectedRoute'
import { InsuranceGuestOnly, InsuranceProtectedRoute } from '@/routes/InsuranceProtectedRoute'
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

function OrderDetailRedirect() {
  const { id } = useParams()
  return <Navigate to={ROUTES.ORDER_DETAIL.replace(':id', id)} replace />
}

const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <LandingPage />,
  },
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
    element: (
      <PatientGuestOnly>
        <PatientLoginPage />
      </PatientGuestOnly>
    ),
  },
  {
    path: ROUTES.PATIENT_PORTAL,
    element: (
      <PatientProtectedRoute>
        <PatientPortalLayout />
      </PatientProtectedRoute>
    ),
    children: [
      { index: true, element: <PatientOrdersPage /> },
      { path: 'ordenes/:orderId', element: <PatientOrderDetailPage /> },
    ],
  },
  {
    path: ROUTES.INSURANCE_LOGIN,
    element: (
      <InsuranceGuestOnly>
        <InsuranceLoginPage />
      </InsuranceGuestOnly>
    ),
  },
  {
    path: ROUTES.INSURANCE_PORTAL,
    element: (
      <InsuranceProtectedRoute>
        <InsurancePortalLayout />
      </InsuranceProtectedRoute>
    ),
    children: [
      { index: true, element: <InsuranceOrdersPage /> },
      { path: 'ordenes/:orderId', element: <InsuranceOrderDetailPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
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
      { path: 'caja/movimientos', element: <CashMovementsPage /> },
      { path: 'caja/flujo', element: <CashFlowPage /> },
      { path: 'caja/arqueo', element: <CashAuditPage /> },
      { path: 'caja/categorias', element: <CashCategoriesPage /> },
      { path: 'caja/ingresos', element: <Navigate to={ROUTES.CASH_MOVEMENTS} replace /> },
      { path: 'caja/egresos', element: <Navigate to={ROUTES.CASH_MOVEMENTS} replace /> },
      { path: 'caja/tipos-ingreso', element: <Navigate to={ROUTES.CASH_CATEGORIES} replace /> },
      { path: 'caja/tipos-egreso', element: <Navigate to={ROUTES.CASH_CATEGORIES} replace /> },
      // Recepción y atención
      { path: 'recepcion/pacientes', element: <PatientsPage /> },
      { path: 'recepcion/crear-orden', element: <OrderReceptionPage /> },
      { path: 'recepcion/cotizaciones', element: <QuotationsPage /> },
      { path: 'recepcion/gestionar-orden', element: <OrderManagePage /> },
      { path: 'recepcion/gestionar-orden/:id', element: <OrderDetailPage /> },
      // Redirecciones legacy
      { path: 'clinico/recepcion-orden', element: <Navigate to={ROUTES.ORDER_RECEPTION} replace /> },
      { path: 'clinico/cotizaciones', element: <Navigate to={ROUTES.QUOTATIONS} replace /> },
      { path: 'clinico/gestion-ordenes', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'clinico/gestion-ordenes/:id', element: <OrderDetailRedirect /> },
      { path: 'clinico/ordenes', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'clinico/ordenes/:id', element: <OrderDetailRedirect /> },
      { path: 'clinico/muestras', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'clinico/resultados', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'laboratorio/recepcion', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'laboratorio/ingreso-resultados', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'laboratorio/validacion', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'laboratorio/cierre', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'laboratorio/completadas', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      { path: 'laboratorio/anuladas', element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace /> },
      // Transacciones
      { path: 'transacciones/gestionar', element: <TransactionManagePage /> },
      { path: 'transacciones/pagos', element: <PaymentsPage /> },
      { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
