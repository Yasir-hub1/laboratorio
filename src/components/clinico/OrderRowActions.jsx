import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, ClipboardList, Eye, FileText, FileSearch } from 'lucide-react'
import { AnnulOrderModal } from '@/components/clinico/AnnulOrderModal'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import { Button } from '@/components/ui'
import { usePermission } from '@/hooks/usePermission'
import { canManageOrderQueue } from '@/utils/permissions'
import { orderDetailPath, orderWorkflowPath } from '@/utils/orderWorkflow'

const PERM_VER = 'atencion.gestion-ordenes.ver'
const PERM_EXPORT_PDF = 'atencion.gestion-ordenes.exportar-pdf'
const PERM_ANULAR = 'atencion.gestion-ordenes.anular'

const MANAGE_VISIBLE_WS = [1, 2, 3, 4, 6]

/**
 * Acciones por fila del listado «Gestionar orden» (§1.3 de la especificación).
 *
 * @param {object} props
 * @param {object} props.order
 * @param {() => void} [props.onChanged] — recarga listado + queue-counts tras anular
 */
export function OrderRowActions({ order, onChanged }) {
  const { can, permissions } = usePermission()
  const [pdfOpen, setPdfOpen] = useState(false)
  const [pdfType, setPdfType] = useState('order')
  const [annulOpen, setAnnulOpen] = useState(false)

  const ws = Number(order?.workflow_status)
  const orderId = order?.id
  const orderCode = order?.code

  const canView = can(PERM_VER)
  const canExportPdf = can(PERM_EXPORT_PDF)
  const canAnnul = can(PERM_ANULAR)
  const canManage = MANAGE_VISIBLE_WS.includes(ws) && canManageOrderQueue(permissions, ws)

  const openPdf = (type) => {
    setPdfType(type)
    setPdfOpen(true)
  }

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {canView && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          title="Ver detalle"
          asChild
        >
          <Link to={orderDetailPath(orderId)}>
            <Eye className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Ver</span>
          </Link>
        </Button>
      )}

      {canExportPdf && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          title="Comprobante de orden"
          onClick={() => openPdf('order')}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Comprobante</span>
        </Button>
      )}

      {ws === 5 && canExportPdf && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          title="Informe de resultados"
          onClick={() => openPdf('results')}
        >
          <FileSearch className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Informe PDF</span>
        </Button>
      )}

      {canManage && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 gap-1 px-2"
          title="Gestionar orden"
          asChild
        >
          <Link to={orderWorkflowPath(orderId)}>
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Gestionar</span>
          </Link>
        </Button>
      )}

      {ws === 4 && canAnnul && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-danger hover:bg-red-50 hover:text-danger"
          title="Anular orden"
          onClick={() => setAnnulOpen(true)}
        >
          <Ban className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Anular</span>
        </Button>
      )}

      <PdfPreviewModal
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        orderId={orderId}
        orderCode={orderCode}
        pdfType={pdfType}
      />

      <AnnulOrderModal
        open={annulOpen}
        onOpenChange={setAnnulOpen}
        orderId={orderId}
        orderCode={orderCode}
        onSuccess={onChanged}
      />
    </div>
  )
}
