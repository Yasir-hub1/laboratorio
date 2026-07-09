/**
 * Normalización de payloads según OpenAPI (API Laboratorio Clínico).
 * Los IDs son strings (UUID/códigos), no enteros.
 */

export function asApiId(value) {
  if (value == null || value === '') return undefined
  return String(value).trim()
}

export function pickDefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}

const GENDER_MAP = {
  M: 'Masculino',
  F: 'Femenino',
  O: 'Otro',
  masculino: 'Masculino',
  femenino: 'Femenino',
}

export function normalizeGender(value) {
  if (!value) return undefined
  return GENDER_MAP[value] ?? value
}

export function buildPatientPayload(form) {
  return pickDefined({
    ci: form.ci,
    first_name: form.first_name,
    last_name: form.last_name,
    phone: form.phone,
    address: form.address,
    gender: normalizeGender(form.gender),
    birth_date: form.birth_date || undefined,
    email: form.email,
    password: form.password,
  })
}

export function buildDoctorPayload(form) {
  const rawIds = form.specialty_ids ?? form.specialties
  const specialtyList = Array.isArray(rawIds)
    ? rawIds.map(asApiId).filter(Boolean)
    : form.specialty_id
      ? [asApiId(form.specialty_id)]
      : []

  return pickDefined({
    ci: form.ci,
    first_name: form.first_name,
    last_name: form.last_name,
    full_name: form.full_name,
    print_name: form.print_name,
    phone: form.phone,
    email: form.email,
    address: form.address,
    gender: normalizeGender(form.gender),
    birth_date: form.birth_date,
    commission: form.commission != null && form.commission !== '' ? Number(form.commission) : undefined,
    specialties: specialtyList.length ? specialtyList : undefined,
    user_id: asApiId(form.user_id),
  })
}

export function buildStaffPayload(form) {
  return pickDefined({
    ci: form.ci,
    first_name: form.first_name,
    last_name: form.last_name,
    full_name: form.full_name,
    print_name: form.print_name,
    phone: form.phone,
    email: form.email,
    address: form.address,
    gender: normalizeGender(form.gender),
    birth_date: form.birth_date,
    position_id: asApiId(form.position_id ?? form.position),
    user_id: asApiId(form.user_id),
  })
}

export function buildLaboratoryOrderPayload({
  patient_id,
  doctor_id,
  insurance_id,
  insurance_number,
  discount,
  sample_collection_date,
  sample_collection_time,
  details,
  payment,
}) {
  const body = pickDefined({
    patient_id: asApiId(patient_id),
    doctor_id: asApiId(doctor_id),
    insurance_id: asApiId(insurance_id),
    insurance_number,
    discount: discount != null && discount !== '' ? Number(discount) : undefined,
    sample_collection_date: sample_collection_date || undefined,
    sample_collection_time: sample_collection_time || undefined,
    details: (details ?? [])
      .map((d) =>
        pickDefined({
          laboratory_analysis_id: asApiId(d.laboratory_analysis_id ?? d.id),
        }),
      )
      .filter((d) => d.laboratory_analysis_id),
  })

  if (payment?.payment_method_id) {
    body.payment = {
      payment_method_id: asApiId(payment.payment_method_id),
      amount: Number(payment.amount),
    }
  }

  return body
}

export function buildQuotationPayload({
  patient_id,
  branch_id,
  doctor_id,
  insurance_id,
  details,
}) {
  const resolvedInsurance =
    insurance_id != null && insurance_id !== '' ? asApiId(insurance_id) : null

  return {
    ...pickDefined({
      patient_id: asApiId(patient_id),
      branch_id: asApiId(branch_id),
      doctor_id: asApiId(doctor_id),
      details: (details ?? []).map((d) => ({
        laboratory_analysis_id: asApiId(d.laboratory_analysis_id),
        unit_price: Number(d.unit_price ?? d.price ?? 0),
      })),
    }),
    insurance_id: resolvedInsurance,
  }
}

export function buildPaymentPayload(form) {
  return {
    laboratory_order_id: asApiId(form.laboratory_order_id),
    payment_method_id: asApiId(form.payment_method_id),
    amount: Number(form.amount),
  }
}

export function buildReceiveSamplePayload(form) {
  return pickDefined({
    laboratory_order_id: asApiId(form.laboratory_order_id),
    sample_id: asApiId(form.sample_id),
    code: form.code?.trim(),
    volume: form.volume,
    note: form.note,
  })
}

