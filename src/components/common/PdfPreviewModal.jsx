import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { OrderPdfPreviewModal } from '@/components/common/OrderPdfPreviewModal'
import { PortalResultsPdfPreviewModal } from '@/components/portal/PortalResultsPdfPreviewModal'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import {
  blobFromPdfResponse,
  buildOrderPdfFilename,
  downloadPdfBlob,
  printPdfBlob,
} from '@/utils/pdfBlob'

const PDF_LABELS = {
  order: 'Orden de laboratorio',
  results: 'Resultados',
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {string|number} props.orderId
 * @param {'order'|'results'} [props.pdfType]
 * @param {string} [props.orderCode]
 * @param {React.ReactNode} [props.footerExtra]
 */
export function PdfPreviewModal({
  open,
  onOpenChange,
  orderId,
  pdfType = 'order',
  orderCode,
  footerExtra,
}) {
  // Comprobante de orden: plantilla HTML + pdf-data en frontend
  if (pdfType === 'order') {
    return (
      <OrderPdfPreviewModal
        open={open}
        onOpenChange={onOpenChange}
        orderId={orderId}
        orderCode={orderCode}
        footerExtra={footerExtra}
      />
    )
  }

  // Informe de resultados: misma plantilla HTML que el portal paciente/seguro (§8)
  if (pdfType === 'results') {
    return (
      <PortalResultsPdfPreviewModal
        open={open}
        onOpenChange={onOpenChange}
        orderId={orderId}
        orderCode={orderCode}
        fetchPdfData={(id) => laboratoryApi.getOrderResultsPdfData(id)}
      />
    )
  }

  return (
    <ServerBlobPdfPreviewModal
      open={open}
      onOpenChange={onOpenChange}
      orderId={orderId}
      pdfType={pdfType}
      orderCode={orderCode}
      footerExtra={footerExtra}
    />
  )
}

/** Fallback legacy: PDF binario del servidor (p. ej. resultados staff). */
function ServerBlobPdfPreviewModal({
  open,
  onOpenChange,
  orderId,
  pdfType = 'results',
  orderCode,
  footerExtra,
}) {
  const [loading, setLoading] = useState(false)
  const [blob, setBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const iframeRef = useRef(null)
  const blobRef = useRef(null)
  const previewUrlRef = useRef(null)

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
    setBlob(null)
    blobRef.current = null
  }, [])

  const loadPdf = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    clearPreview()
    try {
      const response = await laboratoryApi.getOrderResultsPdf(orderId)
      const pdfBlob = await blobFromPdfResponse(response)
      const url = URL.createObjectURL(pdfBlob)
      blobRef.current = pdfBlob
      previewUrlRef.current = url
      setBlob(pdfBlob)
      setPreviewUrl(url)
    } catch (err) {
      toast.error(err.message ?? 'Error al cargar el PDF')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [orderId, onOpenChange, clearPreview])

  useEffect(() => {
    if (!open) {
      clearPreview()
      return undefined
    }
    if (orderId) loadPdf()
    return () => clearPreview()
  }, [open, orderId, pdfType, loadPdf, clearPreview])

  const filename = buildOrderPdfFilename(orderId, pdfType, orderCode)
  const title = orderCode
    ? `${PDF_LABELS[pdfType]} · ${orderCode}`
    : `${PDF_LABELS[pdfType]} #${orderId}`

  const handleDownload = () => {
    if (!blobRef.current) return
    downloadPdfBlob(blobRef.current, filename)
    toast.success('PDF descargado')
  }

  const handlePrint = () => {
    if (!blobRef.current) return
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus()
      iframeRef.current.contentWindow.print()
      return
    }
    printPdfBlob(blobRef.current)
  }

  const handleOpenChange = (next) => {
    if (!next) clearPreview()
    onOpenChange(next)
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description="Revisa el documento antes de imprimir o descargar."
      className="flex max-h-[min(92dvh,900px)] max-w-4xl flex-col overflow-hidden p-4 sm:p-5"
    >
      <div className="relative min-h-[min(60dvh,520px)] flex-1 overflow-hidden rounded-xl border border-border bg-surface-muted">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted">Generando vista previa…</p>
          </div>
        )}
        {!loading && previewUrl && (
          <iframe
            ref={iframeRef}
            title={title}
            src={previewUrl}
            className="h-full min-h-[min(60dvh,520px)] w-full bg-white"
          />
        )}
      </div>

      <ModalFooter className="mt-4 shrink-0">
        {footerExtra}
        <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
          Cerrar
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || !blob}
          onClick={handlePrint}
          className="gap-1.5"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir
        </Button>
        <Button
          type="button"
          disabled={loading || !blob}
          onClick={handleDownload}
          className="gap-1.5"
        >
          <Download className="h-4 w-4" aria-hidden />
          Descargar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
