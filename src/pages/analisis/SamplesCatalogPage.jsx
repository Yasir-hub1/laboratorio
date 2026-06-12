import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { Button, Card, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildSamplePayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '' }

export function SamplesCatalogPage() {
  const { confirmDelete } = useConfirmAction()
  const index = useIndexQuery(laboratoryApi.getSamples)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

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
    setForm({ name: row.name ?? '' })
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del tipo de muestra')
        return
      }
      if (!(await confirmDelete(row.name ?? 'este tipo'))) return
      try {
        await laboratoryApi.deleteSample(id)
        toastApiSuccess('Tipo de muestra eliminado')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirmDelete, index.reload],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Nombre' },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <RowActions
            onEdit={() => openEdit(row.original)}
            onDelete={() => handleDelete(row.original)}
          />
        ),
      },
    ],
    [handleDelete],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = buildSamplePayload(form)
      const id = resolveEntityId(editing)
      if (editing && id) {
        await laboratoryApi.updateSample(id, payload)
        toastApiSuccess('Tipo de muestra actualizado')
      } else {
        await laboratoryApi.createSample(payload)
        toastApiSuccess('Tipo de muestra registrado')
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
        title="Tipos de muestra"
        description="Catálogo de tipos de muestra utilizados en los análisis."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo tipo
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin tipos de muestra"
            description="Registra el primer tipo de muestra."
            actionLabel="Nuevo tipo"
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
        onOpenChange={setModalOpen}
        title={editing ? 'Editar tipo de muestra' : 'Nuevo tipo de muestra'}
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
    </AnimatedPage>
  )
}
