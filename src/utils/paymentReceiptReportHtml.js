import {
  RECEIPT_REPORT_BASE_STYLES,
  buildLogoHtml,
  displayOrDash,
  escHtml,
  wrapReportDocument,
} from './receiptReportShared'

export const PAYMENT_RECEIPT_REPORT_STYLES = RECEIPT_REPORT_BASE_STYLES

/**
 * HTML del comprobante de pago desde payload pdf-data.
 * @param {object} data
 * @param {string} [logoUrl]
 * @param {string} [appName]
 */
export function buildPaymentReceiptReportHtml(data, logoUrl, appName = 'Laboratorio Clínico') {
  const o = data?.order ?? {}
  const pay = data?.payment ?? {}
  const generatedAt = displayOrDash(data?.generated_at_display)
  const paymentRef = displayOrDash(pay.code ?? pay.id)
  const isAnnulled = Boolean(pay.is_annulled) || Number(pay.status) === 2

  return `<div class="sheet">
    <div class="header">
      <table><tr>
        <td style="width:30%;vertical-align:middle">
          <div class="logo-slot">${buildLogoHtml(logoUrl, appName)}</div>
        </td>
        <td style="width:70%;text-align:right;vertical-align:top">
          <div style="line-height:1.1">
            <div style="font-size:16pt;font-weight:bold;margin-bottom:2px">COMPROBANTE DE PAGO</div>
            <div class="order-code" style="margin-bottom:8px">Orden Nº ${escHtml(o.code)}</div>
            <div style="font-size:8.5pt;color:#555">
              <strong>Sucursal:</strong> ${escHtml(displayOrDash(o.branch_name))}<br>
              <strong>Ref. pago:</strong> ${escHtml(paymentRef)}<br>
              <strong>Fecha pago:</strong> ${escHtml(displayOrDash(pay.created_at_display))}
            </div>
          </div>
        </td>
      </tr></table>
    </div>

    ${
      isAnnulled
        ? `<div class="annulled-banner">PAGO ANULADO${
            pay.annulment_reason ? `: ${escHtml(pay.annulment_reason)}` : ''
          }</div>`
        : ''
    }

    <div class="info-box">
      <table class="info-table">
        <tr>
          <td class="label">Paciente:</td><td style="width:45%">${escHtml(displayOrDash(o.patient_name))}</td>
          <td class="label">C.I.:</td><td>${escHtml(displayOrDash(o.patient_ci))}</td>
        </tr>
        <tr>
          <td class="label">Médico:</td><td>${escHtml(displayOrDash(o.doctor_name))}</td>
          <td class="label">Seguro:</td><td>${escHtml(displayOrDash(o.insurance_name))}</td>
        </tr>
      </table>
    </div>

    <div class="payment-detail">
      <table>
        <tr>
          <td class="label">Método de pago</td>
          <td>${escHtml(displayOrDash(pay.payment_method_name))}</td>
        </tr>
        <tr>
          <td class="label">Monto de este pago</td>
          <td style="font-weight:bold;font-size:11pt;color:#000">${escHtml(displayOrDash(pay.amount_display))}</td>
        </tr>
        <tr>
          <td class="label">Caja</td>
          <td>${escHtml(displayOrDash(pay.cash_name))}</td>
        </tr>
      </table>
    </div>

    <div class="totals-wrap">
      <div class="totals-box">
        <table>
          <tr>
            <td>Subtotal orden</td>
            <td class="amount">${escHtml(displayOrDash(o.subtotal_display))}</td>
          </tr>
          <tr>
            <td>Descuento</td>
            <td class="amount">${escHtml(displayOrDash(o.discount_display))}</td>
          </tr>
          <tr class="total">
            <td>Total orden</td>
            <td class="amount">${escHtml(displayOrDash(o.total_amount_display))}</td>
          </tr>
          <tr>
            <td>Pagado acumulado</td>
            <td class="amount">${escHtml(displayOrDash(o.amount_paid_total_display))}</td>
          </tr>
          <tr>
            <td>Saldo</td>
            <td class="amount">${escHtml(displayOrDash(o.total_due_display))}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="footer">
      <table><tr>
        <td style="width:33%">${escHtml(appName)}</td>
        <td style="width:33%;text-align:center">Comprobante de pago</td>
        <td style="width:33%;text-align:right">Generado: ${escHtml(generatedAt)}</td>
      </tr></table>
    </div>
  </div>`
}

export function buildPaymentReceiptReportDocument(data, logoUrl, appName) {
  const code = data?.payment?.code ?? data?.order?.code ?? ''
  return wrapReportDocument(
    `Comprobante de pago · ${code}`,
    buildPaymentReceiptReportHtml(data, logoUrl, appName),
    PAYMENT_RECEIPT_REPORT_STYLES,
  )
}
