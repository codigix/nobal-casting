const API_BASE_URL = import.meta.env.VITE_API_URL

const authService = {
  // Register new user
  async register(email, fullName, password, confirmPassword, department) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, password, confirmPassword, department })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Registration failed')
    return data
  },

  // Login user
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Login failed')
    if (data.token) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
    }
    return data
  },

  // Logout user
  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  // Get token
  getToken() {
    return localStorage.getItem('token')
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token')
  },

  // Verify token
  async verifyToken() {
    const token = this.getToken()
    if (!token) return null
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      return data
    } catch (error) {
      this.logout()
      return null
    }
  },

  // Get headers with auth token
  getAuthHeaders() {
    const token = this.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }
}

export default authService