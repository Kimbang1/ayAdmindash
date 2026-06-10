import { useState, useEffect, useCallback, useRef } from 'react'
import type { Application } from './types'
import { getApplications } from './api'
import { useAuth } from './auth'

interface UseApplicationsResult {
  applications: Application[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useApplications(courseId?: number): UseApplicationsResult {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await getApplications(token, courseId)
      setApplications(res.applications)
    } catch (err: unknown) {
      const e = err as { status?: number; message: string }
      if (e.status === 401) logoutRef.current()
      else setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, courseId])

  useEffect(() => { loadData() }, [loadData])

  return { applications, loading, error, refresh: loadData }
}
