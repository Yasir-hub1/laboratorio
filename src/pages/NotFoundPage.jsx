import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import { PageTransition } from '@/components/common/PageTransition'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  return (
    <PageTransition className="flex flex-col items-center justify-center py-24 text-center">
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-6xl font-semibold text-foreground"
      >
        404
      </motion.p>
      <h1 className="mt-2 text-xl font-medium">Página no encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        La ruta que buscas no existe o fue movida.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </Button>
    </PageTransition>
  )
}
