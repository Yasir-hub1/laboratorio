import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, RefreshCw, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { MotionAlert } from '@/components/common/MotionAlert'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { Button, Card, CardHeader, CardTitle } from '@/components/ui'
import { fetchCashFlowSummary } from '@/services/cashFlow.service'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { useAuth } from '@/hooks/useAuth'

export function CashFlowPage() {
  const { branchId, branchName, openingCashId } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!branchId) {
      toast.error('Selecciona sucursal y rol antes de ver el flujo de caja')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await fetchCashFlowSummary()
      setSummary(data)
      if (data.warnings?.length) {
        toast.warning(data.warnings[0], { duration: 6000 })
      }
    } catch (err) {
      toast.error(err.message)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) return <LoadingScreen message="Cargando flujo de caja..." />

  const overviewStats = [
    {
      label: 'Ingresos del día',
      value: formatCurrency(summary?.total_inflows ?? 0),
      icon: ArrowDownLeft,
      color: 'text-emerald-600',
    },
    {
      label: 'Egresos del día',
      value: formatCurrency(summary?.total_outflows ?? 0),
      icon: ArrowUpRight,
      color: 'text-red-600',
    },
    {
      label: 'Saldo neto',
      value: formatCurrency(summary?.balance ?? 0),
      icon: Wallet,
      color: 'text-primary',
    },
  ]

  const movements = Array.isArray(summary?.movements) ? summary.movements : []

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 7"
        title="Flujo de caja"
        description={`Resumen para ${branchName || 'sucursal actual'}. Datos vía ${summary?.source ?? 'API'}.`}
        actions={
          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        }
      />

      {summary?.warnings?.length > 0 && (
        <MotionAlert variant="warning" icon={AlertTriangle} title="Aviso del sistema">
          <p>{summary.warnings.join(' ')}</p>
          <p className="mt-1 opacity-75">
            El endpoint /cash-flow/overview en el servidor requiere la tabla type_inflows en
            PostgreSQL. Mientras tanto se muestran datos alternativos.
          </p>
        </MotionAlert>
      )}

      <p className="mb-4 text-xs text-muted">
        Sucursal: {branchId}
        {openingCashId ? ` · Caja abierta: ${openingCashId}` : ' · Sin apertura de caja activa'}
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {overviewStats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
              </div>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos del día</CardTitle>
        </CardHeader>
        {movements.length === 0 ? (
          <p className="text-sm text-muted">
            Sin movimientos hoy. Abre caja en Caja → Apertura / Cierre y registra ingresos o
            egresos.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {movements.map((item, index) => {
              const isOut =
                item.movement_type === 'outflow' ||
                item.type === 'outflow' ||
                item.type_outflow_id != null
              const amount = Number(item.amount ?? item.total ?? 0)

              return (
                <li
                  key={item.id ?? index}
                  className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">
                      {item.description ??
                        item.concept ??
                        item.type_inflow?.name ??
                        item.type_outflow?.name ??
                        (isOut ? 'Egreso' : 'Ingreso')}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(item.created_at ?? item.date)}
                    </p>
                  </div>
                  <span
                    className={
                      isOut ? 'font-medium text-red-600' : 'font-medium text-emerald-600'
                    }
                  >
                    {isOut ? '−' : '+'}
                    {formatCurrency(Math.abs(amount))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </AnimatedPage>
  )
}
