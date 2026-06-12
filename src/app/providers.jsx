import { Toaster } from 'sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ConfirmProvider } from '@/context/ConfirmContext'
import { TooltipProvider } from '@radix-ui/react-tooltip'

export function AppProviders({ children }) {
  return (
    <AuthProvider>
      <ConfirmProvider>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'border border-border shadow-soft',
            },
          }}
        />
      </TooltipProvider>
      </ConfirmProvider>
    </AuthProvider>
  )
}
