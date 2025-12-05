import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import { Lock, Mail, User, Eye, EyeOff, Building2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import '../styles/LoginPage.css'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('password123')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [department, setDepartment] = useState('buying')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const departments = [
    { value: 'buying', label: 'Buying' },
    { value: 'selling', label: 'Selling' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'production', label: 'Production' },
    { value: 'toolroom', label: 'Tool Room' },
    { value: 'quality', label: 'Quality' },
    { value: 'dispatch', label: 'Dispatch' },
    { value: 'accounts', label: 'Accounts' },
    { value: 'hr', label: 'HR' },
    { value: 'admin', label: 'Admin' }
  ]

  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isLogin) {
        if (!email || !password) {
          throw new Error('Please enter email and password')
        }
        await login(email, password)
        setSuccess('Login successful! Redirecting...')
        setTimeout(() => {
          const from = location.state?.from?.pathname || '/dashboard'
          navigate(from)
        }, 1000)
      } else {
        if (!email || !fullName || !password || !confirmPassword || !department) {
          throw new Error('Please fill all fields')
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        await register(email, fullName, password, confirmPassword, department)
        setSuccess('Registration successful! Redirecting...')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1000)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="card-header">
          <div className="header-top">
            <div className="brand">
              <div className="brand-icon">
                <Building2 size={28} strokeWidth={1.5} />
              </div>
              <div className="brand-info">
                <h1>Aluminium ERP</h1>
                <p>Enterprise Management</p>
              </div>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true)
                setError('')
                setSuccess('')
              }}
            >
              Sign In
            </button>
            <button
              className={`tab ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false)
                setError('')
                setSuccess('')
              }}
            >
              Register
            </button>
          </div>
        </div>

        <div className="card-body">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-field">
                <label>Full Name</label>
                <div className="input-field">
                  <User size={18} className="icon" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="form-field">
              <label>Email Address</label>
              <div className="input-field">
                <Mail size={18} className="icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-field">
                <label>Department</label>
                <div className="dept-list">
                  {departments.map(dept => (
                    <button
                      key={dept.value}
                      type="button"
                      className={`dept-item ${department === dept.value ? 'active' : ''}`}
                      onClick={() => setDepartment(dept.value)}
                      disabled={loading}
                    >
                      {dept.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-field">
              <label>Password</label>
              <div className="input-field password-field">
                <Lock size={18} className="icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="form-field">
                <label>Confirm Password</label>
                <div className="input-field password-field">
                  <Lock size={18} className="icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing
                </>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div className="footer">
              <details>
                <summary>Demo Credentials</summary>
                <div className="demo-box">
                  <p><strong>Email:</strong> test@example.com</p>
                  <p><strong>Password:</strong> password123</p>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
