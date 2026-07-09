import { PortalResultsPdfPreviewModal } from '@/components/portal/PortalResultsPdfPreviewModal'
import { patientPortalApi } from '@/services/patientPortalApi'

export function PatientPdfPreviewModal(props) {
  return (
    <PortalResultsPdfPreviewModal
      {...props}
      fetchPdfData={patientPortalApi.getOrderResultsPdfData}
      description="Revisa tus resultados antes de imprimir o descargar."
    />
  )
}
