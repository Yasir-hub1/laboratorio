import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card, DataTable, Modal, ModalFooter } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useIndexQuery } from '@/hooks/useIndexQuery'

export function TypeOutflowsPage() {
  const index = useIndexQuery(laboratoryApi.getTypeOutflows)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '' })

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const columns = useMemo(
    () => [{ accessorKey: 'name', header: 'Nombre' }],
    [],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await laboratoryApi.createTypeOutflow(form)
      toast.success('Tipo de egreso registrado')
      setModalOpen(false)
      setForm({ name: '' })
      index.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 7"
        title="Tipos de egreso"
        description="Catálogo de conceptos para egresos de caja."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo tipo
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin tipos de egreso"
            description="Registra el primer tipo de egreso."
            actionLabel="Nuevo tipo"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
          />
        )}
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Nuevo tipo de egreso">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
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
