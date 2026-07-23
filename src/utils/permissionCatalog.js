/**
 * Catálogo de permisos con etiquetas legibles para la matriz de roles.
 * Nunca mostrar el string técnico al usuario final.
 */

const ACTION_LABELS = {
  listar: 'Listar',
  crear: 'Crear',
  ver: 'Ver',
  editar: 'Editar',
  actualizar: 'Actualizar',
  desactivar: 'Desactivar',
  eliminar: 'Eliminar',
  anular: 'Anular',
  confirmar: 'Confirmar',
  'asignar-precios': 'Asignar precios',
  'exportar-pdf': 'Exportar PDF',
  'cambiar-caja': 'Cambiar caja',
  'abrir-caja': 'Abrir caja',
  'cerrar-caja': 'Cerrar caja',
  'ver-movimientos': 'Ver movimientos',
  'continuar-sesion': 'Continuar sesión',
  ingresar: 'Ingresar',
  egresar: 'Egresar',
  'asignar-roles': 'Asignar roles',
  'asignar-sucursales': 'Asignar sucursales',
  'asignar-cajas': 'Asignar cajas',
  'asignar-permisos': 'Asignar permisos',
  'gestionar-pendientes': 'Gestionar pendientes',
  'gestionar-en-proceso': 'Gestionar en proceso',
  'gestionar-en-revision': 'Gestionar en revisión',
  'gestionar-revisadas': 'Gestionar revisadas',
  'gestionar-completadas': 'Gestionar completadas',
  'gestionar-anuladas': 'Gestionar anuladas',
  exportar: 'Exportar',
}

const MODULE_LABELS = {
  inicio: 'Inicio',
  empresa: 'Empresa',
  'gestion-clinica': 'Gestión clínica',
  atencion: 'Atención',
  catalogos: 'Catálogos',
  cobros: 'Cobros',
  caja: 'Caja',
  reportes: 'Reportes',
}

const MENU_LABELS = {
  dashboard: 'Dashboard',
  usuarios: 'Usuarios',
  roles: 'Roles',
  sucursales: 'Sucursales',
  pacientes: 'Pacientes',
  medicos: 'Médicos',
  personal: 'Personal',
  especialidades: 'Especialidades',
  seguros: 'Seguros',
  'precios-particulares': 'Precios particulares',
  'nueva-orden': 'Nueva orden',
  'gestion-ordenes': 'Gestión de órdenes',
  cotizaciones: 'Cotizaciones',
  'catalogo-analisis': 'Catálogo de análisis',
  'analisis-subgrupos': 'Subgrupos de análisis',
  'analisis-componentes': 'Componentes',
  'grupos-analisis': 'Grupos de análisis',
  'tipos-muestra': 'Tipos de muestra',
  metodos: 'Métodos',
  pagos: 'Pagos',
  'historial-cobros': 'Historial de cobros',
  'apertura-cierre': 'Apertura / Cierre',
  movimientos: 'Movimientos',
  'flujo-caja': 'Flujo de caja',
  arqueos: 'Arqueos',
  cajas: 'Cajas',
  categorias: 'Categorías',
  bitacora: 'Bitácora',
  ordenes: 'Órdenes',
}

const MODULE_ORDER = [
  'inicio',
  'empresa',
  'gestion-clinica',
  'atencion',
  'catalogos',
  'cobros',
  'caja',
  'reportes',
]

/** Alias públicos para etiquetas (Roles → Permisos) */
export const PERMISSION_MODULE_LABELS = MODULE_LABELS
export const PERMISSION_MENU_LABELS = MENU_LABELS
export const PERMISSION_ACTION_LABELS = ACTION_LABELS

