const env = import.meta.env

export const config = {
  appName: env.VITE_APP_NAME ?? 'BIOCONTROL',
  apiUrl: env.VITE_API_URL ?? 'http://ws-laboratorio.solucionesinteligentes.pro/api',
  isDev: env.DEV,
  isProd: env.PROD,
}
