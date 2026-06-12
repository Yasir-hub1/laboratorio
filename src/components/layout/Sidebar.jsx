import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSidebar } from '@/context/SidebarContext'
import { APP_NAME, THEME } from '@/utils/constants'
import { NavMenu } from './NavMenu'

const FLYOUT_WIDTH = 256
const HOVER_LEAVE_DELAY = 180

function SidebarBackdrop() {
  return (
    <>
      <div
        className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', THEME.sidebarGradient)}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-12 top-[10%] h-64 w-64 rounded-full bg-blue-500/25 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -left-8 bottom-[15%] h-52 w-52 rounded-full bg-sky-400/15 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"
        aria-hidden
      />
    </>
  )
}

function SidebarHeader({ collapsed, showFullMenu, onToggle }) {
  const toggleButton = (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground',
        showFullMenu ? 'h-8 w-8' : 'h-7 w-7',
      )}
      aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
      aria-expanded={!collapsed}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4" aria-hidden />
      ) : (
        <ChevronLeft className="h-4 w-4" aria-hidden />
      )}
    </motion.button>
  )

  if (!showFullMenu) {
    return (
      <div className="relative flex h-14 shrink-0 flex-col items-center justify-center gap-1.5 border-b border-white/10 px-2 backdrop-blur-sm">
        {toggleButton}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)] backdrop-blur-sm">
          <FlaskConical className="h-4 w-4" aria-hidden />
        </span>
      </div>
    )
  }

  return (
    <div className="relative flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-3 backdrop-blur-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground shadow-[0_4px_12px_-4px_rgba(37,99,235,0.5)] backdrop-blur-sm">
        <FlaskConical className="h-4 w-4" aria-hidden />
      </span>

      <AnimatePresence initial={false}>
        <motion.div
          key="brand"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="min-w-0 flex-1 overflow-hidden"
        >
          <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            {APP_NAME}
          </p>
          <p className="truncate text-[10px] text-sidebar-muted">Laboratorio clínico</p>
        </motion.div>
      </AnimatePresence>

      <div className="ml-auto">{toggleButton}</div>
    </div>
  )
}

function SidebarPanel({ onNavigate, collapsed, showFullMenu, onToggle, className }) {
  return (
    <div className={cn('relative flex h-full min-h-dvh flex-col overflow-hidden', className)}>
      <SidebarBackdrop />
      <SidebarHeader collapsed={collapsed} showFullMenu={showFullMenu} onToggle={onToggle} />
      <motion.div
        className="relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <NavMenu
          variant="sidebar"
          onNavigate={onNavigate}
          layoutId={showFullMenu ? 'sidebar-active' : 'sidebar-active-collapsed'}
          collapsed={!showFullMenu}
          animateReveal={showFullMenu && collapsed}
        />
      </motion.div>
    </div>
  )
}

export function Sidebar({ onNavigate }) {
  const { collapsed, toggleCollapsed } = useSidebar()
  const [hoverExpanded, setHoverExpanded] = useState(false)
  const leaveTimerRef = useRef(null)

  const isFlyout = collapsed && hoverExpanded

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return
    clearLeaveTimer()
    setHoverExpanded(true)
  }, [collapsed, clearLeaveTimer])

  const handleMouseLeave = useCallback(() => {
    if (!collapsed) return
    clearLeaveTimer()
    leaveTimerRef.current = window.setTimeout(() => {
      setHoverExpanded(false)
    }, HOVER_LEAVE_DELAY)
  }, [collapsed, clearLeaveTimer])

  useEffect(() => {
    if (!collapsed) setHoverExpanded(false)
  }, [collapsed])

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer])

  return (
    <div
      className={cn('relative h-full min-h-dvh w-full', collapsed && 'overflow-visible')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Rail base (iconos) */}
      <SidebarPanel
        onNavigate={onNavigate}
        collapsed={collapsed}
        showFullMenu={!collapsed}
        onToggle={toggleCollapsed}
        className="w-full"
      />

      {/* Flyout al hover cuando está contraído */}
      <AnimatePresence>
        {isFlyout && (
          <motion.aside
            key="sidebar-flyout"
            initial={{ opacity: 0, x: -16, width: 72 }}
            animate={{ opacity: 1, x: 0, width: FLYOUT_WIDTH }}
            exit={{ opacity: 0, x: -12, width: 72 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-0 z-50 h-full min-h-dvh overflow-hidden rounded-r-2xl shadow-[8px_0_32px_-8px_rgba(15,23,42,0.45)] ring-1 ring-white/10"
            style={{ width: FLYOUT_WIDTH }}
          >
            <SidebarPanel
              onNavigate={() => {
                setHoverExpanded(false)
                onNavigate?.()
              }}
              collapsed={collapsed}
              showFullMenu
              onToggle={toggleCollapsed}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
