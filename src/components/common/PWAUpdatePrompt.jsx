import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { slideFromBottom } from '@/utils/motion'

const SYNC_PERIOD_MS = 60 * 60 * 1000

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (SYNC_PERIOD_MS <= 0) return

      if (registration?.active?.state === 'activated') {
        registerPeriodicSync(SYNC_PERIOD_MS, swUrl, registration)
        return
      }

      registration?.installing?.addEventListener('statechange', (event) => {
        const sw = event.target
        if (sw.state === 'activated') {
          registerPeriodicSync(SYNC_PERIOD_MS, swUrl, registration)
        }
      })
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          role="alert"
          variants={slideFromBottom}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 mx-auto max-w-md lg:bottom-4"
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
            <RefreshCw className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="flex-1 text-sm text-foreground">Hay una nueva versión disponible.</p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => updateServiceWorker(true)}>
                Actualizar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setNeedRefresh(false)}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function registerPeriodicSync(period, swUrl, registration) {
  if (period <= 0) return

  setInterval(async () => {
    if ('onLine' in navigator && !navigator.onLine) return

    const response = await fetch(swUrl, {
      cache: 'no-store',
      headers: {
        cache: 'no-store',
        'cache-control': 'no-cache',
      },
    })

    if (response?.status === 200) {
      await registration.update()
    }
  }, period)
}
