import { unwrapData } from '@/utils/apiHelpers'
import { patientHttpClient } from './patientHttpClient'

async function patientRequest(method, url, data, config) {
  const response = await patientHttpClient[method](url, data, config)
  return unwrapData(response.data)
}

async function patientListRequest(url, params) {
  const response = await patientHttpClient.get(url, { params })
  return response.data
}

export const patientPortalApi = {
  login: (body) => patientRequest('post', '/login-patient', body),
  logout: () => patientRequest('post', '/logout', {}),
  getProfile: () => patientRequest('get', '/patient/me'),
  getOrders: (params) => patientListRequest('/patient/orders', params),
  getOrder: (id) => patientRequest('get', `/patient/orders/${id}`),
  getOrderResults: (id) => patientRequest('get', `/patient/orders/${id}/results`),
  getOrderResultsPdfData: (id) => patientRequest('get', `/patient/orders/${id}/results-pdf-data`),
  getOrderResultsPdf: (id) =>
    patientHttpClient.get(`/patient/orders/${id}/results-pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    }),
}
