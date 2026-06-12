import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { Button, Card, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input, Select } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency } from '@/utils/apiHelpers'
import { buildLaboratoryAnalysisPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { ROUTES } from '@/utils/constants'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  name: '',
  analysis_group_id: '',
  method_id: '',
  sample_id: '',
  price: '0',
}

function groupName(row) {
  return row?.analysis_group_name ?? row?.analysis_group?.name ?? '—'
}

function methodName(row) {
  return row?.method_name ?? row?.method?.name ?? '—'
}

function sampleName(row) {
  return row?.sample_name ?? row?.sample?.name ?? '—'
}

function analysisDetailFields(data) {
  if (!data) return []
  return [
    { label: 'Nombre', value: data.name },
    { label: 'Grupo', value: groupName(data) },
    { label: 'Método', value: methodName(data) },
    { label: 'Muestra', value: sampleName(data) },
    { label: 'Precio', value: formatCurrency(data.price) },
  ]
}

export function AnalysesPage() {
  const navigate = useNavigate()
  const { confirmDeactivate } = useConfirmAction()
  const index = useIndexQuery(laboratoryApi.getLaboratoryAnalyses)
  const { items: groups, loading: groupsLoading } = useApiList(laboratoryApi.getAnalysisGroups, [])
  const { items: methods, loading: methodsLoading } = useApiList(laboratoryApi.getMethods, [])
  const { items: samples, loading: samplesLoading } = useApiList(laboratoryApi.getSamples, [])

  const catalogLoading = groupsLoading || methodsLoading || samplesLoading

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
  } = useEntityView(laboratoryApi.getLaboratoryAnalysis)

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      name: row.name ?? '',
      analysis_group_id: String(row.analysis_group_id ?? row.analysis_group?.id ?? ''),
      method_id: String(row.method_id ?? row.method?.id ?? ''),
      sample_id: String(row.sample_id ?? row.sample?.id ?? ''),
      price: row.price != null && row.price !== '' ? String(row.price) : '0',
    })
    setModalOpen(true)
  }

  const handleDeactivate = useCallback(
    async (row) => {
      if (!(await confirmDeactivate(row.name))) return
      try {
        await laboratoryApi.deleteLaboratoryAnalysis(row.id)
        toastApiSuccess('Análisis desactivado')
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
        id: 'analysis_group_name',
        header: 'Grupo',
        accessorKey: 'analysis_group_name',
        cell: ({ row }) => groupName(row.original),
      },
      {
        id: 'method_name',
        header: 'Método',
        accessorKey: 'method_name',
        cell: ({ row }) => methodName(row.original),
      },
      {
        id: 'sample_name',
        header: 'Muestra',
        accessorKey: 'sample_name',
        cell: ({ row }) => sampleName(row.original),
      },
      {
        accessorKey: 'price',
        header: 'Precio',
        cell: ({ row }) => formatCurrency(row.original.price),
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => {
          const id = resolveEntityId(row.original)
          return (
            <RowActions
              onView={() => openView(row.original)}
              onEdit={() => openEdit(row.original)}
              onDelete={() => handleDeactivate(row.original)}
              onExtra={
                id
                  ? () => navigate(ROUTES.ANALYSIS_SUBGROUPS.replace(':analysisId', id))
                  : undefined
              }
              extraLabel="Subgrupos"
              extraIcon={Layers}
            />
          )
        },
      },
    ],
    [navigate, openView, handleDeactivate],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = buildLaboratoryAnalysisPayload(form)
      const id = resolveEntityId(editing)
      if (editing && id) {
        await laboratoryApi.updateLaboratoryAnalysis(id, payload)
        toastApiSuccess('Análisis actualizado')
      } else {
        await laboratoryApi.createLaboratoryAnalysis(payload)
        toastApiSuccess('Análisis registrado')
      }
      setModalOpen(false)
      setEditing(null)
      setForm({ ...EMPTY_FORM })
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
        title="Catálogo de análisis"
        description="Análisis del laboratorio con grupo, método, muestra y precio de catálogo."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo análisis
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin análisis"
            description="Registra el primer análisis del catálogo."
            actionLabel="Nuevo análisis"
            onAction={openCreate}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
          />
        )}
      </Card>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle del análisis"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={analysisDetailFields(selected)}
      />

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) {
            setEditing(null)
            setForm({ ...EMPTY_FORM })
          }
        }}
        title={editing ? 'Editar análisis' : 'Nuevo análisis'}
        description="Grupo, método, muestra y precio del análisis en catálogo."
        className="max-w-md max-h-[90vh] overflow-y-auto"
      >
        {catalogLoading ? (
          <p className="py-8 text-center text-sm text-muted">Cargando catálogos…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Grupo"
              name="analysis_group_id"
              value={form.analysis_group_id}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar grupo…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <Select
              label="Método"
              name="method_id"
              value={form.method_id}
              onChange={handleChange}
            >
              <option value="">Sin método</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
            <Select
              label="Muestra"
              name="sample_id"
              value={form.sample_id}
              onChange={handleChange}
            >
              <option value="">Seleccionar muestra…</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              label="Nombre"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <Input
              label="Precio (Bs.)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
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
        )}
      </Modal>
    </AnimatedPage>
  )
}
