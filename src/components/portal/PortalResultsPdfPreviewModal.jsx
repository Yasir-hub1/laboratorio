import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Modal, ModalFooter, Button } from '@/components/ui'
import { APP_NAME } from '@/utils/constants'
import { buildLaboratoryResultsReportDocument } from '@/utils/laboratoryResultsReportHtml'
import {
  generateLaboratoryResultsPdfBlobFromDocument,
  printLaboratoryResultsDocument,
  saveLaboratoryResultsPdfFromDocument,
  waitForIframeReady,
} from '@/utils/laboratoryResultsPdf'
import { buildOrderPdfFilename } from '@/utils/pdfBlob'

/**
 * Modal compartido: obtiene results-pdf-data, renderiza plantilla HTML en front y genera PDF.
 * @param {(orderId: string) => Promise<object>} fetchPdfData
 */
export function PortalResultsPdfPreviewModal({
  open,
  onOpenChange,
  orderId,
  orderCode,
  fetchPdfData,
  description = 'Revisa el informe antes de imprimir o descargar.',
  logoUrl,
}) {
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [previewDoc, setPreviewDoc] = useState('')
  const [previewReady, setPreviewReady] = useState(false)
  const iframeRef = useRef(null)

  const clearPreview = useCallback(() => {
    setPreviewDoc('')
    setPreviewReady(false)
  }, [])

  const loadReport = useCallback(async () => {
    if (!orderId || !fetchPdfData) return
    setLoading(true)
    clearPreview()
    try {
      const data = await fetchPdfData(orderId)
      const srcDoc = buildLaboratoryResultsReportDocument(data, logoUrl, APP_NAME)
      setPreviewDoc(srcDoc)
    } catch (err) {
      toast.error(err.message ?? 'Error al generar el informe')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [orderId, fetchPdfData, logoUrl, onOpenChange, clearPreview])

  useEffect(() => {
    if (!open) {
      clearPreview()
      return undefined
    }
    if (orderId) loadReport()
    return () => clearPreview()
  }, [open, orderId, loadReport, clearPreview])

  useEffect(() => {
    setPreviewReady(false)
  }, [previewDoc])

  const handleIframeLoad = useCallback(async () => {
    const iframe = iframeRef.current
    if (!iframe || !previewDoc) return
    try {
      await waitForIframeReady(iframe)
      setPreviewReady(true)
    } catch (err) {
      toast.error(err.message ?? 'No se pudo renderizar el informe')
    }
  }, [previewDoc])

  const filename = buildOrderPdfFilename(orderId, 'results', orderCode)
  const title = orderCode ? `Resultados · ${orderCode}` : `Resultados #${orderId}`

  const getIframeDocument = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.body) throw new Error('Vista previa no disponible')
    return doc
  }

  const handleDownload = async () => {
    setExporting(true)
    try {
      const doc = getIframeDocument()
      await saveLaboratoryResultsPdfFromDocument(doc, { filename })
      toast.success('PDF descargado')
    } catch (err) {
      try {
        const doc = getIframeDocument()
        const blob = await generateLaboratoryResultsPdfBlobFromDocument(doc, { filename })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        toast.success('PDF descargado')
      } catch {
        toast.error(err.message ?? 'Error al descargar el PDF')
      }
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    try {
      printLaboratoryResultsDocument(iframeRef.current)
    } catch (err) {
      toast.error(err.message ?? 'No se pudo imprimir')
    }
  }

  const handleOpenChange = (next) => {
    if (!next) clearPreview()
    onOpenChange(next)
  }

  const actionsDisabled = loading || exporting || !previewReady

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      className="flex max-h-[min(92dvh,900px)] max-w-4xl flex-col overflow-hidden p-4 sm:p-5"
    >
      <div className="relative min-h-[min(60dvh,520px)] flex-1 overflow-hidden rounded-xl border border-border bg-surface-muted">
        {(loading || exporting) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted">
              {loading ? 'Cargando informe…' : 'Generando PDF…'}
            </p>
          </div>
        )}
        {previewDoc && (
          <iframe
            ref={iframeRef}
            title={title}
            srcDoc={previewDoc}
            onLoad={handleIframeLoad}
            className="h-full min-h-[min(60dvh,520px)] w-full bg-white"
          />
        )}
      </div>

      <ModalFooter className="mt-4 shrink-0">
        <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
          Cerrar
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={actionsDisabled}
          onClick={handlePrint}
          className="gap-1.5"
        >
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir
        </Button>
        <Button
          type="button"
          disabled={actionsDisabled}
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
