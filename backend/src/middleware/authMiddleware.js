import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'

const JWT_SECRET = config.jwt.secret

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7).trim() // Remove "Bearer " prefix and trim whitespace

    if (!token) {
      return res.status(401).json({ error: 'Token is empty' })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Malformed or invalid token' })
    }
    console.error('Auth middleware error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
}

export default authMiddleware