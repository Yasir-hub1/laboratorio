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
import { buildBranchPayload, buildStatusPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '', address: '', phone: '' }

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function branchDetailFields(data) {
  if (!data) return []
  return [
    { label: 'Nombre', value: data.name },
    { label: 'Dirección', value: data.address ?? '—' },
    { label: 'Teléfono', value: data.phone ?? '—' },
  ]
}

export function BranchesPage() {
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
  } = useEntityView(laboratoryApi.getBranch)

  const index = useIndexQuery(laboratoryApi.getBranches, {
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
      address: row.address ?? '',
      phone: row.phone ?? '',
    })
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      const label = row.name ?? 'esta sucursal'
      const ok = await confirm({
        title: 'Eliminar sucursal',
        description: `¿Eliminar "${label}"? La sucursal se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID de la sucursal')
        return
      }
      try {
        await laboratoryApi.deleteBranch(id)
        toastApiSuccess('Sucursal eliminada')
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
        await laboratoryApi.updateBranchStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Sucursal desactivada' : 'Sucursal activada')
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
      { accessorKey: 'address', header: 'Dirección', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'phone', header: 'Teléfono', cell: ({ getValue }) => getValue() ?? '—' },
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
      const payload = buildBranchPayload(form)
      if (editing) {
        const id = resolveEntityId(editing)
        await laboratoryApi.updateBranch(id, payload)
        toastApiSuccess('Sucursal actualizada')
      } else {
        await laboratoryApi.createBranch(payload)
        toastApiSuccess('Sucursal registrada')
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
        title="Sucursales"
        description="Administración de sucursales del laboratorio."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nueva sucursal
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
            title="Sin sucursales"
            description={
              statusFilter === '1'
                ? 'No hay sucursales activas con este criterio.'
                : statusFilter === '2'
                  ? 'No hay sucursales inactivas con este criterio.'
                  : 'Registra la primera sucursal.'
            }
            actionLabel={statusFilter === 'all' ? 'Nueva sucursal' : undefined}
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
        title={editing ? 'Editar sucursal' : 'Nueva sucursal'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
          <Input label="Dirección" name="address" value={form.address} onChange={handleChange} />
          <Input label="Teléfono" name="phone" value={form.phone} onChange={handleChange} />
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
        title="Detalle de sucursal"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={branchDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
      />
    </AnimatedPage>
  )
}
