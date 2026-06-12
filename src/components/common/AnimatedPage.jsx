import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { staggerContainer } from '@/utils/motion'

/** Envuelve contenido de página con stagger suave (opcional en vistas complejas). */
export function AnimatedPage({ children, className }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  )
}
