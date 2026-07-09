import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  RefreshCw,
  Search,
} from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { staggerContainer, staggerItem } from '@/utils/motion'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Input'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function globalFilterFn(row, columnId, filterValue) {
  const search = String(filterValue ?? '').toLowerCase().trim()
  if (!search) return true

  const rowValues = Object.values(row.original ?? {})
    .flatMap((value) => {
      if (value == null) return []
      if (typeof value === 'object') return [JSON.stringify(value)]
      return [String(value)]
    })
    .join(' ')
    .toLowerCase()

  return rowValues.includes(search)
}

function getColumnLabel(column) {
  const header = column.columnDef.header
  if (typeof header === 'string') return header
  return column.id
}

const ROW_NUMBER_COLUMN_ID = '_rowNumber'

function isActionsColumn(column) {
  const id = column.id ?? column.columnDef?.id
  return id === 'actions'
}

function isRowNumberColumn(column) {
  const id = column.id ?? column.columnDef?.id
  return id === ROW_NUMBER_COLUMN_ID
}

function cellAlignClass(column) {
  if (isActionsColumn(column) || isRowNumberColumn(column)) return 'text-center'
  return ''
}

function createRowNumberColumn() {
  return {
    id: ROW_NUMBER_COLUMN_ID,
    header: '#',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row, table }) => {
      const { pageIndex, pageSize } = table.getState().pagination
      const base = table.options.manualPagination
        ? (table.options.meta?.rowOffset ?? pageIndex * pageSize)
        : pageIndex * pageSize
      const n = base + row.index + 1
      return <span className="tabular-nums text-muted">{n}</span>
    },
  }
}

function SortableHeader({ header }) {
  const canSort = header.column.getCanSort()
  const sorted = header.column.getIsSorted()

  const label = header.isPlaceholder
    ? null
    : flexRender(header.column.columnDef.header, header.getContext())

  if (!canSort) {
    return <span className="text-muted">{label}</span>
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 -mx-1',
        'cursor-pointer select-none transition-colors hover:bg-surface-muted hover:text-foreground',
        sorted && 'text-foreground',
      )}
      onClick={header.column.getToggleSortingHandler()}
      aria-label={
        sorted === 'asc'
          ? 'Ordenado ascendente, clic para descendente'
          : sorted === 'desc'
            ? 'Ordenado descendente, clic para quitar orden'
            : 'Clic para ordenar'
      }
    >
      <span>{label}</span>
      <span className="inline-flex shrink-0 text-muted">
        {sorted === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" aria-hidden />
        ) : sorted === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5 text-primary" aria-hidden />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
        )}
      </span>
    </button>
  )
}

