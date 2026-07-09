import { PortalResultsPdfPreviewModal } from '@/components/portal/PortalResultsPdfPreviewModal'
import { insurancePortalApi } from '@/services/insurancePortalApi'

export function InsurancePdfPreviewModal(props) {
  return (
    <PortalResultsPdfPreviewModal
      {...props}
      fetchPdfData={insurancePortalApi.getOrderResultsPdfData}
      description="Revisa los resultados antes de imprimir o descargar."
    />
  )
}
