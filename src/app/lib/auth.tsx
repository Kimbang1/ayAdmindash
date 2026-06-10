import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { login as apiLogin, logout as apiLogout, refreshToken } from './api'

const SESSION_KEY = 'admin_jwt'
const IDLE_MS = 20 * 60 * 1000
const THROTTLE_MS = 60 * 1000

interface AuthContextValue {
  token: string | null
  login: (password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY))
  const lastRefreshRef = useRef(0)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToken = useCallback((t: string) => {
    sessionStorage.setItem(SESSION_KEY, t)
    setToken(t)
  }, [])

  const clearToken = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setToken(null)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
  }, [])

  const onActivity = useCallback(async () => {
    const now = Date.now()
    if (now - lastRefreshRef.current < THROTTLE_MS) return
    lastRefreshRef.current = now

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(clearToken, IDLE_MS)

    const jwt = sessionStorage.getItem(SESSION_KEY)
    if (!jwt) return
    try {
      const res = await refreshToken(jwt)
      saveToken(res.token)
    } catch {
      clearToken()
    }
  }, [clearToken, saveToken])

  useEffect(() => {
    if (!token) return
    const handler = () => { onActivity() }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
    onActivity()
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [token, onActivity])

  const login = useCallback(async (password: string) => {
    const res = await apiLogin(password)
    saveToken(res.token)
  }, [saveToken])

  const logout = useCallback(() => {
    const jwt = sessionStorage.getItem(SESSION_KEY)
    clearToken()
    if (jwt) apiLogout(jwt).catch(() => {})
  }, [clearToken])

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
