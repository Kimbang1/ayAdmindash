import { createContext, useContext, type ReactNode } from 'react'
import { useNotifications } from './useNotifications'
import type { Application } from './types'

interface NotificationsContextValue {
  applications: Application[]
  newApplications: Application[]
  newApplicationIds: Set<string>
  markAllSeen: () => void
  markSeen: (applicationId: string) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const value = useNotifications()
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotificationsContext must be used within a NotificationsProvider')
  return ctx
}
