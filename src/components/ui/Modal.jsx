import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { overlayFade, scaleIn } from '@/utils/motion'
import { Button } from './Button'

export function Modal({ open, onOpenChange, title, description, children, className }) {
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
                className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
                  'rounded-xl border border-border bg-surface p-6 shadow-card outline-none',
                  className,
                )}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    {title && (
                      <Dialog.Title className="text-lg font-semibold text-foreground">
                        {title}
                      </Dialog.Title>
                    )}
                    {description && (
                      <Dialog.Description className="text-sm text-muted">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0"
                      aria-label="Cerrar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </Dialog.Close>
                </div>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export function ModalFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('mt-6 flex flex-wrap items-center justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}
