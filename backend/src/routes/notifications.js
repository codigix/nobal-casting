import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/NotificationController.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)
router.put('/:id/read', markAsRead)
router.put('/read-all', markAllAsRead)
router.delete('/:id', deleteNotification)

export default router
