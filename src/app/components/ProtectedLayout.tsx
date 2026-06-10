import { Navigate } from 'react-router'
import { useAuth } from '../lib/auth'
import { Layout } from './Layout'

export function ProtectedLayout() {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <Layout />
}
