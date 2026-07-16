import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, Loader2, Stethoscope, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import {
  AnalysisGroupCatalog,
  SelectedAnalysesTable,
  buildAnalysisGroupMap,
} from '@/components/clinico/AnalysisGroupCatalog'
import { PersonSearchField, personFullName } from '@/components/clinico/PersonSearchField'
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  ModalFooter,
  Select,
  WorkflowAlert,
} from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency, unwrapData } from '@/utils/apiHelpers'
import { buildLaboratoryOrderPayload } from '@/utils/apiPayload'
import { parseCashOpeningStatus } from '@/utils/cashHelpers'
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
import { computePaymentPreview } from '@/utils/transactions'
import { ROUTES } from '@/utils/constants'
import { storage } from '@/utils/storage'
import { toastApiError } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

const EMPTY_FORM = {
  insurance_id: '',
  insurance_number: '',
  payment_method_id: '',
  amount: '',
  discount: '0',
}

function isCashPaymentMethod(method) {
  const name = String(method?.name ?? method?.description ?? '').toLowerCase()
  return name.includes('efectivo') || name.includes('cash')
}

function CardSection({ icon: Icon, iconClassName, title, subtitle, required, children }) {
  return (
    <Card className="!overflow-visible">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
            iconClassName,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {title}
            {required && <span className="text-danger"> *</span>}
          </p>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

export function OrdersPage() {
  const { items: insurances, loading: insurancesLoading } = useApiList(
    laboratoryApi.getInsurances,
    [],
  )
  const { items: paymentMethods, loading: paymentMethodsLoading } = useApiList(
    laboratoryApi.getPaymentMethods,
    [],
  )

  const [submitting, setSubmitting] = useState(false)
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [analysisGroups, setAnalysisGroups] = useState([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set())
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selected, setSelected] = useState({})
  const [cashOpen, setCashOpen] = useState(null)
  const [errors, setErrors] = useState({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [createdOrderPreview, setCreatedOrderPreview] = useState(null)

  const searchPatients = useCallback(
    (search) => laboratoryApi.getPatients({ search, paginate: false }),
    [],
  )
  const searchDoctors = useCallback(
    (search) => laboratoryApi.getDoctors({ search, paginate: false }),
    [],
  )

  const selectableInsurances = useMemo(
    () => filterSelectableInsurances(insurances),
    [insurances],
  )

  const isParticular = isParticularInsuranceSelection(form.insurance_id, insurances)

  const resetCreateForm = useCallback(() => {
    setForm(EMPTY_FORM)
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setSelected({})
    setAnalysisGroups([])
    setCatalogSearch('')
    setCollapsedGroups(new Set())
    setErrors({})
  }, [])

  useEffect(() => {
    let cancelled = false
    const cashId = storage.getCashId()
    if (!cashId) {
      setCashOpen(false)
      return undefined
    }

    laboratoryApi
      .getCashStatus(cashId)
      .then((raw) => {
        if (cancelled) return
        const status = parseCashOpeningStatus(unwrapData(raw) ?? raw)
        setCashOpen(status.isOpen)
      })
      .catch(() => {
        if (!cancelled) setCashOpen(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingAnalyses(true)

    fetchAnalysisGroupsForOrder(form.insurance_id, { insurances })
      .then((groups) => {
        if (cancelled) return
        setAnalysisGroups(groups)
        const allowed = new Set(flattenAnalysisGroups(groups).map((a) => String(a.id)))
        setSelected((prev) => {
          const next = {}
          for (const id of Object.keys(prev)) {
            if (allowed.has(id)) next[id] = prev[id]
          }
          return next
        })
        setCollapsedGroups(new Set())
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
  }, [form.insurance_id, insurances])

  const handleInsuranceChange = (e) => {
    const insurance_id = e.target.value
    setForm((f) => ({ ...f, insurance_id, insurance_number: '' }))
    setSelected({})
    setCollapsedGroups(new Set())
  }

  const analyses = useMemo(
    () => flattenAnalysisGroups(analysisGroups),
    [analysisGroups],
  )

  const groupMap = useMemo(
    () => buildAnalysisGroupMap(analysisGroups),
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

  const discountNum = Math.max(0, Number(form.discount) || 0)
  const total = useMemo(
    () => applyOrderDiscount(subtotal, discountNum),
    [subtotal, discountNum],
  )

  const payAmount = Math.max(0, Number(form.amount) || 0)
  const saldo = Math.max(0, total - payAmount)
  const cambio = Math.max(0, payAmount - total)

  const selectedPaymentMethod = paymentMethods.find(
    (pm) => String(pm.id) === String(form.payment_method_id),
  )
  const showChangeBox = cambio > 0 && isCashPaymentMethod(selectedPaymentMethod)

  const discountInvalid = discountNum > subtotal && subtotal > 0
  const payMethodInvalid = payAmount > 0 && !form.payment_method_id

  const canSave =
    Boolean(selectedPatient) &&
    details.length > 0 &&
    !discountInvalid &&
    !payMethodInvalid &&
    cashOpen === true &&
    !submitting &&
    !loadingAnalyses

  const saveHint = useMemo(() => {
    if (cashOpen === false) return 'Debe tener una caja abierta para registrar órdenes.'
    if (cashOpen === null) return 'Verificando estado de caja…'
    if (!selectedPatient && !details.length) {
      return 'Seleccione un paciente y al menos un análisis.'
    }
    if (!selectedPatient) return 'Seleccione un paciente.'
    if (!details.length) return 'Agregue al menos un análisis.'
    if (discountInvalid) return 'Corrija el descuento antes de guardar.'
    if (payMethodInvalid) return 'Seleccione un método de pago.'
    return ''
  }, [cashOpen, selectedPatient, details.length, discountInvalid, payMethodInvalid])

  const toggleAnalysis = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
    setErrors((e) => ({ ...e, analyses: undefined }))
  }

  const removeAnalysis = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const paymentPreview = useMemo(
    () => computePaymentPreview(payAmount, total),
    [payAmount, total],
  )

  const insuranceLabel = useMemo(() => {
    if (isParticular) return 'Particular'
    return (
      insurances.find((i) => String(i.id) === String(form.insurance_id))?.name ?? 'Seguro'
    )
  }, [isParticular, insurances, form.insurance_id])

  const selectedLines = useMemo(
    () =>
      details.map((d) => {
        const row = analyses.find(
          (a) => String(a.id) === String(d.laboratory_analysis_id),
        )
        return {
          id: d.laboratory_analysis_id,
          name: d.name ?? row?.name ?? '—',
          price: row?.finalPrice ?? 0,
        }
      }),
    [details, analyses],
  )

  const validateForm = () => {
    const nextErrors = {}
    if (!selectedPatient) nextErrors.patient = 'Debe seleccionar un paciente.'
    if (!details.length) nextErrors.analyses = 'Debe agregar al menos un análisis.'
    if (discountInvalid) nextErrors.discount = 'El descuento no puede superar el subtotal.'
    if (payMethodInvalid) nextErrors.payment_method = 'Seleccione un método de pago.'
    if (cashOpen !== true) {
      toast.error(
        cashOpen === false
          ? 'No hay caja abierta. Abra caja antes de crear órdenes.'
          : 'Verificando estado de caja…',
      )
      return false
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return false
    }
    return true
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setConfirmOpen(true)
  }

  const submitOrder = async () => {
    setSubmitting(true)
    try {
      const body = buildLaboratoryOrderPayload({
        patient_id: selectedPatient.id,
        doctor_id: selectedDoctor?.id || undefined,
        discount: discountNum || 0,
        insurance_id: isParticularInsuranceSelection(form.insurance_id, insurances)
          ? undefined
          : form.insurance_id || undefined,
        insurance_number:
          !isParticular && form.insurance_id ? form.insurance_number.trim() || undefined : undefined,
        details,
        payment:
          payAmount > 0 && form.payment_method_id
            ? {
                payment_method_id: form.payment_method_id,
                amount: payAmount,
              }
            : undefined,
      })
      const created = await laboratoryApi.createLaboratoryOrder(body)
      const code = created?.code ?? created?.order_code
      toast.success(code ? `Orden creada · ${code}` : 'Orden creada')

      setConfirmOpen(false)
      resetCreateForm()

      if (created?.id) {
        setCreatedOrderPreview({
          orderId: created.id,
          orderCode: code,
        })
      }
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const loadingCatalog = insurancesLoading || paymentMethodsLoading

  if (loadingCatalog && insurances.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          className="mb-0"
          title="Crear orden"
          description="Complete los datos para registrar una nueva orden de laboratorio."
        />
        <div className="flex flex-wrap items-center gap-2">
          {cashOpen === true && (
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Caja abierta
            </Badge>
          )}
          {cashOpen === false && (
            <Badge variant="danger" className="px-3 py-1">
              Caja cerrada
            </Badge>
          )}
          <Button variant="secondary" asChild>
            <Link to={ROUTES.ORDER_MANAGEMENT}>Gestionar orden</Link>
          </Button>
        </div>
      </div>

      {cashOpen === false && (
        <WorkflowAlert variant="danger" className="mb-4">
          No hay caja abierta. Abra caja para poder registrar órdenes con pago.
        </WorkflowAlert>
      )}

      <form onSubmit={handleFormSubmit}>
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <CardSection
              icon={UserRound}
              iconClassName="bg-primary/10 text-primary"
              title="Paciente"
              subtitle="Busque por nombre, CI, teléfono o correo"
              required
            >
              <PersonSearchField
                placeholder="Buscar paciente…"
                searchApi={searchPatients}
                selected={selectedPatient}
                onSelect={(p) => {
                  setSelectedPatient(p)
                  setErrors((e) => ({ ...e, patient: undefined }))
                }}
                onClear={() => setSelectedPatient(null)}
                error={errors.patient}
              />
              <Link
                to={ROUTES.PATIENTS}
                className="mt-2 inline-block text-xs font-semibold text-muted hover:text-primary"
              >
                + Crear paciente nuevo
              </Link>
            </CardSection>

            <CardSection
              icon={Stethoscope}
              iconClassName="bg-accent/10 text-accent"
              title="Datos clínicos"
              subtitle="Todos los campos son opcionales"
            >
              <div className="space-y-4">
                <PersonSearchField
                  label="Médico solicitante"
                  subtitle="Opcional"
                  placeholder="Buscar médico por nombre o CI…"
                  searchApi={searchDoctors}
                  selected={selectedDoctor}
                  onSelect={setSelectedDoctor}
                  onClear={() => setSelectedDoctor(null)}
                  clearLabel="Quitar"
                  avatarClassName="bg-accent"
                  cardClassName="border-accent/25 bg-accent/5"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Aseguradora / Convenio"
                    value={form.insurance_id}
                    onChange={handleInsuranceChange}
                  >
                    <option value="">Particular</option>
                    {selectableInsurances.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.name ?? ins.description}
                      </option>
                    ))}
                  </Select>
                </div>
                {!isParticular && form.insurance_id && (
                  <Input
                    label="N° de póliza / Carnet"
                    name="insurance_number"
                    value={form.insurance_number}
                    maxLength={50}
                    placeholder="Ej. 123456-ABC"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, insurance_number: e.target.value }))
                    }
                  />
                )}
              </div>
            </CardSection>

            <CardSection
              icon={FlaskConical}
              iconClassName="bg-amber-100 text-amber-700"
              title="Análisis solicitados"
              subtitle="Seleccione del catálogo o busque por nombre"
              required
            >
              {loadingAnalyses ? (
                <p className="py-8 text-center text-sm text-muted">Cargando catálogo…</p>
              ) : (
                <>
                  <AnalysisGroupCatalog
                    groups={analysisGroups}
                    selected={selected}
                    onToggle={toggleAnalysis}
                    search={catalogSearch}
                    onSearchChange={setCatalogSearch}
                    collapsedGroups={collapsedGroups}
                    onToggleGroup={toggleGroup}
                  />
                  {errors.analyses && (
                    <p className="mt-2 text-xs text-danger">{errors.analyses}</p>
                  )}
                  <div className="mt-4">
                    <SelectedAnalysesTable
                      analyses={analyses}
                      selected={selected}
                      groupMap={groupMap}
                      onRemove={removeAnalysis}
                    />
                  </div>
                </>
              )}
            </CardSection>
          </div>

          <Card className="sticky top-6 overflow-hidden">
            <div className="border-b border-border bg-surface-muted/40 px-4 py-3">
              <h3 className="text-sm font-semibold">Resumen financiero</h3>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">Descuento</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-24 text-right"
                  value={form.discount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discount: e.target.value }))
                  }
                />
              </div>
              {(errors.discount || discountInvalid) && (
                <p className="text-xs text-danger">
                  {errors.discount ?? 'El descuento no puede superar el subtotal.'}
                </p>
              )}

              <div className="flex justify-between border-t border-border pt-3 text-sm">
                <span className="font-semibold">Total</span>
                <span className="text-base font-bold text-primary tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>

              <hr className="border-border" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Pago inicial (opcional)
              </p>

              <Select
                label="Método de pago"
                value={form.payment_method_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    payment_method_id: e.target.value,
                  }))
                }
                className={payMethodInvalid ? 'border-danger' : undefined}
              >
                <option value="">Sin pago ahora</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name ?? pm.description}
                  </option>
                ))}
              </Select>
              {(errors.payment_method || payMethodInvalid) && (
                <p className="text-xs text-danger">
                  {errors.payment_method ?? 'Seleccione un método de pago.'}
                </p>
              )}

              <Input
                label="Monto"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />

              <div className="flex justify-between text-sm">
                <span className="text-muted">Saldo pendiente</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    saldo > 0 ? 'text-amber-700' : 'text-muted',
                  )}
                >
                  {formatCurrency(saldo)}
                </span>
              </div>

              {showChangeBox && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <p className="mb-2 font-semibold text-emerald-800">Cambio a entregar</p>
                  <div className="space-y-1 text-xs text-emerald-900">
                    <div className="flex justify-between">
                      <span>Monto recibido</span>
                      <span className="tabular-nums">{formatCurrency(payAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Aplicado a orden</span>
                      <span className="tabular-nums">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                      <span>Cambio</span>
                      <span className="tabular-nums">{formatCurrency(cambio)}</span>
                    </div>
                  </div>
                </div>
              )}

              <hr className="border-border" />

              <Button type="submit" className="w-full" disabled={!canSave}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  'Guardar orden'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={submitting}
                onClick={resetCreateForm}
              >
                Cancelar y limpiar
              </Button>
              {saveHint && (
                <p className="text-center text-xs text-muted">{saveHint}</p>
              )}
            </div>
          </Card>
        </div>
      </form>

      <Modal
        open={confirmOpen}
        onOpenChange={(open) => !submitting && setConfirmOpen(open)}
        title="Confirmar orden y pago"
        description="Revise el resumen antes de registrar la orden."
        className="max-w-md"
      >
        <div className="max-h-[min(70vh,28rem)] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg border border-border bg-surface-muted/30 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paciente</p>
            <p className="mt-1 font-semibold">{personFullName(selectedPatient)}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Convenio
            </p>
            <p className="mt-0.5">{insuranceLabel}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Análisis ({selectedLines.length})
            </p>
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-sm">
              {selectedLines.map((line) => (
                <li key={line.id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">{line.name}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatCurrency(line.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Descuento</span>
                <span className="tabular-nums">−{formatCurrency(discountNum)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total a pagar</span>
              <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Pago inicial
            </p>
            {payAmount > 0 && form.payment_method_id ? (
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2">
                  <span className="text-muted">Método</span>
                  <span className="font-medium">
                    {selectedPaymentMethod?.name ?? selectedPaymentMethod?.description ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Monto recibido</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(paymentPreview.received)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Aplicado a la orden</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(paymentPreview.applied)}
                  </span>
                </div>
                {paymentPreview.change > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Cambio a entregar</span>
                    <span className="font-bold tabular-nums">
                      {formatCurrency(paymentPreview.change)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-primary/15 pt-2">
                  <span className="text-muted">Saldo pendiente</span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      paymentPreview.remaining > 0 ? 'text-amber-700' : 'text-muted',
                    )}
                  >
                    {formatCurrency(paymentPreview.remaining)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted">
                Sin pago inicial. El saldo pendiente será{' '}
                <strong className="text-foreground">{formatCurrency(total)}</strong>.
              </p>
            )}
          </div>
        </div>

        <ModalFooter className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => setConfirmOpen(false)}
          >
            Volver
          </Button>
          <Button type="button" disabled={submitting} onClick={submitOrder}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              'Confirmar y guardar'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      <PdfPreviewModal
        open={Boolean(createdOrderPreview)}
        onOpenChange={(open) => !open && setCreatedOrderPreview(null)}
        orderId={createdOrderPreview?.orderId}
        orderCode={createdOrderPreview?.orderCode}
        pdfType="order"
      />
    </AnimatedPage>
  )
}
