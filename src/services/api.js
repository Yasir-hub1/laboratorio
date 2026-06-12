import { httpClient } from './httpClient'

export const api = {
  get: (url, config) => httpClient.get(url, config).then((r) => r.data),
  post: (url, data, config) => httpClient.post(url, data, config).then((r) => r.data),
  put: (url, data, config) => httpClient.put(url, data, config).then((r) => r.data),
  patch: (url, data, config) => httpClient.patch(url, data, config).then((r) => r.data),
  delete: (url, config) => httpClient.delete(url, config).then((r) => r.data),
}
