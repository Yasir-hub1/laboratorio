export function getInsuranceDisplayName(insurance) {
  if (!insurance) return 'Seguro'
  return insurance.name || insurance.username || 'Seguro'
}

export function getInsuranceIdentifier(insurance) {
  if (!insurance) return ''
  if (insurance.username) return insurance.username
  return ''
}

export function getOrderPatientName(order) {
  return (
    order?.patient_name ||
    order?.patient?.full_name ||
    [order?.patient?.first_name, order?.patient?.last_name].filter(Boolean).join(' ') ||
    '—'
  )
}

export function getOrderStudyNames(order) {
  const details = order?.details ?? []
  return details
    .map(
      (d) =>
        d.analysis?.name ??
        d.catalog_analysis?.name ??
        d.laboratory_analysis?.name ??
        d.analysis_name,
    )
    .filter(Boolean)
}
