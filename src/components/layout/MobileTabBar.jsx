import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import * as Icons from 'lucide-react'
import { cn } from '@/utils/cn'
import { tapScale } from '@/utils/motion'
import { TAB_BAR_ITEMS, isTabBarItemActive } from '@/utils/constants'
import { usePermission } from '@/hooks/usePermission'
import { canMenu } from '@/utils/permissions'
import { MobileNavSheet } from './MobileNavSheet'

export function MobileTabBar() {
  const { pathname } = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { permissions } = usePermission()

  const tabs = useMemo(
    () =>
      TAB_BAR_ITEMS.filter(
        (item) => item.isMore || canMenu(permissions, item.permission),
      ),
    [permissions],
  )

  return (
    <>
      <nav
        className="glass-tabbar fixed inset-x-0 bottom-0 z-40 border-t lg:hidden"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-1 sm:max-w-2xl sm:px-2">
          {tabs.map((item) => {
            const Icon = Icons[item.icon] ?? Icons.Circle
            const isActive = item.isMore
              ? isTabBarItemActive(pathname, item) || sheetOpen
              : isTabBarItemActive(pathname, item)

            if (item.isMore) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className={cn(
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5',
                    'text-[10px] font-medium transition-colors sm:text-[11px]',
                    isActive ? 'text-primary' : 'text-muted',
                  )}
                  aria-label="Abrir menú completo"
                  aria-expanded={sheetOpen}
                >
                  <motion.span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-colors sm:h-10 sm:w-10',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft'
                        : 'bg-transparent',
                    )}
                    whileTap={tapScale}
                  >
                    <Icon
                      className="h-5 w-5 shrink-0"
                      strokeWidth={isActive ? 2.25 : 2}
                      aria-hidden
                    />
                  </motion.span>
                  <span className="truncate leading-none">{item.label}</span>
                  {isActive && !sheetOpen && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute top-1 h-0.5 w-8 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                </button>
              )
            }

            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.end}
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5',
                  'text-[10px] font-medium transition-colors sm:text-[11px]',
                  isActive ? 'text-primary' : 'text-muted',
                )}
              >
                <motion.span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl transition-colors sm:h-10 sm:w-10',
                    isActive ? 'bg-primary-soft text-primary' : 'bg-transparent',
                  )}
                  whileTap={tapScale}
                >
                  <Icon
                    className="h-5 w-5 shrink-0"
                    strokeWidth={isActive ? 2.25 : 2}
                    aria-hidden
                  />
                </motion.span>
                <span className="truncate leading-none">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute top-1 h-0.5 w-8 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <MobileNavSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
