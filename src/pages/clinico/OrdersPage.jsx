import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import {
  Badge,
  Button,
  Card,
  DataTable,
  Input,
  Modal,
  ModalFooter,
  Select,
} from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, formatDate } from '@/utils/apiHelpers'
import { buildLaboratoryOrderPayload } from '@/utils/apiPayload'
import {
  filterSelectableInsurances,
  isParticularInsuranceSelection,
} from '@/utils/insurancePrices'
import {
  applyOrderDiscount,
  buildOrderDetailLines,
  fetchAnalysisGroupsForOrder,
  flattenAnalysisGroups,
  orderDetailsSubtotal,
} from '@/utils/orderAnalysisPricing'
import { ORDER_STATUS } from '@/utils/constants'
import { toastApiError } from '@/utils/toastApi'

const EMPTY_FORM = {
  patient_id: '',
  doctor_id: '',
  insurance_id: '',
  payment_method_id: '',
  amount: '',
  discount: '',
}

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || `#${p.id}`
}

function statusBadge(status) {
  const key = status ?? 0
  const info = ORDER_STATUS[key] ?? { label: String(status), color: 'default' }
  const variant =
    info.color === 'emerald'
      ? 'success'
      : info.color === 'red'
        ? 'danger'
        : info.color === 'amber'
          ? 'warning'
          : 'info'
  return <Badge variant={variant}>{info.label}</Badge>
}

