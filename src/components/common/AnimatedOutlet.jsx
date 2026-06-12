import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { pageTransition } from '@/utils/motion'

export function AnimatedOutlet() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}
