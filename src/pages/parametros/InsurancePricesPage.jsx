import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { laboratoryApi } from '@/services/laboratoryApi'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card, DataTable, Input } from '@/components/ui'
import { ROUTES } from '@/utils/constants'
import { formatCurrency, unwrapList } from '@/utils/apiHelpers'
import { hasInsuranceAnalysisPrice } from '@/utils/apiPayload'
import {
  getInsurancePrice,
  getReferenceDefaultPrice,
  insuranceAnalysisName,
  insuranceAnalysisRowId,
} from '@/utils/insurancePrices'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'

function normalizePrices(raw) {
  return unwrapList(raw).items
}

export function InsurancePricesPage() {
  const { id } = useParams()
  const [insurance, setInsurance] = useState(null)
  const [rows, setRows] = useState([])
  const [loadingInsurance, setLoadingInsurance] = useState(true)
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [savingBulk, setSavingBulk] = useState(false)
  const [savingRowId, setSavingRowId] = useState(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!id) return
    setLoadingInsurance(true)
    laboratoryApi
      .getInsurance(id)
      .then(setInsurance)
      .catch((err) => toastApiError(err))
      .finally(() => setLoadingInsurance(false))
  }, [id])

  const loadPrices = useCallback(async () => {
    if (!id) return
    setLoadingPrices(true)
    try {
      const pricesData = await laboratoryApi.getInsuranceAnalysisPrices(id, {
        search: search || undefined,
        onlyWithPrice: false,
      })
      setRows(normalizePrices(pricesData))
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingPrices(false)
    }
  }, [id, search])

  useEffect(() => {
    loadPrices()
  }, [loadPrices])

  const updateInsurancePrice = useCallback((rowId, value) => {
    setRows((prev) =>
      prev.map((row) => {
        const key = insuranceAnalysisRowId(row)
        if (String(key) !== String(rowId)) return row
        const next = value === '' ? null : value
        return { ...row, insurance_price: next }
      }),
    )
  }, [])

  const pricedCount = useMemo(() => rows.filter(hasInsuranceAnalysisPrice).length, [rows])

  const handleSaveRow = useCallback(
    async (row) => {
      const analysisId = insuranceAnalysisRowId(row)
      const price = row.insurance_price
      if (price == null || price === '') {
        toastApiError(new Error('Ingresa un precio de seguro antes de guardar'))
        return
      }

      setSavingRowId(analysisId)
      try {
        await laboratoryApi.createInsuranceAnalysisPrice(id, {
          laboratory_analysis_id: analysisId,
          insurance_price: price,
        })
        toastApiSuccess('Precio del seguro guardado')
        await loadPrices()
      } catch (err) {
        toastApiError(err)
      } finally {
        setSavingRowId(null)
      }
    },
    [id, loadPrices],
  )

  const handleSaveBulk = async () => {
    const toSave = rows.filter(hasInsuranceAnalysisPrice)
    if (toSave.length === 0) {
      toastApiError(new Error('No hay precios de seguro para guardar'))
      return
    }

    setSavingBulk(true)
    try {
      await laboratoryApi.bulkUpdateInsurancePrices(id, toSave)
      toastApiSuccess(`${toSave.length} precio(s) guardados`)
      await loadPrices()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSavingBulk(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        id: 'analysis',
        header: 'Análisis',
        cell: ({ row }) => insuranceAnalysisName(row.original),
      },
      {
        id: 'reference',
        header: 'Precio normal',
        cell: ({ row }) => {
          const ref = getReferenceDefaultPrice(row.original)
          return ref != null ? formatCurrency(ref) : '—'
        },
      },
      {
        id: 'insurance_price',
        header: 'Precio seguro',
        cell: ({ row }) => {
          const rowId = insuranceAnalysisRowId(row.original)
          const current = row.original.insurance_price
          return (
            <Input
              type="number"
              min="0"
              step="0.01"
              className="max-w-[8rem]"
              placeholder="Sin asignar"
              value={current == null || current === '' ? '' : String(current)}
              onChange={(e) => updateInsurancePrice(rowId, e.target.value)}
            />
          )
        },
      },
      {
        id: 'row_save',
        header: '',
        cell: ({ row }) => {
          const rowId = insuranceAnalysisRowId(row.original)
          const busy = String(savingRowId) === String(rowId)
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy || savingBulk}
              onClick={() => handleSaveRow(row.original)}
              title="Guardar precio del seguro"
            >
              <Save className="h-4 w-4" />
              {busy ? '…' : 'Guardar'}
            </Button>
          )
        },
      },
    ],
    [savingRowId, savingBulk, updateInsurancePrice, handleSaveRow],
  )

  if (loadingInsurance) return <LoadingScreen />

  const pageTitle = insurance?.name
    ? `Asignar precios — ${insurance.name}`
    : 'Asignar precios por seguro'

  return (
    <AnimatedPage>
      <PageHeader
        title={pageTitle}
        description="Define o actualiza el precio convenido de cada análisis para este seguro."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to={ROUTES.INSURANCES}>
                <ArrowLeft className="h-4 w-4" />
                Precios por seguro
              </Link>
            </Button>
            <Button onClick={handleSaveBulk} disabled={savingBulk || pricedCount === 0}>
              {savingBulk ? 'Guardando…' : `Guardar ${pricedCount} en lote`}
            </Button>
          </div>
        }
      />

      <Card className="mb-4 space-y-4 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Input
            label="Buscar análisis"
            placeholder="Ej.glucosa…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>

        <p className="text-sm text-muted">
          {loadingPrices
            ? 'Cargando…'
            : `${rows.length} análisis · ${pricedCount} con precio de seguro`}
        </p>
      </Card>

      <Card>
        {rows.length === 0 && !loadingPrices ? (
          <EmptyState
            title="Sin análisis"
            description={
              search
                ? `No hay resultados para "${search}".`
                : 'No hay análisis en el catálogo.'
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            enableSearch={false}
            emptyMessage="Sin resultados"
            onRefresh={loadPrices}
            isRefreshing={loadingPrices}
          />
        )}
      </Card>
    </AnimatedPage>
  )
}
