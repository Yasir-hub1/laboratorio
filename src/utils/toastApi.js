import { toast } from 'sonner'

/** Muestra el mensaje del backend (axios / unwrapData) en toast. */
export function toastApiError(error, fallback = 'Ocurrió un error') {
  const message = error?.message ?? fallback
  toast.error(message)
  return message
}

export function toastApiSuccess(message) {
  toast.success(message)
}
