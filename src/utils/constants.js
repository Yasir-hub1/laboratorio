export const APP_NAME = 'BIOCONTROL'
export const APP_DESCRIPTION = 'Sistema Integral de Gestión de Laboratorio Clínico'

/** Paleta de diseño — sincronizada con @theme en index.css */
export const THEME = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  accent: '#22C55E',
  accentHover: '#16A34A',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  sidebar: '#1E293B',
  sidebarGradient: 'from-[#0f172a] via-[#1e3a8a] to-[#0f172a]',
  text: '#0F172A',
  textMuted: '#64748B',
  sidebarText: '#E2E8F0',
  glass: {
    card: 'rgba(255,255,255,0.5)',
    header: 'rgba(255,255,255,0.4)',
    tabBar: 'rgba(255,255,255,0.55)',
    blur: '2xl',
  },
}

export const API_TIMEOUT = 60_000

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SELECT_ACCESS: '/select-access',
  SELECT_CASH: '/select-cash',
  DASHBOARD: '/dashboard',

  // Empresa
  USERS: '/empresa/usuarios',
  ROLES: '/empresa/roles',
  ROLE_PERMISSIONS: '/empresa/roles/:id/permisos',
  BRANCHES: '/empresa/sucursales',

  // Gestión clínica
  PATIENTS: '/clinica/pacientes',
  DOCTORS: '/clinica/medicos',
  STAFF: '/clinica/personal',
  SPECIALTIES: '/clinica/especialidades',
  INSURANCES: '/clinica/seguros',
  INSURANCE_CATALOG_PRICES: '/clinica/seguros/precios-catalogo',
  INSURANCE_PRICES: '/clinica/seguros/:id/precios',

  // Atención
  ORDER_RECEPTION: '/atencion/crear-orden',
  ORDER_MANAGEMENT: '/atencion/gestionar-orden',
  ORDER_DETAIL: '/atencion/gestionar-orden/:id',
  ORDER_WORKFLOW: '/atencion/gestionar-orden/:id/gestionar',
  QUOTATIONS: '/atencion/cotizaciones',

  // Catálogos
  ANALYSES: '/catalogos/analisis',
  ANALYSIS_SUBGROUPS: '/catalogos/analisis/:analysisId/subgrupos',
  ANALYSIS_GROUPS: '/catalogos/grupos',
  SAMPLES_CATALOG: '/catalogos/muestras',
  METHODS: '/catalogos/metodos',
  COMPONENTS: '/catalogos/componentes',

  // Cobros
  PAYMENTS: '/cobros/pagos',
  TRANSACTION_MANAGEMENT: '/cobros/historial',

  // Caja
  OPEN_CASH: '/caja/apertura',
  CASH_MOVEMENTS: '/caja/movimientos',
  CASH_FLOW: '/caja/flujo',
  CASH_AUDIT: '/caja/arqueo',
  CASHES: '/caja/cajas',
  CASH_CATEGORIES: '/caja/categorias',

  // Alias / legacy
  RECEPTION_PATIENTS: '/clinica/pacientes',
  INFLOWS: '/caja/movimientos',
  OUTFLOWS: '/caja/movimientos',
  TYPE_INFLOWS: '/caja/categorias',
  TYPE_OUTFLOWS: '/caja/categorias',
  ORDERS: '/atencion/gestionar-orden',
  LAB_SAMPLE_RECEPTION: '/atencion/gestionar-orden',
  LAB_RESULTS_ENTRY: '/atencion/gestionar-orden',
  LAB_RESULTS_VALIDATION: '/atencion/gestionar-orden',
  LAB_ORDER_CLOSURE: '/atencion/gestionar-orden',
  LAB_ORDERS_COMPLETED: '/atencion/gestionar-orden',
  LAB_ORDERS_ANNULLED: '/atencion/gestionar-orden',
  SAMPLE_RECEPTION: '/atencion/gestionar-orden',
  RESULTS: '/atencion/gestionar-orden',

  // Portal paciente
  PATIENT_LOGIN: '/portal/login',
  PATIENT_PORTAL: '/portal',
  PATIENT_ORDER_DETAIL: '/portal/ordenes/:orderId',
  // Portal seguros
  INSURANCE_LOGIN: '/seguros/login',
  INSURANCE_PORTAL: '/seguros',
  INSURANCE_ORDER_DETAIL: '/seguros/ordenes/:orderId',
  NOT_FOUND: '*',
}