export function OrdersPage() {
  const {
    items: orders,
    loading,
    error,
    reload,
    serverPagination,
    isEmpty,
  } = useIndexQuery(laboratoryApi.getLaboratoryOrders)

  const { items: patients, loading: patientsLoading } = useApiList(
    laboratoryApi.getPatients,
    [],
  )
  const { items: doctors, loading: doctorsLoading } = useApiList(
    laboratoryApi.getDoctors,
    [],
  )
  const { items: insurances, loading: insurancesLoading } = useApiList(
    laboratoryApi.getInsurances,
    [],
  )
  const { items: paymentMethods, loading: paymentMethodsLoading } = useApiList(
    laboratoryApi.getPaymentMethods,
    [],
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [analysisGroups, setAnalysisGroups] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [selected, setSelected] = useState({})
  const [createdOrderPreview, setCreatedOrderPreview] = useState(null)

  const loadingModal =
    patientsLoading || doctorsLoading || insurancesLoading || paymentMethodsLoading

  const selectableInsurances = useMemo(
    () => filterSelectableInsurances(insurances),
    [insurances],
  )

  const isParticular = isParticularInsuranceSelection(form.insurance_id, insurances)

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const resetCreateForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setSelected({})
    setAnalysisGroups([])
  }, [])

  const openCreate = () => {
    resetCreateForm()
    setModalOpen(true)
  }

  useEffect(() => {
    if (!modalOpen) return undefined

    let cancelled = false
    setLoadingAnalyses(true)

    fetchAnalysisGroupsForOrder(form.insurance_id, { insurances })
      .then((groups) => {
        if (!cancelled) setAnalysisGroups(groups)
      })
      .catch((err) => {
        if (!cancelled) {
          toastApiError(err)
          setAnalysisGroups([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalyses(false)
      })

    return () => {
      cancelled = true
    }
  }, [modalOpen, form.insurance_id, insurances])

  const handleInsuranceChange = (e) => {
    const insurance_id = e.target.value
    setForm((f) => ({ ...f, insurance_id }))
    setSelected({})
  }

  const analyses = useMemo(
    () => flattenAnalysisGroups(analysisGroups),
    [analysisGroups],
  )

  const details = useMemo(
    () => buildOrderDetailLines(selected, analyses),
    [selected, analyses],
  )

  const subtotal = useMemo(
    () => orderDetailsSubtotal(analyses, selected),
    [analyses, selected],
  )

  const total = useMemo(
    () => applyOrderDiscount(subtotal, form.discount),
    [subtotal, form.discount],
  )

  const toggleAnalysis = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.patient_id || details.length === 0) {
      toast.error('Completa paciente y al menos un análisis')
      return
    }
    if (Number(form.discount) > subtotal) {
      toast.error('El descuento no puede ser mayor al subtotal de análisis')
      return
    }
    setSubmitting(true)
    try {
      const body = buildLaboratoryOrderPayload({
        patient_id: form.patient_id,
        doctor_id: form.doctor_id,
        discount: form.discount || 0,
        insurance_id: isParticularInsuranceSelection(form.insurance_id, insurances)
          ? undefined
          : form.insurance_id || undefined,
        details,
        payment: form.payment_method_id
          ? {
              payment_method_id: form.payment_method_id,
              amount: form.amount || total,
            }
          : undefined,
      })
      const created = await laboratoryApi.createLaboratoryOrder(body)
      toast.success('Orden creada')
      setModalOpen(false)
      resetCreateForm()
      reload()
      if (created?.id) {
        setCreatedOrderPreview({
          orderId: created.id,
          orderCode: created.code ?? created.order_code,
        })
      }
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'Código',
        accessorKey: 'code',
        cell: ({ row }) => row.original.code ?? row.original.id,
      },
      {
        id: 'patient',
        header: 'Paciente',
        cell: ({ row }) =>
          personLabel(row.original.patient) ??
          row.original.patient_name ??
          '—',
      },
      {
        id: 'date',
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDate(row.original.created_at ?? row.original.date),
      },
      {
        id: 'total',
        header: 'Total',
        cell: ({ row }) =>
          formatCurrency(row.original.total ?? row.original.amount ?? 0),
      },
      {
        id: 'status',
        header: 'Estado',
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to={`/clinico/ordenes/${row.original.id}`}
            className="link-primary text-sm"
          >
            Ver detalle
          </Link>
        ),
      },
    ],
    [],
  )

  const insuranceLabel = isParticular
    ? 'Particular (sin seguro)'
    : insurances.find((i) => String(i.id) === String(form.insurance_id))?.name ?? 'Seguro'

  if (loading && orders.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 9"
        title="Órdenes de laboratorio"
        description="Crea órdenes con precios de catálogo (particular) o tarifas del seguro seleccionado."
        actions={
          <Button onClick={openCreate}>Nueva orden</Button>
        }
      />

      {isEmpty ? (
        <EmptyState
          title="Sin órdenes"
          description="Registra la primera orden de laboratorio."
          actionLabel="Nueva orden"
          onAction={openCreate}
        />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          serverPagination={serverPagination}
        />
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) resetCreateForm()
        }}
        title="Nueva orden"
        description="El listado y precio de análisis dependen del seguro elegido."
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {loadingModal ? (
          <p className="py-8 text-center text-sm text-muted">Cargando datos…</p>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <Select
              label="Paciente"
              value={form.patient_id}
              onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
              required
            >
              <option value="">Seleccionar...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {personLabel(p)}
                </option>
              ))}
            </Select>
            <Select
              label="Médico"
              value={form.doctor_id}
              onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
            >
              <option value="">Opcional</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {personLabel(d)}
                </option>
              ))}
            </Select>
            <Select
              label="Seguro"
              value={form.insurance_id}
              onChange={handleInsuranceChange}
            >
              <option value="">Sin seguro / Particular</option>
              {selectableInsurances.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.name ?? ins.description}
                </option>
              ))}
            </Select>

            <Card>
              <p className="mb-1 text-sm font-medium">Análisis</p>
              <p className="mb-2 text-xs text-muted">
                Tarifa: {insuranceLabel}
                {isParticular
                  ? ' · precio normal del catálogo'
                  : ' · solo análisis con tarifa asignada al seguro'}
              </p>
              {loadingAnalyses ? (
                <p className="py-6 text-center text-sm text-muted">Cargando análisis…</p>
              ) : analysisGroups.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  {!isParticular
                    ? 'Este seguro no tiene análisis con precio asignado.'
                    : 'No hay análisis en el catálogo.'}
                </p>
              ) : (
                <div className="max-h-56 space-y-4 overflow-y-auto">
                  {analysisGroups.map((group) => (
                    <div key={group.id}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {group.name}
                      </p>
                      <div className="space-y-2">
                        {group.analyses.map((a) => {
                          const id = String(a.id)
                          const checked = Boolean(selected[id])
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-2 rounded border border-border p-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAnalysis(id)}
                              />
                              <span className="flex-1">{a.name}</span>
                              <span className="text-right text-muted">
                                {formatCurrency(a.finalPrice)}
                                {!isParticular &&
                                  a.referencePrice != null &&
                                  a.referencePrice !== a.finalPrice && (
                                    <span className="block text-[10px] line-through opacity-70">
                                      Cat. {formatCurrency(a.referencePrice)}
                                    </span>
                                  )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Subtotal análisis</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {Number(form.discount) > 0 && (
                  <div className="flex justify-between text-muted">
                    <span>Descuento</span>
                    <span>-{formatCurrency(form.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </Card>

            <Input
              label="Descuento"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.discount}
              onChange={(e) => {
                const discount = e.target.value
                setForm((f) => ({
                  ...f,
                  discount,
                  amount: f.payment_method_id ? String(applyOrderDiscount(subtotal, discount)) : f.amount,
                }))
              }}
            />

            <Select
              label="Método de pago"
              value={form.payment_method_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  payment_method_id: e.target.value,
                  amount: e.target.value ? String(total) : f.amount,
                }))
              }
            >
              <option value="">Sin pago ahora</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name ?? pm.description}
                </option>
              ))}
            </Select>
            {form.payment_method_id && (
              <Input
                label="Monto"
                type="number"
                step="0.01"
                value={form.amount || total}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            )}

            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || loadingAnalyses}>
                {submitting ? 'Creando…' : 'Crear orden'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      <PdfPreviewModal
        open={!!createdOrderPreview}
        onOpenChange={(open) => !open && setCreatedOrderPreview(null)}
        orderId={createdOrderPreview?.orderId}
        orderCode={createdOrderPreview?.orderCode}
        pdfType="order"
        footerExtra={
          createdOrderPreview?.orderId ? (
            <Button variant="secondary" asChild>
              <Link to={`/clinico/ordenes/${createdOrderPreview.orderId}`}>Ver detalle</Link>
            </Button>
          ) : null
        }
      />
    </AnimatedPage>
  )
}
