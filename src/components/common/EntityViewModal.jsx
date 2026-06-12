import { Badge, Button, Modal, ModalFooter } from '@/components/ui'
import { isActiveStatus, statusLabel } from '@/utils/statusHelpers'

export function DetailList({ fields }) {
  if (!fields?.length) return null
  return (
    <dl className="space-y-3 text-sm">
      {fields.map(({ label, value }) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="text-right font-medium">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Modal de detalle con datos de GET /{id} y acciones opcionales de estado.
 */
export function EntityViewModal({
  open,
  onOpenChange,
  title,
  description,
  loading,
  fields = [],
  data,
  onToggleStatus,
  statusToggling = false,
  footerExtra,
  children,
}) {
  const active = data ? isActiveStatus(data.status ?? data.is_active ?? data.state) : false

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {loading ? (
        <p className="text-sm text-muted">Cargando detalle…</p>
      ) : (
        <>
          {data && (
            <div className="mb-4">
              <Badge variant={active ? 'success' : 'default'}>{statusLabel(data)}</Badge>
            </div>
          )}
          <DetailList fields={fields} />
          {children}
        </>
      )}
      <ModalFooter>
        {onToggleStatus && data && !loading && (
          <Button
            type="button"
            variant="secondary"
            disabled={statusToggling}
            onClick={() => onToggleStatus(data)}
          >
            {statusToggling ? 'Procesando…' : active ? 'Desactivar' : 'Activar'}
          </Button>
        )}
        {footerExtra}
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  )
}
