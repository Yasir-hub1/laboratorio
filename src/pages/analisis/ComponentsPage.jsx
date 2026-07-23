import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useCrudPermission } from '@/hooks/usePermission'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { Button, Card, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildComponentAnalysisPayload } from '@/utils/apiPayload'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  name: '',
  analysis_subgroup_id: '',
  laboratory_analysis_id: '',
}

export function ComponentsPage() {
  const { canView, canCreate, canEdit, canDeactivate, canDelete } = useCrudPermission('catalogos.analisis-componentes')
  const { confirmDelete } = useConfirmAction()
  const index = useIndexQuery(laboratoryApi.getComponentAnalyses)
  const { items: subgroups } = useApiList(laboratoryApi.getAnalysisSubgroups, [])
  const { items: analyses } = useApiList(laboratoryApi.getLaboratoryAnalyses, [])
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
    setForm({
      name: row.name ?? '',
      analysis_subgroup_id: String(
        row.analysis_subgroup_id ?? row.analysis_subgroup?.id ?? '',
      ),
      laboratory_analysis_id: String(
        row.laboratory_analysis_id ?? row.laboratory_analysis?.id ?? '',
      ),
    })
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      if (!(await confirmDelete(row.name))) return
      try {
        await laboratoryApi.deleteComponentAnalysis(row.id)
        toastApiSuccess('Componente eliminado')
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
        id: 'analysis',
        header: 'Análisis',
        cell: ({ row }) =>
          row.original.laboratory_analysis?.name ??
          row.original.laboratory_analysis_name ??
          '—',
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <RowActions
            onEdit={canEdit ? () => openEdit(row.original) : undefined}
            onDelete={canDelete ? () => handleDelete(row.original) : undefined}
          />
        ),
      },
    ],
    [canEdit, canDelete, handleDelete],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = buildComponentAnalysisPayload(form)
      if (editing) {
        await laboratoryApi.updateComponentAnalysis(editing.id, payload)
        toastApiSuccess('Componente actualizado')
      } else {
        await laboratoryApi.createComponentAnalysis(payload)
        toastApiSuccess('Componente registrado')
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
        title="Componentes de análisis"
        description="Parámetros medidos: requiere subgrupo, análisis de laboratorio y nombre."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo componente
            </Button>
          ) : null
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin componentes"
            description="Registra el primer componente de análisis."
            actionLabel={canCreate ? "Nuevo componente" : undefined}
            onAction={canCreate ? openCreate : undefined}
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
        title={editing ? 'Editar componente' : 'Nuevo componente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Análisis de laboratorio"
            value={form.laboratory_analysis_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, laboratory_analysis_id: e.target.value }))
            }
            required
          >
            <option value="">Seleccionar...</option>
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select
            label="Subgrupo"
            value={form.analysis_subgroup_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, analysis_subgroup_id: e.target.value }))
            }
            required
          >
            <option value="">Seleccionar...</option>
            {subgroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            label="Nombre del componente"
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
