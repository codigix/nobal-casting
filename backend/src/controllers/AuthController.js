import jwt from 'jsonwebtoken'
import AuthModel from '../models/AuthModel.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

class AuthController {
  constructor(db) {
    this.authModel = new AuthModel(db)
  }

  // Register endpoint
  async register(req, res) {
    try {
      const { email, fullName, password, confirmPassword, department } = req.body

      // Validation
      if (!email || !fullName || !password) {
        return res.status(400).json({ error: 'Email, full name, and password are required' })
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' })
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' })
      }

      // Register user
      const user = await this.authModel.register(email, fullName, password, department || 'buying')

      // Generate token
      const token = jwt.sign(
        { user_id: user.user_id, email: user.email, department: user.department },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          department: user.department,
          is_active: user.is_active
        }
      })
    } catch (error) {
      console.error('Registration error:', error)
      res.status(400).json({ error: error.message })
    }
  }

  // Login endpoint
  async login(req, res) {
    try {
      const { email, password } = req.body

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' })
      }

      // Login user
      const user = await this.authModel.login(email, password)

      // Generate token
      const token = jwt.sign(
        { user_id: user.user_id, email: user.email, department: user.department },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.json({
        message: 'Login successful',
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          department: user.department,
          is_active: user.is_active
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(401).json({ error: error.message })
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.user_id
      const user = await this.authModel.getUserById(userId)

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(user)
    } catch (error) {
      console.error('Get user error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  // Get all users (admin)
  async getAllUsers(req, res) {
    try {
      const users = await this.authModel.getAllUsers()
      res.json(users)
    } catch (error) {
      console.error('Get users error:', error)
      res.status(500).json({ error: error.message })
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const userId = req.user.user_id
      const { fullName, email } = req.body

      if (!fullName || !email) {
        return res.status(400).json({ error: 'Full name and email are required' })
      }

      const user = await this.authModel.updateUser(userId, fullName, email)
      res.json({
        message: 'User updated successfully',
        user
      })
    } catch (error) {
      console.error('Update user error:', error)
      res.status(400).json({ error: error.message })
    }
  }

  // Verify token
  verifyToken(req, res) {
    try {
      res.json({
        valid: true,
        user: req.user
      })
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' })
    }
  }
}

export default AuthController