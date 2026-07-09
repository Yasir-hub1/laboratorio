export function getPatientDisplayName(patient) {
  if (!patient) return 'Paciente'
  return (
    patient.full_name ||
    patient.name ||
    [patient.first_name, patient.last_name].filter(Boolean).join(' ') ||
    'Paciente'
  )
}

export function getPatientIdentifier(patient) {
  if (!patient) return ''
  if (patient.ci) return `CI ${patient.ci}`
  if (patient.email) return patient.email
  return ''
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
