import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { fadeUp } from '@/utils/motion'

const variants = {
  info: 'border-primary/20 bg-primary-soft text-primary',
  success: 'border-accent/25 bg-accent-soft text-accent',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-800',
}

export function MotionAlert({ variant = 'info', icon: Icon, title, children, className }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      role="alert"
      className={cn(
        'mb-4 flex gap-2.5 rounded-xl border p-3 text-sm sm:p-4',
        variants[variant],
        className,
      )}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        <div className={cn('text-xs opacity-90', title && 'mt-0.5')}>{children}</div>
      </div>
    </motion.div>
  )
}
