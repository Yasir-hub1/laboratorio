import { motion } from 'motion/react'
import { cn } from '@/utils/cn'

export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-[#EFF6FF]/85 to-[#F1F5F9]" />
      <motion.div
        className="absolute -left-[10%] top-[-12%] h-[26rem] w-[26rem] rounded-full bg-[#2563EB]/22 blur-[100px]"
        animate={{ x: [0, 36, 0], y: [0, 24, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8%] top-[18%] h-72 w-72 rounded-full bg-[#60A5FA]/20 blur-[90px]"
        animate={{ x: [0, -28, 0], y: [0, 16, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-8%] left-[20%] h-80 w-80 rounded-full bg-[#22C55E]/10 blur-[100px]"
        animate={{ x: [0, 20, 0], y: [0, -28, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.55),transparent_52%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.05),transparent_50%)]" />
    </div>
  )
}

/** Clases glass reutilizables en layout y páginas */
export const glass = {
  card: cn(
    'border-white/60 bg-white/50 shadow-[0_8px_32px_-12px_rgba(37,99,235,0.12)]',
    'backdrop-blur-2xl backdrop-saturate-150',
  ),
  header: cn(
    'border-white/50 bg-white/40 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.06)]',
    'backdrop-blur-xl backdrop-saturate-150',
  ),
  tabBar: cn(
    'border-white/50 bg-white/55 shadow-[0_-4px_24px_-8px_rgba(37,99,235,0.08)]',
    'backdrop-blur-2xl backdrop-saturate-150',
  ),
  sheet: cn(
    'border-white/60 bg-white/65 shadow-card',
    'backdrop-blur-2xl backdrop-saturate-150',
  ),
  chip: cn(
    'border-white/50 bg-white/40 backdrop-blur-md',
  ),
  listItem: cn(
    'border-white/40 bg-white/35 backdrop-blur-md',
  ),
}