/** Lista plana de permisos Spatie (fallback si GET /permissions falla) */
export const PERMISSION_CATALOG = [
  'inicio.dashboard.listar',
  'empresa.usuarios.listar',
  'empresa.usuarios.crear',
  'empresa.usuarios.ver',
  'empresa.usuarios.editar',
  'empresa.usuarios.desactivar',
  'empresa.usuarios.asignar-roles',
  'empresa.usuarios.asignar-sucursales',
  'empresa.usuarios.asignar-cajas',
  'empresa.usuarios.eliminar',
  'empresa.roles.listar',
  'empresa.roles.crear',
  'empresa.roles.ver',
  'empresa.roles.editar',
  'empresa.roles.desactivar',
  'empresa.roles.asignar-permisos',
  'empresa.roles.eliminar',
  'empresa.sucursales.listar',
  'empresa.sucursales.crear',
  'empresa.sucursales.ver',
  'empresa.sucursales.editar',
  'empresa.sucursales.desactivar',
  'empresa.sucursales.eliminar',
  'gestion-clinica.pacientes.listar',
  'gestion-clinica.pacientes.crear',
  'gestion-clinica.pacientes.ver',
  'gestion-clinica.pacientes.editar',
  'gestion-clinica.pacientes.desactivar',
  'gestion-clinica.pacientes.eliminar',
  'gestion-clinica.medicos.listar',
  'gestion-clinica.medicos.crear',
  'gestion-clinica.medicos.ver',
  'gestion-clinica.medicos.editar',
  'gestion-clinica.medicos.desactivar',
  'gestion-clinica.medicos.eliminar',
  'gestion-clinica.personal.listar',
  'gestion-clinica.personal.crear',
  'gestion-clinica.personal.ver',
  'gestion-clinica.personal.editar',
  'gestion-clinica.personal.desactivar',
  'gestion-clinica.personal.eliminar',
  'gestion-clinica.especialidades.listar',
  'gestion-clinica.especialidades.crear',
  'gestion-clinica.especialidades.ver',
  'gestion-clinica.especialidades.editar',
  'gestion-clinica.especialidades.desactivar',
  'gestion-clinica.especialidades.eliminar',
  'gestion-clinica.seguros.listar',
  'gestion-clinica.seguros.crear',
  'gestion-clinica.seguros.ver',
  'gestion-clinica.seguros.editar',
  'gestion-clinica.seguros.desactivar',
  'gestion-clinica.seguros.asignar-precios',
  'gestion-clinica.seguros.eliminar',
  'gestion-clinica.precios-particulares.listar',
  'gestion-clinica.precios-particulares.ver',
  'gestion-clinica.precios-particulares.editar',
  'atencion.nueva-orden.listar',
  'atencion.nueva-orden.crear',
  'atencion.gestion-ordenes.listar',
  'atencion.gestion-ordenes.ver',
  'atencion.gestion-ordenes.gestionar-pendientes',
  'atencion.gestion-ordenes.gestionar-en-proceso',
  'atencion.gestion-ordenes.gestionar-en-revision',
  'atencion.gestion-ordenes.gestionar-revisadas',
  'atencion.gestion-ordenes.gestionar-completadas',
  'atencion.gestion-ordenes.gestionar-anuladas',
  'atencion.gestion-ordenes.anular',
  'atencion.gestion-ordenes.exportar-pdf',
  'atencion.cotizaciones.listar',
  'atencion.cotizaciones.crear',
  'atencion.cotizaciones.ver',
  'atencion.cotizaciones.eliminar',
  'catalogos.catalogo-analisis.listar',
  'catalogos.catalogo-analisis.crear',
  'catalogos.catalogo-analisis.ver',
  'catalogos.catalogo-analisis.editar',
  'catalogos.catalogo-analisis.eliminar',
  'catalogos.analisis-subgrupos.listar',
  'catalogos.analisis-subgrupos.crear',
  'catalogos.analisis-subgrupos.ver',
  'catalogos.analisis-subgrupos.editar',
  'catalogos.analisis-subgrupos.desactivar',
  'catalogos.analisis-subgrupos.eliminar',
  'catalogos.analisis-componentes.listar',
  'catalogos.analisis-componentes.crear',
  'catalogos.analisis-componentes.editar',
  'catalogos.analisis-componentes.eliminar',
  'catalogos.grupos-analisis.listar',
  'catalogos.grupos-analisis.crear',
  'catalogos.grupos-analisis.ver',
  'catalogos.grupos-analisis.editar',
  'catalogos.grupos-analisis.desactivar',
  'catalogos.grupos-analisis.eliminar',
  'catalogos.tipos-muestra.listar',
  'catalogos.tipos-muestra.crear',
  'catalogos.tipos-muestra.editar',
  'catalogos.tipos-muestra.eliminar',
  'catalogos.metodos.listar',
  'catalogos.metodos.crear',
  'catalogos.metodos.ver',
  'catalogos.metodos.editar',
  'catalogos.metodos.eliminar',
  'cobros.pagos.listar',
  'cobros.pagos.actualizar',
  'cobros.pagos.ver',
  'cobros.pagos.exportar-pdf',
  'cobros.historial-cobros.listar',
  'cobros.historial-cobros.ver',
  'caja.apertura-cierre.listar',
  'caja.apertura-cierre.cambiar-caja',
  'caja.apertura-cierre.abrir-caja',
  'caja.apertura-cierre.cerrar-caja',
  'caja.apertura-cierre.ver-movimientos',
  'caja.apertura-cierre.continuar-sesion',
  'caja.apertura-cierre.exportar',
  'caja.movimientos.listar',
  'caja.movimientos.ingresar',
  'caja.movimientos.egresar',
  'caja.movimientos.anular',
  'caja.flujo-caja.listar',
  'caja.flujo-caja.ver',
  'caja.arqueos.listar',
  'caja.arqueos.crear',
  'caja.arqueos.ver',
  'caja.arqueos.exportar',
  'caja.cajas.listar',
  'caja.cajas.crear',
  'caja.cajas.editar',
  'caja.cajas.eliminar',
  'caja.categorias.listar',
  'caja.categorias.crear',
  'caja.categorias.editar',
  'caja.categorias.eliminar',
  'reportes.bitacora.listar',
  'reportes.bitacora.ver',
  'reportes.bitacora.exportar',
  'reportes.movimientos.listar',
  'reportes.movimientos.ver',
  'reportes.movimientos.exportar',
  'reportes.ordenes.listar',
  'reportes.ordenes.exportar',
]