/**
 * Sidebar oficial. Cada ítem: permission = prefijo sin .listar
 * Visible si permissions incluye `${permission}.listar`
 */
export const NAV_GROUPS = [
  {
    id: 'inicio',
    label: 'Inicio',
    shortLabel: 'Inicio',
    icon: 'LayoutDashboard',
    items: [
      {
        to: ROUTES.DASHBOARD,
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        permission: 'inicio.dashboard',
      },
    ],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    shortLabel: 'Empresa',
    icon: 'Building2',
    items: [
      { to: ROUTES.USERS, label: 'Usuarios', icon: 'UserCog', permission: 'empresa.usuarios' },
      { to: ROUTES.ROLES, label: 'Roles', icon: 'ShieldCheck', permission: 'empresa.roles' },
      {
        to: ROUTES.BRANCHES,
        label: 'Sucursales',
        icon: 'Building2',
        permission: 'empresa.sucursales',
      },
    ],
  },
  {
    id: 'gestion-clinica',
    label: 'Gestión clínica',
    shortLabel: 'Clínica',
    icon: 'HeartPulse',
    items: [
      {
        to: ROUTES.PATIENTS,
        label: 'Pacientes',
        icon: 'UserCircle',
        permission: 'gestion-clinica.pacientes',
      },
      {
        to: ROUTES.DOCTORS,
        label: 'Médicos',
        icon: 'Stethoscope',
        permission: 'gestion-clinica.medicos',
      },
      {
        to: ROUTES.STAFF,
        label: 'Personal',
        icon: 'Users',
        permission: 'gestion-clinica.personal',
      },
      {
        to: ROUTES.SPECIALTIES,
        label: 'Especialidades',
        icon: 'GraduationCap',
        permission: 'gestion-clinica.especialidades',
      },
      {
        to: ROUTES.INSURANCES,
        label: 'Seguros',
        icon: 'Shield',
        permission: 'gestion-clinica.seguros',
      },
    ],
  },
  {
    id: 'atencion',
    label: 'Atención',
    shortLabel: 'Atención',
    icon: 'ClipboardList',
    items: [
      {
        to: ROUTES.ORDER_RECEPTION,
        label: 'Nueva Orden',
        icon: 'ClipboardPlus',
        permission: 'atencion.nueva-orden',
      },
      {
        to: ROUTES.ORDER_MANAGEMENT,
        label: 'Gestión de Órdenes',
        icon: 'ClipboardList',
        permission: 'atencion.gestion-ordenes',
      },
      {
        to: ROUTES.QUOTATIONS,
        label: 'Cotizaciones',
        icon: 'FileText',
        permission: 'atencion.cotizaciones',
      },
    ],
  },
  {
    id: 'catalogos',
    label: 'Catálogos',
    shortLabel: 'Catálogos',
    icon: 'FlaskConical',
    items: [
      {
        to: ROUTES.ANALYSES,
        label: 'Catálogo de Análisis',
        icon: 'FlaskConical',
        permission: 'catalogos.catalogo-analisis',
      },
      {
        to: ROUTES.ANALYSIS_GROUPS,
        label: 'Grupos de Análisis',
        icon: 'Layers',
        permission: 'catalogos.grupos-analisis',
      },
      {
        to: ROUTES.SAMPLES_CATALOG,
        label: 'Tipos de Muestra',
        icon: 'TestTube',
        permission: 'catalogos.tipos-muestra',
      },
      {
        to: ROUTES.METHODS,
        label: 'Métodos',
        icon: 'Microscope',
        permission: 'catalogos.metodos',
      },
      // {
      //   to: ROUTES.COMPONENTS,
      //   label: 'Componentes',
      //   icon: 'Puzzle',
      //   permission: 'catalogos.analisis-componentes',
      // },
    ],
  },
  {
    id: 'cobros',
    label: 'Cobros',
    shortLabel: 'Cobros',
    icon: 'CreditCard',
    items: [
      { to: ROUTES.PAYMENTS, label: 'Pagos', icon: 'CreditCard', permission: 'cobros.pagos' },
      {
        to: ROUTES.TRANSACTION_MANAGEMENT,
        label: 'Historial de Cobros',
        icon: 'Wallet',
        permission: 'cobros.historial-cobros',
      },
    ],
  },
  {
    id: 'caja',
    label: 'Caja',
    shortLabel: 'Caja',
    icon: 'Wallet',
    items: [
      {
        to: ROUTES.OPEN_CASH,
        label: 'Apertura / Cierre',
        icon: 'Wallet',
        permission: 'caja.apertura-cierre',
      },
      {
        to: ROUTES.CASH_MOVEMENTS,
        label: 'Movimientos',
        icon: 'ArrowLeftRight',
        permission: 'caja.movimientos',
      },
      {
        to: ROUTES.CASH_FLOW,
        label: 'Flujo de Caja',
        icon: 'TrendingUp',
        permission: 'caja.flujo-caja',
      },
      {
        to: ROUTES.CASH_AUDIT,
        label: 'Arqueos',
        icon: 'Scale',
        permission: 'caja.arqueos',
      },
      { to: ROUTES.CASHES, label: 'Cajas', icon: 'Landmark', permission: 'caja.cajas' },
      {
        to: ROUTES.CASH_CATEGORIES,
        label: 'Categorías',
        icon: 'Tags',
        permission: 'caja.categorias',
      },
    ],
  },
]

