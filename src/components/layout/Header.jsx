import { FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '@/utils/constants'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="container-app flex h-14 items-center justify-between sm:h-16">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 text-foreground transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <FlaskConical className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent ring-1 ring-accent/20">
          PWA
        </span>
      </div>
    </header>
  )
}
