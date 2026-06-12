/**
 * Etiqueta de especialidad(es) de un médico según respuestas Laravel.
 * El listado suele traer `specialties` como array de UUID o de objetos con name.
 */
export function getDoctorSpecialtiesLabel(doctor, specialtyMap = new Map()) {
  if (!doctor) return '—'

  if (doctor.specialty?.name) {
    return doctor.specialty.name
  }

  if (doctor.specialty_name) {
    return doctor.specialty_name
  }

  if (doctor.specialty_id != null && doctor.specialty_id !== '') {
    const fromMap = specialtyMap.get(String(doctor.specialty_id))
    if (fromMap) return fromMap
  }

  const list = doctor.specialties
  if (!Array.isArray(list) || list.length === 0) {
    return '—'
  }

  const names = list
    .map((item) => {
      if (item == null || item === '') return null

      if (typeof item === 'string' || typeof item === 'number') {
        return specialtyMap.get(String(item)) ?? null
      }

      if (typeof item === 'object') {
        return (
          item.name ??
          item.specialty?.name ??
          (item.id != null ? specialtyMap.get(String(item.id)) : null) ??
          (item.specialty_id != null ? specialtyMap.get(String(item.specialty_id)) : null)
        )
      }

      return null
    })
    .filter(Boolean)

  return names.length > 0 ? names.join(', ') : '—'
}

/** IDs de especialidades del médico (para formulario y badges). */
export function getDoctorSpecialtyIds(doctor) {
  if (!doctor) return []

  const ids = new Set()

  if (doctor.specialty_id != null && doctor.specialty_id !== '') {
    ids.add(String(doctor.specialty_id))
  }

  if (doctor.specialty?.id != null) {
    ids.add(String(doctor.specialty.id))
  }

  const list = doctor.specialties
  if (!Array.isArray(list)) {
    return [...ids]
  }

  list.forEach((item) => {
    if (item == null || item === '') return

    if (typeof item === 'string' || typeof item === 'number') {
      ids.add(String(item))
      return
    }

    if (typeof item === 'object') {
      if (item.id != null) ids.add(String(item.id))
      if (item.specialty_id != null) ids.add(String(item.specialty_id))
    }
  })

  return [...ids]
}

export function getDoctorSpecialtyNames(doctor, specialtyMap = new Map()) {
  return getDoctorSpecialtyIds(doctor)
    .map((id) => specialtyMap.get(id))
    .filter(Boolean)
}
