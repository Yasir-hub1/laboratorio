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
import { insurancePortalApi } from '@/services/insurancePortalApi'
import { storage } from '@/utils/storage'
import { APP_NAME, ROUTES } from '@/utils/constants'

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export function InsuranceLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await insurancePortalApi.login({
        username: username.trim(),
        password,
      })
      if (data?.token) storage.setInsuranceToken(data.token)
      if (data?.insurance) storage.setInsurance(data.insurance)
      toast.success('Bienvenido al portal de seguros')
      navigate(ROUTES.INSURANCE_PORTAL, { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginShell
      variant="insurance"
      title={`${APP_NAME} — Seguros`}
      description="Accede con el usuario asignado por el laboratorio para consultar órdenes de afiliados."
      footerText="¿Eres paciente o personal?"
      footerLinkText="Volver al inicio"
      footerTo={ROUTES.HOME}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={fieldMotion}>
          <Input
            label="Usuario"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="usuario@seguro.com"
            required
            autoComplete="username"
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