export function buildReceiveMultipleSamplesPayload({ laboratory_order_id, samples }) {
  return {
    laboratory_order_id: asApiId(laboratory_order_id),
    samples: (samples ?? [])
      .map((s) =>
        pickDefined({
          sample_id: asApiId(s.sample_id),
          code: s.code?.trim() || undefined,
          volume: s.volume || undefined,
          note: s.note || undefined,
        }),
      )
      .filter((s) => s.sample_id),
  }
}

export function buildSaveOrderResultsPayload(entries) {
  return {
    entries: (entries ?? [])
      .map((entry) => ({
        sample_analysis_id: asApiId(entry.sample_analysis_id),
        results: (entry.results ?? [])
          .map((r) =>
            pickDefined({
              component_analysis_id: asApiId(r.component_analysis_id),
              value_obtained: r.value_obtained != null ? String(r.value_obtained) : undefined,
            }),
          )
          .filter((r) => r.component_analysis_id),
      }))
      .filter((e) => e.sample_analysis_id && e.results.length > 0),
  }
}

export function buildValidateOrderResultsPayload({ result_ids, validate_all }) {
  if (validate_all) return { validate_all: true }
  return { result_ids: (result_ids ?? []).map(asApiId).filter(Boolean) }
}

export function buildWorkflowTransitionPayload(workflow_status) {
  return { workflow_status: Number(workflow_status) }
}

export function buildComponentResultsPayload(sampleAnalysisId, results, draft) {
  return {
    sample_analysis_id: asApiId(sampleAnalysisId),
    results: (results ?? []).map((r) => {
      const key = r.id ?? r.component_analysis_id
      return {
        component_analysis_id: asApiId(r.component_analysis_id ?? r.component_id),
        value_obtained: String(
          draft?.[key] ?? r.value_obtained ?? r.value ?? r.result ?? '',
        ),
      }
    }),
  }
}

export function buildOpenCashPayload(body) {
  return pickDefined({
    cash_id: asApiId(body.cash_id ?? body.cashId),
    initial_amount: Number(body.initial_amount ?? body.opening_amount),
  })
}

export function buildCashPayload(form) {
  return pickDefined({
    name: form.name,
    branch_id: asApiId(form.branch_id),
  })
}

/** POST /cashes/assign-user — action: "assign" | "remove" */
export function buildAssignCashUserPayload({ user_id, cash_id, action, assigned }) {
  const resolvedAction =
    action === 'remove' || action === 'assign'
      ? action
      : assigned === false
        ? 'remove'
        : 'assign'

  return {
    user_id: asApiId(user_id),
    cash_id: asApiId(cash_id),
    action: resolvedAction,
  }
}

export function buildCloseCashPayload(body = {}) {
  return pickDefined({
    final_amount:
      body.final_amount != null
        ? Number(body.final_amount)
        : body.closing_amount != null
          ? Number(body.closing_amount)
          : undefined,
  })
}

function insuranceAnalysisRowId(row) {
  return asApiId(
    row.laboratory_analysis_id ?? row.analysis_id ?? row.laboratory_analysis?.id ?? row.id,
  )
}

export function hasInsuranceAnalysisPrice(row) {
  const price = row?.insurance_price
  return price != null && price !== ''
}

/** Query GET /insurances/{id}/analysis-prices */
export function buildInsuranceAnalysisPricesParams({ search, onlyWithPrice } = {}) {
  return pickDefined({
    search: search?.trim() || undefined,
    only_with_price: onlyWithPrice === true ? 1 : undefined,
  })
}

/** POST /insurances/{id}/analysis-prices/bulk — solo filas con precio definido */
export function buildInsuranceBulkPrices(rows) {
  const analyses = (rows ?? [])
    .filter(hasInsuranceAnalysisPrice)
    .map((row) => ({
      laboratory_analysis_id: insuranceAnalysisRowId(row),
      price: Number(row.insurance_price),
    }))
    .filter((item) => item.laboratory_analysis_id)

  return { analyses }
}

/** POST /insurances/{id}/analysis-prices */
export function buildInsuranceAnalysisPricePayload(body) {
  return {
    laboratory_analysis_id: insuranceAnalysisRowId(body),
    price: Number(body.insurance_price),
  }
}

