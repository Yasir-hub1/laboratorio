import { Outlet } from 'react-router-dom'
import { PWAUpdatePrompt } from '@/components/common/PWAUpdatePrompt'
import { Header } from './Header'

export function MainLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="container-app flex-1 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6">
        <div className="container-app text-center text-xs text-muted">
          © {new Date().getFullYear()} Laboratorio — Base lista para tu proyecto
        </div>
      </footer>
      <PWAUpdatePrompt />
    </div>
  )
}
