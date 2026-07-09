import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'biocontrol_sidebar_collapsed'

/** Anchos del sidebar (espaciador + panel fijo). */
export const SIDEBAR_WIDTH = {
  collapsed: 'w-[4.5rem]',
  expanded: 'w-64 xl:w-72',
}

const SidebarContext = createContext(null)

function readCollapsed() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsedState] = useState(readCollapsed)

  const setCollapsed = useCallback((value) => {
    setCollapsedState(value)
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed }),
    [collapsed, setCollapsed, toggleCollapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error('useSidebar debe usarse dentro de SidebarProvider')
  }
  return ctx
}
