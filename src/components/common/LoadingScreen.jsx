import { motion } from 'motion/react'
import { Spinner } from '@/components/ui'
import { fadeUp } from '@/utils/motion'

export function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3"
    >
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Spinner size="lg" />
      </motion.div>
      <p className="text-sm text-muted">{message}</p>
    </motion.div>
  )
}
