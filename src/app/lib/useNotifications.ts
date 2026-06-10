import { useState, useEffect, useCallback, useRef } from 'react'
import type { Application } from './types'
import { getApplications } from './api'
import { useAuth } from './auth'

const SEEN_IDS_KEY = 'admin_seen_application_ids'
const POLL_INTERVAL_MS = 25000

interface UseNotificationsResult {
  applications: Application[]
  newApplications: Application[]
  markAllSeen: () => void
}

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY)
    if (!raw) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function saveSeenIds(ids: Set<string>): void {
  try {
    localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // localStorage unavailable (e.g. private mode) - ignore
  }
}

export function useNotifications(): UseNotificationsResult {
  const { token, logout } = useAuth()
  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const [applications, setApplications] = useState<Application[]>([])
  const [newApplications, setNewApplications] = useState<Application[]>([])
  const seenIdsRef = useRef<Set<string>>(loadSeenIds())

  const recomputeNew = useCallback((apps: Application[]) => {
    const seen = seenIdsRef.current
    setNewApplications(apps.filter((a) => !seen.has(a.id)))
  }, [])

  const poll = useCallback(async () => {
    if (!token) return
    try {
      const res = await getApplications(token)
      setApplications(res.applications)
      recomputeNew(res.applications)
    } catch (err: unknown) {
      const e = err as { status?: number; message: string }
      if (e.status === 401) logoutRef.current()
      // other errors: silently ignore, retry on next interval
    }
  }, [token, recomputeNew])

  useEffect(() => {
    if (!token) return
    poll()
    const intervalId = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [token, poll])

  const markAllSeen = useCallback(() => {
    const seen = seenIdsRef.current
    const updated = new Set(seen)
    for (const app of applications) updated.add(app.id)
    seenIdsRef.current = updated
    saveSeenIds(updated)
    setNewApplications([])
  }, [applications])

  return { applications, newApplications, markAllSeen }
}
