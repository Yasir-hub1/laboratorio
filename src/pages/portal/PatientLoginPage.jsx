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
import { laboratoryApi } from '@/services/laboratoryApi'
import { storage } from '@/utils/storage'
import { APP_NAME, ROUTES } from '@/utils/constants'

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export function PatientLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await laboratoryApi.loginPatient({ email, password })
      const token = data?.token ?? data?.access_token
      const patient = data?.patient ?? data?.user ?? data
      if (token) storage.setPatientToken(token)
      if (patient) storage.setPatient(patient)
      toast.success('Bienvenido al portal')
      navigate(ROUTES.PATIENT_PORTAL)
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
      description="Accede con el correo registrado del paciente para ver órdenes y resultados."
      footerText="¿Personal del laboratorio?"
      footerLinkText="Iniciar sesión staff"
      footerTo={ROUTES.LOGIN}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={fieldMotion}>
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="paciente@ejemplo.com"
            required
            autoComplete="email"
            className={loginInputClass}
            labelClassName={loginLabelClass}
          />
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
