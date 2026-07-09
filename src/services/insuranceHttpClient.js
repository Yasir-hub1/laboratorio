import axios from 'axios'
import { config } from '@/config/env'
import { API_TIMEOUT } from '@/utils/constants'
import { getErrorMessage } from '@/utils/apiHelpers'
import { storage } from '@/utils/storage'

/** Cliente HTTP exclusivo del portal de seguros (sin headers de staff). */
export const insuranceHttpClient = axios.create({
  baseURL: config.apiUrl,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

function setHeader(requestConfig, name, value) {
  if (value == null || value === '') return
  const str = String(value)
  if (requestConfig.headers?.set) {
    requestConfig.headers.set(name, str)
  } else {
    requestConfig.headers[name] = str
  }
}

insuranceHttpClient.interceptors.request.use((requestConfig) => {
  const token = storage.getInsuranceToken()
  if (token) {
    setHeader(requestConfig, 'Authorization', `Bearer ${token}`)
  }
  return requestConfig
})

insuranceHttpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      storage.clearInsuranceSession()
      if (!window.location.pathname.startsWith('/seguros/login')) {
        window.location.href = '/seguros/login'
      }
    }
    return Promise.reject(new Error(getErrorMessage(error)))
  },
)
