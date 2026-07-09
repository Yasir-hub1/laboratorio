const KEYS = {
  TOKEN: 'biocontrol_token',
  BRANCH_ID: 'biocontrol_branch_id',
  ROLE_ID: 'biocontrol_role_id',
  BRANCH_NAME: 'biocontrol_branch_name',
  ROLE_NAME: 'biocontrol_role_name',
  OPENING_CASH_ID: 'biocontrol_opening_cash_id',
  CASH_ID: 'biocontrol_cash_id',
  CASH_NAME: 'biocontrol_cash_name',
  USER: 'biocontrol_user',
  ACCESS: 'biocontrol_access',
  PATIENT_TOKEN: 'biocontrol_patient_token',
  PATIENT: 'biocontrol_patient',
  INSURANCE_TOKEN: 'biocontrol_insurance_token',
  INSURANCE: 'biocontrol_insurance',
}

export const storage = {
  getToken: () => localStorage.getItem(KEYS.TOKEN),
  setToken: (v) => localStorage.setItem(KEYS.TOKEN, v ?? ''),

  getBranchId: () => localStorage.getItem(KEYS.BRANCH_ID) || null,
  getRoleId: () => localStorage.getItem(KEYS.ROLE_ID) || null,
  getBranchName: () => localStorage.getItem(KEYS.BRANCH_NAME) || null,
  getRoleName: () => localStorage.getItem(KEYS.ROLE_NAME) || null,

  setAccessContext: ({ branchId, roleId, branchName, roleName }) => {
    if (branchId != null) localStorage.setItem(KEYS.BRANCH_ID, String(branchId))
    if (roleId != null) localStorage.setItem(KEYS.ROLE_ID, String(roleId))
    if (branchName != null) localStorage.setItem(KEYS.BRANCH_NAME, String(branchName))
    if (roleName != null) localStorage.setItem(KEYS.ROLE_NAME, String(roleName))
  },

  clearAccessContext: () => {
    ;[
      KEYS.BRANCH_ID,
      KEYS.ROLE_ID,
      KEYS.BRANCH_NAME,
      KEYS.ROLE_NAME,
      KEYS.OPENING_CASH_ID,
      KEYS.CASH_ID,
      KEYS.CASH_NAME,
    ].forEach((k) => localStorage.removeItem(k))
  },

  hasAccessContext: () =>
    Boolean(localStorage.getItem(KEYS.BRANCH_ID) && localStorage.getItem(KEYS.ROLE_ID)),

  getCashId: () => localStorage.getItem(KEYS.CASH_ID) || null,
  getCashName: () => localStorage.getItem(KEYS.CASH_NAME) || null,

  setCashContext: ({ cashId, cashName }) => {
    if (cashId != null) localStorage.setItem(KEYS.CASH_ID, String(cashId))
    if (cashName != null) localStorage.setItem(KEYS.CASH_NAME, String(cashName))
  },

  clearCashContext: () => {
    localStorage.removeItem(KEYS.CASH_ID)
    localStorage.removeItem(KEYS.CASH_NAME)
    localStorage.removeItem(KEYS.OPENING_CASH_ID)
  },

  hasCashContext: () => Boolean(localStorage.getItem(KEYS.CASH_ID)),

  getOpeningCashId: () => localStorage.getItem(KEYS.OPENING_CASH_ID),
  setOpeningCashId: (v) => {
    if (v) localStorage.setItem(KEYS.OPENING_CASH_ID, String(v))
    else localStorage.removeItem(KEYS.OPENING_CASH_ID)
  },

  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USER) ?? 'null')
    } catch {
      return null
    }
  },
  setUser: (u) => {
    if (u) localStorage.setItem(KEYS.USER, JSON.stringify(u))
    else localStorage.removeItem(KEYS.USER)
  },

  getAccess: () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ACCESS) ?? 'null')
    } catch {
      return null
    }
  },
  setAccess: (a) => {
    if (a) localStorage.setItem(KEYS.ACCESS, JSON.stringify(a))
    else localStorage.removeItem(KEYS.ACCESS)
  },

  getPatientToken: () => localStorage.getItem(KEYS.PATIENT_TOKEN),
  setPatientToken: (v) => localStorage.setItem(KEYS.PATIENT_TOKEN, v ?? ''),
  getPatient: () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.PATIENT) ?? 'null')
    } catch {
      return null
    }
  },
  setPatient: (p) => localStorage.setItem(KEYS.PATIENT, JSON.stringify(p)),

  hasPatientSession: () => Boolean(localStorage.getItem(KEYS.PATIENT_TOKEN)),

  clearPatientSession: () => {
    localStorage.removeItem(KEYS.PATIENT_TOKEN)
    localStorage.removeItem(KEYS.PATIENT)
  },

  getInsuranceToken: () => localStorage.getItem(KEYS.INSURANCE_TOKEN),
  setInsuranceToken: (v) => localStorage.setItem(KEYS.INSURANCE_TOKEN, v ?? ''),
  getInsurance: () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.INSURANCE) ?? 'null')
    } catch {
      return null
    }
  },
  setInsurance: (i) => localStorage.setItem(KEYS.INSURANCE, JSON.stringify(i)),

  hasInsuranceSession: () => Boolean(localStorage.getItem(KEYS.INSURANCE_TOKEN)),

  clearInsuranceSession: () => {
    localStorage.removeItem(KEYS.INSURANCE_TOKEN)
    localStorage.removeItem(KEYS.INSURANCE)
  },

  clearSession: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
  },

  clearStaffSession: () => {
    ;[
      KEYS.TOKEN,
      KEYS.BRANCH_ID,
      KEYS.ROLE_ID,
      KEYS.BRANCH_NAME,
      KEYS.ROLE_NAME,
      KEYS.OPENING_CASH_ID,
      KEYS.CASH_ID,
      KEYS.CASH_NAME,
      KEYS.USER,
      KEYS.ACCESS,
    ].forEach((k) => localStorage.removeItem(k))
  },
}
