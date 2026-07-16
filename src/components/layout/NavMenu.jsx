import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Icons from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/utils/cn'
import { tapScale } from '@/utils/motion'
import { NAV_GROUPS } from '@/utils/constants'
import { getActiveNavGroupId, groupHasActiveItem } from '@/utils/nav'

const variantStyles = {
  sidebar: {
    group: 'mb-1',
    link: (isActive) =>
      cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-active text-primary-foreground shadow-[0_2px_8px_-2px_rgba(37,99,235,0.45)]'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
      ),
    trigger: (isOpen, hasActive) =>
      cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors',
        hasActive
          ? 'bg-white/10 text-sidebar-foreground'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
        isOpen && !hasActive && 'bg-white/5 text-sidebar-foreground',
      ),
    nestedList: 'mt-0.5 space-y-0.5 border-l border-white/10 pl-2 ml-3.5',
    subLink: (isActive) =>
      cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        isActive
          ? 'bg-sidebar-active text-primary-foreground shadow-[0_2px_8px_-2px_rgba(37,99,235,0.45)]'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
      ),
  },
  sidebarCollapsed: {
    group: 'mb-1',
    link: (isActive) =>
      cn(
        'flex items-center justify-center rounded-lg p-2 transition-colors',
        isActive
          ? 'bg-sidebar-active text-primary-foreground shadow-[0_2px_8px_-2px_rgba(37,99,235,0.45)]'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
      ),
    trigger: (isOpen, hasActive) =>
      cn(
        'flex w-full items-center justify-center rounded-lg p-2 transition-colors',
        hasActive
          ? 'bg-white/10 text-sidebar-foreground ring-1 ring-white/15'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
        isOpen && !hasActive && 'bg-white/5 text-sidebar-foreground',
      ),
    nestedList: '',
    subLink: (isActive) =>
      cn(
        'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium outline-none transition-colors',
        isActive ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-surface-muted',
      ),
  },
  sheet: {
    group: 'mb-2',
    link: (isActive) =>
      cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-soft text-primary'
          : 'text-foreground hover:bg-surface-muted',
      ),
    trigger: (isOpen, hasActive) =>
      cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors',
        hasActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-surface-muted',
        isOpen && !hasActive && 'bg-surface-muted',
      ),
    nestedList: 'mt-1 space-y-0.5 pl-1',
    subLink: (isActive) =>
      cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-soft text-primary'
          : 'text-foreground hover:bg-surface-muted',
      ),
  },
}

function resolveStyles(variant, collapsed) {
  if (variant === 'sidebar' && collapsed) return variantStyles.sidebarCollapsed
  return variantStyles[variant] ?? variantStyles.sidebar
}

function NavIcon({ name, className }) {
  const Icon = Icons[name] ?? Icons.Circle
  return <Icon className={className} aria-hidden />
}

