import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
import { EntityViewModal } from '@/components/common/EntityViewModal'
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
import { ROUTES } from '@/utils/constants'
import { buildInsurancePayload, buildStatusPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { toast } from 'sonner'

const EMPTY_FORM = { name: '', username: '', password: '', contact: '' }

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function insuranceDetailFields(data) {
  if (!data) return []
  return [
    { label: 'Nombre', value: data.name },
    { label: 'Usuario', value: data.username },
    // { label: 'Email', value: data.email ?? '—' },
    { label: 'Contacto', value: data.contact ?? '—' },
  ]
}

export function InsurancesPage() {
  const navigate = useNavigate()
  const { confirm } = useConfirmAction()
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusToggling, setStatusToggling] = useState(false)

  const index = useIndexQuery(laboratoryApi.getInsurances, {
    extraParams: { status: statusFilter },
  })

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
    refreshSelected,
  } = useEntityView(laboratoryApi.getInsurance)

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
      username: row.username ?? '',
      password: '',
      contact: row.contact != null ? String(row.contact) : '',
    })
    setModalOpen(true)
  }

  const handleDelete = useCallback(
    async (row) => {
      const label = row.name ?? 'este seguro'
      const ok = await confirm({
        title: 'Eliminar seguro',
        description: `¿Eliminar "${label}"? El seguro se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del seguro')
        return
      }
      try {
        await laboratoryApi.deleteInsurance(id)
        toastApiSuccess('Seguro eliminado')
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
        await laboratoryApi.updateInsuranceStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Seguro desactivado' : 'Seguro activado')
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
      { accessorKey: 'username', header: 'Usuario', cell: ({ getValue }) => getValue() ?? '—' },
      // { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'contact', header: 'Contacto', cell: ({ getValue }) => getValue() ?? '—' },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const active = isActiveStatus(row.original.status ?? row.original.is_active)
          return <Badge variant={active ? 'success' : 'default'}>{active ? 'Activo' : 'Inactivo'}</Badge>
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
            onExtra={() => {
              const insuranceId = resolveEntityId(row.original)
              if (insuranceId) {
                navigate(ROUTES.INSURANCE_PRICES.replace(':id', insuranceId))
              }
            }}
            extraLabel="Asignar precios"
          />
        ),
      },
    ],
    [navigate, openView, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildInsurancePayload(form, { isEdit: Boolean(editing) })
      if (editing) {
        await laboratoryApi.updateInsurance(editing.id, payload)
        toastApiSuccess('Seguro actualizado')
      } else {
        await laboratoryApi.createInsurance(payload)
        toastApiSuccess('Seguro registrado')
      }
      setModalOpen(false)
      setForm(EMPTY_FORM)
      setEditing(null)
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
        title="Precios por seguro"
        description="Aseguradoras y tarifas convenidas por análisis. Usa «Asignar precios» en cada fila."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to={ROUTES.INSURANCE_CATALOG_PRICES}>Precios sin seguro</Link>
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nuevo seguro
            </Button>
          </div>
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
            title="Sin seguros"
            description={
              statusFilter === '1'
                ? 'No hay seguros activos con este criterio.'
                : statusFilter === '2'
                  ? 'No hay seguros inactivos con este criterio.'
                  : 'Registra la primera aseguradora para el laboratorio.'
            }
            actionLabel={statusFilter === 'all' ? 'Nuevo seguro' : undefined}
            onAction={statusFilter === 'all' ? openCreate : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            showRowNumbers={true}
          />
        )}
      </Card>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle del seguro"
        description={selected?.name}
        loading={detailLoading}
        data={selected}
        fields={insuranceDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
        footerExtra={
          resolveEntityId(selected) ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setViewOpen(false)
                navigate(
                  ROUTES.INSURANCE_PRICES.replace(':id', resolveEntityId(selected)),
                )
              }}
            >
              Asignar precios
            </Button>
          ) : null
        }
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar seguro' : 'Nuevo seguro'}
        description="Datos de acceso y contacto de la aseguradora."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" name="name" value={form.name} onChange={handleChange} required />
          <Input
            label="Usuario"
            name="username"
            value={form.username}
            onChange={handleChange}
            required={!editing}
          />
          <Input
            label={editing ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required={!editing}
          />
          <Input label="Contacto" name="contact" value={form.contact} onChange={handleChange} />
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
    </AnimatedPage>
  )
}
