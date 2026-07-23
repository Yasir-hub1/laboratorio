import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Sidebar } from './Sidebar'
import { MobileTabBar } from './MobileTabBar'
import { AppBackground } from './AppBackground'
import { AnimatedOutlet } from '@/components/common/AnimatedOutlet'
import { PWAUpdatePrompt } from '@/components/common/PWAUpdatePrompt'
import { Can } from '@/components/auth/Can'
import { Button } from '@/components/ui'
import { SidebarProvider, useSidebar, SIDEBAR_WIDTH } from '@/context/SidebarContext'
import { useAuth } from '@/hooks/useAuth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { APP_NAME, ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'
import { cn } from '@/utils/cn'

function DesktopSidebarShell() {
  const { collapsed } = useSidebar()

  return (
    <div
      aria-hidden
      className={cn(
        'hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block',
        collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded,
      )}
    />
  )
}

function AppLayoutContent() {
  const { user, logout, branchName, roleName, cashName } = useAuth()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada')
    navigate(ROUTES.LOGIN)
  }

  const branchLabel = branchName || user?.active_branch?.name
  const roleLabel = roleName ? ` · ${roleName}` : ''
  const cashLabel = cashName || storage.getCashName()

  return (
    <div className="relative flex min-h-dvh items-stretch">
      <AppBackground />

      {isDesktop && (
        <>
          <DesktopSidebarShell />
          <Sidebar />
        </>
      )}

      <div className="relative z-10 flex min-h-dvh min-w-0 flex-1 flex-col">
        <header
          className={cn(
            'sticky top-0 z-30 border-b',
            'glass-header',
          )}
        >
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              {!isDesktop && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground text-xs font-bold shadow-soft backdrop-blur-sm sm:h-9 sm:w-9">
                  {APP_NAME.slice(0, 1)}
                </span>
              )}
              <div className="flex min-w-0 items-center gap-2">
                {isDesktop && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/15 backdrop-blur-sm">
                    <User className="h-4 w-4" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.name ?? user?.email ?? 'Usuario'}
                  </p>
                  {(branchLabel || roleName || cashLabel) && (
                    <p className="truncate text-xs text-muted">
                      {branchLabel}
                      {roleLabel}
                      {cashLabel ? ` · ${cashLabel}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Can permission="caja.apertura-cierre.cambiar-caja">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="shrink-0 gap-1.5 text-muted"
              >
                <Link to={ROUTES.SELECT_CASH}>
                  <Wallet className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">
                    {cashLabel ? `Caja: ${cashLabel}` : 'Elegir caja'}
                  </span>
                </Link>
              </Button>
            </Can>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="shrink-0 gap-1.5 text-muted hover:bg-white/50 hover:text-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="relative min-w-0 flex-1 overflow-x-hidden p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:p-6 lg:pb-8 lg:p-8">
          <div className="page-content min-w-0">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      {!isDesktop && <MobileTabBar />}

      <PWAUpdatePrompt />
    </div>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  )
}
