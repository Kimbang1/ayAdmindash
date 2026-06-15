import { useState, useEffect, useCallback, useRef } from 'react'
import type { Application } from './types'
import { getApplications } from './api'
import { useAuth } from './auth'

interface UseApplicationsResult {
  applications: Application[]
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

export function useApplications(courseId?: number): UseApplicationsResult {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const hasLoadedRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    if (hasLoadedRef.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await getApplications(token, courseId)
      setApplications(res.applications)
      setLastUpdated(new Date())
    } catch (err: unknown) {
      const e = err as { status?: number; message: string }
      if (e.status === 401) logoutRef.current()
      else setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
      hasLoadedRef.current = true
    }
  }, [token, courseId])

  useEffect(() => { loadData() }, [loadData])

  return { applications, loading, refreshing, error, lastUpdated, refresh: loadData }
}
