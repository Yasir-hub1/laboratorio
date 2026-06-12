import { motion } from 'motion/react'
import { pageTransition } from '@/utils/motion'
import { cn } from '@/utils/cn'

export function PageTransition({ children, className }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('w-full', className)}
    >
      {children}
    </motion.div>
  )
}
