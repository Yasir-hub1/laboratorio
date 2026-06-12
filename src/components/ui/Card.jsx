import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { EASE_OUT, hoverLift } from '@/utils/motion'

export function Card({ className, children, interactive = true, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      whileHover={interactive ? hoverLift : undefined}
      className={cn(
        'glass-card relative overflow-hidden p-5 sm:p-6',
        interactive && 'transition-shadow hover:shadow-[0_12px_40px_-12px_rgba(37,99,235,0.18)]',
        className,
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('mb-4 space-y-1', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-base font-semibold tracking-tight text-foreground sm:text-lg', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm leading-relaxed text-muted', className)} {...props}>
      {children}
    </p>
  )
}
