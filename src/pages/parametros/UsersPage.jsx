import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { useAuth } from '@/hooks/useAuth'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { useCrudPermission, usePermission } from '@/hooks/usePermission'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { CheckboxMultiSelect } from '@/components/common/CheckboxMultiSelect'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { AssignCashModal } from '@/components/common/AssignCashModal'
import { Can } from '@/components/auth/Can'
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
  link_type: 'solo',
  person_id: '',
  role_ids: [],
  branch_ids: [],
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'medico', label: 'Médico' },
  { value: 'personal', label: 'Personal' },
  { value: 'solo', label: 'Sin vinculación' },
]

const LINK_TYPE_OPTIONS = [
  { value: 'solo', label: 'Sólo usuario' },
  { value: 'personal', label: 'Personal' },
  { value: 'medico', label: 'Médico' },
]

/** type 1 = médico, 2 = personal; resto / sin persona = sin vinculación */
function getUserLinkType(user) {
  const person = user?.person
  const personId = user?.person_id ?? resolveEntityId(person)
  if (!personId && !person) return 'solo'
  const type = Number(person?.type)
  if (type === 1) return 'medico'
  if (type === 2) return 'personal'
  return 'solo'
}

function userTypeLabel(user) {
  const t = getUserLinkType(user)
  if (t === 'medico') return 'Médico'
  if (t === 'personal') return 'Personal'
  return 'Sin vinculación'
}

function isUserAlreadyLinked(user) {
  const t = getUserLinkType(user)
  return t === 'medico' || t === 'personal'
}

function personDisplayName(person) {
  if (!person) return '—'
  return (
    person.full_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(' ') ||
    person.ci ||
    '—'
  )
}

function personHasUser(person) {
  return Boolean(person?.user || person?.user_id || resolveEntityId(person?.user))
}

function buildUsernameFromPerson(person) {
  const first = String(person?.first_name ?? '').replace(/\s+/g, '')
  const ciDigits = String(person?.ci ?? '').replace(/\D/g, '').slice(0, 4)
  return `${first}.${ciDigits}`.slice(0, 20)
}

function findBioquimicoRoleId(roles) {
  const role = roles.find((r) => /bioqu[ií]mico/i.test(String(r?.name ?? '')))
  return role ? String(resolveEntityId(role) ?? role.id) : null
}

