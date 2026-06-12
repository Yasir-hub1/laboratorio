import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { FlaskConical, X } from 'lucide-react'
import { NavMenu } from './NavMenu'
import { Button } from '@/components/ui'
import { overlayFade, sheetSlide } from '@/utils/motion'
import { APP_NAME } from '@/utils/constants'

export function MobileNavSheet({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                variants={overlayFade}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-md lg:hidden"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                variants={sheetSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="glass-tabbar fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88dvh,720px)] flex-col rounded-t-2xl border-t shadow-card lg:hidden"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-white/40 px-4 py-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <FlaskConical className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <Dialog.Title className="text-sm font-semibold text-foreground">
                        {APP_NAME}
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-muted">
                        Todas las secciones
                      </Dialog.Description>
                    </div>
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="Cerrar menú">
                      <X className="h-5 w-5" />
                    </Button>
                  </Dialog.Close>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                  <NavMenu
                    variant="sheet"
                    layoutId="sheet-nav-active"
                    onNavigate={() => onOpenChange(false)}
                  />
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
