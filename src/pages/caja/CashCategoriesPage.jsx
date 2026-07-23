import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useCrudPermission } from '@/hooks/usePermission'
import { Badge, Button, Card, DataTable, Modal, ModalFooter, Select } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { unwrapList } from '@/utils/apiHelpers'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

function normalizeCategory(row, kind) {
  return {
    ...row,
    kind,
    _key: `${kind}-${row.id}`,
  }
}

export function CashCategoriesPage() {
  const { canView, canCreate, canEdit, canDeactivate, canDelete } = useCrudPermission('caja.categorias')
  const { confirmDeactivate } = useConfirmAction()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', kind: 'inflow' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inflowsRaw, outflowsRaw] = await Promise.all([
        laboratoryApi.getTypeInflows({ paginate: false }),
        laboratoryApi.getTypeOutflows({ paginate: false }),
      ])
      const inflows = unwrapList(inflowsRaw).items
      const outflows = unwrapList(outflowsRaw).items
      const merged = [
        ...inflows.map((r) => normalizeCategory(r, 'inflow')),
        ...outflows.map((r) => normalizeCategory(r, 'outflow')),
      ].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'es'))
      setItems(merged)
    } catch (err) {
      toastApiError(err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', kind: 'inflow' })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({ name: row.name ?? '', kind: row.kind })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        if (editing.kind === 'inflow') {
          await laboratoryApi.updateTypeInflow(editing.id, { name: form.name })
        } else {
          await laboratoryApi.updateTypeOutflow(editing.id, { name: form.name })
        }
        toastApiSuccess('Categoría actualizada')
      } else if (form.kind === 'inflow') {
        await laboratoryApi.createTypeInflow({ name: form.name })
        toastApiSuccess('Categoría de ingreso creada')
      } else {
        await laboratoryApi.createTypeOutflow({ name: form.name })
        toastApiSuccess('Categoría de egreso creada')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = useCallback(
    async (row) => {
      if (!(await confirmDeactivate(row.name ?? 'esta categoría'))) return
      try {
        if (row.kind === 'inflow') await laboratoryApi.deleteTypeInflow(row.id)
        else await laboratoryApi.deleteTypeOutflow(row.id)
        toastApiSuccess('Categoría eliminada')
        load()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirmDeactivate, load],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Nombre' },
      {
        id: 'kind',
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge variant={row.original.kind === 'inflow' ? 'success' : 'warning'}>
            {row.original.kind === 'inflow' ? 'Ingreso' : 'Egreso'}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge variant={isActiveStatus(row.original) ? 'success' : 'default'}>
            {isActiveStatus(row.original) ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
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

  if (loading && items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Categorías de caja"
        description="Catálogo unificado de conceptos de ingreso y egreso."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nueva categoría
            </Button>
          ) : null
        }
      />

      <Card>
        {items.length === 0 ? (
          <EmptyState
            title="Sin categorías"
            description="Crea la primera categoría de ingreso o egreso."
            actionLabel={canCreate ? "Nueva categoría" : undefined}
            onAction={canCreate ? openCreate : undefined}
          />
        ) : (
          <DataTable columns={columns} data={items} getRowId={(row) => row._key} />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <Select
              label="Tipo"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              required
            >
              <option value="inflow">Ingreso</option>
              <option value="outflow">Egreso</option>
            </Select>
          )}
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              Guardar
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </AnimatedPage>
  )
}
