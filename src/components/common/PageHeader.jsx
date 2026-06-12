import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { fadeUp } from '@/utils/motion'

export function PageHeader({ title, description, actions, phase, className }) {
  return (
    <motion.header
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={cn(
        'glass-card mb-6 flex flex-col gap-4 p-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:p-5',
        className,
      )}
    >
      <div className="relative min-w-0 space-y-1.5">
        {phase && (
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05, duration: 0.25 }}
            className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/15 backdrop-blur-sm"
          >
            {phase}
          </motion.span>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-[1.65rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="relative flex shrink-0 flex-wrap items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </motion.header>
  )
}
