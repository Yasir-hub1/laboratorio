import { LabOrderQueuePage } from './LabOrderQueuePage'
import { ROUTES } from '@/utils/constants'

export function LabSampleReceptionPage() {
  return (
    <LabOrderQueuePage
      title="Recepción de muestras"
      description="Órdenes pendientes (workflow_status = 1). Registra tubos y confirma inicio del procesamiento."
      workflowStatus={1}
      emptyTitle="Sin órdenes pendientes"
      emptyDescription="No hay órdenes en cola de recepción de muestras."
      nextRoute={ROUTES.LAB_RESULTS_ENTRY}
      nextLabel="Ir a ingresar resultados"
    />
  )
}

export function LabResultsEntryPage() {
  return (
    <LabOrderQueuePage
      title="Ingresar resultados"
      description="Órdenes iniciadas (workflow_status = 2). Carga valores y envía a revisión."
      workflowStatus={2}
      emptyTitle="Sin órdenes iniciadas"
      emptyDescription="No hay órdenes pendientes de carga de resultados."
      nextRoute={ROUTES.LAB_RESULTS_VALIDATION}
      nextLabel="Ir a validación"
    />
  )
}

export function LabResultsValidationPage() {
  return (
    <LabOrderQueuePage
      title="Validación de resultados"
      description="Órdenes en revisión (workflow_status = 3). Valida componentes y marca como revisada."
      workflowStatus={3}
      emptyTitle="Sin órdenes en revisión"
      emptyDescription="No hay órdenes pendientes de validación."
      nextRoute={ROUTES.LAB_ORDER_CLOSURE}
      nextLabel="Ir a cierre de órdenes"
    />
  )
}

export function LabOrderClosurePage() {
  return (
    <LabOrderQueuePage
      title="Cierre de órdenes"
      description="Órdenes revisadas (workflow_status = 4). Verifica resultados y completa la orden."
      workflowStatus={4}
      emptyTitle="Sin órdenes revisadas"
      emptyDescription="No hay órdenes pendientes de cierre."
      nextRoute={ROUTES.LAB_ORDERS_COMPLETED}
      nextLabel="Ver completadas"
    />
  )
}

export function LabOrdersCompletedPage() {
  return (
    <LabOrderQueuePage
      title="Órdenes completadas"
      description="Órdenes completadas (workflow_status = 5). Consulta y exporta resultados."
      workflowStatus={5}
      emptyTitle="Sin órdenes completadas"
      emptyDescription="Aún no hay órdenes completadas en esta cola."
    />
  )
}

export function LabOrdersAnnulledPage() {
  return (
    <LabOrderQueuePage
      title="Órdenes anuladas"
      description="Órdenes anuladas (workflow_status = 6). Historial de anulaciones."
      workflowStatus={6}
      emptyTitle="Sin órdenes anuladas"
      emptyDescription="No hay órdenes anuladas registradas."
    />
  )
}
