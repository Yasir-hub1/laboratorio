import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
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
import { formatDate } from '@/utils/apiHelpers'
import { buildPatientPayload, buildStatusPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  ci: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  password: '',
  gender: '',
  birth_date: '',
  address: '',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function genderLabel(value) {
  if (!value) return '—'
  const v = String(value).toLowerCase()
  if (v === 'm' || v === 'masculino') return 'Masculino'
  if (v === 'f' || v === 'femenino') return 'Femenino'
  if (v === 'o' || v === 'otro') return 'Otro'
  return value
}

function genderToFormValue(value) {
  if (!value) return ''
  const v = String(value).toLowerCase()
  if (v === 'masculino' || v === 'm') return 'M'
  if (v === 'femenino' || v === 'f') return 'F'
  if (v === 'otro' || v === 'o') return 'O'
  return value
}

function rowToForm(row) {
  return {
    ci: row.ci ?? '',
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    password: '',
    gender: genderToFormValue(row.gender),
    birth_date: row.birth_date ? String(row.birth_date).slice(0, 10) : '',
    address: row.address ?? '',
  }
}

function patientDisplayName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.ci || 'este paciente'
}

function patientDetailFields(data) {
  if (!data) return []
  return [
    { label: 'CI', value: data.ci },
    {
      label: 'Nombre',
      value: [data.first_name, data.last_name].filter(Boolean).join(' '),
    },
    { label: 'Teléfono', value: data.phone ?? '—' },
    { label: 'Email', value: data.email ?? '—' },
    { label: 'Género', value: genderLabel(data.gender) },
    { label: 'Nacimiento', value: formatDate(data.birth_date) },
    { label: 'Dirección', value: data.address ?? '—' },
  ]
}

export function PatientsPage() {
  const { confirm } = useConfirmAction()
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
  } = useEntityView(laboratoryApi.getPatient)

  const index = useIndexQuery(laboratoryApi.getPatients, {
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
    setEditing(row)
    setForm(rowToForm(row))
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      const label = patientDisplayName(row)
      const ok = await confirm({
        title: 'Eliminar paciente',
        description: `¿Eliminar a "${label}"? El paciente se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del paciente')
        return
      }
      try {
        await laboratoryApi.deletePatient(id)
        toastApiSuccess('Paciente eliminado')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirm, index.reload],
  )

  const handleToggleStatus = useCallback(
    async (entity) => {
      const active = isActiveStatus(entity.status ?? entity.is_active)
      const id = resolveEntityId(entity)
      if (!id) return
      setStatusToggling(true)
      try {
        await laboratoryApi.updatePatientStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Paciente desactivado' : 'Paciente activado')
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
      { accessorKey: 'ci', header: 'CI', cell: ({ getValue }) => getValue() ?? '—' },
      {
        id: 'full_name',
        header: 'Nombre',
        cell: ({ row }) =>
          [row.original.first_name, row.original.last_name].filter(Boolean).join(' ') || '—',
      },
      { accessorKey: 'phone', header: 'Teléfono', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() ?? '—' },
      {
        accessorKey: 'birth_date',
        header: 'Nacimiento',
        cell: ({ getValue }) => formatDate(getValue()),
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
          />
        ),
      },
    ],
    [openView, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPatientPayload(form)
      if (editing) {
        const id = resolveEntityId(editing)
        if (!form.password) delete payload.password
        await laboratoryApi.updatePatient(id, payload)
        toastApiSuccess('Paciente actualizado')
      } else {
        await laboratoryApi.createPatient(payload)
        toastApiSuccess('Paciente registrado')
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
        title="Pacientes"
        description="Registro de pacientes del laboratorio. Busca por CI, nombre, teléfono o email."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo paciente
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
            title="Sin pacientes"
            description={
              statusFilter === '1'
                ? 'No hay pacientes activos con este criterio.'
                : statusFilter === '2'
                  ? 'No hay pacientes inactivos con este criterio.'
                  : 'Registra el primer paciente del laboratorio.'
            }
            actionLabel={statusFilter === 'all' ? 'Nuevo paciente' : undefined}
            onAction={statusFilter === 'all' ? openCreate : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            searchPlaceholder="Buscar por CI, nombre, teléfono o email…"
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar paciente' : 'Nuevo paciente'}
        description="Datos demográficos y de contacto."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="CI" name="ci" value={form.ci} onChange={handleChange} required />
          <Input
            label="Nombres"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            required
          />
          <Input
            label="Apellidos"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            required
          />
          <Input label="Teléfono" name="phone" value={form.phone} onChange={handleChange} />
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
          />
          <Select label="Género" name="gender" value={form.gender} onChange={handleChange}>
            <option value="">Seleccionar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </Select>
          <Input
            label="Fecha de nacimiento"
            name="birth_date"
            type="date"
            value={form.birth_date}
            onChange={handleChange}
          />
          <Input
            className="sm:col-span-2"
            label="Dirección"
            name="address"
            value={form.address}
            onChange={handleChange}
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
      </Modal>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle del paciente"
        description={
          selected
            ? [selected.first_name, selected.last_name].filter(Boolean).join(' ')
            : undefined
        }
        loading={detailLoading}
        data={selected}
        fields={patientDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
      />
    </AnimatedPage>
  )
}