function NavItemLink({
  item,
  styles,
  variant,
  onNavigate,
  layoutId,
  nested = false,
  collapsed = false,
}) {
  const linkClass = nested ? styles.subLink : styles.link

  const link = (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      end={item.to === '/'}
      className={({ isActive }) => linkClass(isActive)}
    >
      {({ isActive }) => (
        <motion.span
          className={cn('flex w-full items-center', collapsed ? 'justify-center' : 'gap-2.5')}
          whileTap={tapScale}
          whileHover={collapsed ? { scale: 1.08, x: 2 } : undefined}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
              variant === 'sheet' &&
                (isActive ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted'),
            )}
          >
            <NavIcon name={item.icon} className="h-3.5 w-3.5" />
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
          {isActive && variant === 'sidebar' && !collapsed && (
            <motion.span
              layoutId={layoutId}
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </motion.span>
      )}
    </NavLink>
  )

  if (collapsed && variant === 'sidebar') {
    return (
      <Tooltip content={item.label} side="right">
        {link}
      </Tooltip>
    )
  }

  return link
}

function CollapsedGroupMenu({ group, styles, onNavigate, hasActive }) {
  const GroupIcon = Icons[group.icon] ?? Icons.Folder
  const displayLabel = group.shortLabel ?? group.label

  return (
    <DropdownMenu.Root>
      <Tooltip content={displayLabel} side="right">
        <DropdownMenu.Trigger asChild>
          <motion.button
            type="button"
            className={styles.trigger(false, hasActive)}
            aria-label={displayLabel}
            whileHover={{ scale: 1.08, x: 2 }}
            whileTap={tapScale}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md',
                hasActive
                  ? 'bg-primary/25 text-primary-foreground'
                  : 'bg-white/10 text-sidebar-foreground',
              )}
            >
              <GroupIcon className="h-3.5 w-3.5" aria-hidden />
            </span>
          </motion.button>
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[12rem] rounded-lg border border-border bg-surface p-1.5 shadow-soft"
          side="right"
          sideOffset={10}
          align="start"
        >
          <p className="px-2.5 py-1.5 text-xs font-semibold text-muted">{group.label}</p>
          {group.items.map((item) => (
            <DropdownMenu.Item key={item.to} asChild>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    styles.subLink(isActive),
                    'cursor-pointer select-none',
                    isActive && 'bg-primary-soft text-primary',
                  )
                }
              >
                <span className="flex items-center gap-2">
                  <NavIcon name={item.icon} className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
              </NavLink>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function NavGroupSection({
  group,
  variant,
  styles,
  isOpen,
  onToggle,
  onNavigate,
  layoutId,
  pathname,
  collapsed = false,
}) {
  const hasActive = groupHasActiveItem(pathname, group)
  const GroupIcon = Icons[group.icon] ?? Icons.Folder
  const displayLabel = group.shortLabel ?? group.label
  const isPrincipal = group.id === 'inicio'
  const isSingleItem = group.items.length === 1

  if (isPrincipal || isSingleItem) {
    const item = group.items[0]
    return (
      <div className={styles.group}>
        <NavItemLink
          item={item}
          styles={styles}
          variant={variant}
          onNavigate={onNavigate}
          layoutId={layoutId}
          collapsed={collapsed}
        />
      </div>
    )
  }

  if (collapsed && variant === 'sidebar') {
    return (
      <div className={styles.group}>
        <CollapsedGroupMenu
          group={group}
          styles={styles}
          onNavigate={onNavigate}
          hasActive={hasActive}
        />
      </div>
    )
  }

  return (
    <div className={styles.group}>
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        className={styles.trigger(isOpen, hasActive)}
        aria-expanded={isOpen}
        aria-controls={`nav-group-${group.id}`}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            variant === 'sidebar'
              ? hasActive
                ? 'bg-primary/25 text-primary-foreground'
                : 'bg-white/10 text-sidebar-foreground'
              : hasActive
                ? 'bg-primary/15 text-primary'
                : 'bg-surface-muted text-muted',
          )}
        >
          <GroupIcon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        <span
          className={cn(
            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
            variant === 'sidebar' ? 'bg-white/10 text-sidebar-muted' : 'bg-surface-muted text-muted',
          )}
        >
          {group.items.length}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-sidebar-muted"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`nav-group-${group.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className={styles.nestedList}>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavItemLink
                    item={item}
                    styles={styles}
                    variant={variant}
                    onNavigate={onNavigate}
                    layoutId={layoutId}
                    nested
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function NavMenu({
  variant = 'sidebar',
  onNavigate,
  layoutId = 'nav-active',
  collapsed = false,
  animateReveal = false,
}) {
  const styles = resolveStyles(variant, collapsed)
  const { pathname } = useLocation()
  const activeGroupId = useMemo(
    () => getActiveNavGroupId(pathname, NAV_GROUPS),
    [pathname],
  )

  const defaultOpen = useMemo(() => {
    const ids = new Set(['inicio'])
    if (activeGroupId) ids.add(activeGroupId)
    return ids
  }, [activeGroupId])

  const [openGroups, setOpenGroups] = useState(defaultOpen)

  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups((prev) => {
        const next = new Set(prev)
        next.add(activeGroupId)
        return next
      })
    }
  }, [activeGroupId])

  const toggleGroup = useCallback(
    (groupId) => {
      setOpenGroups((prev) => {
        const next = new Set(prev)
        if (next.has(groupId)) {
          next.delete(groupId)
          return next
        }
        if (variant === 'sidebar') {
          return new Set([groupId, 'inicio'])
        }
        next.add(groupId)
        return next
      })
    },
    [variant],
  )

  return (
    <motion.nav
      className={cn(variant === 'sheet' ? 'px-1' : 'space-y-0.5', collapsed && 'px-0.5')}
      aria-label="Menú principal"
      initial={animateReveal ? 'hidden' : false}
      animate={animateReveal ? 'show' : false}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
      }}
    >
      {NAV_GROUPS.map((group) => (
        <motion.div
          key={group.id ?? group.label}
          variants={
            animateReveal
              ? {
                  hidden: { opacity: 0, x: -14 },
                  show: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                  },
                }
              : undefined
          }
        >
          <NavGroupSection
            group={group}
            variant={variant}
            styles={styles}
            isOpen={openGroups.has(group.id)}
            onToggle={toggleGroup}
            onNavigate={onNavigate}
            layoutId={layoutId}
            pathname={pathname}
            collapsed={collapsed}
          />
        </motion.div>
      ))}
    </motion.nav>
  )
}
