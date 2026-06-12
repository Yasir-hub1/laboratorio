import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Button, Card, CardDescription, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { laboratoryApi } from '@/services/laboratoryApi'
import { asApiId, buildComponentResultsPayload } from '@/utils/apiPayload'

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || `#${p.id}`
}

export function ResultsPage() {
  const {
    items: orders,
    loading,
    error: ordersError,
  } = useApiList(laboratoryApi.getLaboratoryOrders, [])
  const [orderId, setOrderId] = useState('')
  const [orderInfo, setOrderInfo] = useState(null)
  const [sampleAnalyses, setSampleAnalyses] = useState([])
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('')
  const [results, setResults] = useState([])
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (ordersError) toast.error(ordersError)
  }, [ordersError])

  const loadOrderAnalyses = async (id) => {
    setOrderId(id)
    setSelectedAnalysisId('')
    setResults([])
    setDraft({})
    if (!id) {
      setOrderInfo(null)
      setSampleAnalyses([])
      return
    }
    try {
      const order = await laboratoryApi.getLaboratoryOrder(id)
      setOrderInfo(order)
      const analyses =
        order.sample_analyses ??
        order.laboratory_sample_analyses ??
        order.details ??
        []
      setSampleAnalyses(Array.isArray(analyses) ? analyses : [])
    } catch (err) {
      toast.error(err.message)
      setOrderInfo(null)
      setSampleAnalyses([])
    }
  }

  const loadResults = async (sampleAnalysisId) => {
    setSelectedAnalysisId(sampleAnalysisId)
    if (!sampleAnalysisId) {
      setResults([])
      return
    }
    try {
      const data = await laboratoryApi.getComponentResults(sampleAnalysisId)
      const list = Array.isArray(data) ? data : (data?.results ?? data?.components ?? [])
      setResults(list)
      const initial = {}
      list.forEach((r) => {
        const key = r.id ?? r.component_analysis_id
        initial[key] = r.value ?? r.result ?? ''
      })
      setDraft(initial)
    } catch (err) {
      toast.error(err.message)
      setResults([])
    }
  }

  const handleSave = async () => {
    if (!selectedAnalysisId) return
    setSaving(true)
    try {
      await laboratoryApi.saveComponentResults(
        buildComponentResultsPayload(selectedAnalysisId, results, draft),
      )
      toast.success('Resultados guardados')
      loadResults(selectedAnalysisId)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async (resultId) => {
    try {
      await laboratoryApi.validateComponentResult(asApiId(resultId))
      toast.success('Resultado validado')
      loadResults(selectedAnalysisId)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <LoadingScreen />

  const currentAnalysis = sampleAnalyses.find(
    (a) => String(a.id ?? a.sample_analysis_id) === selectedAnalysisId,
  )

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 10"
        title="Resultados"
        description="Captura y validación de resultados por componente de análisis."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Select
          label="Orden"
          value={orderId}
          onChange={(e) => loadOrderAnalyses(e.target.value)}
        >
          <option value="">Seleccionar orden...</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code ?? `#${o.id}`} — {personLabel(o.patient) ?? o.patient_name}
            </option>
          ))}
        </Select>
        <Select
          label="Análisis de muestra"
          value={selectedAnalysisId}
          onChange={(e) => loadResults(e.target.value)}
          disabled={!orderId}
        >
          <option value="">Seleccionar análisis...</option>
          {sampleAnalyses.map((a) => (
            <option key={a.id ?? a.sample_analysis_id} value={a.id ?? a.sample_analysis_id}>
              {a.analysis?.name ??
                a.laboratory_analysis?.name ??
                a.name ??
                `Análisis #${a.id}`}
            </option>
          ))}
        </Select>
      </div>

      {orderInfo && (
        <p className="mb-4 text-sm text-muted">
          <span className="font-medium text-foreground">Seguro de la orden:</span>{' '}
          {orderInfo.insurance?.name ?? orderInfo.insurance_name ?? 'Particular (sin seguro)'}
        </p>
      )}

      {selectedAnalysisId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {currentAnalysis?.analysis?.name ??
                currentAnalysis?.name ??
                'Componentes'}
            </CardTitle>
            <CardDescription>Ingresa valores y valida resultados</CardDescription>
          </CardHeader>

          {results.length === 0 ? (
            <p className="text-sm text-muted">Sin componentes para este análisis.</p>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => {
                const key = r.id ?? r.component_analysis_id
                const label =
                  r.component?.name ??
                  r.component_analysis?.name ??
                  r.name ??
                  `Componente #${key}`
                return (
                  <li
                    key={key}
                    className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3"
                  >
                    <div className="min-w-[140px] flex-1">
                      <p className="text-sm font-medium">{label}</p>
                      {r.validated_at && (
                        <p className="text-xs text-emerald-600">Validado</p>
                      )}
                    </div>
                    <Input
                      className="w-32"
                      value={draft[key] ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [key]: e.target.value }))
                      }
                      disabled={Boolean(r.validated_at)}
                    />
                    {!r.validated_at && r.id && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleValidate(r.id)}
                      >
                        Validar
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {results.length > 0 && (
            <div className="mt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar resultados'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </AnimatedPage>
  )
}
