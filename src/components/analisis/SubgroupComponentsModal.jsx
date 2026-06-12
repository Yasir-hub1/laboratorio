import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { RowActions } from '@/components/common/RowActions'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { Badge, Button, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildComponentAnalysisPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  name: '',
  unit_measurement: '',
  ref_min: '',
  ref_max: '',
  ref_description: '',
  position: null,
  state: 'true',
  status: 'true',
}

function boolToForm(value) {
  return isActiveStatus(value) ? 'true' : 'false'
}

function rowToForm(row) {
  return {
    name: row.name ?? '',
    unit_measurement: row.unit_measurement ?? '',
    ref_min: row.ref_min != null ? String(row.ref_min) : '',
    ref_max: row.ref_max != null ? String(row.ref_max) : '',
    ref_description: row.ref_description ?? '',
    position: row.position != null ? String(row.position) : '',
    state: boolToForm(row.state ?? row.status),
    status: boolToForm(row.status ?? row.state),
  }
}

function formatRefRange(row) {
  const min = row.ref_min
  const max = row.ref_max
  if (min == null && max == null) return '—'
  if (min != null && max != null) return `${min} – ${max}`
  return min != null ? String(min) : String(max)
}

/**
 * CRUD de component-analyses de un subgrupo (GET /analysis-subgroups/{id}/components).
 */
export function SubgroupComponentsModal({
  open,
  onOpenChange,
  subgroup,
  analysisId,
  analysisName,
}) {
  const { confirm } = useConfirmAction()
  const subgroupId = resolveEntityId(subgroup)
  const subgroupName = subgroup?.name ?? 'Subgrupo'

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const fetchComponents = useCallback(
    (params) => laboratoryApi.getAnalysisSubgroupComponents(subgroupId, params),
    [subgroupId],
  )

  const index = useIndexQuery(
    fetchComponents,
    {
      initialOrderBy: 'position',
      initialOrderDir: 'asc',
      enabled: open && Boolean(subgroupId),
    },
    [subgroupId, open],
  )

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  useEffect(() => {
    if (!open) {
      setFormOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    }
  }, [open])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm(rowToForm(row))
    setFormOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      const id = resolveEntityId(row)
      if (!id) return
      const label = row.name ?? 'este componente'
      const ok = await confirm({
        title: 'Eliminar componente',
        description: `¿Eliminar "${label}"? El componente se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      try {
        await laboratoryApi.deleteComponentAnalysis(id)
        toastApiSuccess('Componente eliminado')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirm, index.reload],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Nombre', cell: ({ getValue }) => getValue() ?? '—' },
      {
        accessorKey: 'unit_measurement',
        header: 'Unidad',
        cell: ({ getValue }) => getValue() ?? '—',
      },
      {
        id: 'ref_range',
        header: 'Ref. min – max',
        cell: ({ row }) => formatRefRange(row.original),
      },
      // {
      //   accessorKey: 'position',
      //   header: 'Posición',
      //   cell: ({ getValue }) => {
      //     const v = getValue()
      //     return v != null && v !== '' ? v : '—'
      //   },
      // },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const active = isActiveStatus(row.original.status ?? row.original.state)
          return (
            <Badge variant={active ? 'success' : 'default'}>{active ? 'Activo' : 'Inactivo'}</Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <RowActions onEdit={() => openEdit(row.original)} onDelete={() => handleDelete(row.original)} />
        ),
      },
    ],
    [handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subgroupId || !analysisId) return
    setSubmitting(true)
    try {
      const payload = buildComponentAnalysisPayload({
        ...form,
        analysis_subgroup_id: subgroupId,
        laboratory_analysis_id: analysisId,
      })
      const id = resolveEntityId(editing)
      if (editing && id) {
        await laboratoryApi.updateComponentAnalysis(id, payload)
        toastApiSuccess('Componente actualizado')
      } else {
        await laboratoryApi.createComponentAnalysis(payload)
        toastApiSuccess('Componente registrado')
      }
      setFormOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      index.reload()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Componentes del subgrupo"
        description={`${subgroupName}${analysisName ? ` · ${analysisName}` : ''}`}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-4 flex justify-end">
          <Button type="button" size="sm" onClick={openCreate} disabled={!subgroupId}>
            <Plus className="h-4 w-4" />
            Nuevo componente
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={index.items}
          serverPagination={index.serverPagination}
          enableSearch={false}
          enableColumnVisibility={false}
          showPagination={index.serverPagination.totalRows > 10}
          emptyMessage="Sin componentes en este subgrupo"
          getRowId={(row) => resolveEntityId(row) ?? row.name}
          onRefresh={index.reload}
          isRefreshing={index.loading}
        />

        <ModalFooter className="mt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar componente' : 'Nuevo componente'}
        description={`Subgrupo: ${subgroupName}`}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            className="sm:col-span-2"
            label="Nombre"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <Input
            label="Unidad de medida"
            name="unit_measurement"
            value={form.unit_measurement}
            onChange={handleChange}
            placeholder="Ej. g/dL"
          />
          {/* <Input
            label="Posición"
            name="position"
            type="number"
            min="0"
            step="1"
            value={form.position}
            onChange={handleChange}
          /> */}
          <Input
            label="Ref. mínima"
            name="ref_min"
            type="number"
            step="any"
            value={form.ref_min}
            onChange={handleChange}
          />
          <Input
            label="Ref. máxima"
            name="ref_max"
            type="number"
            step="any"
            value={form.ref_max}
            onChange={handleChange}
          />
          <Textarea
            className="sm:col-span-2"
            label="Descripción referencial"
            name="ref_description"
            value={form.ref_description}
            onChange={handleChange}
            placeholder="Valores referenciales normales"
          />
          {/* <Select label="Estado (state)" name="state" value={form.state} onChange={handleChange}>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </Select> */}
          {/* <Select label="Estado (status)" name="status" value={form.status} onChange={handleChange}>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </Select> */}
          <ModalFooter className="sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : editing ? 'Actualizar' : 'Guardar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
