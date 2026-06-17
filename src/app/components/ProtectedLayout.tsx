import { Navigate } from 'react-router'
import { useAuth } from '../lib/auth'
import { NotificationsProvider } from '../lib/NotificationsContext'
import { Layout } from './Layout'

export function ProtectedLayout() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return (
    <NotificationsProvider>
      <Layout />
    </NotificationsProvider>
  )
}
