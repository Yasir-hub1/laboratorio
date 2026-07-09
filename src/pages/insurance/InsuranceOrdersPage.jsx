import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Hash,
  Loader2,
  Search,
  Shield,
  SlidersHorizontal,
  UserCircle,
  X,
} from 'lucide-react'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { PortalOrderDateFilters } from '@/components/portal/PortalOrderDateFilters'
import { Badge, Button, Card, Input } from '@/components/ui'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { insurancePortalApi } from '@/services/insurancePortalApi'
import { ROUTES } from '@/utils/constants'
import {
  getInsuranceDisplayName,
  getInsuranceIdentifier,
  getOrderPatientName,
} from '@/utils/insurancePortal'
import {
  buildPortalDateParams,
  formatPortalOrderDate,
  getPortalOrderListDate,
  hasPortalDateFilters,
} from '@/utils/portalOrders'
import { storage } from '@/utils/storage'
import { cn } from '@/utils/cn'

function orderDetailPath(order) {
  const id = order?.id ?? order?.code
  return ROUTES.INSURANCE_ORDER_DETAIL.replace(':orderId', String(id))
}

function OrderCardSkeleton() {
  return (
    <div className="glass-card animate-pulse rounded-2xl border p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-surface-muted" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="h-4 w-2/3 max-w-[12rem] rounded-md bg-surface-muted" />
          <div className="h-3.5 w-1/2 max-w-[10rem] rounded-md bg-surface-muted/80" />
          <div className="h-3 w-3/5 max-w-[11rem] rounded-md bg-surface-muted/70" />
          <div className="h-3 w-2/5 max-w-[8rem] rounded-md bg-surface-muted/60" />
        </div>
      </div>
    </div>
  )
}

