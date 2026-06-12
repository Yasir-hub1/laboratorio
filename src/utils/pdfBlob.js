/**
 * Convierte respuesta axios (blob) en Blob PDF y valida errores JSON del servidor.
 */
export async function blobFromPdfResponse(response) {
  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'application/pdf' })

  if (blob.type === 'application/json' || (blob.size > 0 && blob.size < 400)) {
    const text = await blob.text()
    try {
      const json = JSON.parse(text)
      throw new Error(json.message ?? 'No se pudo generar el PDF')
    } catch (err) {
      if (err instanceof Error && err.message !== 'Unexpected end of JSON input') {
        throw err
      }
      throw new Error('No se pudo generar el PDF')
    }
  }

  return blob
}

export function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Imprime el PDF usando el visor del navegador. */
export function printPdfBlob(blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.className = 'sr-only'
  iframe.src = url
  document.body.appendChild(iframe)
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      window.setTimeout(() => {
        iframe.remove()
        URL.revokeObjectURL(url)
      }, 1000)
    }
  }
}

export function buildOrderPdfFilename(orderId, type = 'order', code) {
  const suffix = code ? `-${code}` : `-${orderId}`
  return type === 'results' ? `resultados-orden${suffix}.pdf` : `orden${suffix}.pdf`
}
