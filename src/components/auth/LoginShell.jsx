import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Activity, FlaskConical, ShieldCheck, TestTube2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { EASE_OUT } from '@/utils/motion'
import { APP_NAME } from '@/utils/constants'

const fadeUpStagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: EASE_OUT },
  }),
}

const staffHighlights = [
  { icon: ShieldCheck, text: 'Acceso seguro' },
  { icon: TestTube2, text: 'Gestión clínica y laboratorio' },
  { icon: Activity, text: 'Flujo operativo en tiempo real' },
]

const accessHighlights = [
  { icon: ShieldCheck, text: 'Roles y permisos por sucursal' },
  { icon: TestTube2, text: 'Contexto guardado en tu sesión' },
  { icon: Activity, text: 'Listo para el panel operativo' },
]

const portalHighlights = [
  { icon: TestTube2, text: 'Consulta de órdenes y estudios' },
  { icon: ShieldCheck, text: 'Datos protegidos del paciente' },
  { icon: Activity, text: 'Resultados cuando estén disponibles' },
]

const insuranceHighlights = [
  { icon: ShieldCheck, text: 'Órdenes de afiliados con tu seguro' },
  { icon: TestTube2, text: 'Resultados y estudios en lectura' },
  { icon: Activity, text: 'Exportación de informes en PDF' },
]

