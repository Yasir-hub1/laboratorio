import { Slot } from '@radix-ui/react-slot'
import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { springSnappy, tapScale } from '@/utils/motion'

const variants = {
  primary:
    'bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-surface-muted',
  ghost: 'text-muted hover:bg-surface-muted hover:text-foreground',
  danger: 'bg-danger text-white hover:bg-danger/90',
  success:
    'bg-accent text-accent-foreground shadow-soft hover:bg-accent-hover',
}

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-11 px-6 text-base rounded-lg',
}

const baseClass =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  type,
  ...props
}) {
  const classes = cn(baseClass, variants[variant], sizes[size], className)

  if (asChild) {
    return <Slot className={classes} {...props} />
  }

  return (
    <motion.button
      type={type ?? 'button'}
      whileHover={{ scale: 1.02 }}
      whileTap={tapScale}
      transition={springSnappy}
      className={classes}
      {...props}
    />
  )
}