/** Tabs principales — móvil y tablet (< lg) */
export const TAB_BAR_ITEMS = [
  {
    id: 'home',
    to: ROUTES.DASHBOARD,
    label: 'Inicio',
    icon: 'LayoutDashboard',
    end: true,
    permission: 'inicio.dashboard',
  },
  {
    id: 'clinical',
    to: ROUTES.ORDER_MANAGEMENT,
    label: 'Atención',
    icon: 'ClipboardList',
    prefixes: ['/atencion', '/recepcion', '/clinico'],
    permission: 'atencion.gestion-ordenes',
  },
  {
    id: 'cash',
    to: ROUTES.OPEN_CASH,
    label: 'Caja',
    icon: 'Wallet',
    prefixes: ['/caja'],
    permission: 'caja.apertura-cierre',
  },
  {
    id: 'patients',
    to: ROUTES.PATIENTS,
    label: 'Pacientes',
    icon: 'UserCircle',
    prefixes: ['/clinica/pacientes', '/parametros/pacientes', '/recepcion/pacientes'],
    permission: 'gestion-clinica.pacientes',
  },
  {
    id: 'more',
    label: 'Más',
    icon: 'LayoutGrid',
    isMore: true,
  },
]

export function isTabBarItemActive(pathname, item) {
  if (item.isMore) {
    const primaryTabs = TAB_BAR_ITEMS.filter((t) => !t.isMore)
    return !primaryTabs.some((t) => isTabBarItemActive(pathname, t))
  }
  if (item.end) return pathname === item.to
  if (item.prefixes?.length) {
    return item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Estado financiero de la orden (`status`) */
export const ORDER_PAYMENT_STATUS = {
  1: { label: 'Pendiente', color: 'amber' },
  2: { label: 'Anulado', color: 'red' },
  3: { label: 'Pagado', color: 'emerald' },
}

/** @deprecated Prefer ORDER_PAYMENT_STATUS para `status` financiero */
export const ORDER_STATUS = ORDER_PAYMENT_STATUS

export const ORDER_WORKFLOW_STATUS = {
  1: { label: 'Pendiente', color: 'amber' },
  2: { label: 'En proceso', color: 'blue' },
  3: { label: 'En revisión', color: 'indigo' },
  4: { label: 'Revisada', color: 'blue' },
  5: { label: 'Completada', color: 'emerald' },
  6: { label: 'Anulada', color: 'red' },
}
