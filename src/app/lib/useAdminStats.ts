import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminStats } from './api'
import { useAuth } from './auth'
import type { AdminStats } from './types'

export function useAdminStats(month?: string) {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setStats(await getAdminStats(token, month))
    } catch (err: unknown) {
      const errorValue = err as { status?: number; message: string }
      if (errorValue.status === 401) logoutRef.current()
      else setError(errorValue.message)
    } finally {
      setLoading(false)
    }
  }, [token, month])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stats, loading, error, refresh }
}

