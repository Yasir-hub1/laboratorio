import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { useCrudPermission, usePermission } from '@/hooks/usePermission'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  ModalFooter,
  Select,
} from '@/components/ui'
import { ROUTES } from '@/utils/constants'
import { buildStatusPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isSuperAdminRole } from '@/utils/permissionCatalog'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '' }

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function roleDetailFields(data) {
  if (!data) return []
  return [{ label: 'Nombre', value: data.name }]
}

function rolePermissionsPath(id) {
  return ROUTES.ROLE_PERMISSIONS.replace(':id', String(id))
}

export function RolesPage() {
  const { confirm } = useConfirmAction()
  const { canView, canCreate, canEdit, canDeactivate, canDelete } = useCrudPermission('empresa.roles')
  const { can } = usePermission()
  const canAssignPermissions = can('empresa.roles.asignar-permisos')

  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusToggling, setStatusToggling] = useState(false)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
    refreshSelected,
  } = useEntityView(laboratoryApi.getRole)

  const index = useIndexQuery(laboratoryApi.getRoles, {
    extraParams: { status: statusFilter },
  })

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    if (isSuperAdminRole(row)) return
    setEditing(row)
    setForm({ name: row.name ?? '' })
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      if (isSuperAdminRole(row)) return
      const label = row.name ?? 'este rol'
      const ok = await confirm({
        title: 'Eliminar rol',
        description: `¿Eliminar "${label}"? El rol se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del rol')
        return
      }
      try {
        await laboratoryApi.deleteRole(id)
        toastApiSuccess('Rol eliminado')
        if (viewOpen && resolveEntityId(selected) === id) {
          setViewOpen(false)
        }
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirm, viewOpen, selected, setViewOpen, index.reload],
  )

  const handleToggleStatus = useCallback(
    async (entity) => {
      if (isSuperAdminRole(entity)) return
      const active = isActiveStatus(entity.status ?? entity.is_active)
      const id = resolveEntityId(entity)
      if (!id) return
      setStatusToggling(true)
      try {
        await laboratoryApi.updateRoleStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Rol desactivado' : 'Rol activado')
        await refreshSelected()
        index.reload()
      } catch (err) {
        toastApiError(err)
      } finally {
        setStatusToggling(false)
      }
    },
    [refreshSelected, index.reload],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Nombre', cell: ({ getValue }) => getValue() ?? '—' },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const active = isActiveStatus(row.original.status ?? row.original.is_active)
          return (
            <Badge variant={active ? 'success' : 'default'}>{active ? 'Activo' : 'Inactivo'}</Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const entity = row.original
          const id = resolveEntityId(entity)
          const isAdmin = isSuperAdminRole(entity)

          return (
            <div className="flex flex-wrap items-center justify-center gap-0.5">
              <RowActions
                onView={canView ? () => openView(entity) : undefined}
                onEdit={canEdit && !isAdmin ? () => openEdit(entity) : undefined}
                onDelete={canDelete && !isAdmin ? () => handleDelete(entity) : undefined}
              />
              {canAssignPermissions && !isAdmin && id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  asChild
                >
                  <Link to={rolePermissionsPath(id)} title="Permisos">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Permisos</span>
                  </Link>
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [canView, canEdit, canDelete, canAssignPermissions, openView, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name?.trim()) {
      toast.error('El nombre del rol es obligatorio')
      return
    }
    setSaving(true)
    try {
      const payload = { name: form.name.trim() }
      if (editing) {
        const id = resolveEntityId(editing)
        await laboratoryApi.updateRole(id, payload)
        toastApiSuccess('Rol actualizado')
      } else {
        await laboratoryApi.createRole(payload)
        toastApiSuccess('Rol registrado')
      }
      setModalOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      index.reload()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSaving(false)
    }
  }

  const selectedIsAdmin = selected ? isSuperAdminRole(selected) : false

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Roles"
        description="Gestión de roles del laboratorio. Los permisos se asignan en la matriz de cada rol."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo rol
            </Button>
          ) : null
        }
      />

      <Card className="mb-4 p-4">
        <Select
          label="Estado"
          name="status_filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-xs"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin roles"
            description={
              statusFilter === '1'
                ? 'No hay roles activos con este criterio.'
                : statusFilter === '2'
                  ? 'No hay roles inactivos con este criterio.'
                  : 'Registra el primer rol del sistema.'
            }
            actionLabel={statusFilter === 'all' && canCreate ? 'Nuevo rol' : undefined}
            onAction={statusFilter === 'all' && canCreate ? openCreate : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            getRowId={(row) => resolveEntityId(row) ?? row.name}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar rol' : 'Nuevo rol'}
        description="El nombre identifica el rol. Los permisos se configuran en la matriz."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Guardar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle de rol"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={roleDetailFields(selected)}
        onToggleStatus={
          canDeactivate && selected && !selectedIsAdmin ? handleToggleStatus : undefined
        }
        statusToggling={statusToggling}
        footerExtra={
          canAssignPermissions && selected && !selectedIsAdmin && resolveEntityId(selected) ? (
            <Button type="button" variant="secondary" asChild>
              <Link to={rolePermissionsPath(resolveEntityId(selected))}>
                <ShieldCheck className="h-4 w-4" />
                Permisos
              </Link>
            </Button>
          ) : null
        }
      />
    </AnimatedPage>
  )
}