export function LoginShell({
  variant = 'staff',
  title,
  description,
  children,
  footerText,
  footerLinkText,
  footerTo,
  panelTitle,
  panelDescription,
  panelBadge,
  highlights: highlightsProp,
}) {
  const isPortal = variant === 'portal'
  const isInsurance = variant === 'insurance'
  const isAccess = variant === 'access'
  const highlights =
    highlightsProp ??
    (isPortal
      ? portalHighlights
      : isInsurance
        ? insuranceHighlights
        : isAccess
          ? accessHighlights
          : staffHighlights)
  const heroTitle =
    panelTitle ??
    (isPortal
      ? 'Tus resultados, cuando los necesites'
      : isInsurance
        ? 'Gestión de afiliados, simplificada'
        : isAccess
          ? 'Configura tu sesión de trabajo'
          : 'Laboratorio clínico, bajo control')
  const heroDescription =
    panelDescription ??
    (isPortal
      ? 'Ingresa con el correo registrado para revisar órdenes y resultados de forma segura.'
      : isInsurance
        ? 'Consulta órdenes completadas asociadas a tu aseguradora y descarga resultados en PDF.'
        : isAccess
          ? 'Elige sucursal y rol. Esta selección se envía en cada petición y define tu alcance en el sistema.'
          : 'Plataforma integral para operaciones, análisis y seguimiento del laboratorio.')
  const badgeLabel =
    panelBadge ??
    (isPortal
      ? 'Portal de pacientes'
      : isInsurance
        ? 'Portal de seguros'
        : isAccess
          ? 'Paso 2 · Acceso'
          : 'Acceso personal')
  const showFooter = Boolean(footerText && footerLinkText && footerTo)

  const accent = isPortal
    ? {
        badge: 'bg-[#22C55E]/90 text-white shadow-[0_8px_32px_-8px_rgba(34,197,94,0.45)] backdrop-blur-sm',
        orb1: 'bg-[#22C55E]/35',
        orb2: 'bg-[#4ADE80]/25',
        orb3: 'bg-[#2563EB]/15',
        glassBorder: 'border-[#22C55E]/15',
        panelGradient: 'from-[#14532d] via-[#166534] to-[#0f172a]',
        panelGlow1: 'bg-emerald-400/25',
        panelGlow2: 'bg-teal-300/15',
        panelRing: 'border-emerald-400/20',
        highlight: 'bg-white/10 text-emerald-200 ring-1 ring-white/10',
        link: 'text-[#2563EB] hover:text-[#1D4ED8]',
      }
    : isInsurance
      ? {
          badge: 'bg-violet-600/90 text-white shadow-[0_8px_32px_-8px_rgba(124,58,237,0.45)] backdrop-blur-sm',
          orb1: 'bg-violet-500/35',
          orb2: 'bg-purple-400/25',
          orb3: 'bg-[#2563EB]/12',
          glassBorder: 'border-violet-500/15',
          panelGradient: 'from-[#3b0764] via-[#5b21b6] to-[#0f172a]',
          panelGlow1: 'bg-violet-400/25',
          panelGlow2: 'bg-purple-300/15',
          panelRing: 'border-violet-400/20',
          highlight: 'bg-white/10 text-violet-200 ring-1 ring-white/10',
          link: 'text-violet-600 hover:text-violet-700',
        }
      : {
        badge: 'bg-[#2563EB]/90 text-white shadow-[0_8px_32px_-8px_rgba(37,99,235,0.45)] backdrop-blur-sm',
        orb1: 'bg-[#2563EB]/40',
        orb2: 'bg-[#60A5FA]/30',
        orb3: 'bg-[#22C55E]/12',
        glassBorder: 'border-[#2563EB]/12',
        panelGradient: 'from-[#0f172a] via-[#1e3a8a] to-[#0f172a]',
        panelGlow1: 'bg-blue-500/30',
        panelGlow2: 'bg-sky-400/20',
        panelRing: 'border-blue-400/25',
        highlight: 'bg-white/10 text-blue-200 ring-1 ring-white/10',
        link: 'text-[#22C55E] hover:text-[#16A34A]',
      }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-dvh flex-col overflow-hidden lg:flex-row"
    >
      {/* Base — gradiente suave, no plano */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F8FAFC] via-[#EFF6FF]/80 to-[#F1F5F9]"
        aria-hidden
      />

      {/* Orbes difuminados — capas translúcidas */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className={cn('absolute -left-[10%] top-[-15%] h-[28rem] w-[28rem] rounded-full blur-[100px]', accent.orb1)}
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={cn('absolute right-[-5%] top-[20%] h-80 w-80 rounded-full blur-[90px]', accent.orb2)}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={cn('absolute bottom-[-10%] left-[25%] h-96 w-96 rounded-full blur-[110px]', accent.orb3)}
          animate={{ x: [0, 25, 0], y: [0, -35, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.5),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.06),transparent_55%)]" />
      </div>

      {/* Panel izquierdo — móvil: marca sobre fondo claro; desktop: gradiente con profundidad */}
      <aside
        className={cn(
          'relative z-10 flex shrink-0 flex-col px-6 py-6 sm:px-10 sm:py-8',
          'lg:min-h-dvh lg:w-[min(44%,520px)] lg:overflow-hidden lg:p-0',
        )}
      >
        {/* Móvil / tablet: sin bloque oscuro */}
        <div className="relative lg:hidden">
          <motion.div
            variants={fadeUpStagger}
            initial="hidden"
            animate="visible"
            custom={0}
            className="flex items-center gap-3"
          >
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent.badge)}>
              <FlaskConical className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                {badgeLabel}
              </p>
              <p className="text-lg font-semibold tracking-tight text-[#0F172A]">{APP_NAME}</p>
            </div>
          </motion.div>
          <motion.p
            variants={fadeUpStagger}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-4 text-sm leading-relaxed text-[#64748B] sm:hidden"
          >
            {isAccess
              ? 'Selecciona sucursal y rol para continuar.'
              : isPortal
                ? 'Consulta tus órdenes y resultados de forma segura.'
                : 'Gestión integral de tu laboratorio clínico.'}
          </motion.p>
        </div>

        {/* Desktop: panel con gradiente, malla y anillos decorativos */}
        <div className="relative hidden min-h-dvh w-full flex-col justify-between px-12 py-12 lg:flex">
          <div
            className={cn(
              'pointer-events-none absolute inset-0 bg-gradient-to-br',
              accent.panelGradient,
            )}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
            aria-hidden
          />
          <motion.div
            className={cn('pointer-events-none absolute -right-16 top-[8%] h-72 w-72 rounded-full blur-3xl', accent.panelGlow1)}
            animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <motion.div
            className={cn('pointer-events-none absolute -left-12 bottom-[12%] h-64 w-64 rounded-full blur-3xl', accent.panelGlow2)}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <div
            className={cn(
              'pointer-events-none absolute right-[12%] top-[18%] h-44 w-44 rounded-full border',
              accent.panelRing,
            )}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-[22%] left-[8%] h-28 w-28 rounded-full border border-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
            aria-hidden
          />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="relative"
          >
            <motion.div variants={fadeUpStagger} custom={0} className="flex items-center gap-3">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent.badge)}>
                <FlaskConical className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-200/80">
                  {badgeLabel}
                </p>
                <p className="text-lg font-semibold tracking-tight text-white">{APP_NAME}</p>
              </div>
            </motion.div>

            <motion.p
              variants={fadeUpStagger}
              custom={1}
              className="mt-8 text-[1.65rem] font-semibold leading-snug tracking-tight text-white"
            >
              {heroTitle}
            </motion.p>

            <motion.p
              variants={fadeUpStagger}
              custom={2}
              className="mt-3 max-w-sm text-sm leading-relaxed text-blue-100/75"
            >
              {heroDescription}
            </motion.p>

            <ul className="mt-10 space-y-3">
              {highlights.map((highlight, i) => {
                const HighlightIcon = highlight.icon
                return (
                  <motion.li
                    key={highlight.text}
                    variants={fadeUpStagger}
                    custom={3 + i}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-3 py-3 text-sm text-slate-200 ring-1 ring-white/10 backdrop-blur-[2px]"
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        accent.highlight,
                      )}
                    >
                      <HighlightIcon className="h-4 w-4" aria-hidden />
                    </span>
                    {highlight.text}
                  </motion.li>
                )
              })}
            </ul>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative text-xs text-slate-400"
          >
            © {new Date().getFullYear()} {APP_NAME}
          </motion.p>
        </div>
      </aside>

      {/* Formulario — glass claro */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5, ease: EASE_OUT }}
          className="w-full max-w-[420px]"
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border p-6 sm:p-8',
              'border-white/60 bg-white/45 shadow-[0_8px_40px_-12px_rgba(37,99,235,0.18)]',
              'backdrop-blur-2xl backdrop-saturate-150',
              accent.glassBorder,
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-white/20 to-transparent"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 text-center sm:text-left">
                <div
                  className={cn(
                    'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl sm:mx-0',
                    accent.badge,
                  )}
                >
                  <FlaskConical className="h-6 w-6" aria-hidden />
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-[#0F172A] sm:text-2xl">
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{description}</p>
                )}
              </div>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
              >
                {children}
              </motion.div>

              {showFooter && (
                <p className="mt-6 text-center text-xs text-[#64748B] sm:text-left">
                  {footerText}{' '}
                  <Link
                    to={footerTo}
                    className={cn('font-medium transition-colors hover:underline', accent.link)}
                  >
                    {footerLinkText}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </motion.div>
  )
}

export const loginInputClass = cn(
  'border-white/50 bg-white/40 text-[#0F172A] placeholder:text-[#94A3B8]',
  'backdrop-blur-md backdrop-saturate-150',
  'focus-visible:border-[#2563EB]/50 focus-visible:bg-white/55 focus-visible:ring-[#2563EB]/20',
)

export const loginButtonClass =
  'h-11 w-full rounded-lg bg-[#2563EB]/95 text-white shadow-[0_4px_20px_-4px_rgba(37,99,235,0.4)] backdrop-blur-sm transition-all hover:bg-[#1D4ED8] hover:shadow-[0_8px_28px_-6px_rgba(29,78,216,0.45)] focus-visible:ring-[#2563EB]/40 active:scale-[0.99]'

export const loginLabelClass = 'text-[#0F172A]'
