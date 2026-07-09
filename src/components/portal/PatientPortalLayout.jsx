import { Link, useNavigate } from 'react-router-dom'
import { LogOut, TestTube2, User } from 'lucide-react'
import { toast } from 'sonner'
import { AppBackground } from '@/components/layout/AppBackground'
import { AnimatedOutlet } from '@/components/common/AnimatedOutlet'
import { Button } from '@/components/ui'
import { patientPortalApi } from '@/services/patientPortalApi'
import { APP_NAME, ROUTES } from '@/utils/constants'
import { getPatientDisplayName, getPatientIdentifier } from '@/utils/patientPortal'
import { storage } from '@/utils/storage'
import { cn } from '@/utils/cn'

export function PatientPortalLayout() {
  const navigate = useNavigate()
  const patient = storage.getPatient()
  const patientName = getPatientDisplayName(patient)
  const patientId = getPatientIdentifier(patient)

  const handleLogout = async () => {
    try {
      await patientPortalApi.logout()
    } catch {
      // Limpiar sesión local aunque falle el servidor
    }
    storage.clearPatientSession()
    toast.success('Sesión cerrada')
    navigate(ROUTES.PATIENT_LOGIN, { replace: true })
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppBackground />

      <header className={cn('sticky top-0 z-30 border-b', 'glass-header')}>
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link
            to={ROUTES.PATIENT_PORTAL}
            className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/90 text-primary-foreground shadow-soft">
              <TestTube2 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-foreground">
                {APP_NAME}
              </p>
              <p className="truncate text-[11px] font-medium text-muted">Portal del paciente</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-foreground">{patientName}</p>
              {patientId && <p className="truncate text-xs text-muted">{patientId}</p>}
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 sm:hidden">
              <User className="h-4 w-4" aria-hidden />
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
