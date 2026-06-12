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
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME, ROUTES } from '@/utils/constants'

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Bienvenido')
      navigate(ROUTES.SELECT_ACCESS)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <LoginShell
      variant="staff"
      title={APP_NAME}
      description="Ingresa tus credenciales para acceder al laboratorio."
      footerText="¿Eres paciente?"
      footerLinkText="Portal de resultados"
      footerTo={ROUTES.PATIENT_LOGIN}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={fieldMotion}>
          <Input
            label="Correo o usuario"
            type="text"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com o usuario"
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
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={loginInputClass}
            labelClassName={loginLabelClass}
          />
        </motion.div>
        <motion.div variants={fieldMotion}>
          <Button type="submit" className={loginButtonClass} disabled={isLoading}>
            {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </motion.div>
      </form>
    </LoginShell>
  )
}
