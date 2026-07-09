import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  LoginShell,
  loginButtonClass,
  loginInputClass,
  loginLabelClass,
} from '@/components/auth/LoginShell'
import { Button, Input } from '@/components/ui'
import { patientPortalApi } from '@/services/patientPortalApi'
import { storage } from '@/utils/storage'
import { APP_NAME, ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export function PatientLoginPage() {
  const navigate = useNavigate()
  const [loginMode, setLoginMode] = useState('ci')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const body = { password }
      if (loginMode === 'email') {
        body.email = identifier.trim()
      } else {
        body.ci = identifier.trim()
      }

      const data = await patientPortalApi.login(body)
      if (data?.token) storage.setPatientToken(data.token)
      if (data?.patient) storage.setPatient(data.patient)
      toast.success('Bienvenido al portal')
      navigate(ROUTES.PATIENT_PORTAL, { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginShell
      variant="portal"
      title={`${APP_NAME} — Portal`}
      description="Accede con tu carnet (CI) o correo registrado para consultar órdenes y resultados."
      footerText="¿No eres paciente?"
      footerLinkText="Volver al inicio"
      footerTo={ROUTES.HOME}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={fieldMotion}>
          <div className="mb-3 flex rounded-xl border border-border bg-surface-muted/50 p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode('ci')
                setIdentifier('')
              }}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                loginMode === 'ci'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground',
              )}
            >
              Carnet (CI)
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('email')
                setIdentifier('')
              }}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                loginMode === 'email'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground',
              )}
            >
              Correo
            </button>
          </div>

          {loginMode === 'email' ? (
            <Input
              label="Correo electrónico"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="paciente@ejemplo.com"
              required
              autoComplete="email"
              className={loginInputClass}
              labelClassName={loginLabelClass}
            />
          ) : (
            <Input
              label="Carnet de identidad (CI)"
              type="text"
              inputMode="numeric"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="1234567"
              required
              autoComplete="username"
              className={loginInputClass}
              labelClassName={loginLabelClass}
            />
          )}
        </motion.div>

        <motion.div variants={fieldMotion}>
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={loginInputClass}
            labelClassName={loginLabelClass}
          />
        </motion.div>

        <motion.div variants={fieldMotion}>
          <Button type="submit" className={loginButtonClass} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </motion.div>
      </form>
    </LoginShell>
  )
}
