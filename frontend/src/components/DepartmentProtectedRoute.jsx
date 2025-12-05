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
  const userDept = user?.department?.toLowerCase() || 'buying'
  const allowedDepts = departments.map(d => d.toLowerCase())

  if (!allowedDepts.includes(userDept)) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        textAlign: 'center',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          This page is only available for {departments.map(d => {
            const deptMap = {
              'buying': 'Buying/Procurement',
              'selling': 'Selling/Sales',
              'inventory': 'Inventory/Stock',
              'admin': 'Administration'
            }
            return deptMap[d.toLowerCase()] || d
          }).join(', ')} department.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Your department: <strong>{user?.department}</strong>
        </p>
      </div>
    )
  }

  return children
}