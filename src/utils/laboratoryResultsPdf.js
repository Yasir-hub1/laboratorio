import { LABORATORY_RESULTS_REPORT_STYLES } from './laboratoryResultsReportHtml'

export const LABORATORY_RESULTS_PDF_OPTIONS = {
  margin: [10, 10, 10, 10],
  filename: 'resultados.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy'] },
}

function waitForNextFrames(count = 2) {
  return new Promise((resolve) => {
    let remaining = count
    const tick = () => {
      remaining -= 1
      if (remaining <= 0) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** Espera a que el iframe con srcDoc termine de renderizar. */
export function waitForIframeReady(iframe) {
  return new Promise((resolve, reject) => {
    if (!iframe) {
      reject(new Error('No se pudo preparar la vista previa'))
      return
    }

    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      fn()
    }

    const check = () => {
      const doc = iframe.contentDocument
      if (doc?.body?.childElementCount > 0) {
        finish(() => resolve(doc))
        return true
      }
      return false
    }

    if (check()) return

    const onLoad = () => {
      if (check()) return
      finish(() => reject(new Error('El informe no tiene contenido para exportar')))
    }

    iframe.addEventListener('load', onLoad, { once: true })
    window.setTimeout(() => {
      iframe.removeEventListener('load', onLoad)
      if (check()) return
      finish(() => reject(new Error('Tiempo de espera agotado al renderizar el informe')))
    }, 8000)
  })
}

function getReportRoot(doc) {
  return doc.querySelector('.sheet') ?? doc.body
}

/**
 * Clona el informe al documento principal para que html2canvas lo capture bien.
 * (Capturar nodos dentro de iframe suele producir PDF en blanco.)
 */
function mountCloneForPdf(sourceRoot) {
  const host = document.createElement('div')
  host.setAttribute('data-pdf-clone', 'true')
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.top = '0'
  host.style.width = '210mm'
  host.style.maxWidth = '210mm'
  host.style.background = '#fff'
  host.style.zIndex = '2147483646'
  host.style.opacity = '0'
  host.style.pointerEvents = 'none'
  host.style.overflow = 'hidden'

  const style = document.createElement('style')
  style.textContent = LABORATORY_RESULTS_REPORT_STYLES
  host.appendChild(style)
  host.appendChild(sourceRoot.cloneNode(true))
  document.body.appendChild(host)
  return host
}

async function runHtml2PdfOnClone(doc, { filename, mode }) {
  const html2pdf = (await import('html2pdf.js')).default
  const sourceRoot = getReportRoot(doc)
  const host = mountCloneForPdf(sourceRoot)
  const target = host.querySelector('.sheet') ?? host.lastElementChild

  try {
    await waitForNextFrames(3)
    const worker = html2pdf()
      .set({ ...LABORATORY_RESULTS_PDF_OPTIONS, filename: filename ?? 'resultados.pdf' })
      .from(target)

    if (mode === 'save') {
      await worker.save()
      return null
    }

    const blob = await worker.outputPdf('blob')
    if (!(blob instanceof Blob) || blob.size < 512) {
      throw new Error('El PDF generado está vacío')
    }
    return blob
  } finally {
    host.remove()
  }
}

/**
 * Genera Blob PDF desde el documento ya renderizado en iframe.
 */
export async function generateLaboratoryResultsPdfBlobFromDocument(doc, { filename } = {}) {
  return runHtml2PdfOnClone(doc, { filename, mode: 'blob' })
}

/** Descarga directa desde el DOM renderizado (iframe). */
export async function saveLaboratoryResultsPdfFromDocument(doc, { filename } = {}) {
  await runHtml2PdfOnClone(doc, { filename, mode: 'save' })
}

/** Imprime el informe HTML del iframe. */
export function printLaboratoryResultsDocument(iframe) {
  const win = iframe?.contentWindow
  if (!win) throw new Error('Vista previa no disponible')
  win.focus()
  win.print()
}

export { LABORATORY_RESULTS_REPORT_STYLES }
