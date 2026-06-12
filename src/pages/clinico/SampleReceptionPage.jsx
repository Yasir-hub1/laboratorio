import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { Button, Card, CardDescription, CardHeader, CardTitle, Input, Select } from '@/components/ui'
import { useApiList } from '@/hooks/useApiList'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatDate } from '@/utils/apiHelpers'
import { buildReceiveSamplePayload } from '@/utils/apiPayload'
import { ORDER_STATUS } from '@/utils/constants'

function personLabel(p) {
  if (!p) return '—'
  const name =
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ')
  return name || `#${p.id}`
}

export function SampleReceptionPage() {
  const {
    items: orders,
    loading: ordersLoading,
    error: ordersError,
  } = useApiList(laboratoryApi.getLaboratoryOrders, [])
  const {
    items: samples,
    loading: samplesLoading,
    error: samplesError,
  } = useApiList(laboratoryApi.getSamples, [])
  const loading = ordersLoading || samplesLoading
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    laboratory_order_id: '',
    sample_id: '',
    code: '',
  })

  useEffect(() => {
    if (ordersError) toast.error(ordersError)
    if (samplesError) toast.error(samplesError)
  }, [ordersError, samplesError])

  const handleReceive = async (e) => {
    e.preventDefault()
    if (!form.laboratory_order_id || !form.sample_id || !form.code.trim()) {
      toast.error('Completa orden, tipo de muestra y código')
      return
    }
    setSubmitting(true)
    try {
      await laboratoryApi.receiveSample(buildReceiveSamplePayload(form))
      toast.success('Muestra recibida')
      setForm({ laboratory_order_id: form.laboratory_order_id, sample_id: '', code: '' })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        phase="Fase 9-10"
        title="Toma de muestras"
        description="Registra la recepción de muestras vinculadas a órdenes de laboratorio."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recibir muestra</CardTitle>
            <CardDescription>Orden, tipo de muestra y código de barras</CardDescription>
          </CardHeader>
          <form onSubmit={handleReceive} className="space-y-4">
            <Select
              label="Orden"
              value={form.laboratory_order_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, laboratory_order_id: e.target.value }))
              }
              required
            >
              <option value="">Seleccionar orden...</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code ?? `#${o.id}`} — {personLabel(o.patient) ?? o.patient_name}
                </option>
              ))}
            </Select>
            <Select
              label="Tipo de muestra"
              value={form.sample_id}
              onChange={(e) => setForm((f) => ({ ...f, sample_id: e.target.value }))}
              required
            >
              <option value="">Seleccionar...</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.description ?? `Muestra #${s.id}`}
                </option>
              ))}
            </Select>
            <Input
              label="Código"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Código de muestra"
              required
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Recibir muestra'}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Órdenes pendientes</CardTitle>
            <CardDescription>Órdenes registradas o con muestra tomada</CardDescription>
          </CardHeader>
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {orders
              .filter((o) => o.status !== 4)
              .map((o) => {
                const status = ORDER_STATUS[o.status]?.label ?? o.status
                return (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{o.code ?? `Orden #${o.id}`}</p>
                      <p className="text-muted">
                        {personLabel(o.patient) ?? o.patient_name} · {formatDate(o.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted">{status}</span>
                  </li>
                )
              })}
          </ul>
        </Card>
      </div>
    </AnimatedPage>
  )
}
