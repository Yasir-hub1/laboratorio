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
  LOGIN: '/login',
  SELECT_ACCESS: '/select-access',
  SELECT_CASH: '/select-cash',
  DASHBOARD: '/',
  // Parámetros
  INSURANCES: '/parametros/seguros',
  INSURANCE_CATALOG_PRICES: '/parametros/seguros/precios-catalogo',
  INSURANCE_PRICES: '/parametros/seguros/:id/precios',
  STAFF: '/parametros/personal',
  DOCTORS: '/parametros/medicos',
  SPECIALTIES: '/parametros/especialidades',
  PATIENTS: '/parametros/pacientes',
  USERS: '/parametros/usuarios',
  BRANCHES: '/parametros/sucursales',
  // Análisis
  ANALYSES: '/analisis/catalogo',
  ANALYSIS_SUBGROUPS: '/analisis/catalogo/:analysisId/subgrupos',
  ANALYSIS_GROUPS: '/analisis/grupos',
  SAMPLES_CATALOG: '/analisis/muestras',
  METHODS: '/analisis/metodos',
  COMPONENTS: '/analisis/componentes',
  // Caja
  CASHES: '/caja/cajas',
  CASH_FLOW: '/caja/flujo',
  OPEN_CASH: '/caja/apertura',
  INFLOWS: '/caja/ingresos',
  OUTFLOWS: '/caja/egresos',
  TYPE_INFLOWS: '/caja/tipos-ingreso',
  TYPE_OUTFLOWS: '/caja/tipos-egreso',
  // Clínico
  QUOTATIONS: '/clinico/cotizaciones',
  ORDERS: '/clinico/ordenes',
  ORDER_DETAIL: '/clinico/ordenes/:id',
  SAMPLE_RECEPTION: '/clinico/muestras',
  RESULTS: '/clinico/resultados',
  // Transacciones
  PAYMENTS: '/transacciones/pagos',
  // Portal paciente
  PATIENT_LOGIN: '/portal/login',
  PATIENT_PORTAL: '/portal',
  NOT_FOUND: '*',
}

export const NAV_GROUPS = [
  {
    id: 'principal',
    label: 'Principal',
    shortLabel: 'Principal',
    icon: 'LayoutDashboard',
    items: [{ to: ROUTES.DASHBOARD, label: 'Dashboard', icon: 'LayoutDashboard' }],
  },
  {
    id: 'parametros',
    label: 'Parámetros',
    shortLabel: 'Parámetros',
    icon: 'Settings2',
    items: [
      { to: ROUTES.INSURANCES, label: 'Seguros', icon: 'Shield' },
      { to: ROUTES.STAFF, label: 'Personal', icon: 'Users' },
      { to: ROUTES.DOCTORS, label: 'Médicos', icon: 'Stethoscope' },
      { to: ROUTES.SPECIALTIES, label: 'Especialidades', icon: 'GraduationCap' },
      { to: ROUTES.PATIENTS, label: 'Pacientes', icon: 'UserCircle' },
      { to: ROUTES.USERS, label: 'Usuarios', icon: 'UserCog' },
      { to: ROUTES.BRANCHES, label: 'Sucursales', icon: 'Building2' },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    shortLabel: 'Análisis',
    icon: 'FlaskConical',
    items: [
      { to: ROUTES.ANALYSES, label: 'Catálogo análisis', icon: 'FlaskConical' },
      { to: ROUTES.ANALYSIS_GROUPS, label: 'Grupos', icon: 'Layers' },
      { to: ROUTES.SAMPLES_CATALOG, label: 'Tipos muestra', icon: 'TestTube' },
      { to: ROUTES.METHODS, label: 'Métodos', icon: 'Microscope' },
      // { to: ROUTES.COMPONENTS, label: 'Componentes', icon: 'Puzzle' },
    ],
  },
  {
    label: 'Caja',
    items: [
      { to: ROUTES.CASHES, label: 'Cajas', icon: 'Landmark' },
      { to: ROUTES.OPEN_CASH, label: 'Apertura / Cierre', icon: 'Wallet' },
      { to: ROUTES.CASH_FLOW, label: 'Flujo de caja', icon: 'TrendingUp' },
      { to: ROUTES.INFLOWS, label: 'Ingresos', icon: 'ArrowDownLeft' },
      { to: ROUTES.OUTFLOWS, label: 'Egresos', icon: 'ArrowUpRight' },
      { to: ROUTES.TYPE_INFLOWS, label: 'Tipos ingreso', icon: 'Tags' },
      { to: ROUTES.TYPE_OUTFLOWS, label: 'Tipos egreso', icon: 'Tags' },
    ],
  },
  {
    id: 'clinico',
    label: 'Clínico',
    shortLabel: 'Clínico',
    icon: 'ClipboardList',
    items: [
      { to: ROUTES.QUOTATIONS, label: 'Cotizaciones', icon: 'FileText' },
      { to: ROUTES.ORDERS, label: 'Órdenes', icon: 'ClipboardList' },
      { to: ROUTES.SAMPLE_RECEPTION, label: 'Toma de muestras', icon: 'Syringe' },
      { to: ROUTES.RESULTS, label: 'Resultados', icon: 'Activity' },
    ],
  },
  {
    id: 'transacciones',
    label: 'Transacciones',
    shortLabel: 'Transacciones',
    icon: 'CreditCard',
    items: [{ to: ROUTES.PAYMENTS, label: 'Pagos', icon: 'CreditCard' }],
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
    to: ROUTES.ORDERS,
    label: 'Clínico',
    icon: 'ClipboardList',
    prefixes: ['/clinico'],
  },
  {
    id: 'cash',
    to: ROUTES.CASH_FLOW,
    label: 'Caja',
    icon: 'Wallet',
    prefixes: ['/caja'],
  },
  {
    id: 'patients',
    to: ROUTES.PATIENTS,
    label: 'Pacientes',
    icon: 'UserCircle',
    prefixes: ['/parametros/pacientes'],
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
