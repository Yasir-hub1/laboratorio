import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useAuth } from '@/hooks/useAuth'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { Badge, Button, Card, DataTable, Modal, ModalFooter, Select } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildCashPayload } from '@/utils/apiPayload'
import { cashDisplayName, resolveCashId } from '@/utils/cashHelpers'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = { name: '', branch_id: '' }

export function CashesPage() {
  const { branchId: sessionBranchId } = useAuth()
  const { confirmDeactivate } = useConfirmAction()
  const { items: branches } = useApiList(laboratoryApi.getBranches, [])
  const [filterBranchId, setFilterBranchId] = useState(() => sessionBranchId ?? '')
  const index = useIndexQuery(
    laboratoryApi.getCashes,
    {
      enabled: !!filterBranchId,
      extraParams: filterBranchId ? { branch_id: filterBranchId } : {},
    },
    [filterBranchId],
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (sessionBranchId && !filterBranchId) {
      setFilterBranchId(sessionBranchId)
    }
  }, [sessionBranchId, filterBranchId])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', branch_id: filterBranchId ?? '' })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      name: row.name ?? '',
      branch_id: String(row.branch_id ?? row.branch?.id ?? filterBranchId ?? ''),
    })
    setModalOpen(true)
  }

  const handleDeactivate = useCallback(
    async (row) => {
      const id = resolveCashId(row)
      if (!id) return
      if (!(await confirmDeactivate(cashDisplayName(row)))) return
      try {
        await laboratoryApi.deleteCash(id)
        toastApiSuccess('Caja desactivada')
        index.reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirmDeactivate, index.reload],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Nombre', cell: ({ row }) => cashDisplayName(row.original) },
      {
        id: 'branch',
        header: 'Sucursal',
        cell: ({ row }) => row.original.branch?.name ?? '—',
      },
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
          <RowActions onEdit={() => openEdit(row.original)} onDelete={() => handleDeactivate(row.original)} />
        ),
      },
    ],
    [handleDeactivate],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = buildCashPayload(form)
      const id = resolveCashId(editing)
      if (editing && id) {
        await laboratoryApi.updateCash(id, payload)
        toastApiSuccess('Caja actualizada')
      } else {
        await laboratoryApi.createCash(payload)
        toastApiSuccess('Caja registrada')
      }
      setModalOpen(false)
      setEditing(null)
      index.reload()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 7"
        title="Cajas"
        description="Mantenimiento de cajas por sucursal. La asignación de usuarios se gestiona en Usuarios."
        actions={
          <Button onClick={openCreate} disabled={!filterBranchId}>
            <Plus className="h-4 w-4" />
            Nueva caja
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <Select
          label="Sucursal"
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
          className="max-w-xs"
        >
          <option value="">Seleccionar sucursal…</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Card>

      <Card>
        {!filterBranchId ? (
          <EmptyState title="Selecciona una sucursal" description="Elige la sucursal para ver sus cajas." />
        ) : index.loading && index.items.length === 0 ? (
          <LoadingScreen />
        ) : index.isEmpty ? (
          <EmptyState
            title="Sin cajas"
            description="Registra cajas para esta sucursal."
            actionLabel="Nueva caja"
            onAction={openCreate}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            getRowId={(row) => resolveCashId(row)}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar caja' : 'Nueva caja'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="Sucursal"
            value={form.branch_id}
            onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            required
          >
            <option value="">Seleccionar…</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
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
