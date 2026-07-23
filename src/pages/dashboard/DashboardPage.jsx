import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  FileText,
  Plus,
  TrendingUp,
  UserCircle,
  Wallet,
} from 'lucide-react'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { PageHeader } from '@/components/common/PageHeader'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { Can } from '@/components/auth/Can'
import { Badge, Card, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency, formatDateTime } from '@/utils/apiHelpers'
import { cn } from '@/utils/cn'
import { ORDER_STATUS, ORDER_WORKFLOW_STATUS, ROUTES, TAB_BAR_ITEMS } from '@/utils/constants'
import { canMenu } from '@/utils/permissions'
import { toastApiError } from '@/utils/toastApi'
import * as TabIcons from 'lucide-react'

const statStyles = {
  income: {
    icon: TrendingUp,
    iconBg: 'bg-accent-soft text-accent',
    value: 'text-foreground',
  },
  expense: {
    icon: ArrowUpRight,
    iconBg: 'bg-red-50 text-red-600',
    value: 'text-foreground',
  },
  balance: {
    icon: Activity,
    iconBg: 'bg-primary-soft text-primary',
    value: 'text-primary',
  },
  active: {
    icon: ClipboardList,
    iconBg: 'bg-indigo-50 text-indigo-600',
    value: 'text-foreground',
  },
}

const quickLinks = [
  {
    to: ROUTES.ORDER_RECEPTION,
    label: 'Nueva orden',
    icon: Plus,
    highlight: true,
    permission: 'atencion.nueva-orden',
  },
  {
    to: ROUTES.ORDER_MANAGEMENT,
    label: 'Gestionar orden',
    icon: ClipboardList,
    permission: 'atencion.gestion-ordenes',
  },
  {
    to: ROUTES.QUOTATIONS,
    label: 'Cotizar',
    icon: FileText,
    permission: 'atencion.cotizaciones',
  },
  {
    to: ROUTES.PATIENTS,
    label: 'Pacientes',
    icon: UserCircle,
    permission: 'gestion-clinica.pacientes',
  },
  {
    to: ROUTES.OPEN_CASH,
    label: 'Caja',
    icon: Wallet,
    permission: 'caja.apertura-cierre',
  },
]

function personLabel(p) {
  if (!p) return '—'
  return (
    p.full_name ||
    p.name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') ||
    '—'
  )
}

