import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui'
import { unwrapList } from '@/utils/apiHelpers'
import { cn } from '@/utils/cn'

const DROPDOWN_MAX_HEIGHT = 280
const DROPDOWN_GAP = 6

export function personFullName(person) {
  if (!person) return '—'
  return (
    person.full_name ||
    person.print_name ||
    person.name ||
    [person.first_name, person.last_name].filter(Boolean).join(' ') ||
    '—'
  )
}

export function personCi(person) {
  return person?.ci ?? person?.document ?? person?.document_number ?? ''
}

export function personContactMeta(person) {
  return person?.phone || person?.email || ''
}

export function personInitials(name) {
  return (name || '')
    .replace(/^Dr[a]?\.\s*/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function useDropdownPosition(anchorRef, open) {
  const [style, setStyle] = useState(null)

  const update = useCallback(() => {
    const el = anchorRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP
    const spaceAbove = rect.top - DROPDOWN_GAP
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow
    const maxHeight = Math.min(
      DROPDOWN_MAX_HEIGHT,
      Math.max(120, openUp ? spaceAbove : spaceBelow),
    )

    setStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight,
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + DROPDOWN_GAP }
        : { top: rect.bottom + DROPDOWN_GAP }),
    })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!open) {
      setStyle(null)
      return undefined
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, update])

  return style
}

export function PersonSearchField({
  label,
  subtitle,
  placeholder = 'Buscar…',
  searchApi,
  selected,
  onSelect,
  onClear,
  clearLabel = 'Cambiar',
  error,
  required,
  avatarClassName = 'bg-primary',
  cardClassName = 'border-primary/25 bg-primary/5',
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const anchorRef = useRef(null)
  const dropdownRef = useRef(null)
  const dropdownStyle = useDropdownPosition(anchorRef, open)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return undefined
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const raw = await searchApi(query.trim())
        const { items } = unwrapList(raw)
        setResults(Array.isArray(items) ? items : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query, searchApi])

  useEffect(() => {
    const onDocClick = (e) => {
      const target = e.target
      if (wrapRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const dropdownPanel =
    open && dropdownStyle
      ? createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            style={dropdownStyle}
            className="overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface shadow-lg"
          >
            {loading ? (
              <p className="px-3 py-2.5 text-sm text-muted">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-muted">Sin resultados</p>
            ) : (
              results.map((person) => {
                const name = personFullName(person)
                const ci = personCi(person)
                const extra = personContactMeta(person)
                return (
                  <button
                    key={person.id}
                    type="button"
                    role="option"
                    className="block w-full border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-surface-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(person)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-xs text-muted">
                      {ci ? `CI ${ci}` : '—'}
                      {extra ? ` · ${extra}` : ''}
                    </p>
                  </button>
                )
              })
            )}
          </div>,
          document.body,
        )
      : null

  if (selected) {
    const name = personFullName(selected)
    const ci = personCi(selected)
    const extra = personContactMeta(selected)
    return (
      <div className="space-y-1">
        {label && (
          <p className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-danger"> *</span>}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border p-3',
            cardClassName,
          )}
        >
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white',
              avatarClassName,
            )}
          >
            {personInitials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted">
              {ci ? `CI ${ci}` : '—'}
              {extra ? ` · ${extra}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
            onClick={() => {
              onClear?.()
              setQuery('')
            }}
          >
            {clearLabel}
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1" ref={wrapRef}>
      {label && (
        <p className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </p>
      )}
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      <div className="relative" ref={anchorRef}>
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
        />
      </div>
      {dropdownPanel}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
