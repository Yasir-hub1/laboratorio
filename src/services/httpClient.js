import axios from 'axios'
import { config } from '@/config/env'
import { API_TIMEOUT } from '@/utils/constants'
import { getErrorMessage } from '@/utils/apiHelpers'
import { storage } from '@/utils/storage'

/** Headers oficiales según OpenAPI securitySchemes */
export const API_HEADERS = {
  BRANCH: 'X-Branch-Id',
  ROLE: 'X-Role-Id',
  OPENING_CASH: 'X-Opening-Cash-Id',
}

export const httpClient = axios.create({
  baseURL: config.apiUrl,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

function setHeader(config, name, value) {
  if (value == null || value === '') return
  const str = String(value)
  if (config.headers?.set) {
    config.headers.set(name, str)
  } else {
    config.headers[name] = str
  }
}

httpClient.interceptors.request.use((requestConfig) => {
  const token = storage.getToken() ?? storage.getPatientToken()
  if (token) {
    setHeader(requestConfig, 'Authorization', `Bearer ${token}`)
  }

  const branchId = storage.getBranchId()
  const roleId = storage.getRoleId()
  const openingCashId = storage.getOpeningCashId()

  if (branchId) {
    setHeader(requestConfig, API_HEADERS.BRANCH, branchId)
    setHeader(requestConfig, 'branch_id', branchId)
  }
  if (roleId) {
    setHeader(requestConfig, API_HEADERS.ROLE, roleId)
    setHeader(requestConfig, 'role_id', roleId)
  }
  if (openingCashId) {
    setHeader(requestConfig, API_HEADERS.OPENING_CASH, openingCashId)
    setHeader(requestConfig, 'opening_cash_id', openingCashId)
  }

  return requestConfig
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getErrorMessage(error)
    const missingContext =
      message.includes('Falta contexto de sucursal') ||
      message.includes('X-Branch-Id') ||
      message.includes('X-Role-Id')

    if (missingContext && typeof window !== 'undefined') {
      storage.clearAccessContext()
      if (!window.location.pathname.includes('/select-access')) {
        window.location.href = '/select-access'
      }
    }

    if (error.response?.status === 401) {
      const isPatient = Boolean(storage.getPatientToken())
      if (isPatient) {
        storage.setPatientToken(null)
        storage.setPatient(null)
      } else {
        storage.clearStaffSession()
      }
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = isPatient ? '/portal/login' : '/login'
      }
    }

    return Promise.reject(new Error(message))
  },
)
