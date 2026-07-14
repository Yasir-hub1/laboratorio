import {
  RECEIPT_REPORT_BASE_STYLES,
  buildLogoHtml,
  displayOrDash,
  escHtml,
  wrapReportDocument,
} from './receiptReportShared'

export const LABORATORY_ORDER_REPORT_STYLES = RECEIPT_REPORT_BASE_STYLES

/**
 * HTML del comprobante de orden desde payload pdf-data.
 * @param {object} data
 * @param {string} [logoUrl]
 * @param {string} [appName]
 */
export function buildLaboratoryOrderReportHtml(data, logoUrl, appName = 'Laboratorio Clínico') {
  const o = data?.order ?? {}
  const p = o.patient ?? {}
  const b = o.branch ?? {}
  const doctor = o.doctor ?? {}
  const portal = data?.portal_access ?? {}
  const generatedAt = displayOrDash(data?.generated_at_display)
  const note = data?.note

  const detailsRows = (data?.details ?? [])
    .map(
      (row) => `<tr>
        <td>${escHtml(row.line_number ?? '')}</td>
        <td>${escHtml(displayOrDash(row.analysis_group_name))}</td>
        <td>${escHtml(displayOrDash(row.analysis_name))}</td>
        <td class="num">${escHtml(displayOrDash(row.unit_price_display ?? row.unit_price))}</td>
      </tr>`,
    )
    .join('')

  return `<div class="sheet">
    <div class="header">
      <table><tr>
        <td style="width:30%;vertical-align:middle">
          <div class="logo-slot">${buildLogoHtml(logoUrl, appName)}</div>
        </td>
        <td style="width:70%;text-align:right;vertical-align:top">
          <div style="line-height:1.1">
            <div style="font-size:16pt;font-weight:bold;margin-bottom:2px">COMPROBANTE DE ORDEN</div>
            <div class="order-code" style="margin-bottom:8px">Nº ${escHtml(o.code)}</div>
            <div style="font-size:8.5pt;color:#555">
              <strong>Sucursal:</strong> ${escHtml(b.name)}<br>
              ${escHtml(b.address)}<br>
              <strong>Telf:</strong> ${escHtml(b.phone)}<br>
              <strong>Fecha:</strong> ${escHtml(displayOrDash(o.created_at_display))}
            </div>
          </div>
        </td>
      </tr></table>
    </div>

    <div class="portal-grid">
      <div class="portal-cell">
        <div class="portal-label">Portal web</div>
        <div class="portal-value">${escHtml(displayOrDash(portal.url))}</div>
      </div>
      <div class="portal-cell">
        <div class="portal-label">Usuario</div>
        <div class="portal-value">${escHtml(displayOrDash(portal.username))}</div>
      </div>
      <div class="portal-cell">
        <div class="portal-label">Contraseña (CI)</div>
        <div class="portal-value">${escHtml(displayOrDash(portal.password_hint))}</div>
      </div>
    </div>

    <div class="info-box">
      <table class="info-table">
        <tr>
          <td class="label">Paciente:</td><td style="width:45%">${escHtml(displayOrDash(p.full_name))}</td>
          <td class="label">C.I.:</td><td>${escHtml(displayOrDash(p.ci))}</td>
        </tr>
        <tr>
          <td class="label">Edad / Sexo:</td><td>${escHtml(displayOrDash(p.age_display))} / ${escHtml(displayOrDash(p.gender_display))}</td>
          <td class="label">Teléfono:</td><td>${escHtml(displayOrDash(p.phone))}</td>
        </tr>
        <tr>
          <td class="label">Médico:</td><td>${escHtml(displayOrDash(doctor.full_name))}</td>
          <td class="label">Seguro:</td><td>${escHtml(displayOrDash(o.insurance_name))}</td>
        </tr>
        <tr>
          <td class="label">Nro. Seguro:</td><td>${escHtml(displayOrDash(o.insurance_number))}</td>
          <td class="label">Toma Muestra:</td><td style="font-size:8.5pt">${escHtml(displayOrDash(o.sample_collection_display))}</td>
        </tr>
      </table>
    </div>

    <table class="details-table">
      <thead>
        <tr>
          <th style="width:8%">Nro</th>
          <th style="width:28%">Grupo</th>
          <th style="width:44%">Análisis</th>
          <th style="width:20%;text-align:right">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${detailsRows || `<tr><td colspan="4">Sin análisis</td></tr>`}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals-box">
        <table>
          <tr>
            <td>Subtotal</td>
            <td class="amount">${escHtml(displayOrDash(o.subtotal_display))}</td>
          </tr>
          <tr>
            <td>Descuento</td>
            <td class="amount">${escHtml(displayOrDash(o.discount_display))}</td>
          </tr>
          <tr class="total">
            <td>Total</td>
            <td class="amount">${escHtml(displayOrDash(o.total_amount_display))}</td>
          </tr>
          <tr>
            <td>Pagado</td>
            <td class="amount">${escHtml(displayOrDash(o.amount_paid_total_display))}</td>
          </tr>
          <tr>
            <td>Saldo</td>
            <td class="amount">${escHtml(displayOrDash(o.total_due_display))}</td>
          </tr>
        </table>
      </div>
    </div>

    ${note ? `<div class="note-box">${escHtml(note)}</div>` : ''}

    <div class="footer">
      <table><tr>
        <td style="width:33%">${escHtml(appName)}</td>
        <td style="width:33%;text-align:center">Comprobante de orden</td>
        <td style="width:33%;text-align:right">Generado: ${escHtml(generatedAt)}</td>
      </tr></table>
    </div>
  </div>`
}

export function buildLaboratoryOrderReportDocument(data, logoUrl, appName) {
  const code = data?.order?.code ?? ''
  return wrapReportDocument(
    `Comprobante de orden · ${code}`,
    buildLaboratoryOrderReportHtml(data, logoUrl, appName),
    LABORATORY_ORDER_REPORT_STYLES,
  )
}
