import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { laboratoryApi } from '@/services/laboratoryApi'
import { useIndexQuery } from '@/hooks/useIndexQuery'
import { PageHeader } from '@/components/common/PageHeader'
import { AnimatedPage } from '@/components/common/AnimatedPage'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { Button, Card, DataTable } from '@/components/ui'
import { ROUTES } from '@/utils/constants'
import { formatCurrency } from '@/utils/apiHelpers'
import { getCatalogDefaultPrice, insuranceAnalysisName } from '@/utils/insurancePrices'

export function InsuranceCatalogPricesPage() {
  const index = useIndexQuery(laboratoryApi.getLaboratoryAnalyses)

  useEffect(() => {
    if (index.error) toast.error(index.error)
  }, [index.error])

  const columns = useMemo(
    () => [
      {
        id: 'analysis',
        header: 'Análisis',
        cell: ({ row }) => insuranceAnalysisName(row.original),
      },
      {
        id: 'price',
        header: 'Precio normal',
        cell: ({ row }) => {
          const price = getCatalogDefaultPrice(row.original)
          return price != null ? formatCurrency(price) : '—'
        },
      },
    ],
    [],
  )

  if (index.loading && index.items.length === 0) return <LoadingScreen />

  return (
    <AnimatedPage>
      <PageHeader
        // phase="Fase 2"
        title="Precios sin seguro"
        description="Catálogo de análisis con precio normal (particular). Equivale a la opción «Sin seguro» en órdenes."
        actions={
          <Button variant="secondary" asChild>
            <Link to={ROUTES.INSURANCES}>
              <ArrowLeft className="h-4 w-4" />
              Precios por seguro
            </Link>
          </Button>
        }
      />

      <Card>
        {index.isEmpty ? (
          <EmptyState
            title="Sin análisis"
            description="No hay análisis en el catálogo de laboratorio."
          />
        ) : (
          <DataTable
            columns={columns}
            data={index.items}
            serverPagination={index.serverPagination}
            searchPlaceholder="Buscar análisis…"
          />
        )}
      </Card>
    </AnimatedPage>
  )
}