function InsuranceOrderCard({ order, disabled }) {
  const patientName = getOrderPatientName(order)
  const orderDate = formatPortalOrderDate(getPortalOrderListDate(order))
  const branchName = order.branch?.name
  const insuranceNumber = order.insurance_number

  return (
    <Link
      to={orderDetailPath(order)}
      aria-disabled={disabled}
      className={cn(
        'glass-card group relative block overflow-hidden rounded-2xl border p-4 transition-all',
        'active:scale-[0.99] sm:p-5',
        'hover:border-violet-400/35 hover:shadow-[0_12px_40px_-16px_rgba(124,58,237,0.22)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-violet-400/0 via-violet-400/45 to-violet-400/0 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/15 sm:h-12 sm:w-12">
          <FileText className="h-5 w-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
                Orden {order.code}
              </p>
              <p className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <UserCircle className="h-3.5 w-3.5 shrink-0 text-violet-600/80" aria-hidden />
                <span className="truncate">{patientName}</span>
              </p>
              <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
                {insuranceNumber && (
                  <span className="inline-flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 shrink-0 text-violet-600/80" aria-hidden />
                    <span>Afiliación {insuranceNumber}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-violet-600/80" aria-hidden />
                  <span>{orderDate !== '—' ? orderDate : 'Sin fecha de orden'}</span>
                </span>
                {branchName && (
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-violet-600/80" aria-hidden />
                    <span className="truncate">{branchName}</span>
                  </span>
                )}
              </div>
            </div>

            <Badge variant="success" className="w-fit shrink-0 self-start sm:mt-0.5">
              {order.workflow_status_label ?? 'Completada'}
            </Badge>
          </div>
        </div>

        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-muted/50 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-600"
          aria-hidden
        />
      </div>
    </Link>
  )
}

export function InsuranceOrdersPage() {
  const insurance = storage.getInsurance()
  const insuranceName = getInsuranceDisplayName(insurance)
  const insuranceId = getInsuranceIdentifier(insurance)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const listParams = useMemo(
    () => buildPortalDateParams(dateFrom, dateTo),
    [dateFrom, dateTo],
  )

  const { items, loading, error, serverPagination, isEmpty } = useIndexQuery(
    insurancePortalApi.getOrders,
    {
      initialPerPage: 10,
      initialOrderBy: 'created_at',
      initialOrderDir: 'desc',
      initialState: '1',
      extraParams: listParams,
    },
    [listParams],
  )

  const {
    fromRow,
    toRow,
    totalRows,
    canPreviousPage,
    canNextPage,
    onPaginationChange,
    pageIndex,
    pageSize,
    searchValue,
    onSearchChange,
    isLoading,
  } = serverPagination

  const hasDateFilter = hasPortalDateFilters(dateFrom, dateTo)
  const hasSearch = Boolean(searchValue?.trim())
  const hasFilters = hasDateFilter || hasSearch
  const showNoResults = !loading && !error && items.length === 0
  const activeFilterCount = (hasSearch ? 1 : 0) + (hasDateFilter ? 1 : 0)

  const goToPage = (nextIndex) => {
    onPaginationChange?.({ pageIndex: nextIndex, pageSize })
  }

  const clearDateFilters = () => {
    setDateFrom('')
    setDateTo('')
  }

  const clearAllFilters = () => {
    clearDateFilters()
    onSearchChange('')
    setFiltersOpen(false)
  }

  return (
    <AnimatedPage className="pb-24 sm:pb-8">
      <section className="glass-card mb-4 overflow-hidden rounded-2xl border p-4 sm:mb-6 sm:p-5">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/20">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700/80">
              Portal seguros
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {insuranceName}
            </h1>
            {insuranceId && (
              <p className="mt-1 truncate text-sm text-muted">{insuranceId}</p>
            )}
          </div>
          {!loading && totalRows > 0 && (
            <div className="hidden shrink-0 rounded-xl bg-surface-muted/80 px-3 py-2 text-center sm:block">
              <p className="text-lg font-bold tabular-nums text-foreground">{totalRows}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                {totalRows === 1 ? 'Orden' : 'Órdenes'}
              </p>
            </div>
          )}
        </div>
      </section>

      <Card className="mb-4 overflow-hidden border-white/60 p-3 sm:p-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="h-11 pl-9 text-base sm:text-sm"
                placeholder="Buscar código, afiliación o paciente…"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-label="Buscar órdenes"
              />
            </div>

            <Button
              type="button"
              variant={filtersOpen ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFiltersOpen((open) => !open)}
              className="h-11 w-full gap-2 sm:h-10 sm:w-auto sm:shrink-0"
              aria-expanded={filtersOpen}
              aria-controls="insurance-order-filters"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                id="insurance-order-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-3 sm:p-4">
                  <PortalOrderDateFilters
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                    onClear={clearDateFilters}
                    className="[&_input]:h-11 [&_input]:text-base sm:[&_input]:h-10 sm:[&_input]:text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-surface-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                >
                  <Filter className="h-3 w-3 shrink-0 text-muted" aria-hidden />
                  <span className="truncate">“{searchValue.trim()}”</span>
                  <X className="h-3 w-3 shrink-0 text-muted" aria-hidden />
                </button>
              )}
              {hasDateFilter && (
                <button
                  type="button"
                  onClick={clearDateFilters}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                >
                  <Calendar className="h-3 w-3 shrink-0 text-muted" aria-hidden />
                  <span>
                    {dateFrom && dateTo
                      ? `${dateFrom} → ${dateTo}`
                      : dateFrom
                        ? `Desde ${dateFrom}`
                        : `Hasta ${dateTo}`}
                  </span>
                  <X className="h-3 w-3 shrink-0 text-muted" aria-hidden />
                </button>
              )}
              {activeFilterCount > 1 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-violet-600 hover:underline"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {error && (
        <Card className="mb-4 border-red-200/60 bg-red-50/50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <section aria-live="polite" aria-busy={loading}>
        {loading && items.length === 0 && (
          <ul className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 lg:grid-cols-1 lg:space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <OrderCardSkeleton />
              </li>
            ))}
          </ul>
        )}

        {showNoResults && !hasFilters && isEmpty && (
          <Card className="px-4 py-10 text-center sm:px-8 sm:py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
              <FileText className="h-7 w-7" aria-hidden />
            </span>
            <p className="text-base font-semibold text-foreground">No hay órdenes completadas</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Las órdenes con tu seguro aparecerán aquí cuando el laboratorio las complete.
            </p>
          </Card>
        )}

        {showNoResults && hasFilters && (
          <Card className="px-4 py-10 text-center sm:px-8 sm:py-12">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-muted">
              <Search className="h-7 w-7" aria-hidden />
            </span>
            <p className="text-base font-semibold text-foreground">Sin órdenes con esos filtros</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Prueba otro rango de fechas o término de búsqueda.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={clearAllFilters}
              className="mt-5"
            >
              Limpiar filtros
            </Button>
          </Card>
        )}

        {items.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between gap-2 px-0.5 sm:hidden">
              <p className="text-xs font-medium text-muted">
                {totalRows} {totalRows === 1 ? 'orden' : 'órdenes'}
              </p>
              {isLoading && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Actualizando…
                </span>
              )}
            </div>

            <ul className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-1 xl:space-y-3">
              {items.map((order, index) => (
                <motion.li
                  key={order.id ?? order.code}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.25 }}
                >
                  <InsuranceOrderCard order={order} disabled={isLoading} />
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </section>

      {items.length > 0 && totalRows > 0 && (
        <div
          className={cn(
            'mt-6 rounded-2xl border border-white/60 bg-white/70 p-3 backdrop-blur-xl',
            'sm:static sm:bg-transparent sm:p-0 sm:backdrop-blur-none',
            'fixed inset-x-0 bottom-0 z-20 mx-auto max-w-5xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:relative sm:inset-auto sm:mx-0 sm:max-w-none sm:pb-0',
            'shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.12)] sm:shadow-none',
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs text-muted sm:text-left sm:text-sm">
              <span className="font-medium text-foreground">
                {fromRow}–{toRow}
              </span>{' '}
              de {totalRows}
              <span className="hidden sm:inline"> · Página {pageIndex + 1}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                type="button"
                variant="secondary"
                disabled={!canPreviousPage || isLoading}
                onClick={() => goToPage(pageIndex - 1)}
                className="h-11 gap-1.5 sm:h-9"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Anterior
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canNextPage || isLoading}
                onClick={() => goToPage(pageIndex + 1)}
                className="h-11 gap-1.5 sm:h-9"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      )}
    </AnimatedPage>
  )
}
