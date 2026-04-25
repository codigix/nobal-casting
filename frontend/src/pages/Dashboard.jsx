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
    'admin': '/admin/dashboard',
    'production': '/manufacturing/dashboard',
    'accounts': '/accounts/dashboard',
  }

  const dashboardRoute = departmentRoutes[department]
  
  if (!dashboardRoute) {
    console.error('[Dashboard] Unknown department:', user.department)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 max-w-md">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Department Not Assigned</h2>
          <p className="text-slate-600 mb-6">
            Your account is currently not assigned to a valid department dashboard. Please contact your administrator.
          </p>
          <div className="flex flex-col gap-3">
            <div className="text-sm text-slate-400 bg-slate-50 p-2 rounded mb-4">
              Current Department: <span className="font-mono font-bold text-slate-700">{user.department || 'None'}</span>
            </div>
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <Navigate to={dashboardRoute} replace />
}
