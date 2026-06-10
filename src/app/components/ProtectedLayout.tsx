import { Navigate } from 'react-router'
import { useAuth } from '../lib/auth'
import { useNotifications } from '../lib/useNotifications'
import { Layout } from './Layout'

export function ProtectedLayout() {
  const { token } = useAuth()
  const { newApplications, markAllSeen } = useNotifications()
  if (!token) return <Navigate to="/login" replace />
  return <Layout newApplications={newApplications} markAllSeen={markAllSeen} />
}
