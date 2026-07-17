import { createBrowserRouter, Navigate, RouterProvider, useLocation, useParams } from 'react-router-dom'
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
  const { search, hash } = useLocation()
  return <Navigate to={`${ROUTES.ORDER_DETAIL.replace(':id', id)}${search}${hash}`} replace />
}

function InsurancePricesRedirect() {
  const { id } = useParams()
  const { search, hash } = useLocation()
  return (
    <Navigate to={`${ROUTES.INSURANCE_PRICES.replace(':id', id)}${search}${hash}`} replace />
  )
}

function AnalysisSubgroupsRedirect() {
  const { analysisId } = useParams()
  const { search, hash } = useLocation()
  return (
    <Navigate
      to={`${ROUTES.ANALYSIS_SUBGROUPS.replace(':analysisId', analysisId)}${search}${hash}`}
      replace
    />
  )
}

function LegacyRedirect({ to }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
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
      // Empresa
      { path: 'empresa/usuarios', element: <UsersPage /> },
      { path: 'empresa/sucursales', element: <BranchesPage /> },
      // Gestión clínica
      { path: 'clinica/pacientes', element: <PatientsPage /> },
      { path: 'clinica/medicos', element: <DoctorsPage /> },
      { path: 'clinica/personal', element: <StaffPage /> },
      { path: 'clinica/especialidades', element: <SpecialtiesPage /> },
      { path: 'clinica/seguros', element: <InsurancesPage /> },
      { path: 'clinica/seguros/precios-catalogo', element: <InsuranceCatalogPricesPage /> },
      { path: 'clinica/seguros/:id/precios', element: <InsurancePricesPage /> },
      // Atención
      { path: 'atencion/crear-orden', element: <OrderReceptionPage /> },
      { path: 'atencion/cotizaciones', element: <QuotationsPage /> },
      { path: 'atencion/gestionar-orden', element: <OrderManagePage /> },
      { path: 'atencion/gestionar-orden/:id', element: <OrderDetailPage /> },
      // Catálogos
      { path: 'catalogos/analisis', element: <AnalysesPage /> },
      { path: 'catalogos/analisis/:analysisId/subgrupos', element: <AnalysisSubgroupsPage /> },
      { path: 'catalogos/grupos', element: <AnalysisGroupsPage /> },
      { path: 'catalogos/muestras', element: <SamplesCatalogPage /> },
      { path: 'catalogos/metodos', element: <MethodsPage /> },
      { path: 'catalogos/componentes', element: <ComponentsPage /> },
      // Cobros
      { path: 'cobros/pagos', element: <PaymentsPage /> },
      { path: 'cobros/historial', element: <TransactionManagePage /> },
      // Caja
      { path: 'caja/cajas', element: <CashesPage /> },
      { path: 'caja/apertura', element: <OpenCashPage /> },
      { path: 'caja/movimientos', element: <CashMovementsPage /> },
      { path: 'caja/flujo', element: <CashFlowPage /> },
      { path: 'caja/arqueo', element: <CashAuditPage /> },
      { path: 'caja/categorias', element: <CashCategoriesPage /> },
      { path: 'caja/ingresos', element: <LegacyRedirect to={ROUTES.CASH_MOVEMENTS} /> },
      { path: 'caja/egresos', element: <LegacyRedirect to={ROUTES.CASH_MOVEMENTS} /> },
      { path: 'caja/tipos-ingreso', element: <LegacyRedirect to={ROUTES.CASH_CATEGORIES} /> },
      { path: 'caja/tipos-egreso', element: <LegacyRedirect to={ROUTES.CASH_CATEGORIES} /> },
      // Legacy → Empresa
      { path: 'parametros/usuarios', element: <LegacyRedirect to={ROUTES.USERS} /> },
      { path: 'parametros/sucursales', element: <LegacyRedirect to={ROUTES.BRANCHES} /> },
      // Legacy → Gestión clínica
      { path: 'parametros/pacientes', element: <LegacyRedirect to={ROUTES.PATIENTS} /> },
      { path: 'parametros/medicos', element: <LegacyRedirect to={ROUTES.DOCTORS} /> },
      { path: 'parametros/personal', element: <LegacyRedirect to={ROUTES.STAFF} /> },
      { path: 'parametros/especialidades', element: <LegacyRedirect to={ROUTES.SPECIALTIES} /> },
      { path: 'parametros/seguros', element: <LegacyRedirect to={ROUTES.INSURANCES} /> },
      {
        path: 'parametros/seguros/precios-catalogo',
        element: <LegacyRedirect to={ROUTES.INSURANCE_CATALOG_PRICES} />,
      },
      { path: 'parametros/seguros/:id/precios', element: <InsurancePricesRedirect /> },
      { path: 'recepcion/pacientes', element: <LegacyRedirect to={ROUTES.PATIENTS} /> },
      // Legacy → Atención
      { path: 'recepcion/crear-orden', element: <LegacyRedirect to={ROUTES.ORDER_RECEPTION} /> },
      { path: 'recepcion/cotizaciones', element: <LegacyRedirect to={ROUTES.QUOTATIONS} /> },
      { path: 'recepcion/gestionar-orden', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'recepcion/gestionar-orden/:id', element: <OrderDetailRedirect /> },
      { path: 'clinico/recepcion-orden', element: <LegacyRedirect to={ROUTES.ORDER_RECEPTION} /> },
      { path: 'clinico/cotizaciones', element: <LegacyRedirect to={ROUTES.QUOTATIONS} /> },
      { path: 'clinico/gestion-ordenes', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'clinico/gestion-ordenes/:id', element: <OrderDetailRedirect /> },
      { path: 'clinico/ordenes', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'clinico/ordenes/:id', element: <OrderDetailRedirect /> },
      { path: 'clinico/muestras', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'clinico/resultados', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'laboratorio/recepcion', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      {
        path: 'laboratorio/ingreso-resultados',
        element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} />,
      },
      { path: 'laboratorio/validacion', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'laboratorio/cierre', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'laboratorio/completadas', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      { path: 'laboratorio/anuladas', element: <LegacyRedirect to={ROUTES.ORDER_MANAGEMENT} /> },
      // Legacy → Catálogos
      { path: 'analisis/catalogo', element: <LegacyRedirect to={ROUTES.ANALYSES} /> },
      { path: 'analisis/catalogo/:analysisId/subgrupos', element: <AnalysisSubgroupsRedirect /> },
      { path: 'analisis/grupos', element: <LegacyRedirect to={ROUTES.ANALYSIS_GROUPS} /> },
      { path: 'analisis/muestras', element: <LegacyRedirect to={ROUTES.SAMPLES_CATALOG} /> },
      { path: 'analisis/metodos', element: <LegacyRedirect to={ROUTES.METHODS} /> },
      { path: 'analisis/componentes', element: <LegacyRedirect to={ROUTES.COMPONENTS} /> },
      // Legacy → Cobros
      { path: 'transacciones/pagos', element: <LegacyRedirect to={ROUTES.PAYMENTS} /> },
      {
        path: 'transacciones/gestionar',
        element: <LegacyRedirect to={ROUTES.TRANSACTION_MANAGEMENT} />,
      },
      { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
