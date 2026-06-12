import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { useAuth } from '@/hooks/useAuth'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { CheckboxMultiSelect } from '@/components/common/CheckboxMultiSelect'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { AssignCashModal } from '@/components/common/AssignCashModal'
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
import { buildUserPayload, buildStatusPayload } from '@/utils/apiPayload'
import { formatDateTime } from '@/utils/apiHelpers'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  name: '',
  username: '',
  email: '',
  password: '',
  role_ids: [],
  branch_ids: [],
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function resolveIdList(items, singleId, nested) {
  const ids = []
  if (Array.isArray(items)) {
    items.forEach((item) => {
      const id = resolveEntityId(item) ?? item?.id ?? (typeof item === 'string' || typeof item === 'number' ? item : null)
      if (id != null) ids.push(String(id))
    })
  }
  if (ids.length) return ids
  const one = singleId ?? nested?.id
  return one != null ? [String(one)] : []
}

function getUserRoleIds(row) {
  return resolveIdList(row.roles, row.role_id, row.role)
}

function getUserBranchIds(row) {
  return resolveIdList(row.branches, row.branch_id, row.branch)
}

function formatNames(items, fallback = '—') {
  if (!items?.length) return fallback
  return items.map((x) => x?.name ?? x).filter(Boolean).join(', ') || fallback
}

function rowToForm(row) {
  return {
    name: row.name ?? '',
    username: row.username ?? '',
    email: row.email ?? '',
    password: '',
    role_ids: getUserRoleIds(row),
    branch_ids: getUserBranchIds(row),
  }
}

function userDisplayName(row) {
  return row.name ?? row.username ?? row.email ?? 'este usuario'
}

function userDetailFields(data) {
  if (!data) return []
  return [
    { label: 'Nombre', value: data.name },
    { label: 'Usuario', value: data.username ?? '—' },
    { label: 'Email', value: data.email },
    { label: 'Roles', value: formatNames(data.roles) },
    { label: 'Sucursales', value: formatNames(data.branches) },
    { label: 'Último acceso', value: formatDateTime(data.last_login_at) },
  ]
}

function RoleBranchBadges({ items }) {
  if (!items?.length) return <span className="text-muted">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => {
        const label = item?.name ?? item
        const key = resolveEntityId(item) ?? item?.id ?? i
        return (
          <Badge key={key} variant="default" className="font-normal">
            {label}
          </Badge>
        )
      })}
    </div>
  )
}

