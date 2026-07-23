/** Estilos del informe (plantilla PDF resultados laboratorio). */
export const LABORATORY_RESULTS_REPORT_STYLES = `
  @page { margin: 12mm 12mm 18mm 12mm; }
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
  .sheet {
    background: #fff;
    padding: 0 0 24px 0;
  }
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
    margin-top: 5px;
  }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 2px 5px; }
  .info-table td.label { width: 20%; font-weight: bold; }
  .results-container { margin-top: 10px; margin-bottom: 30px; }
  .group-header {
    font-weight: bold;
    font-size: 9pt;
    border-bottom: 1.5px solid #000;
    text-transform: uppercase;
    margin-bottom: 5px;
    padding: 5px 0;
  }
  .results-table { width: 100%; border-collapse: collapse; }
  .results-table th {
    padding: 4px 12px;
    text-align: left;
    font-size: 9pt;
    font-weight: bold;
  }
  .results-table td { padding: 2px 12px; vertical-align: top; }
  .result-value { font-weight: bold; color: #000; }
  .reference-range { font-size: 8.5pt; color: #666; white-space: pre-line; }
  .subgroup-row td {
    font-weight: bold;
    font-size: 8.5pt;
    padding: 6px 12px 2px;
  }
  .indent { padding-left: 20px !important; }
  .observation-box {
    padding: 10px 12px;
    font-size: 8.5pt;
    border-top: 1px solid #eee;
    font-style: italic;
  }
  .footer {
    margin-top: 28px;
    margin-bottom: 8px;
    padding-top: 8px;
    padding-bottom: 16px;
    font-size: 8pt;
    color: #777;
    border-top: 1px solid #eee;
    line-height: 1.4;
  }
  .footer table { width: 100%; border-collapse: collapse; }
  .footer td {
    padding: 2px 0 6px;
    vertical-align: middle;
  }
  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .sheet { box-shadow: none; padding: 0 0 24px 0; }
  }
`

function esc(value) {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function val(value, fallback = '—') {
  const s = value == null || value === '' ? '' : String(value)
  return s || fallback
}

/**
 * Renderiza HTML del informe desde payload de results-pdf-data.
 * @param {object} data
 * @param {string} [logoUrl]
 * @param {string} [appName]
 */
export function buildLaboratoryResultsReportHtml(data, logoUrl, appName = 'Laboratorio Clínico') {
  const o = data?.order ?? {}
  const p = o.patient ?? {}
  const b = o.branch ?? {}
  const doctor = o.doctor ?? {}

  let groupsHtml = ''
  ;(data?.results_groups ?? []).forEach((group) => {
    let analysesHtml = ''
    ;(group.analyses ?? []).forEach((analysis) => {
      let rowsHtml = ''
      ;(analysis.rows ?? []).forEach((row) => {
        if (row.type === 'subgroup_header') {
          rowsHtml += `<tr class="subgroup-row"><td colspan="3">${esc(row.label)}</td></tr>`
        } else if (row.type === 'component') {
          const pad = row.indent ? 'indent' : ''
          rowsHtml += `<tr>
            <td class="${pad}">${esc(row.name)}</td>
            <td class="result-value">${esc(row.value)} <span style="font-size:8pt;font-weight:normal;color:#666">${esc(row.unit)}</span></td>
            <td class="reference-range">${esc(row.reference_display || row.reference_value)}</td>
          </tr>`
        }
      })
      const obs = analysis.observation
        ? `<div class="observation-box"><strong>Observaciones:</strong> ${esc(analysis.observation)}</div>`
        : ''
      analysesHtml += `
        <table class="results-table">
          <thead><tr>
            <th style="width:40%">${esc(analysis.name)}</th>
            <th style="width:30%">Resultado</th>
            <th style="width:30%">Valores de Referencia</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>${obs}`
    })
    groupsHtml += `<div class="results-container">
      <div class="group-header">${esc(group.group_name)}</div>${analysesHtml}</div>`
  })

  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="Laboratorio">`
    : `<span class="logo-fallback">${esc(appName)}</span>`

  const generatedAt = val(data?.generated_at_display)

  return `<div class="sheet">
    <div class="header">
      <table><tr>
        <td style="width:30%;vertical-align:middle">
          <div class="logo-slot">${logoHtml}</div>
        </td>
        <td style="width:70%;text-align:right;vertical-align:top">
          <div style="line-height:1.1">
            <div style="font-size:16pt;font-weight:bold;margin-bottom:2px">INFORME DE RESULTADOS</div>
            <div class="order-code" style="margin-bottom:8px">Nº ${esc(o.code)}</div>
            <div style="font-size:8.5pt;color:#555">
              <strong>Sucursal:</strong> ${esc(b.name)}<br>
              ${esc(b.address)}<br>
              <strong>Telf:</strong> ${esc(b.phone)}<br>
              <strong>Fecha:</strong> ${esc(generatedAt)}
            </div>
          </div>
        </td>
      </tr></table>
    </div>
    <div class="info-box">
      <table class="info-table">
        <tr>
          <td class="label">Paciente:</td><td style="width:45%">${esc(val(p.full_name))}</td>
          <td class="label">C.I.:</td><td>${esc(val(p.ci))}</td>
        </tr>
        <tr>
          <td class="label">Edad / Sexo:</td><td>${esc(val(p.age_display))} / ${esc(val(p.gender_display))}</td>
          <td class="label">Teléfono:</td><td>${esc(val(p.phone))}</td>
        </tr>
        <tr>
          <td class="label">Médico:</td><td>${esc(val(doctor.full_name))}</td>
          <td class="label">Seguro:</td><td>${esc(val(o.insurance_name))}</td>
        </tr>
        <tr>
          <td class="label">Nro. Seguro:</td><td>${esc(val(o.insurance_number))}</td>
          <td class="label">Toma Muestra:</td><td style="font-size:8.5pt">${esc(val(o.sample_collection_display))}</td>
        </tr>
      </table>
    </div>
    ${groupsHtml}
    <div class="footer">
      <table><tr>
        <td style="width:33%">${esc(appName)}</td>
        <td style="width:33%;text-align:center">Informe de resultados</td>
        <td style="width:33%;text-align:right">Generado: ${esc(generatedAt)}</td>
      </tr></table>
    </div>
  </div>`
}

export function buildLaboratoryResultsReportDocument(data, logoUrl, appName) {
  const body = buildLaboratoryResultsReportHtml(data, logoUrl, appName)
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Informe de Resultados · ${esc(data?.order?.code ?? '')}</title>
  <style>${LABORATORY_RESULTS_REPORT_STYLES}</style>
</head>
<body>${body}</body>
</html>`
}
