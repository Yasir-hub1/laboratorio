/** Nombres que equivalen a «Sin seguro / Particular» en el selector de órdenes. */
export const PARTICULAR_INSURANCE_NAME =
  /^(sin\s*seguro|particular|sin\s*seguro\s*\/\s*particular)$/i

export function isParticularInsuranceName(label) {
  return PARTICULAR_INSURANCE_NAME.test(String(label ?? '').trim())
}

/** Sin seguro: valor vacío o seguro del catálogo con nombre «Sin seguro» / «Particular». */
export function isParticularInsuranceSelection(insuranceId, insurances = []) {
  if (insuranceId == null || insuranceId === '') return true
  const ins = insurances.find((i) => String(i.id) === String(insuranceId))
  if (!ins) return false
  return isParticularInsuranceName(ins.name ?? ins.description)
}

/** Quita del listado seguros duplicados de la opción vacía «Sin seguro». */
export function filterSelectableInsurances(insurances = []) {
  return insurances.filter(
    (ins) => !isParticularInsuranceName(ins.name ?? ins.description),
  )
}

/** ID de análisis en filas de precios por seguro o catálogo. */
export function insuranceAnalysisRowId(row) {
  return (
    row.laboratory_analysis_id ??
    row.analysis_id ??
    row.laboratory_analysis?.id ??
    row.id
  )
}

export function insuranceAnalysisName(row) {
  return (
    row.analysis_name ??
    row.name ??
    row.laboratory_analysis?.name ??
    '—'
  )
}

export function insuranceAnalysisCode(row) {
  return row.code ?? row.laboratory_analysis?.code ?? '—'
}

/** Precio normal del catálogo (GET /laboratory-analyses — opción Sin seguro). */
export function getCatalogDefaultPrice(row) {
  const value = row.price ?? row.laboratory_analysis?.price
  return value != null && value !== '' ? Number(value) : null
}

/**
 * Precio convenido del seguro (GET /insurances/{id}/analysis-prices).
 * El backend expone insurance_price; price en ese endpoint es el del seguro al guardar.
 */
export function getInsurancePrice(row) {
  if (row.insurance_price != null && row.insurance_price !== '') {
    return Number(row.insurance_price)
  }
  // GET /insurances/{id}/analysis-prices?only_with_price=true suele devolver `price`
  if (row.price != null && row.price !== '') {
    return Number(row.price)
  }
  return null
}

/** Precio de referencia (catálogo) en filas del endpoint analysis-prices. */
export function getReferenceDefaultPrice(row) {
  const value =
    row.default_price ??
    row.base_price ??
    row.standard_price ??
    row.laboratory_analysis?.price
  return value != null && value !== '' ? Number(value) : null
}

export function hasInsurancePrice(row) {
  return getInsurancePrice(row) != null
}
