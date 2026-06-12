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
import { Badge, Button, Card, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildMethodPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus, statusLabel } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '' }

function methodDetailFields(data) {
  if (!data) return []
  return [
    { label: 'Nombre', value: data.name },
    { label: 'Estado', value: statusLabel(data) },
    { label: 'ID', value: resolveEntityId(data) },
  ]
}

export function MethodsPage() {
  const { confirmDeactivate } = useConfirmAction()
  const index = useIndexQuery(laboratoryApi.getMethods)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
  } = useEntityView(laboratoryApi.getMethod)

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

  const handleDeactivate = useCallback(
    async (row) => {
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del método')
        return
      }
      if (!(await confirmDeactivate(row.name))) return
      try {
        await laboratoryApi.deleteMethod(id)
        toastApiSuccess('Método desactivado')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirmDeactivate, index.reload],
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
            onDelete={() => handleDeactivate(row.original)}
          />
        ),
      },
    ],
    [openView, openEdit, handleDeactivate],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = buildMethodPayload(form)
      const id = resolveEntityId(editing)
      if (editing && id) {
        await laboratoryApi.updateMethod(id, payload)
        toastApiSuccess('Método actualizado')
      } else {
        await laboratoryApi.createMethod(payload)
        toastApiSuccess('Método registrado')
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
        // phase="Fase 5"
        title="Métodos"
        description="Catálogo de métodos analíticos del laboratorio."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo método
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin métodos"
            description="Registra el primer método analítico."
            actionLabel="Nuevo método"
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
        title={editing ? 'Editar método' : 'Nuevo método'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
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
        title="Detalle del método"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={methodDetailFields(selected)}
      />
    </AnimatedPage>
  )
}
