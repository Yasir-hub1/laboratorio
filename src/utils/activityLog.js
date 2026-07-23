/**
 * Catálogo y helpers de Bitácora (activity log Spatie).
 * Alineado con ActivityLogCatalog del backend.
 */

export const ACTIVITY_LOG_MODULES = [
  { id: 'auth', label: 'Sesión / Auth', log_names: ['auth'] },
  {
    id: 'empresa',
    label: 'Empresa',
    log_names: [
      'user',
      'role',
      'permission',
      'branch',
      'branch_user',
      'company',
      'configuration',
    ],
  },
  {
    id: 'gestion-clinica',
    label: 'Gestión clínica',
    log_names: [
      'person',
      'patient',
      'specialty',
      'person_specialty',
      'insurance',
      'position',
    ],
  },
  {
    id: 'atencion',
    label: 'Atención',
    log_names: [
      'laboratory_order',
      'laboratory_order_detail',
      'laboratory_sample',
      'quotation_order',
      'quotation_detail',
      'component_result',
    ],
  },
  {
    id: 'catalogos',
    label: 'Catálogos',
    log_names: [
      'laboratory_analysis',
      'analysis_group',
      'analysis_subgroup',
      'component_analysis',
      'sample',
      'sample_analysis',
      'method',
      'analysis_price',
      'analysis_insurance',
    ],
  },
  {
    id: 'cobros',
    label: 'Cobros',
    log_names: ['payment', 'payment_method'],
  },
  {
    id: 'caja',
    label: 'Caja',
    log_names: [
      'cash',
      'opening_cash',
      'cash_inflows',
      'cash_outflows',
      'type_inflow',
      'type_outflow',
    ],
  },
]

export const ACTIVITY_EVENT_LABELS = {
  created: 'Creación',
  updated: 'Actualización',
  deleted: 'Eliminación',
  restored: 'Restauración',
  login: 'Inicio de sesión',
  login_failed: 'Login fallido',
  logout: 'Cierre de sesión',
  select_access: 'Selección de acceso',
  select_cash: 'Selección de caja',
}

export const ACTIVITY_LOG_NAME_LABELS = {
  auth: 'Sesión',
  user: 'Usuario',
  role: 'Rol',
  permission: 'Permiso',
  branch: 'Sucursal',
  branch_user: 'Usuario–sucursal',
  company: 'Empresa',
  configuration: 'Configuración',
  person: 'Persona',
  patient: 'Paciente',
  specialty: 'Especialidad',
  person_specialty: 'Especialidad de persona',
  insurance: 'Seguro',
  position: 'Cargo',
  laboratory_order: 'Orden',
  laboratory_order_detail: 'Detalle de orden',
  laboratory_sample: 'Muestra de orden',
  quotation_order: 'Cotización',
  quotation_detail: 'Detalle de cotización',
  component_result: 'Resultado de componente',
  laboratory_analysis: 'Análisis',
  analysis_group: 'Grupo de análisis',
  analysis_subgroup: 'Subgrupo',
  component_analysis: 'Componente',
  sample: 'Tipo de muestra',
  sample_analysis: 'Muestra–análisis',
  method: 'Método',
  analysis_price: 'Precio de análisis',
  analysis_insurance: 'Precio por seguro',
  payment: 'Pago',
  payment_method: 'Método de pago',
  cash: 'Caja',
  opening_cash: 'Apertura de caja',
  cash_inflows: 'Ingreso de caja',
  cash_outflows: 'Egreso de caja',
  type_inflow: 'Tipo de ingreso',
  type_outflow: 'Tipo de egreso',
}

export function activityEventLabel(event, fallbackLabel) {
  if (fallbackLabel) return fallbackLabel
  if (!event) return '—'
  return ACTIVITY_EVENT_LABELS[event] ?? String(event)
}

export function activityLogNameLabel(logName) {
  if (!logName) return '—'
  return ACTIVITY_LOG_NAME_LABELS[logName] ?? String(logName)
}

export function activityModuleLabel(moduleId, fallbackLabel) {
  if (fallbackLabel) return fallbackLabel
  if (!moduleId) return '—'
  const found = ACTIVITY_LOG_MODULES.find((m) => m.id === moduleId)
  return found?.label ?? String(moduleId)
}

export function logNamesForModule(moduleId) {
  if (!moduleId) {
    return ACTIVITY_LOG_MODULES.flatMap((m) => m.log_names)
  }
  const found = ACTIVITY_LOG_MODULES.find((m) => m.id === moduleId)
  return found?.log_names ?? []
}

export function activityEventBadgeVariant(event) {
  const e = String(event ?? '').toLowerCase()
  if (e === 'created' || e === 'login' || e === 'restored') return 'success'
  if (e === 'updated' || e === 'select_access' || e === 'select_cash') return 'info'
  if (e === 'deleted' || e === 'login_failed' || e === 'logout') return 'danger'
  return 'default'
}

const SENSITIVE_PROPERTY_KEYS = /password|token|secret|authorization/i

function sanitizeProperties(value) {
  if (Array.isArray(value)) return value.map(sanitizeProperties)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_PROPERTY_KEYS.test(key) ? '[oculto]' : sanitizeProperties(val)
    }
    return out
  }
  return value
}

export function formatActivityProperties(properties) {
  if (properties == null || properties === '') return '—'
  try {
    const cleaned = sanitizeProperties(properties)
    return JSON.stringify(cleaned, null, 2)
  } catch {
    return String(properties)
  }
}

/** Clase corta del subject_type Spatie */
export function shortSubjectType(subjectType) {
  if (!subjectType) return null
  const parts = String(subjectType).split('\\')
  return parts[parts.length - 1] || subjectType
}

export function activitySubjectLabel(row) {
  if (row?.is_group) {
    const steps = Array.isArray(row.events) ? row.events.length : row.properties?.steps
    if (steps != null) return `${steps} paso${Number(steps) === 1 ? '' : 's'}`
    return 'Transacción'
  }
  const type = shortSubjectType(row?.subject_type)
  const id = row?.subject_id
  if (type && id) return `${type} · ${id}`
  if (type) return type
  if (id) return String(id)
  return '—'
}

/**
 * Une módulos locales con meta.modules del API (no oculta valores nuevos).
 */
export function mergeActivityModules(metaModules) {
  const byId = new Map(ACTIVITY_LOG_MODULES.map((m) => [m.id, { ...m }]))
  for (const m of metaModules ?? []) {
    const id = m?.id
    if (!id) continue
    const existing = byId.get(id)
    if (existing) {
      const names = new Set([...(existing.log_names ?? []), ...(m.log_names ?? [])])
      byId.set(id, {
        id,
        label: m.label || existing.label,
        log_names: Array.from(names),
      })
    } else {
      byId.set(id, {
        id,
        label: m.label ?? id,
        log_names: Array.isArray(m.log_names) ? m.log_names : [],
      })
    }
  }
  return Array.from(byId.values())
}

export function mergeActivityEvents(metaEvents) {
  const set = new Set([
    ...Object.keys(ACTIVITY_EVENT_LABELS),
    ...(Array.isArray(metaEvents) ? metaEvents : []),
  ])
  return Array.from(set).sort()
}

export function mergeLogNames(modules, metaLogNames) {
  const set = new Set([
    ...modules.flatMap((m) => m.log_names ?? []),
    ...(Array.isArray(metaLogNames) ? metaLogNames : []),
  ])
  return Array.from(set).sort()
}
