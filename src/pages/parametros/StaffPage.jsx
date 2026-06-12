import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildStaffPayload, buildStatusPayload } from '@/utils/apiPayload'
import { useApiList } from '@/hooks/useApiList'
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
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  ci: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  position_id: '',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function rowToForm(row) {
  return {
    ci: row.ci ?? '',
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    position_id: String(row.position_id ?? row.position?.id ?? ''),
  }
}

function staffDetailFields(data) {
  if (!data) return []
  return [
    { label: 'CI', value: data.ci },
    {
      label: 'Nombre',
      value: [data.first_name, data.last_name].filter(Boolean).join(' '),
    },
    { label: 'Cargo', value: data.position?.name },
    { label: 'Teléfono', value: data.phone },
    { label: 'Email', value: data.email ?? '—' },
  ]
}

function staffDisplayName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.ci || 'este colaborador'
}

export function StaffPage() {
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
  } = useEntityView(laboratoryApi.getStaff)

  const index = useIndexQuery(laboratoryApi.getStaffs, {
    extraParams: { status: statusFilter },
  })
  const { items: positions } = useApiList(laboratoryApi.getPositions, [])

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
      const label = staffDisplayName(row)
      const ok = await confirm({
        title: 'Eliminar personal',
        description: `¿Eliminar a "${label}"? El colaborador se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      try {
        await laboratoryApi.deleteStaff(row.id)
        toastApiSuccess('Personal eliminado')
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
      setStatusToggling(true)
      try {
        await laboratoryApi.updateStaffStatus(entity.id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Personal desactivado' : 'Personal activado')
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
      {
        id: 'position',
        header: 'Cargo',
        cell: ({ row }) => row.original.position?.name ?? row.original.position ?? '—',
      },
      { accessorKey: 'phone', header: 'Teléfono', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() ?? '—' },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const active = isActiveStatus(row.original.status ?? row.original.is_active)
          return <Badge variant={active ? 'success' : 'default'}>{active ? 'Activo' : 'Inactivo'}</Badge>
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
      const payload = buildStaffPayload(form)
      if (editing) {
        await laboratoryApi.updateStaff(editing.id, payload)
        toastApiSuccess('Personal actualizado')
      } else {
        await laboratoryApi.createStaff(payload)
        toastApiSuccess('Personal registrado')
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
        title="Personal"
        description="Personal administrativo y técnico del laboratorio."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo personal
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
            title="Sin personal"
            description={
              statusFilter === '1'
                ? 'No hay personal activo con este criterio.'
                : statusFilter === '2'
                  ? 'No hay personal inactivo con este criterio.'
                  : 'Registra colaboradores del laboratorio.'
            }
            actionLabel={statusFilter === 'all' ? 'Nuevo personal' : undefined}
            onAction={statusFilter === 'all' ? openCreate : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar personal' : 'Nuevo personal'}
        description="Datos del colaborador."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input label="CI" name="ci" value={form.ci} onChange={handleChange} required />
          <Select
            label="Cargo"
            name="position_id"
            value={form.position_id}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar cargo...</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
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
        title="Detalle de personal"
        description={
          selected
            ? [selected.first_name, selected.last_name].filter(Boolean).join(' ')
            : undefined
        }
        loading={detailLoading}
        data={selected}
        fields={staffDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
      />
    </AnimatedPage>
  )
}
