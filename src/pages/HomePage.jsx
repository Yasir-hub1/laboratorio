import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Bell, LayoutGrid, Table2 } from 'lucide-react'
import { PageTransition } from '@/components/common/PageTransition'
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Modal,
  ModalFooter,
} from '@/components/ui'
import { APP_DESCRIPTION, APP_NAME } from '@/utils/constants'

const DEMO_DATA = [
  { id: '001', paciente: 'Ana García', estudio: 'Hemograma', estado: 'Pendiente' },
  { id: '002', paciente: 'Luis Pérez', estudio: 'Glucosa', estado: 'Completado' },
  { id: '003', paciente: 'María López', estudio: 'Perfil lipídico', estado: 'En proceso' },
]

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false)

  const columns = useMemo(
    () => [
      { accessorKey: 'id', header: 'ID' },
      { accessorKey: 'paciente', header: 'Paciente' },
      { accessorKey: 'estudio', header: 'Estudio' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ getValue }) => {
          const value = getValue()
          const styles = {
            Pendiente: 'bg-amber-50 text-amber-700',
            Completado: 'bg-emerald-50 text-emerald-700',
            'En proceso': 'bg-blue-50 text-blue-700',
          }
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[value] ?? 'bg-surface-muted text-muted'}`}
            >
              {value}
            </span>
          )
        },
      },
    ],
    [],
  )

  return (
    <PageTransition>
      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
          <p className="max-w-xl text-muted">{APP_DESCRIPTION}</p>
        </motion.section>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: LayoutGrid, label: 'Estructura base', desc: 'pages, services, context' },
            { icon: Bell, label: 'Sonner toast', desc: 'notificaciones modernas' },
            { icon: Table2, label: 'TanStack Table', desc: 'tablas con paginación' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <item.icon className="mb-2 h-5 w-5 text-accent" />
                  <CardTitle className="text-base">{item.label}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Componentes de demostración</CardTitle>
            <CardDescription>
              Prueba toast, modal y tabla. Sustituye esta página con tu flujo real.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                toast.success('Operación exitosa', {
                  description: 'Integración Sonner lista.',
                })
              }
            >
              Mostrar toast
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Abrir modal
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                toast.info('PWA activa', {
                  description: 'La app puede instalarse y actualizarse offline.',
                })
              }
            >
              Info PWA
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Muestras recientes</CardTitle>
            <CardDescription>Tabla con @tanstack/react-table</CardDescription>
          </CardHeader>
          <DataTable
            columns={columns}
            data={DEMO_DATA}
            searchPlaceholder="Buscar muestra…"
          />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Modal de ejemplo"
        description="Radix UI Dialog con estilos Tailwind minimalistas."
      >
        <p className="text-sm text-muted">
          Aquí puedes colocar formularios, confirmaciones o detalle de registros.
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => {
            setModalOpen(false)
            toast.success('Guardado correctamente')
          }}>
            Confirmar
          </Button>
        </ModalFooter>
      </Modal>
    </PageTransition>
  )
}
