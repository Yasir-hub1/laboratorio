import { useCallback, useMemo } from 'react'
import { HtmlPdfPreviewModal } from '@/components/common/HtmlPdfPreviewModal'
import { laboratoryApi } from '@/services/laboratoryApi'
import { APP_NAME } from '@/utils/constants'
import {
  buildLaboratoryOrderReportDocument,
  LABORATORY_ORDER_REPORT_STYLES,
} from '@/utils/laboratoryOrderReportHtml'
import { buildOrderPdfFilename } from '@/utils/pdfBlob'

/**
 * Vista previa del comprobante de orden (pdf-data + plantilla HTML en frontend).
 */
export function OrderPdfPreviewModal({
  open,
  onOpenChange,
  orderId,
  orderCode,
  footerExtra,
  logoUrl,
}) {
  const fetchData = useCallback(() => laboratoryApi.getOrderPdfData(orderId), [orderId])

  const buildDocument = useCallback(
    (data) => buildLaboratoryOrderReportDocument(data, logoUrl, APP_NAME),
    [logoUrl],
  )

  const title = useMemo(
    () => (orderCode ? `Orden · ${orderCode}` : `Orden #${orderId}`),
    [orderCode, orderId],
  )

  const filename = buildOrderPdfFilename(orderId, 'order', orderCode)

  if (!orderId) return null

  return (
    <HtmlPdfPreviewModal
      open={open}
      onOpenChange={onOpenChange}
      fetchData={fetchData}
      buildDocument={buildDocument}
      stylesCss={LABORATORY_ORDER_REPORT_STYLES}
      title={title}
      description="Revisa el comprobante de orden antes de imprimir o descargar."
      filename={filename}
      reloadKey={orderId}
      footerExtra={footerExtra}
    />
  )
}
