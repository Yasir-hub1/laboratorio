import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Building2, CheckCircle2, Lock, Unlock, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import {
  LoginShell,
  loginButtonClass,
  loginInputClass,
  loginLabelClass,
} from '@/components/auth/LoginShell'
import { Button, Input, Select } from '@/components/ui'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'
import { laboratoryApi } from '@/services/laboratoryApi'
import { formatCurrency } from '@/utils/apiHelpers'
import {
  cashDisplayName,
  isUserAssignedToCash,
  parseCashOpeningStatus,
  resolveCashId,
  unwrapCashes,
} from '@/utils/cashHelpers'
import { resolveEntityId } from '@/utils/entityId'
import { storage } from '@/utils/storage'
import { ROUTES } from '@/utils/constants'
import { toastApiError, toastApiSuccess } from '@/utils/toastApi'
import { cn } from '@/utils/cn'

const fieldMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export function SelectCashPage() {
  const {
    setCashContext,
    setOpeningCash,
    resetSessionAccess,
    branchName,
    roleName,
    hasSelectedCash,
    isLoading: authLoading,
  } = useAuth()
  const navigate = useNavigate()

  const [cashes, setCashes] = useState([])
  const [cashId, setCashId] = useState(() => storage.getCashId() ?? '')
  const [openingAmount, setOpeningAmount] = useState('')
  const [cashStatus, setCashStatus] = useState(null)
  const [loadingCashes, setLoadingCashes] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadCashes = useCallback(async () => {
    const branchId = storage.getBranchId()
    if (!branchId) {
      toast.error('Selecciona sucursal y rol primero')
      navigate(ROUTES.SELECT_ACCESS, { replace: true })
      return
    }

    setLoadingCashes(true)
    try {
      const userId = resolveEntityId(storage.getUser())
      const myList = unwrapCashes(await laboratoryApi.getMyCashes())

      let selectable = myList.filter(
        (c) =>
          String(c.branch_id ?? c.branch?.id ?? '') === String(branchId) ||
          !c.branch_id,
      )

      if (selectable.length === 0) {
        const branchList = unwrapCashes(await laboratoryApi.getCashesByBranch(branchId))
        selectable = branchList.filter((c) => isUserAssignedToCash(c, userId))
        if (selectable.length === 0 && myList.length > 0) {
          selectable = myList
        }
        if (selectable.length === 0) {
          selectable = branchList
        }
      }

      setCashes(selectable)

      const saved = storage.getCashId()
      if (saved && selectable.some((c) => resolveCashId(c) === saved)) {
        setCashId(saved)
      } else if (selectable.length === 1) {
        setCashId(resolveCashId(selectable[0]) ?? '')
      }
    } catch (err) {
      toastApiError(err)
      setCashes([])
    } finally {
      setLoadingCashes(false)
    }
  }, [navigate])

  useEffect(() => {
    if (!storage.getToken()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    if (!storage.hasAccessContext()) {
      navigate(ROUTES.SELECT_ACCESS, { replace: true })
      return
    }
    if (hasSelectedCash && storage.hasCashContext() && storage.getOpeningCashId()) {
      navigate(ROUTES.DASHBOARD, { replace: true })
      return
    }
    loadCashes()
  }, [hasSelectedCash, loadCashes, navigate])

  useEffect(() => {
    if (!cashId) {
      setCashStatus(null)
      setOpeningAmount('')
      return undefined
    }

    let cancelled = false
    setLoadingStatus(true)

    laboratoryApi
      .getCashStatus(cashId)
      .then((raw) => {
        if (!cancelled) {
          const parsed = parseCashOpeningStatus(raw)
          setCashStatus(parsed)
          if (parsed.isOpen && parsed.openingId) {
            storage.setOpeningCashId(parsed.openingId)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastApiError(err)
          setCashStatus(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStatus(false)
      })

    return () => {
      cancelled = true
    }
  }, [cashId])

  const handleChangeBranch = () => {
    resetSessionAccess()
    navigate(ROUTES.SELECT_ACCESS, { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cashId?.trim()) {
      toast.error('Selecciona la caja con la que trabajarás')
      return
    }

    const cash = cashes.find((c) => resolveCashId(c) === cashId)
    const name = cashDisplayName(cash)

    setSubmitting(true)
    try {
      let status = cashStatus
      if (!status) {
        const raw = await laboratoryApi.getCashStatus(cashId)
        status = parseCashOpeningStatus(raw)
        setCashStatus(status)
      }

      if (!status.isOpen) {
        const amount = Number(openingAmount)
        if (!openingAmount || Number.isNaN(amount) || amount < 0) {
          toast.error('Ingresa el monto inicial para abrir la caja')
          setSubmitting(false)
          return
        }

        const result = await laboratoryApi.openCash({
          cash_id: cashId,
          initial_amount: amount,
        })

        const openingId = result?.id ?? result?.opening_cash_id ?? result?.data?.id
        if (openingId) {
          storage.setOpeningCashId(String(openingId))
          setOpeningCash(String(openingId))
        }
        toastApiSuccess('Caja abierta')
      } else if (status.openingId) {
        storage.setOpeningCashId(status.openingId)
        setOpeningCash(status.openingId)
      }

      setCashContext({ cashId: cashId.trim(), cashName: name })

      if (!storage.hasCashContext()) {
        toast.error('No se pudo guardar la caja en sesión')
        return
      }

      toast.success(`Sesión iniciada · ${name}`)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCash = cashes.find((c) => resolveCashId(c) === cashId)
  const isOpen = cashStatus?.isOpen === true
  const needsOpening = cashId && cashStatus && !isOpen && !loadingStatus

  return (
    <LoginShell
      variant="access"
      title="Caja y apertura"
      description={
        branchName
          ? `${branchName}${roleName ? ` · ${roleName}` : ''} — elige tu caja y verifica la apertura del turno.`
          : 'Elige la caja y confirma la apertura para operar.'
      }
    >
      {loadingCashes ? (
        <LoadingScreen message="Cargando tus cajas…" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <motion.div
            variants={fieldMotion}
            className="flex gap-2 rounded-xl border border-border/80 bg-surface/60 p-3 text-xs text-muted"
          >
            <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              Sucursal: <strong className="text-foreground">{branchName ?? '—'}</strong>
              {roleName ? ` · Rol: ${roleName}` : ''}
            </span>
          </motion.div>

          {cashes.length === 0 ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-900">
              No tienes cajas asignadas en esta sucursal. Un administrador debe crear la caja en
              Caja → Cajas y asignártela en Usuarios.
            </p>
          ) : (
            <>
              <motion.div variants={fieldMotion}>
                <Select
                  label="Caja"
                  value={cashId}
                  onChange={(e) => setCashId(e.target.value)}
                  required
                  className={loginInputClass}
                  labelClassName={loginLabelClass}
                >
                  <option value="">Seleccionar caja…</option>
                  {cashes.map((c) => {
                    const id = resolveCashId(c)
                    return (
                      <option key={id} value={id}>
                        {cashDisplayName(c)}
                      </option>
                    )
                  })}
                </Select>
              </motion.div>

              {cashId && loadingStatus && (
                <p className="text-center text-sm text-muted">Verificando apertura de caja…</p>
              )}

              {cashId && cashStatus && !loadingStatus && (
                <motion.div
                  variants={fieldMotion}
                  className={cn(
                    'rounded-xl border p-3 text-sm',
                    isOpen
                      ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900'
                      : 'border-amber-200/80 bg-amber-50/80 text-amber-900',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isOpen ? (
                      <Unlock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {isOpen ? 'Caja con apertura activa' : 'Caja sin apertura activa'}
                      </p>
                      {isOpen ? (
                        <p className="mt-1 text-xs opacity-90">
                          Puedes continuar al sistema.
                          {cashStatus.openingId
                            ? ` Apertura #${cashStatus.openingId}`
                            : ''}
                          {cashStatus.opening?.initial_amount != null &&
                            ` · Monto: ${formatCurrency(cashStatus.opening.initial_amount)}`}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs opacity-90">
                          Ingresa el monto inicial para abrir la caja antes de continuar.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {needsOpening && (
                <motion.div variants={fieldMotion}>
                  <Input
                    label="Monto inicial de apertura (Bs.)"
                    name="initial_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    className={loginInputClass}
                    labelClassName={loginLabelClass}
                    required
                    placeholder="0.00"
                  />
                </motion.div>
              )}

              {selectedCash && isOpen && (
                <motion.div
                  variants={fieldMotion}
                  className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-sm text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-medium">Listo para entrar</p>
                    <p className="text-xs opacity-90">{cashDisplayName(selectedCash)}</p>
                  </div>
                </motion.div>
              )}
            </>
          )}

          <motion.div variants={fieldMotion} className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleChangeBranch}
              disabled={submitting || authLoading}
            >
              Cambiar sucursal
            </Button>
            <Button
              type="submit"
              className={`flex-1 ${loginButtonClass}`}
              disabled={
                !cashId ||
                cashes.length === 0 ||
                loadingStatus ||
                submitting ||
                authLoading ||
                (needsOpening && !openingAmount)
              }
            >
              <Wallet className="h-4 w-4" aria-hidden />
              {submitting
                ? isOpen
                  ? 'Entrando…'
                  : 'Abriendo caja…'
                : isOpen
                  ? 'Continuar'
                  : 'Abrir caja y continuar'}
            </Button>
          </motion.div>
        </form>
      )}
    </LoginShell>
  )
}
