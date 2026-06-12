import { Eye, Pencil, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

/**
 * Acciones estándar por fila en tablas CRUD.
 * @param {object} props
 * @param {() => void} [props.onView]
 * @param {() => void} [props.onEdit]
 * @param {() => void} [props.onDelete]
 * @param {() => void} [props.onExtra] — ej. precios de seguro
 * @param {import('react').ReactNode} [props.extraIcon]
 * @param {string} [props.extraLabel]
 */
export function RowActions({
  onView,
  onEdit,
  onDelete,
  onExtra,
  extraIcon: ExtraIcon = Tag,
  extraLabel = 'Más',
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-0.5', className)}>
      {onView && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onView}
          aria-label="Ver"
          title="Ver"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onEdit}
          aria-label="Editar"
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onExtra && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={onExtra}
          title={extraLabel}
        >
          <ExtraIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{extraLabel}</span>
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-danger hover:bg-red-50 hover:text-danger"
          onClick={onDelete}
          aria-label="Eliminar"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
