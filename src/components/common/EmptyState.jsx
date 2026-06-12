import { motion } from 'motion/react'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui'
import { scaleIn } from '@/utils/motion'

export function EmptyState({ title = 'Sin registros', description, actionLabel, onAction }) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface py-16 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 22 }}
      >
        <Inbox className="mb-3 h-10 w-10 text-muted/40" aria-hidden />
      </motion.div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm px-4 text-sm text-muted">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
