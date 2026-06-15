import { useCallback, useEffect, useRef, useState } from 'react'
import { getAdminCourses } from './api'
import { useAuth } from './auth'
import type { CourseConfig } from './types'

export function useCourses() {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout
  const [courses, setCourses] = useState<CourseConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await getAdminCourses(token)
      setCourses(response.courses)
      setLastUpdated(new Date())
    } catch (err: unknown) {
      const errorValue = err as { status?: number; message: string }
      if (errorValue.status === 401) logoutRef.current()
      else setError(errorValue.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { courses, setCourses, loading, error, lastUpdated, refresh }
}

