import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { laboratoryApi } from '@/services/laboratoryApi'
import { storage } from '@/utils/storage'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

/** Solo sucursales/roles activos (status=1, state=1) */
export function filterActiveAccessItems(items = []) {
  return items.filter((item) => item.status === 1 && item.state === 1)
}

function resolveAccessFromResponse(selectedBranchId, selectedRoleId, branches, roles, apiUser) {
  const branch =
    branches.find((b) => b.id === selectedBranchId) ??
    apiUser?.active_branch ??
    null
  const role =
    roles.find((r) => r.id === selectedRoleId) ?? apiUser?.active_role ?? null

  const branchId = apiUser?.active_branch?.id ?? branch?.id ?? selectedBranchId
  const roleId = apiUser?.active_role?.id ?? role?.id ?? selectedRoleId
  const branchName = apiUser?.active_branch?.name ?? branch?.name ?? ''
  const roleName = apiUser?.active_role?.name ?? role?.name ?? ''

  return { branchId, roleId, branchName, roleName }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => storage.getUser())
  const [access, setAccess] = useState(() => storage.getAccess())
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const [branchId, setBranchId] = useState(() => storage.getBranchId() ?? '')
  const [roleId, setRoleId] = useState(() => storage.getRoleId() ?? '')
  const [branchName, setBranchName] = useState(() => storage.getBranchName() ?? '')
  const [roleName, setRoleName] = useState(() => storage.getRoleName() ?? '')
  const [cashId, setCashId] = useState(() => storage.getCashId() ?? '')
  const [cashName, setCashName] = useState(() => storage.getCashName() ?? '')

  const isAuthenticated = Boolean(storage.getToken())
  const hasSelectedAccess = Boolean(branchId && roleId)
  const hasSelectedCash = Boolean(cashId && storage.hasCashContext())

  useEffect(() => {
    setSessionReady(true)
  }, [])

  const applyAccessContext = useCallback(
    (ctx, apiUser, perms = []) => {
      storage.setAccessContext({
        branchId: ctx.branchId,
        roleId: ctx.roleId,
        branchName: ctx.branchName,
        roleName: ctx.roleName,
      })

      if (apiUser) {
        storage.setUser(apiUser)
        setUser(apiUser)
      }

      setBranchId(ctx.branchId)
      setRoleId(ctx.roleId)
      setBranchName(ctx.branchName)
      setRoleName(ctx.roleName)
      setPermissions(perms)
    },
    [],
  )

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true)
      try {
        const data = await laboratoryApi.login({ email, password })
        storage.setToken(data.token)
        storage.setUser(data.user)
        setUser(data.user)

        if (data.access) {
          const normalized = {
            branches: filterActiveAccessItems(data.access.branches ?? []),
            roles: filterActiveAccessItems(data.access.roles ?? []),
          }
          storage.setAccess(normalized)
          setAccess(normalized)
        }

        return data
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const selectAccess = useCallback(
    async (selectedBranchId, selectedRoleId) => {
      if (!selectedBranchId || !selectedRoleId) {
        throw new Error('Debes seleccionar sucursal y rol')
      }

      setIsLoading(true)
      try {
        const accessData = storage.getAccess() ?? (await laboratoryApi.getAccessData())
        const branches = filterActiveAccessItems(accessData?.branches ?? [])
        const roles = filterActiveAccessItems(accessData?.roles ?? [])

        const branchValid = branches.some((b) => b.id === selectedBranchId)
        const roleValid = roles.some((r) => r.id === selectedRoleId)

        if (!branchValid) throw new Error('Sucursal no válida o inactiva')
        if (!roleValid) throw new Error('Rol no válido o inactivo')

        storage.clearCashContext()
        setCashId('')
        setCashName('')

        const response = await laboratoryApi.selectAccess({
          branch_id: selectedBranchId,
          role_id: selectedRoleId,
        })

        const ctx = resolveAccessFromResponse(
          selectedBranchId,
          selectedRoleId,
          branches,
          roles,
          response?.user,
        )

        applyAccessContext(ctx, response?.user ?? user, response?.permissions ?? [])

        if (!storage.hasAccessContext()) {
          throw new Error('No se pudo guardar el contexto de acceso')
        }

        return response
      } finally {
        setIsLoading(false)
      }
    },
    [applyAccessContext, user],
  )

  const refreshAccessData = useCallback(async () => {
    const data = await laboratoryApi.getAccessData()
    const normalized = {
      branches: filterActiveAccessItems(data?.branches ?? []),
      roles: filterActiveAccessItems(data?.roles ?? []),
    }
    storage.setAccess(normalized)
    setAccess(normalized)
    return normalized
  }, [])

  const logout = useCallback(async () => {
    try {
      if (storage.getToken()) await laboratoryApi.logout()
    } catch {
      /* ignore */
    }
    storage.clearStaffSession()
    setUser(null)
    setAccess(null)
    setPermissions([])
    setBranchId('')
    setRoleId('')
    setBranchName('')
    setRoleName('')
    setCashId('')
    setCashName('')
  }, [])

  const setCashContext = useCallback(({ cashId: nextCashId, cashName: nextCashName }) => {
    if (!nextCashId) return
    storage.setCashContext({
      cashId: nextCashId,
      cashName: nextCashName ?? '',
    })
    setCashId(String(nextCashId))
    setCashName(nextCashName ?? '')
  }, [])

  const clearCashContext = useCallback(() => {
    storage.clearCashContext()
    setCashId('')
    setCashName('')
  }, [])

  /** Volver a elegir sucursal/rol (p. ej. desde selección de caja). */
  const resetSessionAccess = useCallback(() => {
    storage.clearAccessContext()
    setBranchId('')
    setRoleId('')
    setBranchName('')
    setRoleName('')
    setCashId('')
    setCashName('')
    setPermissions([])
  }, [])

  const setOpeningCash = useCallback((id) => {
    storage.setOpeningCashId(id ?? '')
  }, [])

  const value = useMemo(
    () => ({
      user,
      access,
      permissions,
      isLoading,
      sessionReady,
      isAuthenticated,
      hasSelectedAccess,
      hasSelectedCash,
      branchId,
      roleId,
      branchName,
      roleName,
      cashId,
      cashName,
      login,
      selectAccess,
      refreshAccessData,
      logout,
      setCashContext,
      clearCashContext,
      resetSessionAccess,
      setOpeningCash,
      openingCashId: storage.getOpeningCashId(),
    }),
    [
      user,
      access,
      permissions,
      isLoading,
      sessionReady,
      isAuthenticated,
      hasSelectedAccess,
      hasSelectedCash,
      branchId,
      roleId,
      branchName,
      roleName,
      cashId,
      cashName,
      login,
      selectAccess,
      refreshAccessData,
      logout,
      setCashContext,
      clearCashContext,
      resetSessionAccess,
      setOpeningCash,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
