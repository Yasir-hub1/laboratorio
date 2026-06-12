import { laboratoryApi } from './laboratoryApi'
import { unwrapList } from '@/utils/apiHelpers'
import { storage } from '@/utils/storage'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Parámetros según Swagger: branch_id, cash_id, date_from, date_to, user_id */
export function buildCashFlowParams(extra = {}) {
  const branchId = storage.getBranchId()
  const openingCashId = storage.getOpeningCashId()

  return {
    date_from: todayISO(),
    date_to: todayISO(),
    ...(branchId ? { branch_id: String(branchId) } : {}),
    ...(openingCashId ? { opening_cash_id: String(openingCashId) } : {}),
    ...extra,
  }
}

function sumAmounts(items) {
  return (items ?? []).reduce((acc, item) => acc + Number(item.amount ?? item.total ?? 0), 0)
}

function normalizeGeneral(data) {
  if (!data) {
    return {
      total_inflows: 0,
      total_outflows: 0,
      balance: 0,
      movements: [],
      breakdown_inflows: [],
      breakdown_outflows: [],
    }
  }

  const summary = data.summary ?? data.totals ?? data

  return {
    total_inflows:
      Number(summary.total_inflows ?? summary.inflows ?? data.total_inflows ?? 0) || 0,
    total_outflows:
      Number(summary.total_outflows ?? summary.outflows ?? data.total_outflows ?? 0) || 0,
    balance: Number(summary.balance ?? summary.net_balance ?? data.balance ?? 0) || 0,
    movements: data.movements ?? data.openings ?? data.items ?? data.data ?? [],
    breakdown_inflows: data.inflows_by_type ?? data.inflow_breakdown ?? [],
    breakdown_outflows: data.outflows_by_type ?? data.outflow_breakdown ?? [],
  }
}

function normalizeFromLists(inflows, outflows) {
  const total_inflows = sumAmounts(inflows)
  const total_outflows = sumAmounts(outflows)

  const movements = [
    ...inflows.map((item) => ({ ...item, movement_type: 'inflow' })),
    ...outflows.map((item) => ({ ...item, movement_type: 'outflow' })),
  ].sort((a, b) => {
    const da = new Date(a.created_at ?? a.date ?? 0)
    const db = new Date(b.created_at ?? b.date ?? 0)
    return db - da
  })

  return {
    total_inflows,
    total_outflows,
    balance: total_inflows - total_outflows,
    movements,
    breakdown_inflows: [],
    breakdown_outflows: [],
  }
}

function isServerSqlError(error) {
  const msg = String(error?.message ?? '')
  return msg.includes('SQLSTATE') || msg.includes('type_inflows') || msg.includes('Undefined table')
}

/**
 * Resumen de caja resiliente:
 * 1) /cash-flow/general (recomendado por Swagger, con branch_id en query)
 * 2) /cash-flow/detail si hay apertura de caja activa
 * 3) Suma de /cash-inflows + /cash-outflows
 *
 * /cash-flow/overview se omite por defecto: en el servidor falla si falta tabla type_inflows.
 */
export async function fetchCashFlowSummary(options = {}) {
  const { tryOverview = false, params: extraParams } = options
  const params = buildCashFlowParams(extraParams)
  const warnings = []

  if (tryOverview) {
    try {
      const overview = await laboratoryApi.getCashFlowOverview(params)
      return {
        ...normalizeGeneral(overview),
        source: 'overview',
        warnings,
      }
    } catch (error) {
      if (isServerSqlError(error)) {
        warnings.push(
          'El resumen detallado (overview) no está disponible en el servidor. Se usó otra fuente.',
        )
      }
    }
  }

  try {
    const general = await laboratoryApi.getCashFlowGeneral(params)
    return {
      ...normalizeGeneral(general),
      source: 'general',
      warnings,
    }
  } catch (error) {
    if (!isServerSqlError(error)) throw error
    warnings.push('Flujo general no disponible; calculando desde movimientos.')
  }

  const openingCashId = storage.getOpeningCashId()
  if (openingCashId) {
    try {
      const detail = await laboratoryApi.getCashFlowDetail(openingCashId)
      const movements = Array.isArray(detail)
        ? detail
        : (detail?.movements ?? detail?.items ?? detail?.data ?? [])

      const inflows = movements.filter((m) => m.type === 'inflow' || m.movement_type === 'inflow')
      const outflows = movements.filter((m) => m.type === 'outflow' || m.movement_type === 'outflow')

      return {
        ...normalizeFromLists(inflows, outflows),
        movements,
        source: 'detail',
        warnings,
      }
    } catch {
      /* siguiente fallback */
    }
  }

  const [inflowsRaw, outflowsRaw] = await Promise.all([
    laboratoryApi.getCashInflows(params),
    laboratoryApi.getCashOutflows(params),
  ])

  const inflows = unwrapList(inflowsRaw).items
  const outflows = unwrapList(outflowsRaw).items

  return {
    ...normalizeFromLists(inflows, outflows),
    source: 'lists',
    warnings: [
      ...warnings,
      'Mostrando totales desde listados de ingresos y egresos del día.',
    ],
  }
}