function resolveIdList(items, singleId, nested) {
  const ids = []
  if (Array.isArray(items)) {
    items.forEach((item) => {
      const id =
        resolveEntityId(item) ??
        item?.id ??
        (typeof item === 'string' || typeof item === 'number' ? item : null)
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
  const linkType = getUserLinkType(row)
  return {
    name: row.name ?? '',
    username: row.username ?? '',
    email: row.email ?? '',
    password: '',
    link_type: linkType === 'solo' ? 'solo' : linkType,
    person_id: String(resolveEntityId(row.person) ?? row.person_id ?? ''),
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
    { label: 'Tipo', value: userTypeLabel(data) },
    { label: 'Persona vinculada', value: personDisplayName(data.person) },
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
  const { canView, canCreate, canEdit, canDeactivate, canDelete } =
    useCrudPermission('empresa.usuarios')
  const { can } = usePermission()
  const canAssignRoles = can('empresa.usuarios.asignar-roles')
  const canAssignBranches = can('empresa.usuarios.asignar-sucursales')
  const canAssignCashes = can('empresa.usuarios.asignar-cajas')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
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

  const listExtraParams = useMemo(
    () => ({
      status: statusFilter,
      type: typeFilter,
    }),
    [statusFilter, typeFilter],
  )

  const index = useIndexQuery(laboratoryApi.getUsers, {
    extraParams: listExtraParams,
  })
  const { items: roles } = useApiList(laboratoryApi.getRoles, [])
  const { items: branches } = useApiList(laboratoryApi.getBranches, [])
  const { items: doctors } = useApiList(laboratoryApi.getDoctors, [], {
    status: 1,
  })
  const { items: staffs } = useApiList(laboratoryApi.getStaffs, [], {
    status: 1,
  })

  const currentUserId = resolveEntityId(sessionUser)
  const editingLinked = Boolean(editing && isUserAlreadyLinked(editing))
  const canChangeLink = !editing || !editingLinked

  const doctorsWithoutUser = useMemo(
    () => doctors.filter((d) => !personHasUser(d)),
    [doctors],
  )
  const staffsWithoutUser = useMemo(
    () => staffs.filter((s) => !personHasUser(s)),
    [staffs],
  )

  const personOptions = useMemo(() => {
    const list = form.link_type === 'medico' ? doctorsWithoutUser : staffsWithoutUser
    return list.map((p) => {
      const id = String(resolveEntityId(p) ?? p.id)
      const name = personDisplayName(p)
      const ci = p.ci ? ` · CI ${p.ci}` : ''
      return { id, name: `${name}${ci}`, raw: p }
    })
  }, [form.link_type, doctorsWithoutUser, staffsWithoutUser])

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
        id: 'link_type',
        header: 'Tipo',
        cell: ({ row }) => {
          const label = userTypeLabel(row.original)
          const variant =
            label === 'Médico' ? 'info' : label === 'Personal' ? 'warning' : 'default'
          return <Badge variant={variant}>{label}</Badge>
        },
      },
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
            onView={canView ? () => openView(row.original) : undefined}
            onEdit={canEdit ? () => openEdit(row.original) : undefined}
            onDelete={canDelete ? () => handleDelete(row.original) : undefined}
            onExtra={canAssignCashes ? () => setAssignCashUser(row.original) : undefined}
            extraLabel="Cajas"
          />
        ),
      },
    ],
    [canView, canEdit, canDelete, canAssignCashes, openView, openEdit, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const applyPersonAutofill = useCallback(
    (person, linkType, prev) => {
      const next = { ...prev }
      next.name = personDisplayName(person)
      next.username = buildUsernameFromPerson(person)
      if (person?.email) next.email = String(person.email)
      if (linkType === 'medico' && (!prev.role_ids || prev.role_ids.length === 0)) {
        const bioId = findBioquimicoRoleId(roles)
        if (bioId) next.role_ids = [bioId]
      }
      return next
    },
    [roles],
  )

  const handleLinkTypeChange = (e) => {
    const link_type = e.target.value
    setForm((prev) => {
      const next = { ...prev, link_type, person_id: '' }
      if (link_type === 'medico' && (!prev.role_ids || prev.role_ids.length === 0)) {
        const bioId = findBioquimicoRoleId(roles)
        if (bioId) next.role_ids = [bioId]
      }
      return next
    })
  }

  const handlePersonChange = (e) => {
    const person_id = e.target.value
    setForm((prev) => {
      const next = { ...prev, person_id }
      const opt = personOptions.find((o) => o.id === person_id)
      if (opt?.raw) return applyPersonAutofill(opt.raw, prev.link_type, next)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.username?.trim()) {
      toast.error('El nombre de usuario es obligatorio')
      return
    }
    if (!editing && (!form.password || form.password.length < 8)) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (editing && form.password && form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (canChangeLink && form.link_type !== 'solo' && !form.person_id) {
      toast.error(
        form.link_type === 'medico'
          ? 'Selecciona un médico'
          : 'Selecciona un personal',
      )
      return
    }
    if (canAssignBranches && form.branch_ids.length === 0) {
      toast.error('Selecciona al menos una sucursal')
      return
    }
    if (canAssignRoles && form.role_ids.length === 0) {
      toast.error('Selecciona al menos un rol')
      return
    }

    setSaving(true)
    try {
      const sendPersonId = canChangeLink
      const payload = buildUserPayload(
        {
          ...form,
          person_id: form.link_type === 'solo' ? '' : form.person_id,
        },
        { isEdit: Boolean(editing), sendPersonId },
      )
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
        description="Gestión de usuarios: usuario, vinculación con personal/médico, roles, sucursales y cajas."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          ) : null
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Estado"
            name="status_filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            label="Tipo"
            name="type_filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
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
            actionLabel={statusFilter === 'all' && typeFilter === 'all' && canCreate ? 'Nuevo usuario' : undefined}
            onAction={
              statusFilter === 'all' && typeFilter === 'all' && canCreate ? openCreate : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            searchPlaceholder="Buscar por nombre, usuario o correo…"
            getRowId={(row) => resolveEntityId(row) ?? row.email ?? row.username}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
        description="Nombre, usuario, correo, tipo de vinculación, roles y sucursales."
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
              label={editing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!editing}
              minLength={editing ? undefined : 8}
              autoComplete="new-password"
            />

            {editingLinked ? (
              <div className="sm:col-span-2 space-y-1.5">
                <p className="text-sm font-medium text-foreground">Tipo de usuario</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={form.link_type === 'medico' ? 'info' : 'warning'}>
                    {form.link_type === 'medico' ? 'Médico' : 'Personal'}
                  </Badge>
                  <span className="text-sm text-muted">
                    Vinculado a: {personDisplayName(editing?.person)}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <Select
                  label="Tipo de usuario"
                  name="link_type"
                  value={form.link_type}
                  onChange={handleLinkTypeChange}
                >
                  {LINK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
                {form.link_type !== 'solo' ? (
                  <Select
                    label={form.link_type === 'medico' ? 'Médico' : 'Personal'}
                    name="person_id"
                    value={form.person_id}
                    onChange={handlePersonChange}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {personOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </>
            )}

            <Can permission="empresa.usuarios.asignar-roles">
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
            </Can>
            <Can permission="empresa.usuarios.asignar-sucursales">
              <CheckboxMultiSelect
                className="sm:col-span-2"
                label="Sucursales"
                options={branches}
                value={form.branch_ids}
                onChange={(branch_ids) => setForm((prev) => ({ ...prev, branch_ids }))}
                required
                emptyMessage="No hay sucursales registradas."
                countLabel="sucursal"
                selectAllLabel="Seleccionar todas"
              />
            </Can>
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
        onToggleStatus={canDeactivate ? handleToggleStatus : undefined}
        statusToggling={statusToggling}
        footerExtra={
          selected && canAssignCashes ? (
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
