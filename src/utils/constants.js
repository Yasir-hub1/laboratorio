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
  /** Superficies glass (app interior) */
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
  QUOTATIONS: '/atencion/cotizaciones',
  ORDER_MANAGEMENT: '/atencion/gestionar-orden',
  ORDER_DETAIL: '/atencion/gestionar-orden/:id',
  /** @deprecated → PATIENTS */
  RECEPTION_PATIENTS: '/clinica/pacientes',
  /** @deprecated → ORDER_MANAGEMENT */
  ORDERS: '/atencion/gestionar-orden',
  /** @deprecated rutas /clinico/* /laboratorio/* /recepcion/* redirigen aquí */
  LAB_SAMPLE_RECEPTION: '/atencion/gestionar-orden',
  LAB_RESULTS_ENTRY: '/atencion/gestionar-orden',
  LAB_RESULTS_VALIDATION: '/atencion/gestionar-orden',
  LAB_ORDER_CLOSURE: '/atencion/gestionar-orden',
  LAB_ORDERS_COMPLETED: '/atencion/gestionar-orden',
  LAB_ORDERS_ANNULLED: '/atencion/gestionar-orden',
  SAMPLE_RECEPTION: '/atencion/gestionar-orden',
  RESULTS: '/atencion/gestionar-orden',
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
  CASHES: '/caja/cajas',
  CASH_FLOW: '/caja/flujo',
  OPEN_CASH: '/caja/apertura',
  CASH_MOVEMENTS: '/caja/movimientos',
  CASH_AUDIT: '/caja/arqueo',
  CASH_CATEGORIES: '/caja/categorias',
  /** @deprecated → CASH_MOVEMENTS */
  INFLOWS: '/caja/movimientos',
  /** @deprecated → CASH_MOVEMENTS */
  OUTFLOWS: '/caja/movimientos',
  /** @deprecated → CASH_CATEGORIES */
  TYPE_INFLOWS: '/caja/categorias',
  /** @deprecated → CASH_CATEGORIES */
  TYPE_OUTFLOWS: '/caja/categorias',
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

/** Sidebar staff — rutas alineadas a módulos del menú */
export const NAV_GROUPS = [
  {
    id: 'inicio',
    label: 'Inicio',
    shortLabel: 'Inicio',
    icon: 'Home',
    items: [{ to: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' }],
  },
  {
    id: 'empresa',
    label: 'Empresa',
    shortLabel: 'Empresa',
    icon: 'Building2',
    items: [
      { to: ROUTES.USERS, label: 'Usuarios', icon: 'UserCog' },
      { to: ROUTES.BRANCHES, label: 'Sucursales', icon: 'Building2' },
    ],
  },
  {
    id: 'gestion-clinica',
    label: 'Gestión clínica',
    shortLabel: 'Clínica',
    icon: 'Users',
    items: [
      { to: ROUTES.PATIENTS, label: 'Pacientes', icon: 'UserCircle' },
      { to: ROUTES.DOCTORS, label: 'Médicos', icon: 'Stethoscope' },
      { to: ROUTES.STAFF, label: 'Personal', icon: 'UsersRound' },
      { to: ROUTES.SPECIALTIES, label: 'Especialidades', icon: 'GraduationCap' },
      { to: ROUTES.INSURANCES, label: 'Seguros', icon: 'Shield' },
    ],
  },
  {
    id: 'atencion',
    label: 'Atención',
    shortLabel: 'Atención',
    icon: 'ClipboardList',
    items: [
      { to: ROUTES.ORDER_RECEPTION, label: 'Nueva Orden', icon: 'ClipboardPlus' },
      { to: ROUTES.ORDER_MANAGEMENT, label: 'Gestión de Órdenes', icon: 'ClipboardList' },
      { to: ROUTES.QUOTATIONS, label: 'Cotizaciones', icon: 'FileText' },
    ],
  },
  {
    id: 'catalogos',
    label: 'Catálogos',
    shortLabel: 'Catálogos',
    icon: 'FlaskConical',
    items: [
      { to: ROUTES.ANALYSES, label: 'Catálogo de Análisis', icon: 'FlaskConical' },
      { to: ROUTES.ANALYSIS_GROUPS, label: 'Grupos de Análisis', icon: 'Layers' },
      { to: ROUTES.SAMPLES_CATALOG, label: 'Tipos de Muestra', icon: 'TestTube' },
      { to: ROUTES.METHODS, label: 'Métodos', icon: 'Microscope' },
    ],
  },
  {
    id: 'cobros',
    label: 'Cobros',
    shortLabel: 'Cobros',
    icon: 'CreditCard',
    items: [
      { to: ROUTES.PAYMENTS, label: 'Pagos', icon: 'CreditCard' },
      { to: ROUTES.TRANSACTION_MANAGEMENT, label: 'Historial de Cobros', icon: 'Receipt' },
    ],
  },
  {
    id: 'caja',
    label: 'Caja',
    shortLabel: 'Caja',
    icon: 'Wallet',
    items: [
      { to: ROUTES.OPEN_CASH, label: 'Apertura/Cierre', icon: 'Wallet' },
      { to: ROUTES.CASH_MOVEMENTS, label: 'Movimientos', icon: 'ArrowLeftRight' },
      { to: ROUTES.CASH_FLOW, label: 'Flujo de Caja', icon: 'TrendingUp' },
      { to: ROUTES.CASH_AUDIT, label: 'Arqueos', icon: 'Scale' },
      { to: ROUTES.CASHES, label: 'Cajas', icon: 'Landmark' },
      { to: ROUTES.CASH_CATEGORIES, label: 'Categorías', icon: 'Tags' },
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
  },
  {
    id: 'clinical',
    to: ROUTES.ORDER_MANAGEMENT,
    label: 'Atención',
    icon: 'ClipboardList',
    prefixes: ['/atencion', '/recepcion', '/clinico'],
  },
  {
    id: 'cash',
    to: ROUTES.OPEN_CASH,
    label: 'Caja',
    icon: 'Wallet',
    prefixes: ['/caja'],
  },
  {
    id: 'patients',
    to: ROUTES.PATIENTS,
    label: 'Pacientes',
    icon: 'UserCircle',
    prefixes: ['/clinica/pacientes', '/parametros/pacientes', '/recepcion/pacientes'],
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

export const ORDER_STATUS = {
  0: { label: 'Registrada', color: 'amber' },
  1: { label: 'Muestra tomada', color: 'blue' },
  2: { label: 'En proceso', color: 'indigo' },
  3: { label: 'Completada', color: 'emerald' },
  4: { label: 'Anulada', color: 'red' },
}

export const ORDER_WORKFLOW_STATUS = {
  1: { label: 'Pendiente', color: 'amber' },
  2: { label: 'Iniciada', color: 'blue' },
  3: { label: 'En revisión', color: 'indigo' },
  4: { label: 'Revisada', color: 'blue' },
  5: { label: 'Completada', color: 'emerald' },
  6: { label: 'Anulada', color: 'red' },
}

export const ORDER_PAYMENT_STATUS = {
  1: { label: 'Pendiente', color: 'amber' },
  2: { label: 'Anulado', color: 'red' },
  3: { label: 'Pagado', color: 'emerald' },
}
