import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { laboratoryApi } from '@/services/laboratoryApi'
import { usePermission } from '@/hooks/usePermission'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card } from '@/components/ui'
import { ROUTES } from '@/utils/constants'
import { unwrapList } from '@/utils/apiHelpers'
import { cn } from '@/utils/cn'
import {
  PERMISSION_CATALOG,
  groupPermissionsForMatrix,
  isAdministratorRole,
  permissionLabel,
} from '@/utils/permissionCatalog'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

function extractPermissionNames(items = []) {
  return items
    .map((item) => {
      if (typeof item === 'string') return item
      return item?.name ?? item?.permission ?? null
    })
    .filter(Boolean)
}

function rolePermissionNames(role) {
  if (!role) return []
  const raw = role.permissions ?? role.permission_names ?? []
  return extractPermissionNames(Array.isArray(raw) ? raw : [])
}

export function RolePermissionsPage() {
  const { id } = useParams()
  const { can } = usePermission()
  const canAssign = can('empresa.roles.asignar-permisos')

  const [role, setRole] = useState(null)
  const [catalogNames, setCatalogNames] = useState(PERMISSION_CATALOG)
  const [selected, setSelected] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [roleData, permissionsRaw] = await Promise.all([
        laboratoryApi.getRole(id),
        laboratoryApi.getPermissions({ paginate: false }).catch(() => null),
      ])

      setRole(roleData)

      const apiNames = extractPermissionNames(unwrapList(permissionsRaw).items)
      setCatalogNames(apiNames.length > 0 ? apiNames : PERMISSION_CATALOG)
      setSelected(new Set(rolePermissionNames(roleData)))
    } catch (err) {
      toastApiError(err)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const matrix = useMemo(() => groupPermissionsForMatrix(catalogNames), [catalogNames])
  const isAdmin = isAdministratorRole(role)
  const readOnly = isAdmin || !canAssign

  const toggleOne = (name) => {
    if (readOnly) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const setMany = (names, checked) => {
    if (readOnly) return
    setSelected((prev) => {
      const next = new Set(prev)
      names.forEach((name) => {
        if (checked) next.add(name)
        else next.delete(name)
      })
      return next
    })
  }

  const handleSave = async () => {
    if (readOnly || !id) return
    setSaving(true)
    try {
      await laboratoryApi.syncRolePermissions(id, {
        permissions: Array.from(selected),
      })
      toastApiSuccess('Permisos actualizados')
      await load()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSaving(false)
    }
  }

  if (!canAssign) {
    return <Navigate to={ROUTES.ROLES} replace />
  }

  if (loading) return <LoadingScreen />

  if (!role) {
    return (
      <AnimatedPage>
        <PageHeader
          title="Permisos del rol"
          actions={
            <Button variant="secondary" asChild>
              <Link to={ROUTES.ROLES}>
                <ArrowLeft className="h-4 w-4" />
                Volver a roles
              </Link>
            </Button>
          }
        />
        <Card>
          <EmptyState
            title="Rol no encontrado"
            description="No se pudo cargar el rol solicitado."
          />
        </Card>
      </AnimatedPage>
    )
  }

  const pageTitle = role.name ? `Permisos — ${role.name}` : 'Permisos del rol'

  return (
    <AnimatedPage>
      <PageHeader
        title={pageTitle}
        description={
          isAdmin
            ? 'El rol Administrador tiene acceso completo y no se puede editar desde la matriz.'
            : 'Marca las acciones permitidas por módulo y menú. Solo se muestran etiquetas legibles.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to={ROUTES.ROLES}>
                <ArrowLeft className="h-4 w-4" />
                Volver a roles
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={saving || readOnly}>
              <Save className="h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar permisos'}
            </Button>
          </div>
        }
      />

      {isAdmin && (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          El rol Administrador no admite cambios en la matriz de permisos.
        </Card>
      )}

      <div className={cn('space-y-4', readOnly && 'pointer-events-none opacity-70')}>
        {matrix.length === 0 ? (
          <Card>
            <EmptyState
              title="Sin permisos en el catálogo"
              description="No hay permisos disponibles para asignar."
            />
          </Card>
        ) : (
          matrix.map((mod) => {
            const moduleNames = mod.menus.flatMap((menu) => menu.permissions.map((p) => p.name))
            const moduleAllChecked =
              moduleNames.length > 0 && moduleNames.every((name) => selected.has(name))

            return (
              <Card key={mod.key} className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <h2 className="text-base font-semibold text-foreground">{mod.label}</h2>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      checked={moduleAllChecked}
                      disabled={readOnly}
                      onChange={(e) => setMany(moduleNames, e.target.checked)}
                    />
                    Seleccionar todo
                  </label>
                </div>

                <div className="space-y-5">
                  {mod.menus.map((menu) => {
                    const menuNames = menu.permissions.map((p) => p.name)
                    const menuAllChecked =
                      menuNames.length > 0 && menuNames.every((name) => selected.has(name))

                    return (
                      <div key={`${mod.key}.${menu.key}`}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-medium text-foreground">{menu.label}</h3>
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                              checked={menuAllChecked}
                              disabled={readOnly}
                              onChange={(e) => setMany(menuNames, e.target.checked)}
                            />
                            Seleccionar todo
                          </label>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {menu.permissions.map((perm) => {
                            const labels = permissionLabel(perm.name)
                            const checked = selected.has(perm.name)
                            return (
                              <label
                                key={perm.name}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm transition-colors',
                                  checked && 'border-primary/40 bg-primary/5',
                                  readOnly && 'cursor-not-allowed',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                  value={perm.name}
                                  checked={checked}
                                  disabled={readOnly}
                                  onChange={() => toggleOne(perm.name)}
                                />
                                <span className="flex-1">{labels.action || perm.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </AnimatedPage>
  )
}
