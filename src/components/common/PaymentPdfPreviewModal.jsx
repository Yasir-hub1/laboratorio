import { useCallback, useMemo } from 'react'
import { HtmlPdfPreviewModal } from '@/components/common/HtmlPdfPreviewModal'
import { laboratoryApi } from '@/services/laboratoryApi'
import { APP_NAME } from '@/utils/constants'
import {
  buildPaymentReceiptReportDocument,
  PAYMENT_RECEIPT_REPORT_STYLES,
} from '@/utils/paymentReceiptReportHtml'

/**
 * Vista previa del comprobante de pago (pdf-data + plantilla HTML en frontend).
 */
export function PaymentPdfPreviewModal({
  open,
  onOpenChange,
  paymentId,
  paymentCode,
  footerExtra,
  logoUrl,
}) {
  const fetchData = useCallback(() => laboratoryApi.getPaymentPdfData(paymentId), [paymentId])

  const buildDocument = useCallback(
    (data) => buildPaymentReceiptReportDocument(data, logoUrl, APP_NAME),
    [logoUrl],
  )

  const title = useMemo(() => {
    if (paymentCode) return `Pago · ${paymentCode}`
    return paymentId ? `Pago #${paymentId}` : 'Comprobante de pago'
  }, [paymentCode, paymentId])

  const filename = paymentCode
    ? `comprobante-pago-${paymentCode}.pdf`
    : `comprobante-pago-${paymentId}.pdf`

  if (!paymentId) return null

  return (
    <HtmlPdfPreviewModal
      open={open}
      onOpenChange={onOpenChange}
      fetchData={fetchData}
      buildDocument={buildDocument}
      stylesCss={PAYMENT_RECEIPT_REPORT_STYLES}
      title={title}
      description="Revisa el comprobante de pago antes de imprimir o descargar."
      filename={filename}
      reloadKey={paymentId}
      footerExtra={footerExtra}
    />
  )
}