/** POST /{resource}/{id}/status — 1=Activo, 2=Desactivado */
export function buildStatusPayload(isCurrentlyActive) {
  return { status: isCurrentlyActive ? 2 : 1 }
}

export function buildCashInflowPayload(form) {
  return pickDefined({
    type_inflow_id: asApiId(form.type_inflow_id),
    amount: Number(form.amount),
    description: form.description || undefined,
  })
}

export function buildCashOutflowPayload(form) {
  return pickDefined({
    type_outflow_id: asApiId(form.type_outflow_id),
    amount: Number(form.amount),
    description: form.description || undefined,
  })
}

export function buildLaboratoryAnalysisPayload(form) {
  return pickDefined({
    analysis_group_id: asApiId(form.analysis_group_id),
    method_id: asApiId(form.method_id),
    sample_id: asApiId(form.sample_id),
    name: form.name,
    price: Number(form.price ?? 0),
  })
}

export function buildComponentAnalysisPayload(form) {
  const toBool = (value) =>
    value === true || value === 'true' || value === 1 || value === '1'

  return pickDefined({
    analysis_subgroup_id: asApiId(form.analysis_subgroup_id),
    laboratory_analysis_id: asApiId(form.laboratory_analysis_id),
    name: form.name,
    unit_measurement: form.unit_measurement,
    ref_min: form.ref_min != null && form.ref_min !== '' ? Number(form.ref_min) : undefined,
    ref_max: form.ref_max != null && form.ref_max !== '' ? Number(form.ref_max) : undefined,
    ref_description: form.ref_description,
    position: form.position != null && form.position !== '' ? Number(form.position) : undefined,
    state: form.state !== undefined && form.state !== '' ? toBool(form.state) : undefined,
    status: form.status !== undefined && form.status !== '' ? toBool(form.status) : undefined,
  })
}

export function annulmentBody(body = {}) {
  return {
    annulment_reason: body.annulment_reason ?? body.reason ?? 'Anulación desde sistema',
  }
}

export function buildBranchPayload(form) {
  return pickDefined({
    name: form.name,
    address: form.address,
    phone: form.phone,
    status: form.status != null && form.status !== '' ? Number(form.status) : undefined,
    state: form.state != null && form.state !== '' ? Number(form.state) : undefined,
  })
}

export function buildInsurancePayload(form, { isEdit = false } = {}) {
  return {
    ...pickDefined({
      name: form.name,
      username: form.username,
      password: !isEdit || form.password ? form.password : undefined,
    }),
    contact: String(form.contact ?? ''),
  }
}

export function buildSpecialtyPayload(form) {
  return pickDefined({
    name: form.name,
    description: form.description,
  })
}

export function buildAnalysisGroupPayload(form) {
  return pickDefined({
    name: form.name,
  })
}

export function buildAnalysisSubgroupPayload(form, { laboratoryAnalysisId } = {}) {
  return pickDefined({
    laboratory_analysis_id: asApiId(form.laboratory_analysis_id ?? laboratoryAnalysisId),
    name: form.name,
    position: form.position != null && form.position !== '' ? Number(form.position) : undefined,
    state: form.state != null && form.state !== '' ? Number(form.state) : undefined,
  })
}

export function buildMethodPayload(form) {
  return pickDefined({
    name: form.name,
  })
}

export function buildSamplePayload(form) {
  return pickDefined({
    name: form.name,
    state: form.state === '0' || form.state === false ? false : form.state ? true : undefined,
    status: form.status === '0' || form.status === false ? false : form.status ? true : undefined,
  })
}

export function buildUserPayload(form, { isEdit = false } = {}) {
  const roleIds = form.role_ids?.length
    ? form.role_ids.map(asApiId).filter(Boolean)
    : form.role_id
      ? [asApiId(form.role_id)]
      : undefined

  const branchIds = form.branch_ids?.length
    ? form.branch_ids.map(asApiId).filter(Boolean)
    : form.branch_id
      ? [asApiId(form.branch_id)]
      : undefined

  return pickDefined({
    name: form.name,
    username: form.username,
    email: form.email,
    password: !isEdit || form.password ? form.password : undefined,
    person_id: asApiId(form.person_id),
    roles: roleIds?.length ? roleIds : undefined,
    branches: branchIds?.length ? branchIds : undefined,
  })
}
