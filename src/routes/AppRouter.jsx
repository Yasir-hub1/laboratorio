import { createBrowserRouter, Navigate, RouterProvider, useLocation, useParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RequirePermission } from '@/components/auth/RequirePermission'
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
  RolePermissionsPage,
  RolesPage,
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
  OrderWorkflowPage,
  QuotationsPage,
} from '@/pages/clinico'
import { PaymentsPage, TransactionManagePage } from '@/pages/transacciones'
import { ActivityLogPage, ActiveMovementsPage } from '@/pages/reportes'
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

function withPerm(permission, element, anyOf) {
  return (
    <RequirePermission permission={permission} anyOf={anyOf}>
      {element}
    </RequirePermission>
  )
}

function postLoginRoute() {
  if (!storage.hasAccessContext()) return ROUTES.SELECT_ACCESS
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
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }
  return children
}

/** select-cash es opcional; se puede visitar aunque ya haya caja */
function CashGate({ children }) {
  if (!storage.getToken()) return <Navigate to={ROUTES.LOGIN} replace />
  if (!storage.hasAccessContext()) return <Navigate to={ROUTES.SELECT_ACCESS} replace />
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
  { path: ROUTES.HOME, element: <LandingPage /> },
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
      <CashGate>
        <SelectCashPage />
      </CashGate>
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
      <ProtectedRoute requireCash={false}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: withPerm('inicio.dashboard.listar', <DashboardPage />),
      },

      // Empresa
      {
        path: 'empresa/usuarios',
        element: withPerm('empresa.usuarios.listar', <UsersPage />),
      },
      {
        path: 'empresa/roles',
        element: withPerm('empresa.roles.listar', <RolesPage />),
      },
      {
        path: 'empresa/roles/:id/permisos',
        element: withPerm('empresa.roles.asignar-permisos', <RolePermissionsPage />),
      },
      {
        path: 'empresa/sucursales',
        element: withPerm('empresa.sucursales.listar', <BranchesPage />),
      },

      // Gestión clínica
      {
        path: 'clinica/pacientes',
        element: withPerm('gestion-clinica.pacientes.listar', <PatientsPage />),
      },
      {
        path: 'clinica/medicos',
        element: withPerm('gestion-clinica.medicos.listar', <DoctorsPage />),
      },
      {
        path: 'clinica/personal',
        element: withPerm('gestion-clinica.personal.listar', <StaffPage />),
      },
      {
        path: 'clinica/especialidades',
        element: withPerm('gestion-clinica.especialidades.listar', <SpecialtiesPage />),
      },
      {
        path: 'clinica/seguros',
        element: withPerm('gestion-clinica.seguros.listar', <InsurancesPage />),
      },
      {
        path: 'clinica/seguros/precios-catalogo',
        element: withPerm(
          'gestion-clinica.precios-particulares.listar',
          <InsuranceCatalogPricesPage />,
        ),
      },
      {
        path: 'clinica/seguros/:id/precios',
        element: withPerm('gestion-clinica.seguros.listar', <InsurancePricesPage />),
      },

      // Atención
      {
        path: 'atencion/crear-orden',
        element: withPerm('atencion.nueva-orden.listar', <OrderReceptionPage />),
      },
      {
        path: 'atencion/gestionar-orden',
        element: withPerm('atencion.gestion-ordenes.listar', <OrderManagePage />),
      },
      {
        path: 'atencion/gestionar-orden/:id',
        element: withPerm('atencion.gestion-ordenes.ver', <OrderDetailPage />),
      },
      {
        path: 'atencion/gestionar-orden/:id/gestionar',
        element: withPerm(null, <OrderWorkflowPage />, [
          'atencion.gestion-ordenes.gestionar-pendientes',
          'atencion.gestion-ordenes.gestionar-en-proceso',
          'atencion.gestion-ordenes.gestionar-en-revision',
          'atencion.gestion-ordenes.gestionar-revisadas',
          'atencion.gestion-ordenes.gestionar-completadas',
          'atencion.gestion-ordenes.gestionar-anuladas',
        ]),
      },
      {
        path: 'atencion/cotizaciones',
        element: withPerm('atencion.cotizaciones.listar', <QuotationsPage />),
      },

      // Catálogos
      {
        path: 'catalogos/analisis',
        element: withPerm('catalogos.catalogo-analisis.listar', <AnalysesPage />),
      },
      {
        path: 'catalogos/analisis/:analysisId/subgrupos',
        element: withPerm('catalogos.analisis-subgrupos.listar', <AnalysisSubgroupsPage />),
      },
      {
        path: 'catalogos/grupos',
        element: withPerm('catalogos.grupos-analisis.listar', <AnalysisGroupsPage />),
      },
      {
        path: 'catalogos/muestras',
        element: withPerm('catalogos.tipos-muestra.listar', <SamplesCatalogPage />),
      },
      {
        path: 'catalogos/metodos',
        element: withPerm('catalogos.metodos.listar', <MethodsPage />),
      },
      {
        path: 'catalogos/componentes',
        element: withPerm('catalogos.analisis-componentes.listar', <ComponentsPage />),
      },

      // Cobros
      {
        path: 'cobros/pagos',
        element: withPerm('cobros.pagos.listar', <PaymentsPage />),
      },
      {
        path: 'cobros/historial',
        element: withPerm('cobros.historial-cobros.listar', <TransactionManagePage />),
      },

      // Caja
      {
        path: 'caja/apertura',
        element: withPerm('caja.apertura-cierre.listar', <OpenCashPage />),
      },
      {
        path: 'caja/movimientos',
        element: withPerm('caja.movimientos.listar', <CashMovementsPage />),
      },
      {
        path: 'caja/flujo',
        element: withPerm('caja.flujo-caja.listar', <CashFlowPage />),
      },
      {
        path: 'caja/arqueo',
        element: withPerm('caja.arqueos.listar', <CashAuditPage />),
      },
      {
        path: 'caja/cajas',
        element: withPerm('caja.cajas.listar', <CashesPage />),
      },
      {
        path: 'caja/categorias',
        element: withPerm('caja.categorias.listar', <CashCategoriesPage />),
      },

      // Reportes
      {
        path: 'reportes/bitacora',
        element: withPerm('reportes.bitacora.listar', <ActivityLogPage />),
      },
      {
        path: 'reportes/movimientos-activos',
        element: withPerm('reportes.movimientos.listar', <ActiveMovementsPage />),
      },

      { path: 'caja/ingresos', element: <Navigate to={ROUTES.CASH_MOVEMENTS} replace /> },
      { path: 'caja/egresos', element: <Navigate to={ROUTES.CASH_MOVEMENTS} replace /> },
      { path: 'caja/tipos-ingreso', element: <Navigate to={ROUTES.CASH_CATEGORIES} replace /> },
      { path: 'caja/tipos-egreso', element: <Navigate to={ROUTES.CASH_CATEGORIES} replace /> },

      // Legacy redirects → rutas oficiales
      { path: 'parametros/usuarios', element: <Navigate to={ROUTES.USERS} replace /> },
      { path: 'parametros/sucursales', element: <Navigate to={ROUTES.BRANCHES} replace /> },
      { path: 'parametros/pacientes', element: <Navigate to={ROUTES.PATIENTS} replace /> },
      { path: 'parametros/medicos', element: <Navigate to={ROUTES.DOCTORS} replace /> },
      { path: 'parametros/personal', element: <Navigate to={ROUTES.STAFF} replace /> },
      {
        path: 'parametros/especialidades',
        element: <Navigate to={ROUTES.SPECIALTIES} replace />,
      },
      { path: 'parametros/seguros', element: <Navigate to={ROUTES.INSURANCES} replace /> },
      {
        path: 'parametros/seguros/precios-catalogo',
        element: <Navigate to={ROUTES.INSURANCE_CATALOG_PRICES} replace />,
      },
      { path: 'parametros/seguros/:id/precios', element: <InsurancePricesRedirect /> },
      { path: 'analisis/catalogo', element: <Navigate to={ROUTES.ANALYSES} replace /> },
      {
        path: 'analisis/catalogo/:analysisId/subgrupos',
        element: <AnalysisSubgroupsRedirect />,
      },
      { path: 'analisis/grupos', element: <Navigate to={ROUTES.ANALYSIS_GROUPS} replace /> },
      { path: 'analisis/muestras', element: <Navigate to={ROUTES.SAMPLES_CATALOG} replace /> },
      { path: 'analisis/metodos', element: <Navigate to={ROUTES.METHODS} replace /> },
      { path: 'analisis/componentes', element: <Navigate to={ROUTES.COMPONENTS} replace /> },
      { path: 'recepcion/pacientes', element: <Navigate to={ROUTES.PATIENTS} replace /> },
      {
        path: 'recepcion/crear-orden',
        element: <Navigate to={ROUTES.ORDER_RECEPTION} replace />,
      },
      { path: 'recepcion/cotizaciones', element: <Navigate to={ROUTES.QUOTATIONS} replace /> },
      {
        path: 'recepcion/gestionar-orden',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      { path: 'recepcion/gestionar-orden/:id', element: <OrderDetailRedirect /> },
      {
        path: 'transacciones/gestionar',
        element: <Navigate to={ROUTES.TRANSACTION_MANAGEMENT} replace />,
      },
      { path: 'transacciones/pagos', element: <Navigate to={ROUTES.PAYMENTS} replace /> },
      {
        path: 'clinico/recepcion-orden',
        element: <Navigate to={ROUTES.ORDER_RECEPTION} replace />,
      },
      { path: 'clinico/cotizaciones', element: <Navigate to={ROUTES.QUOTATIONS} replace /> },
      {
        path: 'clinico/gestion-ordenes',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      { path: 'clinico/gestion-ordenes/:id', element: <OrderDetailRedirect /> },
      {
        path: 'clinico/ordenes',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      { path: 'clinico/ordenes/:id', element: <OrderDetailRedirect /> },
      {
        path: 'clinico/muestras',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'clinico/resultados',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'laboratorio/recepcion',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'laboratorio/ingreso-resultados',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'laboratorio/validacion',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'laboratorio/cierre',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'laboratorio/completadas',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },
      {
        path: 'laboratorio/anuladas',
        element: <Navigate to={ROUTES.ORDER_MANAGEMENT} replace />,
      },

      { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.HOME} replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
