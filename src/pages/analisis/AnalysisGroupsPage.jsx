import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  ModalFooter,
} from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildAnalysisGroupPayload, buildStatusPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '' }

function groupDetailFields(data) {
  if (!data) return []
  return [{ label: 'Nombre', value: data.name }]
}

export function AnalysisGroupsPage() {
  const { confirmDelete } = useConfirmAction()
  const index = useIndexQuery(laboratoryApi.getAnalysisGroups)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusToggling, setStatusToggling] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
    refreshSelected,
  } = useEntityView(laboratoryApi.getAnalysisGroup)

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((row) => {
    setEditing(row)
    setForm({ name: row?.name ?? '' })
    setModalOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (row) => {
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del grupo')
        return
      }
      if (!(await confirmDelete(row.name))) return
      try {
        const active = isActiveStatus(row.status ?? row.is_active)
        await laboratoryApi.updateAnalysisGroupStatus(id, buildStatusPayload(active))
        toastApiSuccess('Grupo eliminado')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirmDelete, index.reload],
  )

  const handleToggleStatus = useCallback(
    async (entity) => {
      const id = resolveEntityId(entity)
      if (!id) return
      const active = isActiveStatus(entity.status ?? entity.is_active)
      setStatusToggling(true)
      try {
        await laboratoryApi.updateAnalysisGroupStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Grupo desactivado' : 'Grupo activado')
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
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const active = isActiveStatus(row.original.status ?? row.original.is_active)
          return (
            <Badge variant={active ? 'success' : 'default'}>
              {active ? 'Activo' : 'Inactivo'}
            </Badge>
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
    [openView, openEdit, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = buildAnalysisGroupPayload(form)
      const id = resolveEntityId(editing)
      if (editing && id) {
        await laboratoryApi.updateAnalysisGroup(id, payload)
        toastApiSuccess('Grupo actualizado')
      } else {
        await laboratoryApi.createAnalysisGroup(payload)
        toastApiSuccess('Grupo registrado')
      }
      setModalOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      index.reload()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        // // phase="Fase 5"
        title="Grupos de análisis"
        description="Organiza los análisis en grupos para el catálogo del laboratorio."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo grupo
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin grupos"
            description="Registra el primer grupo de análisis."
            actionLabel="Nuevo grupo"
            onAction={openCreate}
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
        onOpenChange={(v) => {
          setModalOpen(v)
          if (!v) {
            setEditing(null)
            setForm(EMPTY_FORM)
          }
        }}
        title={editing ? 'Editar grupo' : 'Nuevo grupo'}
        description="Nombre del grupo de análisis."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : editing ? 'Actualizar' : 'Guardar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle del grupo"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={groupDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
      />
    </AnimatedPage>
  )
}
