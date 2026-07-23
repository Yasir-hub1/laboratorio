import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Building2, CheckCircle2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import {
  LoginShell,
  loginButtonClass,
  loginInputClass,
  loginLabelClass,
} from '@/components/auth/LoginShell'
import { Button, Select } from '@/components/ui'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { filterActiveAccessItems } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { storage } from '@/utils/storage'
import { ROUTES } from '@/utils/constants'
import { cn } from '@/utils/cn'

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export function SelectAccessPage() {
  const { selectAccess, refreshAccessData, isLoading, hasSelectedAccess } = useAuth()
  const navigate = useNavigate()

  const [branches, setBranches] = useState([])
  const [roles, setRoles] = useState([])
  const [branchId, setBranchId] = useState(() => storage.getBranchId() ?? '')
  const [roleId, setRoleId] = useState(() => storage.getRoleId() ?? '')
  const [loadingData, setLoadingData] = useState(true)

  const loadAccessOptions = useCallback(async () => {
    setLoadingData(true)
    try {
      const cached = storage.getAccess()
      const data = cached?.branches?.length ? cached : await refreshAccessData()

      const activeBranches = filterActiveAccessItems(data?.branches ?? [])
      const activeRoles = filterActiveAccessItems(data?.roles ?? [])

      setBranches(activeBranches)
      setRoles(activeRoles)

      const savedBranch = storage.getBranchId()
      const savedRole = storage.getRoleId()

      if (savedBranch && activeBranches.some((b) => b.id === savedBranch)) {
        setBranchId(savedBranch)
      } else if (activeBranches.length === 1) {
        setBranchId(activeBranches[0].id)
      }

      if (savedRole && activeRoles.some((r) => r.id === savedRole)) {
        setRoleId(savedRole)
      } else if (activeRoles.length === 1) {
        setRoleId(activeRoles[0].id)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoadingData(false)
    }
  }, [refreshAccessData])

  useEffect(() => {
    if (!storage.getToken()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    if (hasSelectedAccess && storage.hasAccessContext()) {
      navigate(ROUTES.DASHBOARD, { replace: true })
      return
    }
    loadAccessOptions()
  }, [hasSelectedAccess, loadAccessOptions, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!branchId?.trim() || !roleId?.trim()) {
      toast.error('Selecciona sucursal y rol')
      return
    }

    try {
      await selectAccess(branchId.trim(), roleId.trim())

      if (!storage.hasAccessContext()) {
        toast.error('Error al guardar la sesión. Intenta de nuevo.')
        return
      }

      const branchLabel = branches.find((b) => b.id === branchId)?.name ?? 'Sucursal'
      const roleLabel = roles.find((r) => r.id === roleId)?.name ?? 'Rol'

      toast.success(`Acceso: ${branchLabel} · ${roleLabel}`)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      toast.error(err.message)
    }
  }

  const selectedBranch = branches.find((b) => b.id === branchId)
  const selectedRole = roles.find((r) => r.id === roleId)

  return (
    <LoginShell
      variant="access"
      title="Seleccionar acceso"
      description="Elige la sucursal y el rol con los que trabajarás en esta sesión."
    >
      {loadingData ? (
        <LoadingScreen message="Cargando sucursales y roles..." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div variants={fieldMotion}>
            <Select
              label="Sucursal"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
              className={loginInputClass}
              labelClassName={loginLabelClass}
            >
              <option value="">Seleccionar sucursal...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </motion.div>

          <motion.div variants={fieldMotion}>
            <Select
              label="Rol"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              required
              className={loginInputClass}
              labelClassName={loginLabelClass}
            >
              <option value="">Seleccionar rol...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </motion.div>

          {selectedBranch && selectedRole && (
            <motion.div
              variants={fieldMotion}
              className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-sm text-emerald-800 backdrop-blur-sm"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Listo para continuar</p>
                <p className="text-xs opacity-90">
                  {selectedBranch.name} · {selectedRole.name}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            variants={fieldMotion}
            className={cn(
              'flex gap-2 rounded-xl border border-primary/10 bg-primary-soft/80 p-3 text-xs text-primary backdrop-blur-sm',
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {branches.length} sucursales · {roles.length} roles disponibles
            </span>
          </motion.div>

          <motion.div variants={fieldMotion}>
            <Button
              type="submit"
              className={loginButtonClass}
              disabled={isLoading || !branchId || !roleId}
            >
              <Shield className="h-4 w-4" aria-hidden />
              {isLoading ? 'Validando acceso...' : 'Entrar al sistema'}
            </Button>
          </motion.div>
        </form>
      )}
    </LoginShell>
  )
}
