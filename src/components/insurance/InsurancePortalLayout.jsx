import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { AppBackground } from '@/components/layout/AppBackground'
import { AnimatedOutlet } from '@/components/common/AnimatedOutlet'
import { Button } from '@/components/ui'
import { insurancePortalApi } from '@/services/insurancePortalApi'
import { APP_NAME, ROUTES } from '@/utils/constants'
import { getInsuranceDisplayName, getInsuranceIdentifier } from '@/utils/insurancePortal'
import { storage } from '@/utils/storage'
import { cn } from '@/utils/cn'

export function InsurancePortalLayout() {
  const navigate = useNavigate()
  const insurance = storage.getInsurance()
  const insuranceName = getInsuranceDisplayName(insurance)
  const insuranceId = getInsuranceIdentifier(insurance)

  const handleLogout = async () => {
    try {
      await insurancePortalApi.logout()
    } catch {
      // Limpiar sesión local aunque falle el servidor
    }
    storage.clearInsuranceSession()
    toast.success('Sesión cerrada')
    navigate(ROUTES.INSURANCE_LOGIN, { replace: true })
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppBackground />

      <header className={cn('sticky top-0 z-30 border-b', 'glass-header')}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link
            to={ROUTES.INSURANCE_PORTAL}
            className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600/90 text-white shadow-soft">
              <Shield className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-foreground">
                {APP_NAME}
              </p>
              <p className="truncate text-[11px] font-medium text-muted">Portal de seguros</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-foreground">{insuranceName}</p>
              {insuranceId && <p className="truncate text-xs text-muted">{insuranceId}</p>}
            </div>
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

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <AnimatedOutlet />
      </main>
    </div>
  )
}