export function parsePermissionName(name) {
  const [module, menu, ...actionParts] = String(name).split('.')
  const action = actionParts.join('.')
  return { module, menu, action, name }
}

export function permissionLabel(name) {
  const { module, menu, action } = parsePermissionName(name)
  return {
    module: MODULE_LABELS[module] ?? module,
    menu: MENU_LABELS[menu] ?? menu,
    action: ACTION_LABELS[action] ?? action,
  }
}

/** Agrupa permisos por módulo → menú para la matriz UI */
export function groupPermissionsForMatrix(permissionNames = PERMISSION_CATALOG) {
  const modules = new Map()

  for (const name of permissionNames) {
    const parsed = parsePermissionName(name)
    const labels = permissionLabel(name)
    if (!modules.has(parsed.module)) {
      modules.set(parsed.module, {
        key: parsed.module,
        label: labels.module,
        menus: new Map(),
      })
    }
    const mod = modules.get(parsed.module)
    if (!mod.menus.has(parsed.menu)) {
      mod.menus.set(parsed.menu, {
        key: parsed.menu,
        label: labels.menu,
        permissions: [],
      })
    }
    mod.menus.get(parsed.menu).permissions.push({
      name,
      action: parsed.action,
      label: labels.action,
    })
  }

  const orderedKeys = [
    ...MODULE_ORDER.filter((key) => modules.has(key)),
    ...Array.from(modules.keys()).filter((key) => !MODULE_ORDER.includes(key)),
  ]

  return orderedKeys.map((key) => {
    const mod = modules.get(key)
    return {
      key: mod.key,
      label: mod.label,
      menus: Array.from(mod.menus.values()),
    }
  })
}

/** Rol protegido del sistema (antes Administrador). */
export function isSuperAdminRole(role) {
  const name = String(role?.name ?? role?.label ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return name === 'superadmin' || name === 'super-admin'
}

/** @deprecated Preferir isSuperAdminRole */
export function isAdministratorRole(role) {
  return isSuperAdminRole(role)
}
