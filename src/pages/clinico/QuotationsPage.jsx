import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { RowActions } from '@/components/common/RowActions'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import {
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
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { buildQuotationPayload } from '@/utils/apiPayload'
import { resolveEntityId } from '@/utils/entityId'
import { storage } from '@/utils/storage'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

const STEPS = ['Paciente', 'Análisis', 'Confirmar']

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || `Paciente #${p.id}`
}

function analysisPrice(a) {
  return Number(a?.price ?? a?.sale_price ?? a?.unit_price ?? 0)
}

function quotationPatient(row) {
  return personLabel(row?.patient ?? row?.patient_data)
}

function quotationBranch(row) {
  return row?.branch?.name ?? row?.branch_name ?? '—'
}

function quotationCode(row) {
  return row?.code ?? '—'
}

function quotationTotal(row) {
  return Number(row?.total_amount ?? row?.total ?? row?.amount ?? 0)
}

function quotationDetailsCount(row) {
  const details = row?.details ?? row?.quotation_details ?? row?.items
  return Array.isArray(details) ? details.length : 0
}

function mapQuotationDetailLines(quotation) {
  const lines = quotation?.details ?? quotation?.quotation_details ?? quotation?.items
  if (!Array.isArray(lines)) return []
  return lines.map((line) => {
    const analysis = line.analysis ?? line.laboratory_analysis
    const unit = Number(line.unit_price ?? analysis?.price ?? 0)
    const qty = Number(line.quantity ?? 1)
    return {
      id: line.id ?? line.laboratory_analysis_id,
      name: analysis?.name ?? analysis?.description ?? `Análisis #${line.laboratory_analysis_id}`,
      unit,
      qty,
      subtotal: unit * qty,
    }
  })
}

