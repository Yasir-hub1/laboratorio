import { httpClient } from './httpClient'
import { unwrapData } from '@/utils/apiHelpers'
import {
  annulmentBody,
  buildCashInflowPayload,
  buildCashOutflowPayload,
  buildCloseCashPayload,
  buildInsuranceAnalysisPricePayload,
  buildInsuranceAnalysisPricesParams,
  buildAssignCashUserPayload,
  buildInsuranceBulkPrices,
  buildOpenCashPayload,
} from '@/utils/apiPayload'

async function request(method, url, data, config) {
  const response = await httpClient[method](url, data, config)
  return unwrapData(response.data)
}

/** Listados index: conserva el envelope { success, data } para unwrapList. */
async function listRequest(url, params) {
  const response = await httpClient.get(url, { params })
  return response.data
}

export const laboratoryApi = {
  // ——— Autenticación ———
  login: (body) => request('post', '/login', body),
  loginPatient: (body) => request('post', '/login-patient', body),
  logout: () => request('post', '/logout'),
  getAccessData: () => request('get', '/access-data'),
  selectAccess: (body) =>
    request('post', '/select-access', {
      branch_id: body.branch_id != null ? String(body.branch_id) : undefined,
      role_id: body.role_id != null ? String(body.role_id) : undefined,
    }),

  // ——— Sucursales ———
  getBranches: (params) => listRequest('/branches', params),
  getBranch: (id) => request('get', `/branches/${id}`),
  createBranch: (body) => request('post', '/branches', body),
  updateBranch: (id, body) => request('put', `/branches/${id}`, body),
  deleteBranch: (id) => request('delete', `/branches/${id}`),
  updateBranchStatus: (id, body) => request('post', `/branches/${id}/status`, body),

  // ——— Flujo de caja ———
  getCashFlowOverview: (params) => request('get', '/cash-flow/overview', null, { params }),
  getCashFlowGeneral: (params) => request('get', '/cash-flow/general', null, { params }),
  getCashFlowDetail: (openingCashId) =>
    request('get', `/cash-flow/detail/${openingCashId}`),

  // ——— Seguros ———
  getInsurances: (params) => listRequest('/insurances', params),
  getInsurance: (id) => request('get', `/insurances/${id}`),
  createInsurance: (body) => request('post', '/insurances', body),
  updateInsurance: (id, body) => request('put', `/insurances/${id}`, body),
  deleteInsurance: (id) => request('delete', `/insurances/${id}`),
  updateInsuranceStatus: (id, body) => request('post', `/insurances/${id}/status`, body),
  /**
   * Precios de análisis por seguro.
   * @param {string} id — ID del seguro
   * @param {{ search?: string, onlyWithPrice?: boolean }} [params]
   */
  getInsuranceAnalysisPrices: (id, params) =>
    request('get', `/insurances/${id}/analysis-prices`, null, {
      params: buildInsuranceAnalysisPricesParams(params),
    }),
  getInsuranceAnalysisPricesByGroup: (id, params) =>
    listRequest(`/insurances/${id}/analysis-prices-by-group`, params),
  /** POST — un análisis */
  createInsuranceAnalysisPrice: (id, body) =>
    request(
      'post',
      `/insurances/${id}/analysis-prices`,
      buildInsuranceAnalysisPricePayload(body),
    ),
  /** POST — varios análisis (body: filas o { analyses }) */
  bulkUpdateInsurancePrices: (id, body) => {
    const payload = Array.isArray(body)
      ? buildInsuranceBulkPrices(body)
      : body?.analyses
        ? body
        : buildInsuranceBulkPrices(body?.rows ?? body?.prices ?? [])
    return request('post', `/insurances/${id}/analysis-prices/bulk`, payload)
  },

  // ——— Personal ———
  getStaffs: (params) => listRequest('/staffs', params),
  getStaff: (id) => request('get', `/staffs/${id}`),
  createStaff: (body) => request('post', '/staffs', body),
  updateStaff: (id, body) => request('put', `/staffs/${id}`, body),
  deleteStaff: (id) => request('delete', `/staffs/${id}`),
  updateStaffStatus: (id, body) => request('post', `/staffs/${id}/status`, body),

  getDoctors: (params) => listRequest('/doctors', params),
  getDoctor: (id) => request('get', `/doctors/${id}`),
  createDoctor: (body) => request('post', '/doctors', body),
  updateDoctor: (id, body) => request('put', `/doctors/${id}`, body),
  deleteDoctor: (id) => request('delete', `/doctors/${id}`),
  updateDoctorStatus: (id, body) => request('post', `/doctors/${id}/status`, body),

  getSpecialties: (params) => listRequest('/specialties', params),
  getSpecialty: (id) => request('get', `/specialties/${id}`),
  createSpecialty: (body) => request('post', '/specialties', body),
  updateSpecialty: (id, body) => request('put', `/specialties/${id}`, body),
  deleteSpecialty: (id) => request('delete', `/specialties/${id}`),
  updateSpecialtyStatus: (id, body) => request('post', `/specialties/${id}/status`, body),

  getPositions: (params) => listRequest('/positions', params),
  createPosition: (body) => request('post', '/positions', body),
  updatePosition: (id, body) => request('put', `/positions/${id}`, body),

  getUsers: (params) => listRequest('/users', params),
  getUser: (id) => request('get', `/users/${id}`),
  createUser: (body) => request('post', '/users', body),
  updateUser: (id, body) => request('put', `/users/${id}`, body),
  deleteUser: (id) => request('delete', `/users/${id}`),
  updateUserStatus: (id, body) => request('post', `/users/${id}/status`, body),

  getRoles: (params) => listRequest('/roles', params),
  getPermissions: (params) => listRequest('/permissions', params),

  // ——— Pacientes ———
  getPatients: (params) => listRequest('/patients', params),
  getPatient: (id) => request('get', `/patients/${id}`),
  createPatient: (body) => request('post', '/patients', body),
  updatePatient: (id, body) => request('put', `/patients/${id}`, body),
  deletePatient: (id) => request('delete', `/patients/${id}`),
  updatePatientStatus: (id, body) => request('post', `/patients/${id}/status`, body),

  // ——— Catálogo análisis ———
  getLaboratoryAnalyses: (params) => listRequest('/laboratory-analyses', params),
  getLaboratoryAnalysisPricesByGroup: (params) =>
    listRequest('/laboratory-analyses/prices-by-group', params),
  getLaboratoryAnalysis: (id) => request('get', `/laboratory-analyses/${id}`),
  createLaboratoryAnalysis: (body) => request('post', '/laboratory-analyses', body),
  updateLaboratoryAnalysis: (id, body) =>
    request('put', `/laboratory-analyses/${id}`, body),
  deleteLaboratoryAnalysis: (id) => request('delete', `/laboratory-analyses/${id}`),
  updateLaboratoryAnalysisPrice: (id, body) =>
    request('patch', `/laboratory-analyses/${id}/price`, body),
  getLaboratoryAnalysisSubgroups: (analysisId, params) =>
    listRequest(`/laboratory-analyses/${analysisId}/subgroups`, params),

  getAnalysisGroups: (params) => listRequest('/analysis-groups', params),
  getAnalysisGroup: (id) => request('get', `/analysis-groups/${id}`),
  createAnalysisGroup: (body) => request('post', '/analysis-groups', body),
  updateAnalysisGroup: (id, body) => request('put', `/analysis-groups/${id}`, body),
  deleteAnalysisGroup: (id) => request('delete', `/analysis-groups/${id}`),
  updateAnalysisGroupStatus: (id, body) =>
    request('post', `/analysis-groups/${id}/status`, body),

  getAnalysisSubgroups: (params) => listRequest('/analysis-subgroups', params),
  getAnalysisSubgroup: (id) => request('get', `/analysis-subgroups/${id}`),
  createAnalysisSubgroup: (body) => request('post', '/analysis-subgroups', body),
  updateAnalysisSubgroup: (id, body) => request('put', `/analysis-subgroups/${id}`, body),
  deleteAnalysisSubgroup: (id) => request('delete', `/analysis-subgroups/${id}`),
  updateAnalysisSubgroupStatus: (id, body) =>
    request('post', `/analysis-subgroups/${id}/status`, body),
  getAnalysisSubgroupComponents: (subgroupId, params) =>
    listRequest(`/analysis-subgroups/${subgroupId}/components`, params),

  getComponentAnalyses: (params) => listRequest('/component-analyses', params),
  createComponentAnalysis: (body) => request('post', '/component-analyses', body),
  updateComponentAnalysis: (id, body) =>
    request('put', `/component-analyses/${id}`, body),
  deleteComponentAnalysis: (id) => request('delete', `/component-analyses/${id}`),

  getSamples: (params) => listRequest('/samples', params),
  getSample: (id) => request('get', `/samples/${id}`),
  createSample: (body) => request('post', '/samples', body),
  updateSample: (id, body) => request('put', `/samples/${id}`, body),
  deleteSample: (id) => request('delete', `/samples/${id}`),

  getMethods: (params) => listRequest('/methods', params),
  getMethod: (id) => request('get', `/methods/${id}`),
  createMethod: (body) => request('post', '/methods', body),
  updateMethod: (id, body) => request('put', `/methods/${id}`, body),
  deleteMethod: (id) => request('delete', `/methods/${id}`),

  getAnalysisPrices: (params) => listRequest('/analysis-prices', params),
  createAnalysisPrice: (body) => request('post', '/analysis-prices', body),

  // ——— Caja ———
  getTypeInflows: (params) => listRequest('/type-inflows', params),
  createTypeInflow: (body) => request('post', '/type-inflows', body),
  getTypeOutflows: (params) => listRequest('/type-outflows', params),
  createTypeOutflow: (body) => request('post', '/type-outflows', body),

  getCashes: (params) => listRequest('/cashes', params),
  getMyCashes: () => request('get', '/cashes/my-cashes'),
  getCashStatus: (id) => request('get', `/cashes/${id}/status`),
  createCash: (body) => request('post', '/cashes', body),
  updateCash: (id, body) => request('put', `/cashes/${id}`, body),
  deleteCash: (id) => request('delete', `/cashes/${id}`),
  assignCashUser: (body) =>
    request('post', '/cashes/assign-user', buildAssignCashUserPayload(body)),
  getCashesByBranch: (branchId) => request('get', `/cashes/branch/${branchId}`),

  getOpeningCashes: (params) => listRequest('/opening-cashes', params),
  openCash: (body) => request('post', '/opening-cashes/open', buildOpenCashPayload(body)),
  closeCash: (id, body) =>
    request('post', `/opening-cashes/${id}/close`, buildCloseCashPayload(body)),

  getCashInflows: (params) => listRequest('/cash-inflows', params),
  createCashInflow: (body) =>
    request('post', '/cash-inflows', buildCashInflowPayload(body)),
  annulCashInflow: (id, body) => request('post', `/cash-inflows/${id}/annular`, body),

  getCashOutflows: (params) => listRequest('/cash-outflows', params),
  createCashOutflow: (body) =>
    request('post', '/cash-outflows', buildCashOutflowPayload(body)),
  annulCashOutflow: (id, body) => request('post', `/cash-outflows/${id}/annular`, body),

  getPaymentMethods: (params) => listRequest('/payment-methods', params),
  createPaymentMethod: (body) => request('post', '/payment-methods', body),

  // ——— Cotizaciones ———
  getQuotationOrders: (params) => listRequest('/quotation-orders', params),
  getQuotationOrder: (id) => request('get', `/quotation-orders/${id}`),
  createQuotationOrder: (body) => request('post', '/quotation-orders', body),
  deleteQuotationOrder: (id) => request('delete', `/quotation-orders/${id}`),

  // ——— Órdenes ———
  getLaboratoryOrders: (params) => listRequest('/laboratory-orders', params),
  getLaboratoryOrder: (id) => request('get', `/laboratory-orders/${id}`),
  createLaboratoryOrder: (body) => request('post', '/laboratory-orders', body),
  annulLaboratoryOrder: (id, body) =>
    request('post', `/laboratory-orders/${id}/annular`, annulmentBody(body)),
  getOrderSamples: (id) => request('get', `/laboratory-orders/${id}/samples`),
  getOrderPdf: (id) =>
    httpClient.get(`/laboratory-orders/${id}/pdf`, { responseType: 'blob' }),
  getOrderResultsPdf: (id) =>
    httpClient.get(`/laboratory-orders/${id}/results-pdf`, { responseType: 'blob' }),

  // ——— Muestras de laboratorio ———
  getLaboratorySamples: (params) => listRequest('/laboratory-samples', params),
  receiveSample: (body) => request('post', '/laboratory-samples/receive', body),
  receiveMultipleSamples: (body) =>
    request('post', '/laboratory-samples/receive-multiple', body),
  getOrderLaboratorySamples: (orderId) =>
    request('get', `/laboratory-samples/order/${orderId}`),

  // ——— Resultados ———
  saveComponentResults: (body) => request('post', '/component-results/save', body),
  getComponentResults: (sampleAnalysisId) =>
    request('get', `/component-results/analysis/${sampleAnalysisId}`),
  validateComponentResult: (id) =>
    request('post', `/component-results/${id}/validate`),

  // ——— Pagos ———
  getPayments: (params) => listRequest('/payments', params),
  getPayment: (id) => request('get', `/payments/${id}`),
  createPayment: (body) => request('post', '/payments', body),
  getPaymentsByOrder: (orderId) => request('get', `/payments/order/${orderId}`),
  annulPayment: (id, body) =>
    request('post', `/payments/${id}/annular`, annulmentBody(body)),

  // ——— Empresa / Config ———
  getCompany: () => request('get', '/company'),
  updateCompany: (body) => request('post', '/company', body),
  getConfigurations: (params) => listRequest('/configurations', params),
  getConfiguration: (key) => request('get', `/configurations/${key}`),
  updateConfiguration: (key, body) => request('put', `/configurations/${key}`, body),

  // ——— Impresiones / Logs ———
  createImpresion: (body) => request('post', '/impresions', body),
  getImpresionsByOrder: (orderId) => request('get', `/impresions/order/${orderId}`),
  getActivityLogs: (params) => listRequest('/activity-logs', params),
}
