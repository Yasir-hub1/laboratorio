import axios from 'axios'
import { config } from '@/config/env'
import { API_TIMEOUT } from '@/utils/constants'
import { getErrorMessage } from '@/utils/apiHelpers'
import { storage } from '@/utils/storage'

/** Cliente HTTP exclusivo del portal paciente (sin headers de staff). */
export const patientHttpClient = axios.create({
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

patientHttpClient.interceptors.request.use((requestConfig) => {
  const token = storage.getPatientToken()
  if (token) {
    setHeader(requestConfig, 'Authorization', `Bearer ${token}`)
  }
  return requestConfig
})

patientHttpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      storage.clearPatientSession()
      if (!window.location.pathname.startsWith('/portal/login')) {
        window.location.href = '/portal/login'
      }
    }
    return Promise.reject(new Error(getErrorMessage(error)))
  },
)