export function DataTable({
  columns,
  data,
  className,
  pageSize: initialPageSize = 10,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  emptyMessage = 'Sin registros',
  searchPlaceholder = 'Buscar en la tabla…',
  enableSearch = true,
  enableColumnVisibility = true,
  showPagination = true,
  showRowNumbers = true,
  getRowId,
  /** Paginación/búsqueda/orden en servidor (useIndexQuery → serverPagination) */
  serverPagination,
  /** Recarga manual del listado (también puede venir en serverPagination.onRefresh) */
  onRefresh: onRefreshProp,
  isRefreshing: isRefreshingProp,
  /** false oculta el botón aunque exista onRefresh */
  enableRefresh,
  refreshLabel = 'Actualizar listado',
  onRowClick,
  selectedRowId,
  getRowClassName,
}) {
  const isServer = Boolean(serverPagination)

  const onRefresh = onRefreshProp ?? serverPagination?.onRefresh
  const isRefreshing =
    isRefreshingProp ?? serverPagination?.isRefreshing ?? serverPagination?.isLoading ?? false
  const showRefresh = enableRefresh !== false && Boolean(onRefresh)

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState({})
  const [clientSorting, setClientSorting] = useState([])
  const [clientPagination, setClientPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  })

  const globalFilterValue = isServer ? (serverPagination.searchValue ?? '') : globalFilter
  const setGlobalFilterValue = isServer
    ? (serverPagination.onSearchChange ?? (() => {}))
    : setGlobalFilter

  const sorting = isServer ? (serverPagination.sorting ?? []) : clientSorting
  const setSorting = isServer
    ? (serverPagination.onSortingChange ?? (() => {}))
    : setClientSorting

  const pagination = isServer
    ? {
        pageIndex: serverPagination.pageIndex ?? 0,
        pageSize: serverPagination.pageSize ?? initialPageSize,
      }
    : clientPagination

  const setPagination = isServer
    ? (updater) => {
        const next =
          typeof updater === 'function'
            ? updater({
                pageIndex: serverPagination.pageIndex ?? 0,
                pageSize: serverPagination.pageSize ?? initialPageSize,
              })
            : updater
        serverPagination.onPaginationChange?.(next)
      }
    : setClientPagination

  const enhancedColumns = useMemo(() => {
    const hasRowNumber = columns.some(
      (col) => (col.id ?? col.accessorKey) === ROW_NUMBER_COLUMN_ID,
    )

    const mapped = columns.map((col) => {
      const id = col.id ?? col.accessorKey
      const isActions = id === 'actions'
      const isRowNum = id === ROW_NUMBER_COLUMN_ID
      return {
        ...col,
        enableHiding: isActions || isRowNum ? false : col.enableHiding ?? true,
        enableSorting: isActions || isRowNum ? false : col.enableSorting ?? true,
      }
    })

    if (showRowNumbers && !hasRowNumber) {
      return [createRowNumberColumn(), ...mapped]
    }
    return mapped
  }, [columns, showRowNumbers])

  const table = useReactTable({
    data: data ?? [],
    columns: enhancedColumns,
    getRowId: getRowId ?? ((row, index) => String(row?.id ?? index)),
    defaultColumn: {
      enableSorting: true,
    },
    state: {
      globalFilter: globalFilterValue,
      columnVisibility,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilterValue,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    globalFilterFn,
    manualPagination: isServer,
    manualSorting: isServer,
    manualFiltering: isServer,
    autoResetPageIndex: !isServer,
    pageCount: isServer ? (serverPagination.pageCount ?? 1) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: isServer ? undefined : getFilteredRowModel(),
    getSortedRowModel: isServer ? undefined : getSortedRowModel(),
    getPaginationRowModel: isServer ? undefined : getPaginationRowModel(),
    enableHiding: enableColumnVisibility,
    meta: {
      rowOffset: isServer
        ? Math.max(0, (serverPagination.fromRow ?? 1) - 1)
        : pagination.pageIndex * pagination.pageSize,
    },
  })

  useEffect(() => {
    if (!isServer) {
      setClientPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
  }, [globalFilterValue, sorting, isServer])

  const hideableColumns = table
    .getAllColumns()
    .filter(
      (col) =>
        col.getCanHide() && col.id !== 'actions' && col.id !== ROW_NUMBER_COLUMN_ID,
    )

  const { pageIndex: tablePageIndex, pageSize: tablePageSize } = table.getState().pagination
  const pageIndex = isServer ? (serverPagination.pageIndex ?? 0) : tablePageIndex
  const pageSize = isServer ? (serverPagination.pageSize ?? initialPageSize) : tablePageSize
  const pageCount = isServer ? (serverPagination.pageCount ?? 1) : table.getPageCount()
  const totalRows = isServer
    ? (serverPagination.totalRows ?? 0)
    : table.getFilteredRowModel().rows.length
  const from = isServer
    ? (serverPagination.fromRow ?? 0)
    : totalRows === 0
      ? 0
      : pageIndex * pageSize + 1
  const to = isServer
    ? (serverPagination.toRow ?? 0)
    : Math.min((pageIndex + 1) * pageSize, totalRows)

  const applyServerPage = (nextPageIndex, nextPageSize = pageSize) => {
    const maxIndex = Math.max(0, pageCount - 1)
    serverPagination?.onPaginationChange?.({
      pageIndex: Math.max(0, Math.min(nextPageIndex, maxIndex)),
      pageSize: nextPageSize,
    })
  }

  const canPrevious = isServer
    ? Boolean(serverPagination.canPreviousPage) && !serverPagination.isLoading
    : table.getCanPreviousPage()
  const canNext = isServer
    ? Boolean(serverPagination.canNextPage) && !serverPagination.isLoading
    : table.getCanNextPage()

  const rows = table.getRowModel().rows
  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? []

  const toolbar = (enableSearch || showRefresh || enableColumnVisibility) && (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {enableSearch && (
        <div className="relative w-full min-w-0 sm:max-w-xs md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            value={globalFilterValue}
            onChange={(e) => setGlobalFilterValue(e.target.value)}
            aria-label="Buscar"
          />
        </div>
      )}

      {(showRefresh || (enableColumnVisibility && hideableColumns.length > 0)) && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          {showRefresh && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={refreshLabel}
              title={refreshLabel}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                aria-hidden
              />
              Actualizar
            </Button>
          )}

          {enableColumnVisibility && hideableColumns.length > 0 && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                  <Columns3 className="h-4 w-4" />
                  Columnas
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 max-h-64 min-w-[12rem] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-soft"
                  align="end"
                  sideOffset={6}
                >
                  <p className="px-2 py-1 text-xs font-medium text-muted">Mostrar columnas</p>
                  {hideableColumns.map((column) => (
                    <DropdownMenu.CheckboxItem
                      key={column.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-surface-muted data-[state=checked]:font-medium"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {getColumnLabel(column)}
                    </DropdownMenu.CheckboxItem>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className={cn('space-y-4', className)}>
      {toolbar}

      {/* Vista tabla — desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
        <table className="w-full min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'whitespace-nowrap px-3 py-3 font-medium text-muted lg:px-4',
                      cellAlignClass(header.column),
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          (isActionsColumn(header.column) || isRowNumberColumn(header.column)) &&
                            'flex justify-center',
                        )}
                      >
                        <SortableHeader header={header} />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleHeaders.length || 1} className="px-4 py-10 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-surface-muted/60',
                    onRowClick && 'cursor-pointer',
                    selectedRowId != null &&
                      String(row.original?.id) === String(selectedRowId) &&
                      'bg-primary/10 hover:bg-primary/10',
                    getRowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 py-3 text-foreground lg:px-4',
                        isRowNumberColumn(cell.column) && 'w-12 text-center',
                        isActionsColumn(cell.column) && 'text-center',
                        !isActionsColumn(cell.column) &&
                          !isRowNumberColumn(cell.column) &&
                          'max-w-[14rem] truncate lg:max-w-xs',
                      )}
                      title={
                        !isActionsColumn(cell.column) && typeof cell.getValue() === 'string'
                          ? cell.getValue()
                          : undefined
                      }
                    >
                      <div
                        className={cn(
                          (isActionsColumn(cell.column) || isRowNumberColumn(cell.column)) &&
                            'flex justify-center',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vista tarjetas — móvil */}
      <motion.div
        className="space-y-3 md:hidden"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted">
            {emptyMessage}
          </p>
        ) : (
          rows.map((row) => {
            const rowNumber = pageIndex * pageSize + row.index + 1
            return (
            <motion.article
              key={row.id}
              variants={staggerItem}
              className="rounded-xl border border-border bg-surface p-4 shadow-soft"
            >
              {showRowNumbers && (
                <p className="mb-3 text-xs font-semibold tabular-nums text-muted">#{rowNumber}</p>
              )}
              <dl className="space-y-2">
                {row.getVisibleCells().map((cell) => {
                  const label = getColumnLabel(cell.column)
                  if (cell.column.id === ROW_NUMBER_COLUMN_ID) {
                    return null
                  }
                  if (cell.column.id === 'actions') {
                    return (
                      <div
                        key={cell.id}
                        className="flex flex-wrap justify-center gap-2 border-t border-border pt-3"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    )
                  }
                  return (
                    <div key={cell.id} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                        {label}
                      </dt>
                      <dd className="text-sm text-foreground break-words">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </motion.article>
            )
          })
        )}
      </motion.div>

      {showPagination && (
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-muted sm:text-left sm:text-sm">
            {totalRows === 0
              ? '0 registros'
              : `Mostrando ${from}–${to} de ${totalRows}`}
            {!isServer && globalFilterValue && ` (filtrado de ${data?.length ?? 0})`}
          </p>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted whitespace-nowrap">Por página:</span>
              <Select
                className="h-8 w-20 text-xs"
                value={String(pageSize)}
                onChange={(e) => {
                  const nextSize = Number(e.target.value)
                  if (isServer) {
                    applyServerPage(0, nextSize)
                  } else {
                    table.setPageSize(nextSize)
                  }
                }}
                aria-label="Registros por página"
                disabled={isServer && serverPagination.isLoading}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center justify-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  isServer ? applyServerPage(0) : table.setPageIndex(0)
                }
                disabled={!canPrevious}
                aria-label="Primera página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  isServer ? applyServerPage(pageIndex - 1) : table.previousPage()
                }
                disabled={!canPrevious}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[5rem] px-2 text-center text-xs font-medium sm:text-sm">
                {pageCount === 0 ? '0 / 0' : `${pageIndex + 1} / ${pageCount}`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  isServer ? applyServerPage(pageIndex + 1) : table.nextPage()
                }
                disabled={!canNext}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  isServer
                    ? applyServerPage(pageCount - 1)
                    : table.setPageIndex(pageCount - 1)
                }
                disabled={!canNext}
                aria-label="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
