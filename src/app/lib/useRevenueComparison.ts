import { useCallback, useRef, useState } from 'react'
import { getRevenueComparison } from './api'
import { useAuth } from './auth'
import type { RevenueComparisonParams, RevenueComparisonResponse } from './types'

export function useRevenueComparison() {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout
  const [data, setData] = useState<RevenueComparisonResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (params: RevenueComparisonParams) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await getRevenueComparison(token, params))
    } catch (err: unknown) {
      const errorValue = err as { status?: number; message: string }
      if (errorValue.status === 401) logoutRef.current()
      else setError(errorValue.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  return { data, loading, error, fetch }
}
