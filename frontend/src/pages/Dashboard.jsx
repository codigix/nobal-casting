import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const department = user.department?.toLowerCase() || 'manufacturing'

  const departmentRoutes = {
    'manufacturing': '/manufacturing/dashboard',
    'inventory': '/inventory/dashboard',
    'admin': '/admin/dashboard',
    'production': '/manufacturing/dashboard',
  }

  const dashboardRoute = departmentRoutes[department] || '/manufacturing/dashboard'

  return <Navigate to={dashboardRoute} replace />
}