export function QuotationsPage() {
  const { confirmDelete } = useConfirmAction()

  const {
    items: quotations,
    loading: listLoading,
    error: listError,
    reload,
    serverPagination,
    isEmpty,
  } = useIndexQuery(laboratoryApi.getQuotationOrders)

  const { items: patients, loading: patientsLoading, error: patientsError } = useApiList(
    laboratoryApi.getPatients,
    [],
  )
  const { items: analyses, loading: analysesLoading, error: analysesError } = useApiList(
    laboratoryApi.getLaboratoryAnalyses,
    [],
  )

  const catalogLoading = patientsLoading || analysesLoading
  const catalogError = patientsError ?? analysesError

  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [selected, setSelected] = useState({})
  const [patientSearch, setPatientSearch] = useState('')
  const [analysisSearch, setAnalysisSearch] = useState('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (listError) toast.error(listError)
  }, [listError])

  useEffect(() => {
    if (catalogError) toast.error(catalogError)
  }, [catalogError])

  const details = useMemo(
    () =>
      Object.entries(selected).map(([id, qty]) => {
        const analysis = analyses.find((a) => String(a.id) === id)
        const price = analysisPrice(analysis)
        return {
          laboratory_analysis_id: id,
          unit_price: price,
          quantity: qty,
          subtotal: price * qty,
          name: analysis?.name ?? analysis?.description ?? `Análisis #${id}`,
        }
      }),
    [selected, analyses],
  )

  const total = useMemo(() => details.reduce((sum, d) => sum + d.subtotal, 0), [details])

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => personLabel(p).toLowerCase().includes(q))
  }, [patients, patientSearch])

  const filteredAnalyses = useMemo(() => {
    const q = analysisSearch.trim().toLowerCase()
    if (!q) return analyses
    return analyses.filter((a) =>
      (a.name ?? a.description ?? '').toLowerCase().includes(q),
    )
  }, [analyses, analysisSearch])

  const resetWizard = useCallback(() => {
    setStep(0)
    setPatientId('')
    setSelected({})
    setPatientSearch('')
    setAnalysisSearch('')
  }, [])

  const openWizard = () => {
    resetWizard()
    setWizardOpen(true)
  }

  const toggleAnalysis = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  }

  const setQty = (id, qty) => {
    const n = Math.max(1, Number(qty) || 1)
    setSelected((prev) => ({ ...prev, [id]: n }))
  }

  const canNext = () => {
    if (step === 0) return Boolean(patientId)
    if (step === 1) return details.length > 0
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const branchId = storage.getBranchId()
      if (!branchId) {
        toast.error('Selecciona sucursal y rol antes de cotizar')
        return
      }
      await laboratoryApi.createQuotationOrder(
        buildQuotationPayload({
          patient_id: patientId,
          branch_id: branchId,
          insurance_id: null,
          details,
        }),
      )
      toastApiSuccess('Cotización registrada')
      setWizardOpen(false)
      resetWizard()
      reload()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const openDetail = useCallback((row) => {
    setDetail(row)
    setDetailOpen(true)
  }, [])

  const handleDelete = useCallback(
    async (row) => {
      const id = resolveEntityId(row)
      if (!id) return
      const label = quotationPatient(row) !== '—' ? quotationPatient(row) : `Cotización #${id}`
      if (!(await confirmDelete(label))) return
      try {
        await laboratoryApi.deleteQuotationOrder(id)
        toastApiSuccess('Cotización eliminada')
        reload()
      } catch (err) {
        toastApiError(err)
      }
    },
    [confirmDelete, reload],
  )

  const columns = useMemo(
    () => [
      {
        id: 'code',
        header: 'Código',
        accessorKey: 'code',
        cell: ({ row }) => (
          <span className="font-mono text-xs sm:text-sm">{quotationCode(row.original)}</span>
        ),
      },
      {
        id: 'patient',
        header: 'Paciente',
        accessorKey: 'patient_id',
        cell: ({ row }) => quotationPatient(row.original),
      },
      {
        id: 'branch',
        header: 'Sucursal',
        accessorKey: 'branch_id',
        cell: ({ row }) => quotationBranch(row.original),
      },
      {
        id: 'created_at',
        header: 'Fecha',
        accessorKey: 'created_at',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: 'items',
        header: 'Análisis',
        enableSorting: false,
        cell: ({ row }) => quotationDetailsCount(row.original),
      },
      {
        id: 'total_amount',
        header: 'Total',
        accessorKey: 'total_amount',
        cell: ({ row }) => formatCurrency(quotationTotal(row.original)),
      },
      {
        id: 'actions',
        header: 'Acciones',
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            onView={() => openDetail(row.original)}
            onDelete={() => handleDelete(row.original)}
          />
        ),
      },
    ],
    [openDetail, handleDelete],
  )

  const detailLines = useMemo(() => mapQuotationDetailLines(detail), [detail])

  const patient = patients.find((p) => String(p.id) === patientId)

  if (listLoading && quotations.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        title="Cotizaciones"
        description="Consulta cotizaciones registradas y genera nuevas con paciente y análisis."
        actions={
          <Button onClick={openWizard}>
            <Plus className="h-4 w-4" />
            Nueva cotización
          </Button>
        }
      />

      <Card>
        {isEmpty ? (
          <EmptyState
            title="Sin cotizaciones"
            description="Registra la primera cotización para un paciente."
            actionLabel="Nueva cotización"
            onAction={openWizard}
          />
        ) : (
          <DataTable
            columns={columns}
            data={quotations}
            serverPagination={serverPagination}
            searchPlaceholder="Buscar cotizaciones…"
          />
        )}
      </Card>

      <Modal
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open)
          if (!open) resetWizard()
        }}
        title="Nueva cotización"
        description="Paciente, análisis y confirmación del total."
        className="max-w-xl max-h-[90vh] overflow-y-auto"
      >
        {catalogLoading ? (
          <p className="py-8 text-center text-sm text-muted">Cargando catálogo…</p>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    i === step
                      ? 'bg-accent text-white'
                      : i < step
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-surface-muted text-muted'
                  }`}
                >
                  {i + 1}. {label}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <Input
                  label="Buscar paciente"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Nombre o documento"
                />
                <Select
                  label="Paciente"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {filteredPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                      {p.ci ? ` — ${p.ci}` : p.document_number ? ` — ${p.document_number}` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <Input
                  label="Buscar análisis"
                  value={analysisSearch}
                  onChange={(e) => setAnalysisSearch(e.target.value)}
                  placeholder="Nombre del análisis"
                />
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
                  {filteredAnalyses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted">Sin análisis disponibles</p>
                  ) : (
                    filteredAnalyses.map((a) => {
                      const id = String(a.id)
                      const checked = Boolean(selected[id])
                      return (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAnalysis(id)}
                            className="h-4 w-4"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{a.name ?? a.description}</p>
                            <p className="text-sm text-muted">{formatCurrency(analysisPrice(a))}</p>
                          </div>
                          {checked && (
                            <Input
                              type="number"
                              min={1}
                              className="w-20"
                              value={selected[id]}
                              onChange={(e) => setQty(id, e.target.value)}
                              aria-label="Cantidad"
                            />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
                <p className="text-right text-sm font-semibold">
                  Subtotal: {formatCurrency(total)}
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-surface-muted/40 p-4 text-sm">
                  <p>
                    <span className="text-muted">Paciente:</span> {personLabel(patient)}
                  </p>
                </div>
                <ul className="divide-y divide-border text-sm">
                  {details.map((d) => (
                    <li key={d.laboratory_analysis_id} className="flex justify-between py-2">
                      <span>
                        {d.name} × {d.quantity}
                      </span>
                      <span>{formatCurrency(d.subtotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-right text-lg font-semibold">Total: {formatCurrency(total)}</p>
              </div>
            )}

            <ModalFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                Anterior
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
                  Siguiente
                </Button>
              ) : (
                <Button type="button" disabled={submitting || !canNext()} onClick={handleSubmit}>
                  {submitting ? 'Guardando…' : 'Crear cotización'}
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </Modal>

      <Modal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de cotización"
        description={
          detail
            ? `${quotationCode(detail)} · ${formatDateTime(detail.created_at)}`
            : undefined
        }
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {detail ? (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Código</dt>
                <dd className="font-medium font-mono">{quotationCode(detail)}</dd>
              </div>
              <div>
                <dt className="text-muted">Fecha</dt>
                <dd className="font-medium">{formatDateTime(detail.created_at)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Paciente</dt>
                <dd className="font-medium">{quotationPatient(detail)}</dd>
                {detail.patient?.ci && (
                  <dd className="text-xs text-muted">CI: {detail.patient.ci}</dd>
                )}
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Sucursal</dt>
                <dd className="font-medium">{quotationBranch(detail)}</dd>
              </div>
              <div>
                <dt className="text-muted">Total</dt>
                <dd className="text-lg font-semibold text-primary">
                  {formatCurrency(quotationTotal(detail))}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Análisis</dt>
                <dd className="font-medium">{quotationDetailsCount(detail)}</dd>
              </div>
            </dl>

            {detailLines.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Detalle de análisis
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {detailLines.map((line) => (
                    <li key={line.id} className="flex justify-between gap-3 px-3 py-2.5">
                      <span>{line.name}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {formatCurrency(line.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin líneas de detalle.</p>
            )}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">No se pudo cargar el detalle.</p>
        )}
      </Modal>
    </AnimatedPage>
  )
}
