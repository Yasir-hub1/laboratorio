/** Estilos compartidos de comprobantes PDF (orden / pago / resultados). */
export const RECEIPT_REPORT_BASE_STYLES = `
  @page { margin: 1cm; }
  * { box-sizing: border-box; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 9pt;
    color: #4A4A4A;
    line-height: 1.2;
    max-width: 210mm;
    margin: 0 auto;
    padding: 1cm;
    background: #fff;
  }
  .sheet { background: #fff; padding: 0; }
  .header {
    width: 100%;
    margin-bottom: 0.5cm;
    border-bottom: 2px solid #007BFF;
    padding-bottom: 10px;
  }
  .header table { width: 100%; border-collapse: collapse; }
  .logo-slot {
    max-width: 200px;
    max-height: 50px;
    min-height: 40px;
    display: flex;
    align-items: center;
  }
  .logo-slot img {
    max-width: 200px;
    max-height: 50px;
    width: auto;
    height: auto;
    object-fit: contain;
  }
  .logo-fallback {
    font-size: 11pt;
    font-weight: bold;
    color: #0056B3;
  }
  .order-code { font-size: 14pt; color: #0056B3; font-weight: bold; }
  .info-box {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 8px;
    margin-top: 8px;
  }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 2px 5px; vertical-align: top; }
  .info-table td.label { width: 20%; font-weight: bold; }
  .portal-grid {
    display: table;
    width: 100%;
    margin-top: 10px;
    border-collapse: separate;
    border-spacing: 8px 0;
  }
  .portal-cell {
    display: table-cell;
    width: 33.33%;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 8px;
    vertical-align: top;
  }
  .portal-cell .portal-label {
    font-size: 8pt;
    color: #666;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .portal-cell .portal-value {
    font-size: 9pt;
    color: #000;
    word-break: break-all;
  }
  .details-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
  }
  .details-table th {
    padding: 5px 8px;
    text-align: left;
    font-size: 8.5pt;
    font-weight: bold;
    border-bottom: 1.5px solid #000;
    text-transform: uppercase;
  }
  .details-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #eee;
    vertical-align: top;
  }
  .details-table td.num { text-align: right; white-space: nowrap; }
  .totals-wrap {
    margin-top: 12px;
    text-align: right;
  }
  .totals-box {
    display: inline-block;
    min-width: 220px;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 8px 12px;
    text-align: left;
  }
  .totals-box table { width: 100%; border-collapse: collapse; }
  .totals-box td { padding: 2px 0; }
  .totals-box td.amount { text-align: right; font-weight: bold; }
  .totals-box tr.total td {
    border-top: 1px solid #ccc;
    padding-top: 5px;
    font-weight: bold;
    color: #000;
  }
  .note-box {
    margin-top: 14px;
    padding: 8px 10px;
    font-size: 8pt;
    color: #555;
    border-top: 1px solid #eee;
    font-style: italic;
  }
  .annulled-banner {
    margin-top: 10px;
    padding: 8px 10px;
    border: 1px solid #f5c2c7;
    background: #f8d7da;
    color: #842029;
    border-radius: 8px;
    font-size: 9pt;
    font-weight: bold;
  }
  .payment-detail {
    margin-top: 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 10px 12px;
  }
  .payment-detail table { width: 100%; border-collapse: collapse; }
  .payment-detail td { padding: 3px 5px; }
  .payment-detail td.label { width: 35%; font-weight: bold; }
  .footer {
    margin-top: 24px;
    font-size: 8pt;
    color: #777;
    border-top: 1px solid #eee;
    padding-top: 5px;
  }
  .footer table { width: 100%; }
  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .sheet { box-shadow: none; padding: 0; }
  }
`

export function escHtml(value) {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function displayOrDash(value, fallback = '—') {
  const s = value == null || value === '' ? '' : String(value)
  return s || fallback
}

export function buildLogoHtml(logoUrl, appName) {
  if (logoUrl) return `<img src="${escHtml(logoUrl)}" alt="Laboratorio">`
  return `<span class="logo-fallback">${escHtml(appName)}</span>`
}

export function wrapReportDocument(title, bodyHtml, stylesCss) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escHtml(title)}</title>
  <style>${stylesCss}</style>
</head>
<body>${bodyHtml}</body>
</html>`
}
