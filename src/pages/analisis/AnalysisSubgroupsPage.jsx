import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Layers, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { SubgroupComponentsModal } from '@/components/analisis/SubgroupComponentsModal'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
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
  Select,
} from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildAnalysisSubgroupPayload, buildStatusPayload } from '@/utils/apiPayload'
import { ROUTES } from '@/utils/constants'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '', position: '', state: '1' }

function subgroupDetailFields(data) {
  if (!data) return []
  const active = isActiveStatus(data.status ?? data.state ?? data.is_active)
  return [
    { label: 'Nombre', value: data.name },
    // { label: 'Posición', value: data.position ?? '—' },
    { label: 'Estado', value: active ? 'Activo' : 'Inactivo' },
  ]
}

function rowToForm(row) {
  const state = row.state ?? row.status ?? 1
  return {
    name: row.name ?? '',
    position: row.position != null ? String(row.position) : '',
    state: String(state),
  }
}

export function AnalysisSubgroupsPage() {
  const { analysisId } = useParams()
  const { confirm } = useConfirmAction()
  const [analysis, setAnalysis] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusToggling, setStatusToggling] = useState(false)
  const [componentsSubgroup, setComponentsSubgroup] = useState(null)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
    refreshSelected,
  } = useEntityView(laboratoryApi.getAnalysisSubgroup)

  const fetchSubgroups = useCallback(
    (params) => laboratoryApi.getLaboratoryAnalysisSubgroups(analysisId, params),
    [analysisId],
  )

  const index = useIndexQuery(
    fetchSubgroups,
    {
      initialOrderBy: 'position',
      initialOrderDir: 'asc',
      enabled: Boolean(analysisId),
    },
    [analysisId],
  )

  useEffect(() => {
    if (!analysisId) return
    setLoadingAnalysis(true)
    laboratoryApi
      .getLaboratoryAnalysis(analysisId)
      .then(setAnalysis)
      .catch((err) => toastApiError(err))
      .finally(() => setLoadingAnalysis(false))
  }, [analysisId])

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
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del subgrupo')
        return
      }
      const label = row.name ?? 'este subgrupo'
      const ok = await confirm({
        title: 'Eliminar subgrupo',
        description: `¿Eliminar "${label}"? El subgrupo se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      try {
        await laboratoryApi.deleteAnalysisSubgroup(id)
        toastApiSuccess('Subgrupo eliminado')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirm, index.reload],
  )

  const handleToggleStatus = useCallback(
    async (entity) => {
      const id = resolveEntityId(entity)
      if (!id) return
      const active = isActiveStatus(entity.status ?? entity.state ?? entity.is_active)
      setStatusToggling(true)
      try {
        await laboratoryApi.updateAnalysisSubgroupStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Subgrupo desactivado' : 'Subgrupo activado')
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
      { accessorKey: 'name', header: 'Nombre', cell: ({ getValue }) => getValue() ?? '—' },
      // {
      //   accessorKey: 'position',
      //   header: 'Posición',
      //   cell: ({ getValue }) => {
      //     const v = getValue()
      //     return v != null && v !== '' ? v : '—'
      //   },
      // },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const active = isActiveStatus(
            row.original.status  ?? row.original.is_active,
          )
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
            onExtra={() => setComponentsSubgroup(row.original)}
            extraLabel="Componentes"
            extraIcon={Layers}
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
    if (!analysisId) return
    setSaving(true)
    try {
      const payload = buildAnalysisSubgroupPayload(form, { laboratoryAnalysisId: analysisId })
      const id = resolveEntityId(editing)
      if (editing && id) {
        await laboratoryApi.updateAnalysisSubgroup(id, payload)
        toastApiSuccess('Subgrupo actualizado')
      } else {
        await laboratoryApi.createAnalysisSubgroup(payload)
        toastApiSuccess('Subgrupo registrado')
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

  if (!analysisId) {
    return (
      <AnimatedPage>
        <p className="text-sm text-muted">Análisis no especificado.</p>
        <Button variant="secondary" className="mt-4" asChild>
          <Link to={ROUTES.ANALYSES}>Volver al catálogo</Link>
        </Button>
      </AnimatedPage>
    )
  }

  if (loadingAnalysis && index.loading && index.items.length === 0) {
    return <LoadingScreen />
  }

  const analysisTitle = analysis?.name ?? 'Análisis'

  return (
    <AnimatedPage>
      <PageHeader
        title={`Subgrupos — ${analysisTitle}`}
        description="Subgrupos del análisis. Gestiona posición, estado y componentes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to={ROUTES.ANALYSES}>
                <ArrowLeft className="h-4 w-4" />
                Volver al catálogo
              </Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo subgrupo
            </Button>
          </div>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin subgrupos"
            description="Registra el primer subgrupo de este análisis."
            actionLabel="Nuevo subgrupo"
            onAction={openCreate}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            enableSearch={false}
            getRowId={(row) => resolveEntityId(row) ?? row.name}
            onRefresh={index.reload}
            isRefreshing={index.loading}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar subgrupo' : 'Nuevo subgrupo'}
        description={`Análisis: ${analysisTitle}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
          {/* <Input
            label="Posición"
            name="position"
            type="number"
            min="0"
            step="1"
            value={form.position}
            onChange={handleChange}
            required
          /> */}
          <Select label="Estado" name="state" value={form.state} onChange={handleChange}>
            <option value="1">Activo</option>
            <option value="2">Inactivo</option>
          </Select>
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
        title="Detalle del subgrupo"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={subgroupDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
        footerExtra={
          selected ? (
            <Button type="button" variant="secondary" onClick={() => setComponentsSubgroup(selected)}>
              Gestionar componentes
            </Button>
          ) : null
        }
      />

      <SubgroupComponentsModal
        open={Boolean(componentsSubgroup)}
        onOpenChange={(open) => !open && setComponentsSubgroup(null)}
        subgroup={componentsSubgroup}
        analysisId={analysisId}
        analysisName={analysisTitle}
      />
    </AnimatedPage>
  )
}
