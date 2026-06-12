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
  Textarea,
} from '@/components/ui'
import { buildSpecialtyPayload, buildStatusPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '', description: '' }

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function specialtyDetailFields(data) {
  if (!data) return []
  return [
    { label: 'Nombre', value: data.name },
    { label: 'Descripción', value: data.description ?? '—' },
  ]
}

export function SpecialtiesPage() {
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
  } = useEntityView(laboratoryApi.getSpecialty)

  const index = useIndexQuery(laboratoryApi.getSpecialties, {
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
    setForm({
      name: row.name ?? '',
      description: row.description ?? '',
    })
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      const label = row.name ?? 'esta especialidad'
      const ok = await confirm({
        title: 'Eliminar especialidad',
        description: `¿Eliminar "${label}"? La especialidad se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID de la especialidad')
        return
      }
      try {
        await laboratoryApi.deleteSpecialty(id)
        toastApiSuccess('Especialidad eliminada')
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
        await laboratoryApi.updateSpecialtyStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Especialidad desactivada' : 'Especialidad activada')
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
      { accessorKey: 'name', header: 'Nombre' },
      {
        accessorKey: 'description',
        header: 'Descripción',
        cell: ({ getValue }) => getValue() ?? '—',
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
      const payload = buildSpecialtyPayload(form)
      if (editing) {
        await laboratoryApi.updateSpecialty(editing.id, payload)
        toastApiSuccess('Especialidad actualizada')
      } else {
        await laboratoryApi.createSpecialty(payload)
        toastApiSuccess('Especialidad registrada')
      }
      setModalOpen(false)
      setForm(EMPTY_FORM)
      setEditing(null)
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
        title="Especialidades"
        description="Catálogo de especialidades médicas para médicos referentes."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva especialidad
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
            title="Sin especialidades"
            description={
              statusFilter === '1'
                ? 'No hay especialidades activas con este criterio.'
                : statusFilter === '2'
                  ? 'No hay especialidades inactivas con este criterio.'
                  : 'Registra especialidades para asignar a médicos.'
            }
            actionLabel={statusFilter === 'all' ? 'Nueva especialidad' : undefined}
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
        title={editing ? 'Editar especialidad' : 'Nueva especialidad'}
        description="Nombre y descripción de la especialidad."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
          <Textarea
            label="Descripción"
            name="description"
            value={form.description}
            onChange={handleChange}
          />
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
        title="Detalle de especialidad"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={specialtyDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
      />
    </AnimatedPage>
  )
}
