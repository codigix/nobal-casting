class NotificationModel {
  static getDb() {
    return global.db
  }

  static async create(data) {
    try {
      const db = this.getDb()
      const {
        user_id,
        notification_type,
        title,
        message,
        reference_type,
        reference_id
      } = data

      const result = await db.execute(
        `INSERT INTO notification (
          user_id, notification_type, title, message, reference_type, reference_id, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
        [
          user_id,
          notification_type,
          title,
          message,
          reference_type || null,
          reference_id || null
        ]
      )

      return this.getById(result[0].insertId)
    } catch (error) {
      throw new Error(`Failed to create notification: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      const db = this.getDb()
      const [notifications] = await db.execute(
        `SELECT * FROM notification WHERE id = ?`,
        [id]
      )
      return notifications[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch notification: ${error.message}`)
    }
  }

  static async getByUserId(userId, options = {}) {
    try {
      const db = this.getDb()
      const {
        unreadOnly = false,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = options

      const validSortColumns = ['id', 'notification_type', 'title', 'created_at', 'is_read']
      const validSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
      const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000))
      const offsetNum = Math.max(0, parseInt(offset) || 0)

      let query = `SELECT * FROM notification WHERE user_id = ?`
      const params = [userId]

      if (unreadOnly) {
        query += ` AND is_read = FALSE`
      }

      query += ` ORDER BY ${validSortBy} ${validSortOrder} LIMIT ${limitNum} OFFSET ${offsetNum}`

      const [notifications] = await db.execute(query, params)
      return notifications || []
    } catch (error) {
      throw new Error(`Failed to fetch user notifications: ${error.message}`)
    }
  }

  static async getUnreadCount(userId) {
    try {
      const db = this.getDb()
      const [result] = await db.execute(
        `SELECT COUNT(*) as count FROM notification WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      )
      return result[0]?.count || 0
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error.message}`)
    }
  }

  static async markAsRead(id) {
    try {
      const db = this.getDb()
      await db.execute(
        `UPDATE notification SET is_read = TRUE, read_at = NOW() WHERE id = ?`,
        [id]
      )
      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`)
    }
  }

  static async markAllAsRead(userId) {
    try {
      const db = this.getDb()
      await db.execute(
        `UPDATE notification SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE`,
        [userId]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`)
    }
  }

  static async delete(id) {
    try {
      const db = this.getDb()
      await db.execute(`DELETE FROM notification WHERE id = ?`, [id])
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error.message}`)
    }
  }

  static async deleteByReference(referenceType, referenceId) {
    try {
      const db = this.getDb()
      await db.execute(
        `DELETE FROM notification WHERE reference_type = ? AND reference_id = ?`,
        [referenceType, referenceId]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete notifications: ${error.message}`)
    }
  }

  static async notifyUsers(userIds, notificationData) {
    try {
      const db = this.getDb()
      const {
        notification_type,
        title,
        message,
        reference_type,
        reference_id
      } = notificationData

      const promises = userIds.map(userId =>
        this.create({
          user_id: userId,
          notification_type,
          title,
          message,
          reference_type,
          reference_id
        })
      )

      return Promise.all(promises)
    } catch (error) {
      throw new Error(`Failed to notify users: ${error.message}`)
    }
  }

  static async cleanOldNotifications(daysOld = 30) {
    try {
      const db = this.getDb()
      await db.execute(
        `DELETE FROM notification WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [daysOld]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to clean old notifications: ${error.message}`)
    }
  }
}

export default NotificationModel