function orderStatusBadge(order) {
  const workflowKey = order.workflow_status
  if (workflowKey != null && ORDER_WORKFLOW_STATUS[workflowKey]) {
    const info = ORDER_WORKFLOW_STATUS[workflowKey]
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

  const key = order.status ?? 0
  const info = ORDER_STATUS[key] ?? { label: String(order.status), color: 'default' }
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

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
}

export function DashboardPage() {
  const { user, branchId, branchName, cashName, openingCashId } = useAuth()
  const { permissions } = usePermission()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const visibleTabs = useMemo(
    () => TAB_BAR_ITEMS.filter((t) => !t.isMore && canMenu(permissions, t.permission)),
    [permissions],
  )
  const visibleQuickLinks = useMemo(
    () => quickLinks.filter((link) => canMenu(permissions, link.permission)),
    [permissions],
  )

  const loadDashboard = useCallback(async () => {
    if (!branchId) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const payload = await laboratoryApi.getDashboard({ orders_limit: 5 })
      setData(payload)
    } catch (err) {
      toastApiError(err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [branchId, openingCashId])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const cashSummary = data?.cash_summary ?? null
  const hasCashSession = Boolean(cashSummary?.has_session)
  const cashSessionMessage =
    cashSummary?.message ||
    (!hasCashSession
      ? 'Sin caja de sesión. Los montos de caja se muestran en 0.'
      : null)
  const orders = Array.isArray(data?.orders) ? data.orders : []
  const pipeline = data?.pipeline ?? {
    registered: 0,
    in_lab: 0,
    completed_today: 0,
    active_total: 0,
  }

  if (loading) return <LoadingScreen />

  const cashLabel = hasCashSession
    ? cashSummary?.cash_name || cashName || 'mi caja'
    : null

  const stats = [
    {
      key: 'income',
      label: hasCashSession ? `Ingresos (${cashLabel})` : 'Ingresos (mi caja)',
      value: formatCurrency(
        hasCashSession
          ? (cashSummary?.total_inflow ?? cashSummary?.total_inflows ?? 0)
          : 0,
      ),
      style: statStyles.income,
    },
    {
      key: 'expense',
      label: hasCashSession ? `Egresos (${cashLabel})` : 'Egresos (mi caja)',
      value: formatCurrency(
        hasCashSession
          ? (cashSummary?.total_outflow ?? cashSummary?.total_outflows ?? 0)
          : 0,
      ),
      style: statStyles.expense,
    },
    {
      key: 'balance',
      label: hasCashSession ? `Saldo (${cashLabel})` : 'Saldo caja',
      value: formatCurrency(
        hasCashSession
          ? (cashSummary?.balance ?? cashSummary?.total_current_amount ?? 0)
          : 0,
      ),
      style: statStyles.balance,
    },
    {
      key: 'active',
      label: 'Órdenes activas',
      value: String(pipeline.active_total ?? 0),
      style: statStyles.active,
    },
  ]

  const activeTotal = Number(pipeline.active_total ?? 0)

  return (
    <AnimatedPage>
      <PageHeader
        phase="Panel principal"
        title={`Hola, ${user?.name ?? 'Usuario'}`}
        description={
          branchName
            ? `${branchName}${
                hasCashSession && (cashSummary?.cash_name || cashName)
                  ? ` · ${cashSummary?.cash_name || cashName}`
                  : ''
              } — resumen de tu sesión de caja y tareas pendientes.`
            : 'Resumen del día y acceso a las tareas más usadas.'
        }
        actions={<Badge variant="success">PWA activa</Badge>}
      />

      {cashSessionMessage ? (
        <Card className="mb-4 border-amber-200/70 bg-amber-50/60 p-4">
          <p className="text-sm text-amber-900">{cashSessionMessage}</p>
          <Can permission="caja.apertura-cierre.listar">
            <Link
              to={ROUTES.OPEN_CASH}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              Ir a apertura / cierre
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Can>
        </Card>
      ) : null}

      <motion.nav
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="mb-6 lg:hidden"
        aria-label="Accesos de la barra inferior"
      >
        <p className="mb-2 text-xs font-medium text-muted">Navegación rápida</p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleTabs.map((tab) => {
            const TabIcon = TabIcons[tab.icon] ?? TabIcons.Circle
            return (
              <NavLink
                key={tab.id}
                to={tab.to}
                end={tab.end}
                className={cn(
                  'glass-chip inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                  'text-muted hover:border-primary/30 hover:bg-white/55 hover:text-primary',
                )}
              >
                <TabIcon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
              </NavLink>
            )
          })}
          <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-white/50 bg-white/25 px-3 py-1.5 text-xs text-muted backdrop-blur-sm">
            + Más en la barra inferior
          </span>
        </div>
      </motion.nav>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.style.icon
          return (
            <motion.div key={stat.key} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted sm:text-sm">{stat.label}</p>
                    <p className={cn('mt-1 truncate text-xl font-semibold sm:text-2xl', stat.style.value)}>
                      {stat.value}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      stat.style.iconBg,
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Órdenes en curso</CardTitle>
            <CardDescription>
              {activeTotal === 0
                ? 'No hay órdenes activas en el sistema'
                : `${activeTotal} orden${activeTotal === 1 ? '' : 'es'} activa${activeTotal === 1 ? '' : 's'}`}
            </CardDescription>
          </CardHeader>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <Link
              to={`${ROUTES.ORDER_MANAGEMENT}?tab=1`}
              className="glass-list-item flex flex-col items-center gap-1 px-2 py-3 text-center transition-colors hover:border-amber-200/60 hover:bg-amber-50/50"
            >
              <span className="text-xl font-bold tabular-nums text-amber-700">
                {pipeline.registered ?? 0}
              </span>
              <span className="text-[11px] font-medium leading-tight text-muted">Registradas</span>
            </Link>
            <Link
              to={`${ROUTES.ORDER_MANAGEMENT}?tab=2`}
              className="glass-list-item flex flex-col items-center gap-1 px-2 py-3 text-center transition-colors hover:border-indigo-200/60 hover:bg-indigo-50/50"
            >
              <span className="text-xl font-bold tabular-nums text-indigo-700">
                {pipeline.in_lab ?? 0}
              </span>
              <span className="text-[11px] font-medium leading-tight text-muted">En laboratorio</span>
            </Link>
            <Link
              to={`${ROUTES.ORDER_MANAGEMENT}?tab=5`}
              className="glass-list-item flex flex-col items-center gap-1 px-2 py-3 text-center transition-colors hover:border-emerald-200/60 hover:bg-emerald-50/50"
            >
              <span className="text-xl font-bold tabular-nums text-emerald-700">
                {pipeline.completed_today ?? 0}
              </span>
              <span className="text-[11px] font-medium leading-tight text-muted">Completadas hoy</span>
            </Link>
          </div>

          {orders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-surface/40 px-4 py-8 text-center text-sm text-muted">
              No hay órdenes recientes. Puedes registrar una nueva desde acciones rápidas.
            </p>
          ) : (
            <ul className="space-y-2">
              {orders.map((order, i) => (
                <motion.li
                  key={order.id}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                >
                  <Link
                    to={ROUTES.ORDER_DETAIL.replace(':id', order.id)}
                    className="glass-list-item flex items-start gap-3 overflow-hidden px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-white/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">
                          {personLabel(order.patient) !== '—'
                            ? personLabel(order.patient)
                            : (order.patient_name ?? 'Paciente')}
                        </p>
                        <div className="shrink-0">{orderStatusBadge(order)}</div>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {order.code ? (
                          <span className="font-mono text-[11px] text-foreground/80">{order.code}</span>
                        ) : null}
                        {order.code ? ' · ' : ''}
                        {formatDateTime(order.updated_at ?? order.created_at ?? order.date)}
                        {order.total != null || order.amount != null
                          ? ` · ${formatCurrency(order.total ?? order.amount)}`
                          : ''}
                      </p>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}

          <Can permission="atencion.gestion-ordenes.listar">
            <Link
              to={ROUTES.ORDER_MANAGEMENT}
              className="link-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
            >
              Ver todas las órdenes
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Can>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
            <CardDescription>Ir directo a la tarea que necesitas</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 gap-2">
            {visibleQuickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'glass-list-item group flex min-h-[3.25rem] items-center gap-3 px-3 py-3',
                  'text-sm font-medium transition-all active:scale-[0.99]',
                  link.highlight
                    ? 'border-primary/30 bg-primary-soft/80 text-primary hover:bg-primary hover:text-primary-foreground'
                    : 'text-foreground hover:border-primary/25 hover:bg-white/50 hover:shadow-soft',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    link.highlight
                      ? 'bg-primary text-primary-foreground group-hover:bg-primary-foreground group-hover:text-primary'
                      : 'bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground',
                  )}
                >
                  <link.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="truncate">{link.label}</span>
                <ArrowRight
                  className={cn(
                    'ml-auto h-4 w-4 shrink-0 transition-opacity',
                    link.highlight ? 'opacity-80' : 'text-muted opacity-0 group-hover:opacity-100',
                  )}
                />
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/40 pt-4">
            <Can permission="caja.flujo-caja.listar">
              <Link
                to={ROUTES.CASH_FLOW}
                className="glass-chip inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-white/55 hover:text-primary"
              >
                <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden />
                Flujo de caja
              </Link>
            </Can>
            <Can permission="cobros.pagos.listar">
              <Link
                to={ROUTES.PAYMENTS}
                className="glass-chip inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-white/55 hover:text-primary"
              >
                <CreditCard className="h-3.5 w-3.5" aria-hidden />
                Pagos
              </Link>
            </Can>
          </div>
        </Card>
      </div>
    </AnimatedPage>
  )
}
