import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { buildDoctorPayload, buildStatusPayload } from '@/utils/apiPayload'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useEntityView } from '@/hooks/useEntityView'
import { EntityViewModal } from '@/components/common/EntityViewModal'
import { SpecialtyMultiSelect } from '@/components/common/SpecialtyMultiSelect'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { RowActions } from '@/components/common/RowActions'
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
import { resolveEntityId } from '@/utils/entityId'
import { getDoctorSpecialtyIds } from '@/utils/doctorHelpers'
import { isActiveStatus } from '@/utils/statusHelpers'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const EMPTY_FORM = {
  ci: '',
  first_name: '',
  last_name: '',
  specialty_ids: [],
  phone: '',
  email: '',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: '1', label: 'Activos' },
  { value: '2', label: 'Inactivos' },
]

function doctorDisplayName(row) {
  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.ci || 'este médico'
}

function rowToForm(row) {
  return {
    ci: row.ci ?? '',
    first_name: row.first_name ?? '',
    last_name: row.last_name ?? '',
    specialty_ids: getDoctorSpecialtyIds(row),
    phone: row.phone ?? '',
    email: row.email ?? '',
  }
}

function SpecialtyBadges({ ids, specialtyMap }) {
  if (!ids?.length) {
    return <span className="text-muted">—</span>
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {ids.map((id) => (
        <Badge key={id} variant="default" className="font-normal">
          {specialtyMap.get(String(id)) ?? id}
        </Badge>
      ))}
    </div>
  )
}

export function DoctorsPage() {
  const { confirm } = useConfirmAction()
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusToggling, setStatusToggling] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const {
    viewOpen,
    setViewOpen,
    selected,
    detailLoading,
    openView,
    refreshSelected,
  } = useEntityView(laboratoryApi.getDoctor)

  const index = useIndexQuery(laboratoryApi.getDoctors, {
    extraParams: { status: statusFilter },
  })
  const { items: specialties } = useApiList(laboratoryApi.getSpecialties, [])

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const specialtyMap = useMemo(() => {
    const map = new Map()
    specialties.forEach((s) => {
      if (s?.id != null) map.set(String(s.id), s.name ?? '—')
    })
    return map
  }, [specialties])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = useCallback(
    async (row) => {
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del médico')
        return
      }

      setModalOpen(true)
      setLoadingEdit(true)
      setEditing(row)
      setForm(rowToForm(row))

      try {
        const detail = await laboratoryApi.getDoctor(id)
        const data = detail ?? row
        setEditing(data)
        setForm(rowToForm(data))
      } catch (err) {
        toastApiError(err)
      } finally {
        setLoadingEdit(false)
      }
    },
    [],
  )

  const handleDelete = useCallback(
    async (row) => {
      const label = doctorDisplayName(row)
      const ok = await confirm({
        title: 'Eliminar médico',
        description: `¿Eliminar a "${label}"? El médico se eliminará del sistema.`,
        confirmLabel: 'Eliminar',
        variant: 'danger',
      })
      if (!ok) return
      const id = resolveEntityId(row)
      if (!id) {
        toast.error('No se encontró el ID del médico')
        return
      }
      try {
        await laboratoryApi.deleteDoctor(id)
        toastApiSuccess('Médico eliminado')
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
        await laboratoryApi.updateDoctorStatus(id, buildStatusPayload(active))
        toastApiSuccess(active ? 'Médico desactivado' : 'Médico activado')
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

  const doctorDetailFields = useCallback(
    (data) => {
      if (!data) return []
      return [
        { label: 'CI', value: data.ci },
        {
          label: 'Nombre',
          value: [data.first_name, data.last_name].filter(Boolean).join(' '),
        },
        { label: 'Teléfono', value: data.phone },
        { label: 'Email', value: data.email ?? '—' },
      ]
    },
    [],
  )

  const columns = useMemo(
    () => [
      { accessorKey: 'ci', header: 'CI', cell: ({ getValue }) => getValue() ?? '—' },
      {
        id: 'full_name',
        header: 'Nombre',
        cell: ({ row }) =>
          [row.original.first_name, row.original.last_name].filter(Boolean).join(' ') || '—',
      },
      {
        id: 'specialties',
        header: 'Especialidades',
        cell: ({ row }) => (
          <SpecialtyBadges
            ids={getDoctorSpecialtyIds(row.original)}
            specialtyMap={specialtyMap}
          />
        ),
      },
      { accessorKey: 'phone', header: 'Teléfono', cell: ({ getValue }) => getValue() ?? '—' },
      { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() ?? '—' },
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
    [specialtyMap, openView, openEdit, handleDelete],
  )

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.specialty_ids.length === 0) {
      toast.error('Selecciona al menos una especialidad')
      return
    }

    setSaving(true)
    try {
      const payload = buildDoctorPayload(form)
      if (editing) {
        const id = resolveEntityId(editing)
        await laboratoryApi.updateDoctor(id, payload)
        toastApiSuccess('Médico actualizado')
      } else {
        await laboratoryApi.createDoctor(payload)
        toastApiSuccess('Médico registrado')
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

  const selectedSpecialtyIds = selected ? getDoctorSpecialtyIds(selected) : []

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 3"
        title="Médicos"
        description="Médicos referentes. Cada uno puede tener varias especialidades."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo médico
          </Button>
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
            title="Sin médicos"
            description={
              statusFilter === '1'
                ? 'No hay médicos activos con este criterio.'
                : statusFilter === '2'
                  ? 'No hay médicos inactivos con este criterio.'
                  : 'Registra médicos referentes del laboratorio.'
            }
            actionLabel={statusFilter === 'all' ? 'Nuevo médico' : undefined}
            onAction={statusFilter === 'all' ? openCreate : undefined}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            getRowId={(row) => resolveEntityId(row) ?? row.ci}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar médico' : 'Nuevo médico'}
        description="Puedes asignar una o más especialidades al médico."
      >
        {loadingEdit ? (
          <p className="py-8 text-center text-sm text-muted">Cargando datos del médico…</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input label="CI" name="ci" value={form.ci} onChange={handleChange} />
            <Input
              label="Nombres"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
            />
            <Input
              label="Apellidos"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
            />
            <Input label="Teléfono" name="phone" value={form.phone} onChange={handleChange} />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
            <SpecialtyMultiSelect
              options={specialties}
              value={form.specialty_ids}
              onChange={(specialty_ids) => setForm((prev) => ({ ...prev, specialty_ids }))}
              required
            />
            <ModalFooter className="sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Guardar'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      <EntityViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detalle de médico"
        description={
          selected
            ? [selected.first_name, selected.last_name].filter(Boolean).join(' ')
            : undefined
        }
        loading={detailLoading}
        data={selected}
        fields={doctorDetailFields(selected)}
        onToggleStatus={handleToggleStatus}
        statusToggling={statusToggling}
      >
        {!detailLoading && selected && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-foreground">Especialidades</p>
            {selectedSpecialtyIds.length === 0 ? (
              <p className="text-sm text-muted">Sin especialidades asignadas</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedSpecialtyIds.map((id) => (
                  <Badge key={id} variant="default">
                    {specialtyMap.get(String(id)) ?? id}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </EntityViewModal>
    </AnimatedPage>
  )
}
