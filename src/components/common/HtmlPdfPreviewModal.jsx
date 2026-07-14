import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Modal, ModalFooter, Button } from '@/components/ui'
import {
  generatePdfBlobFromDocument,
  printIframeDocument,
  savePdfFromDocument,
  waitForIframeReady,
} from '@/utils/htmlPdfExport'

/**
 * Modal genérico: fetch JSON → HTML srcDoc → imprimir / descargar PDF en cliente.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {() => Promise<object>} props.fetchData
 * @param {(data: object) => string} props.buildDocument — HTML completo
 * @param {string} props.stylesCss — CSS para html2pdf clone
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.filename]
 * @param {unknown} [props.reloadKey] — cambia para forzar recarga
 */
export function HtmlPdfPreviewModal({
  open,
  onOpenChange,
  fetchData,
  buildDocument,
  stylesCss,
  title,
  description = 'Revisa el documento antes de imprimir o descargar.',
  filename = 'documento.pdf',
  reloadKey,
  footerExtra,
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
    if (!fetchData || !buildDocument) return
    setLoading(true)
    clearPreview()
    try {
      const data = await fetchData()
      setPreviewDoc(buildDocument(data))
    } catch (err) {
      toast.error(err.message ?? 'Error al generar el documento')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [fetchData, buildDocument, onOpenChange, clearPreview])

  useEffect(() => {
    if (!open) {
      clearPreview()
      return undefined
    }
    loadReport()
    return () => clearPreview()
  }, [open, reloadKey, loadReport, clearPreview])

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
      toast.error(err.message ?? 'No se pudo renderizar el documento')
    }
  }, [previewDoc])

  const getIframeDocument = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.body) throw new Error('Vista previa no disponible')
    return doc
  }

  const handleDownload = async () => {
    setExporting(true)
    try {
      const doc = getIframeDocument()
      await savePdfFromDocument(doc, { filename, stylesCss })
      toast.success('PDF descargado')
    } catch (err) {
      try {
        const doc = getIframeDocument()
        const blob = await generatePdfBlobFromDocument(doc, { filename, stylesCss })
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
      printIframeDocument(iframeRef.current)
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
              {loading ? 'Cargando documento…' : 'Generando PDF…'}
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
        {footerExtra}
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
        <Button type="button" disabled={actionsDisabled} onClick={handleDownload} className="gap-1.5">
          <Download className="h-4 w-4" aria-hidden />
          Descargar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
