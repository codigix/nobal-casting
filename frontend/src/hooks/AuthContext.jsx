import React, { createContext, useContext, useState, useEffect } from 'react'
import authService from '../services/authService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = authService.getCurrentUser()
      if (currentUser) {
        // Verify token is still valid
        const verified = await authService.verifyToken()
        if (verified) {
          setUser(currentUser)
        } else {
          authService.logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    try {
      setError(null)
      const response = await authService.login(email, password)
      setUser(response.user)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const register = async (email, fullName, password, confirmPassword, department) => {
    try {
      setError(null)
      const response = await authService.register(email, fullName, password, confirmPassword, department)
      setUser(response.user)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}