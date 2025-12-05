import express from 'express'
import AuthController from '../controllers/AuthController.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

export default (db) => {
  const authController = new AuthController(db)

  // Public routes
  router.post('/register', (req, res) => authController.register(req, res))
  router.post('/login', (req, res) => authController.login(req, res))

  // Protected routes
  router.get('/me', authMiddleware, (req, res) => authController.getCurrentUser(req, res))
  router.get('/verify', authMiddleware, (req, res) => authController.verifyToken(req, res))
  router.put('/profile', authMiddleware, (req, res) => authController.updateUser(req, res))

  // Admin routes
  router.get('/users', authMiddleware, (req, res) => authController.getAllUsers(req, res))

  return router
}