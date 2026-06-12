import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { storage } from '@/utils/storage'
import { ROUTES } from '@/utils/constants'

export function PatientPortalPage() {
  const navigate = useNavigate()
  const patient = storage.getPatient()
  const [orders] = useState([])

  useEffect(() => {
    if (!storage.getPatientToken()) {
      navigate(ROUTES.PATIENT_LOGIN, { replace: true })
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('biocontrol_patient_token')
    localStorage.removeItem('biocontrol_patient')
    toast.success('Sesión cerrada')
    navigate(ROUTES.PATIENT_LOGIN)
  }

  const patientName =
    patient?.full_name ||
    patient?.name ||
    [patient?.first_name, patient?.last_name].filter(Boolean).join(' ') ||
    'Paciente'

  return (
    <AnimatedPage className="mx-auto max-w-3xl p-4">
      <PageHeader
        title={`Hola, ${patientName}`}
        description="Portal de paciente — consulta tus órdenes y resultados (próximamente con API dedicada)."
        actions={
          <Button variant="secondary" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis órdenes</CardTitle>
          <CardDescription>
            Listado de órdenes y resultados disponibles para descarga.
          </CardDescription>
        </CardHeader>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">
            No hay órdenes para mostrar. Cuando el backend exponga el endpoint del portal,
            aquí verás el historial y podrás descargar PDFs de resultados.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {orders.map((o) => (
              <li key={o.id} className="py-3">
                {o.code ?? `Orden #${o.id}`}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AnimatedPage>
  )
}
