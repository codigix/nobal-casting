import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'

/**
 * DepartmentProtectedRoute Component
 * Restricts access to pages based on user's department
 * 
 * Usage:
 * <DepartmentProtectedRoute departments={['buying']}>
 *   <SomePage />
 * </DepartmentProtectedRoute>
 */
export default function DepartmentProtectedRoute({ children, departments = [] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: 'var(--text-secondary)'
      }}>
        Loading...
      </div>
    )
  }

  // If no department restriction, allow all authenticated users
  if (departments.length === 0) {
    return children
  }

  // Check if user's department is in allowed departments
  let userDept = user?.department?.toLowerCase() || 'manufacturing'
  if (userDept === 'production') userDept = 'manufacturing'
  const allowedDepts = departments.map(d => {
    let dept = d.toLowerCase()
    if (dept === 'production') dept = 'manufacturing'
    return dept
  })

  if (!allowedDepts.includes(userDept)) {
    console.warn(`[DepartmentProtectedRoute] Access denied. User department: "${userDept}", Allowed departments: ${JSON.stringify(allowedDepts)}. Redirecting to dashboard.`);
    return <Navigate to="/dashboard" replace />
  }

  return children
}