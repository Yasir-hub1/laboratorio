/** Utilidades compartidas para exportar HTML → PDF (html2pdf) e imprimir iframe. */

export const DEFAULT_HTML_PDF_OPTIONS = {
  /** top, right, bottom, left (mm) — bottom mayor para no cortar el pie */
  margin: [12, 12, 20, 12],
  filename: 'documento.pdf',
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
      finish(() => reject(new Error('El documento no tiene contenido para exportar')))
    }

    iframe.addEventListener('load', onLoad, { once: true })
    window.setTimeout(() => {
      iframe.removeEventListener('load', onLoad)
      if (check()) return
      finish(() => reject(new Error('Tiempo de espera agotado al renderizar el documento')))
    }, 8000)
  })
}

function getReportRoot(doc) {
  return doc.querySelector('.sheet') ?? doc.body
}

function mountCloneForPdf(sourceRoot, stylesCss) {
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
  // visible: overflow:hidden recorta el pie al capturar con html2canvas
  host.style.overflow = 'visible'

  const style = document.createElement('style')
  style.textContent = stylesCss
  host.appendChild(style)

  const clone = sourceRoot.cloneNode(true)
  // El padding debe ir en .sheet (es lo que captura html2pdf), no solo en el host
  const sheet = clone.classList?.contains('sheet')
    ? clone
    : clone.querySelector?.('.sheet')
  if (sheet) {
    sheet.style.paddingBottom = '28px'
    sheet.style.boxSizing = 'border-box'
    const spacer = document.createElement('div')
    spacer.setAttribute('aria-hidden', 'true')
    spacer.style.height = '14px'
    spacer.style.width = '100%'
    sheet.appendChild(spacer)
  }

  host.appendChild(clone)
  document.body.appendChild(host)
  return host
}

async function runHtml2PdfOnClone(doc, { filename, mode, stylesCss, pdfOptions }) {
  const html2pdf = (await import('html2pdf.js')).default
  const sourceRoot = getReportRoot(doc)
  const host = mountCloneForPdf(sourceRoot, stylesCss)
  const target = host.querySelector('.sheet') ?? host.lastElementChild

  try {
    await waitForNextFrames(3)
    const worker = html2pdf()
      .set({
        ...DEFAULT_HTML_PDF_OPTIONS,
        ...pdfOptions,
        filename: filename ?? 'documento.pdf',
      })
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

export async function generatePdfBlobFromDocument(doc, { filename, stylesCss, pdfOptions } = {}) {
  return runHtml2PdfOnClone(doc, { filename, mode: 'blob', stylesCss, pdfOptions })
}

export async function savePdfFromDocument(doc, { filename, stylesCss, pdfOptions } = {}) {
  await runHtml2PdfOnClone(doc, { filename, mode: 'save', stylesCss, pdfOptions })
}

export function printIframeDocument(iframe) {
  const win = iframe?.contentWindow
  if (!win) throw new Error('Vista previa no disponible')
  win.focus()
  win.print()
}
