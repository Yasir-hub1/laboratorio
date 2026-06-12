import { createContext, useCallback, useMemo, useReducer } from 'react'

const initialState = {
  isLoading: false,
  user: null,
  theme: 'light',
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_THEME':
      return { ...state, theme: action.payload }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- context + provider en un solo módulo base
export const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const setLoading = useCallback((value) => {
    dispatch({ type: 'SET_LOADING', payload: value })
  }, [])

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user })
  }, [])

  const setTheme = useCallback((theme) => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      setLoading,
      setUser,
      setTheme,
      reset,
    }),
    [state, setLoading, setUser, setTheme, reset],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
