/** Variantes y transiciones compartidas — Motion (motion/react) */

export const EASE_OUT = [0.22, 1, 0.36, 1]

export const springSnappy = { type: 'spring', stiffness: 400, damping: 28 }

export const springSoft = { type: 'spring', stiffness: 320, damping: 30 }

export const tweenFast = { duration: 0.2, ease: EASE_OUT }

export const tweenBase = { duration: 0.35, ease: EASE_OUT }

export const pageTransition = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
}

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
}

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
}

export const slideFromBottom = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSoft,
  },
  exit: {
    opacity: 0,
    y: 16,
    transition: tweenFast,
  },
}

/** Panel inferior tipo sheet (menú Más) */
export const sheetSlide = {
  hidden: { opacity: 0, y: '100%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: springSoft,
  },
  exit: {
    opacity: 0,
    y: '100%',
    transition: tweenFast,
  },
}

export const slideFromLeft = {
  hidden: { opacity: 0, x: -24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: tweenFast,
  },
}

export const overlayFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
}

export const hoverLift = {
  y: -2,
  transition: tweenFast,
}

export const tapScale = {
  scale: 0.98,
  transition: springSnappy,
}
