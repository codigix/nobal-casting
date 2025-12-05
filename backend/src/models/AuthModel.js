import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

class AuthModel {
  constructor(db) {
    this.db = db
  }

  // Register new user
  async register(email, fullName, password, department = 'buying', role = 'staff', phone = null) {
    try {
      // Check if user already exists
      const [existing] = await this.db.query('SELECT * FROM users WHERE email = ?', [email])
      if (existing.length > 0) {
        throw new Error('Email already registered')
      }

      // Validate department
      const validDepartments = [
        'buying', 'selling', 'inventory', 'production', 
        'toolroom', 'quality', 'dispatch', 'accounts', 
        'hr', 'admin'
      ]
      if (!validDepartments.includes(department)) {
        throw new Error('Invalid department')
      }

      // Validate role
      const validRoles = ['admin', 'manager', 'executive', 'staff']
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Insert user
      const [result] = await this.db.query(
        'INSERT INTO users (full_name, email, password, department, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [fullName, email, hashedPassword, department, role, phone]
      )

      return {
        user_id: result.insertId,
        email,
        full_name: fullName,
        department,
        role,
        is_active: true,
        created_at: new Date()
      }
    } catch (error) {
      throw error
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const [users] = await this.db.query('SELECT * FROM users WHERE email = ?', [email])
      
      if (users.length === 0) {
        throw new Error('Invalid email or password')
      }

      const user = users[0]

      // Check if user is active
      if (!user.is_active) {
        throw new Error('User account is inactive')
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        throw new Error('Invalid email or password')
      }

      return {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        department: user.department || 'buying',
        role: user.role || 'staff',
        is_active: user.is_active
      }
    } catch (error) {
      throw error
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const [users] = await this.db.query('SELECT * FROM users WHERE user_id = ?', [userId])
      
      if (users.length === 0) {
        return null
      }

      const user = users[0]
      return {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        department: user.department || 'buying',
        role: user.role || 'staff',
        is_active: user.is_active
      }
    } catch (error) {
      throw error
    }
  }

  // Get all users
  async getAllUsers() {
    try {
      const [users] = await this.db.query(
        'SELECT user_id, email, full_name, is_active, created_at FROM users ORDER BY created_at DESC'
      )
      return users
    } catch (error) {
      throw error
    }
  }

  // Update user
  async updateUser(userId, fullName, email, department = null, role = null, phone = null) {
    try {
      let query = 'UPDATE users SET full_name = ?, email = ?'
      const params = [fullName, email]

      if (department) {
        query += ', department = ?'
        params.push(department)
      }
      if (role) {
        query += ', role = ?'
        params.push(role)
      }
      if (phone) {
        query += ', phone = ?'
        params.push(phone)
      }

      query += ' WHERE user_id = ?'
      params.push(userId)

      const [result] = await this.db.query(query, params)
      
      if (result.affectedRows === 0) {
        throw new Error('User not found')
      }

      return await this.getUserById(userId)
    } catch (error) {
      throw error
    }
  }

  // Deactivate user
  async deactivateUser(userId) {
    try {
      const [result] = await this.db.query(
        'UPDATE users SET is_active = FALSE WHERE user_id = ?',
        [userId]
      )
      
      if (result.affectedRows === 0) {
        throw new Error('User not found')
      }

      return { message: 'User deactivated successfully' }
    } catch (error) {
      throw error
    }
  }

  // Get users by department
  async getUsersByDepartment(department) {
    try {
      const [users] = await this.db.query(
        'SELECT user_id, email, full_name, department, role, is_active FROM users WHERE department = ? AND is_active = TRUE ORDER BY full_name',
        [department]
      )
      return users
    } catch (error) {
      throw error
    }
  }

  // Get users by role
  async getUsersByRole(role) {
    try {
      const [users] = await this.db.query(
        'SELECT user_id, email, full_name, department, role, is_active FROM users WHERE role = ? AND is_active = TRUE ORDER BY full_name',
        [role]
      )
      return users
    } catch (error) {
      throw error
    }
  }

  // Check user permissions
  async checkPermission(userId, module, action) {
    try {
      const [user] = await this.db.query(
        'SELECT role FROM users WHERE user_id = ? AND is_active = TRUE',
        [userId]
      )

      if (user.length === 0) {
        return false
      }

      // Admin has all permissions
      if (user[0].role === 'admin') {
        return true
      }

      const [permission] = await this.db.query(
        'SELECT is_allowed FROM permission_matrix WHERE role_id = (SELECT CONCAT("role_", ?)) AND module = ? AND action = ?',
        [user[0].role, module, action]
      )

      return permission.length > 0 && permission[0].is_allowed
    } catch (error) {
      throw error
    }
  }
}

export default AuthModel