export function UsersPage() {
  const { user: sessionUser } = useAuth()
  const { confirm } = useConfirmAction()
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusToggling, setStatusToggling] = useState(false)
  const [assignCashUser, setAssignCashUser] = useState(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
    refreshSelected,
  } = useEntityView(laboratoryApi.getUser)

  const index = useIndexQuery(laboratoryApi.getUsers, {
    extraParams: { status: statusFilter },
  })
  const { items: roles } = useApiList(laboratoryApi.getRoles, [])
  const { items: branches } = useApiList(laboratoryApi.getBranches, [])

  const currentUserId = resolveEntityId(sessionUser)

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = useCallback(async (row) => {
    const id = resolveEntityId(row)
    if (!id) {
      toast.error('No se encontró el ID del usuario')
      return
    }

    setModalOpen(true)
    setLoadingEdit(true)
    setEditing(row)
    setForm(rowToForm(row))

    try {
      const detail = await laboratoryApi.getUser(id)
      setEditing(detail ?? row)
      setForm(rowToForm(detail ?? row))
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingEdit(false)
    }
  }, [])

  const handleDelete = useCallback(
    async (row) => {
      const userId = resolveEntityId(row)
      if (!userId) {
        toast.error('No se encontró el ID del usuario')
        return
      }
      if (currentUserId && userId === currentUserId) {
        toast.error('No puedes eliminar tu propia sesión')
        return
      }

      const label = userDisplayName(row)
      const ok = await confirm({
        title: 'Eliminar usuario',
        description: `¿Eliminar a "${label}"? El usuario se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return

      try {
        await laboratoryApi.deleteUser(userId)
        toastApiSuccess('Usuario eliminado')
        if (viewOpen && resolveEntityId(selected) === userId) {
          setViewOpen(false)
        }
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirm, currentUserId, viewOpen, selected, setViewOpen, index.reload],
  )

  const handleToggleStatus = useCallback(
    async (entity) => {
      const active = isActiveStatus(entity.status ?? entity.is_active)
      const userId = resolveEntityId(entity)
      if (!userId) {
        toast.error('No se encontró el ID del usuario')
        return
      }
      if (active && currentUserId && userId === currentUserId) {
        toast.error('No puedes desactivar tu propia sesión')
        return
      }

      setStatusToggling(true)
      try {
        await laboratoryApi.updateUserStatus(userId, buildStatusPayload(active))
        toastApiSuccess(active ? 'Usuario desactivado' : 'Usuario activado')
        await refreshSelected()
        index.reload()
      } catch (err) {
        toastApiError(err)
      } finally {
        setStatusToggling(false)
      }
    },
    [currentUserId, refreshSelected, index.reload],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Nombre', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'username', header: 'Usuario', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'email', header: 'Email' },
      {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => (
          <RoleBranchBadges items={row.original.roles ?? (row.original.role ? [row.original.role] : [])} />
        ),
      },
      {
        id: 'branches',
        header: 'Sucursales',
        cell: ({ row }) => (
          <RoleBranchBadges
            items={row.original.branches ?? (row.original.branch ? [row.original.branch] : [])}
          />
        ),
      },
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
        cell: ({ row }) => (
          <RowActions
            onView={() => openView(row.original)}
            onEdit={() => openEdit(row.original)}
            onDelete={() => handleDelete(row.original)}
            onExtra={() => setAssignCashUser(row.original)}
            extraLabel="Cajas"
          />
        ),
      },
    ],
    [openView, openEdit, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.username?.trim()) {
      toast.error('El nombre de usuario es obligatorio')
      return
    }
    if (form.branch_ids.length === 0) {
      toast.error('Selecciona al menos una sucursal')
      return
    }
    if (form.role_ids.length === 0) {
      toast.error('Selecciona al menos un rol')
      return
    }

    setSaving(true)
    try {
      const payload = buildUserPayload(form, { isEdit: Boolean(editing) })
      if (editing) {
        const id = resolveEntityId(editing)
        await laboratoryApi.updateUser(id, payload)
        toastApiSuccess('Usuario actualizado')
      } else {
        await laboratoryApi.createUser(payload)
        toastApiSuccess('Usuario registrado')
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

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios: usuario, roles, sucursales y asignación de cajas."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
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
            title="Sin usuarios"
            description={
              statusFilter === '1'
                ? 'No hay usuarios activos con este criterio.'
                : statusFilter === '2'
                  ? 'No hay usuarios inactivos con este criterio.'
                  : 'Registra el primer usuario del sistema.'
            }
            actionLabel={statusFilter === 'all' ? 'Nuevo usuario' : undefined}
            onAction={statusFilter === 'all' ? openCreate : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            getRowId={(row) => resolveEntityId(row) ?? row.email ?? row.username}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        description="Nombre, usuario, correo, contraseña, roles y sucursales."
      >
        {loadingEdit ? (
          <p className="py-8 text-center text-sm text-muted">Cargando datos del usuario…</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
            <Input
              label="Usuario"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <Input
              className="sm:col-span-2"
              label={editing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!editing}
              autoComplete={editing ? 'new-password' : 'new-password'}
            />
            <CheckboxMultiSelect
              className="sm:col-span-2"
              label="Roles"
              options={roles}
              value={form.role_ids}
              onChange={(role_ids) => setForm((prev) => ({ ...prev, role_ids }))}
              required
              emptyMessage="No hay roles registrados."
              countLabel="rol"
            />
            <CheckboxMultiSelect
              className="sm:col-span-2"
              label="Sucursales"
              options={branches}
              value={form.branch_ids}
              onChange={(branch_ids) => setForm((prev) => ({ ...prev, branch_ids }))}
              required
              emptyMessage="No hay sucursales registradas."
              countLabel="sucursal"
            />
            <ModalFooter className="sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Guardar'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle de usuario"
        description={selected?.username ?? selected?.email}
        loading={detailLoading}
        data={selected}
        fields={userDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
        footerExtra={
          selected ? (
            <Button type="button" variant="secondary" onClick={() => setAssignCashUser(selected)}>
              Asignar cajas
            </Button>
          ) : null
        }
      />

      <AssignCashModal
        open={Boolean(assignCashUser)}
        onOpenChange={(open) => !open && setAssignCashUser(null)}
        user={assignCashUser}
      />
    </AnimatedPage>
  )
}
