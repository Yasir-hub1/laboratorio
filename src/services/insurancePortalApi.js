import { unwrapData } from '@/utils/apiHelpers'
import { insuranceHttpClient } from './insuranceHttpClient'

async function insuranceRequest(method, url, data, config) {
  const response = await insuranceHttpClient[method](url, data, config)
  return unwrapData(response.data)
}

async function insuranceListRequest(url, params) {
  const response = await insuranceHttpClient.get(url, { params })
  return response.data
}

export const insurancePortalApi = {
  login: (body) => insuranceRequest('post', '/login-insurance', body),
  logout: () => insuranceRequest('post', '/logout', {}),
  getProfile: () => insuranceRequest('get', '/insurance/me'),
  getOrders: (params) => insuranceListRequest('/insurance/orders', params),
  getOrder: (id) => insuranceRequest('get', `/insurance/orders/${id}`),
  getOrderResults: (id) => insuranceRequest('get', `/insurance/orders/${id}/results`),
  getOrderResultsPdfData: (id) => insuranceRequest('get', `/insurance/orders/${id}/results-pdf-data`),
  getOrderResultsPdf: (id) =>
    insuranceHttpClient.get(`/insurance/orders/${id}/results-pdf`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    }),
}
