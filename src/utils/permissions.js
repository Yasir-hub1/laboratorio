import { NAV_GROUPS } from '@/utils/constants'

/** ¿Tiene el permiso exacto? */
export function can(permissions, name) {
  if (!name) return true
  if (!Array.isArray(permissions) || permissions.length === 0) return false
  return permissions.includes(name)
}

/** ¿Tiene alguno de la lista? */
export function canAny(permissions, names = []) {
  if (!names?.length) return true
  return names.some((name) => can(permissions, name))
}

/** ¿Puede ver el menú? → prefix + '.listar' */
export function canMenu(permissions, prefix) {
  if (!prefix) return true
  return can(permissions, `${prefix}.listar`)
}

/** ¿Tiene algún permiso del módulo (primer segmento)? */
export function canModule(permissions, moduleName) {
  if (!moduleName) return true
  if (!Array.isArray(permissions)) return false
  const head = `${moduleName}.`
  return permissions.some((p) => typeof p === 'string' && p.startsWith(head))
}

/** Filtra NAV_GROUPS: ítems sin *.listar y grupos vacíos */
export function filterNavGroups(groups = NAV_GROUPS, permissions = []) {
  return groups
    .map((group) => ({
      ...group,
      items: (group.items ?? []).filter((item) => canMenu(permissions, item.permission)),
    }))
    .filter((group) => (group.items?.length ?? 0) > 0)
}

export function crudPermissionFlags(permissions, prefix) {
  if (!prefix) {
    return {
      canList: true,
      canCreate: true,
      canView: true,
      canEdit: true,
      canDeactivate: true,
      canDelete: true,
      can: () => true,
    }
  }
  const p = (action) => can(permissions, `${prefix}.${action}`)
  return {
    canList: p('listar'),
    canCreate: p('crear'),
    canView: p('ver'),
    canEdit: p('editar'),
    canDeactivate: p('desactivar'),
    canDelete: p('eliminar'),
    can: p,
  }
}

/** Colas de órdenes → permiso gestionar-* */
export const ORDER_QUEUE_PERMISSIONS = {
  1: 'atencion.gestion-ordenes.gestionar-pendientes',
  2: 'atencion.gestion-ordenes.gestionar-en-proceso',
  3: 'atencion.gestion-ordenes.gestionar-en-revision',
  4: 'atencion.gestion-ordenes.gestionar-revisadas',
  5: 'atencion.gestion-ordenes.gestionar-completadas',
  6: 'atencion.gestion-ordenes.gestionar-anuladas',
}

export function canManageOrderQueue(permissions, workflowStatus) {
  const name = ORDER_QUEUE_PERMISSIONS[Number(workflowStatus)]
  return name ? can(permissions, name) : false
}
