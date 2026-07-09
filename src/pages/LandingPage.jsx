import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  Building2,
  FlaskConical,
  Shield,
  TestTube2,
  UserCircle,
} from 'lucide-react'
import { AppBackground } from '@/components/layout/AppBackground'
import { APP_DESCRIPTION, APP_NAME, ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'
import { EASE_OUT } from '@/utils/motion'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: EASE_OUT },
  }),
}

const portals = [
  {
    id: 'patient',
    title: 'Soy paciente',
    description: 'Consulta tus órdenes completadas, revisa resultados y descarga el PDF desde cualquier dispositivo.',
    icon: UserCircle,
    to: ROUTES.PATIENT_LOGIN,
    cta: 'Acceder como paciente',
    accent: 'from-emerald-500/15 to-emerald-600/5',
    iconBg: 'bg-emerald-500/15 text-emerald-600 ring-emerald-500/20',
    hoverBorder: 'hover:border-emerald-400/40',
  },
  {
    id: 'staff',
    title: 'Personal del laboratorio',
    description: 'Panel operativo para recepción, análisis, caja, transacciones y administración del laboratorio.',
    icon: FlaskConical,
    to: ROUTES.LOGIN,
    cta: 'Acceder al panel',
    accent: 'from-primary/15 to-primary/5',
    iconBg: 'bg-primary/15 text-primary ring-primary/20',
    hoverBorder: 'hover:border-primary/40',
  },
  {
    id: 'insurance',
    title: 'Aseguradora',
    description: 'Consulta órdenes asociadas a tu seguro, resultados de afiliados y exportación de informes en PDF.',
    icon: Shield,
    to: ROUTES.INSURANCE_LOGIN,
    cta: 'Acceder como seguro',
    accent: 'from-violet-500/15 to-violet-600/5',
    iconBg: 'bg-violet-500/15 text-violet-600 ring-violet-500/20',
    hoverBorder: 'hover:border-violet-400/40',
  },
]

const features = [
  { icon: TestTube2, label: 'Resultados en línea' },
  { icon: Building2, label: 'Multi-sucursal' },
  { icon: Shield, label: 'Acceso seguro' },
]

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppBackground />

      <header className="relative z-10 border-b border-white/50 bg-white/35 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/90 text-primary-foreground shadow-soft">
              <FlaskConical className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">{APP_NAME}</p>
              <p className="text-[11px] text-muted">Laboratorio clínico</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <motion.section
          initial="hidden"
          animate="visible"
          className="mb-12 text-center sm:mb-16"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/15"
          >
            Plataforma integral
          </motion.p>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Bienvenido a {APP_NAME}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          >
            {APP_DESCRIPTION}. Elige cómo deseas ingresar según tu perfil.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {features.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-md"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          animate="visible"
          className="grid gap-5 md:grid-cols-3"
        >
          {portals.map((portal, index) => (
            <motion.div key={portal.id} variants={fadeUp} custom={index + 4}>
              <Link
                to={portal.to}
                className={cn(
                  'glass-card group relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300',
                  'hover:-translate-y-1 hover:shadow-[0_16px_48px_-16px_rgba(37,99,235,0.2)]',
                  portal.hoverBorder,
                )}
              >
                <div
                  className={cn(
                    'mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ring-1',
                    portal.iconBg,
                  )}
                >
                  <portal.icon className="h-6 w-6" aria-hidden />
                </div>

                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100',
                    portal.accent,
                  )}
                  aria-hidden
                />

                <h2 className="relative text-lg font-semibold text-foreground">{portal.title}</h2>
                <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {portal.description}
                </p>

                <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
                  {portal.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.section>
      </main>

      <footer className="relative z-10 border-t border-white/50 bg-white/30 py-6 text-center text-xs text-muted backdrop-blur-md">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
