/**
 * Descarga un blob Excel (Content-Disposition o nombre por defecto).
 * @param {import('axios').AxiosResponse} response
 * @param {string} fallbackName
 */
export function downloadXlsxResponse(response, fallbackName = 'reporte.xlsx') {
  const disposition = response.headers?.['content-disposition']
  const match =
    typeof disposition === 'string' ? disposition.match(/filename="?([^"]+)"?/i) : null
  const filename = match?.[1] ?? fallbackName
  const url = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
