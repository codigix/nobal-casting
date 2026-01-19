import NotificationModel from '../models/NotificationModel.js'

export async function getNotifications(req, res) {
  try {
    const userId = req.user?.user_id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const unreadOnly = req.query.unread_only === 'true'
    const userIdInt = parseInt(userId) || userId

    console.log('[Notification] Fetching for userId:', userIdInt, '(type:', typeof userIdInt, ') limit:', limit, 'offset:', offset)

    const notifications = await NotificationModel.getByUserId(userIdInt, {
      limit,
      offset,
      unreadOnly
    })

    const unreadCount = await NotificationModel.getUnreadCount(userIdInt)

    res.json({
      success: true,
      data: notifications,
      unread_count: unreadCount
    })
  } catch (error) {
    console.error('[Notification] Error:', error.message, error.stack)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.user_id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const userIdInt = parseInt(userId) || userId
    const count = await NotificationModel.getUnreadCount(userIdInt)

    res.json({
      success: true,
      unread_count: count
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function markAsRead(req, res) {
  try {
    const userId = req.user?.user_id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const userIdInt = parseInt(userId) || userId
    const { id } = req.params
    const notification = await NotificationModel.getById(id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      })
    }

    if (parseInt(notification.user_id) !== parseInt(userIdInt)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden'
      })
    }

    const updated = await NotificationModel.markAsRead(id)

    res.json({
      success: true,
      data: updated
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function markAllAsRead(req, res) {
  try {
    const userId = req.user?.user_id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const userIdInt = parseInt(userId) || userId
    await NotificationModel.markAllAsRead(userIdInt)

    res.json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function deleteNotification(req, res) {
  try {
    const userId = req.user?.user_id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const userIdInt = parseInt(userId) || userId
    const { id } = req.params
    const notification = await NotificationModel.getById(id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      })
    }

    if (parseInt(notification.user_id) !== parseInt(userIdInt)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden'
      })
    }

    await NotificationModel.delete(id)

    res.json({
      success: true,
      message: 'Notification deleted'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
