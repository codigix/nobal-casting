import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const department = user.department?.toLowerCase() || ''

  const departmentRoutes = {
    'manufacturing': '/manufacturing/dashboard',
    'inventory': '/inventory/dashboard',
    'admin': '/admin/project-analysis',
    'production': '/manufacturing/dashboard',
    'accounts': '/accounts/dashboard',
  }

  const dashboardRoute = departmentRoutes[department] || '/login'
  
  if (dashboardRoute === '/login') {
    console.error('[Dashboard] Unknown department:', user.department)
  }

  return <Navigate to={dashboardRoute} replace />
}
