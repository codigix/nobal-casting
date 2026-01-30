import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Bell, Check, Trash2, X } from 'lucide-react'
import { useAuth } from '../hooks/AuthContext'
import './NotificationCenter.css'

export default function NotificationCenter() {
  const { user } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.user_id) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.user_id])

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/notifications?limit=20`,
        { headers }
      )

      if (response.data.success) {
        setNotifications(response.data.data || [])
        setUnreadCount(response.data.unread_count || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      await axios.put(
        `${import.meta.env.VITE_API_URL}/notifications/${id}/read`,
        {},
        { headers }
      )

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      await axios.put(
        `${import.meta.env.VITE_API_URL}/notifications/read-all`,
        {},
        { headers }
      )

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      await axios.delete(
        `${import.meta.env.VITE_API_URL}/notifications/${id}`,
        { headers }
      )

      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const getNotificationColor = (type) => {
    const colorMap = {
      'STOCK_IN': '#10b981',
      'STOCK_OUT': '#f59e0b',
      'TRANSFER': '#3b82f6',
      'TRANSFER_COMPLETE': '#8b5cf6',
      'LOW_STOCK': '#dc2626',
      'MATERIAL_REQUEST_NEW': '#0ea5e9',
      'MATERIAL_REQUEST_APPROVED': '#10b981',
      'MATERIAL_REQUEST_REJECTED': '#dc2626',
      'MATERIAL_ARRIVED': '#10b981'
    }
    return colorMap[type] || '#6b7280'
  }

  const getNotificationIcon = (type) => {
    const iconMap = {
      'STOCK_IN': '📥',
      'STOCK_OUT': '📤',
      'TRANSFER': '🔄',
      'TRANSFER_COMPLETE': '✅',
      'LOW_STOCK': '⚠️',
      'MATERIAL_REQUEST_NEW': '📋',
      'MATERIAL_REQUEST_APPROVED': '✔️',
      'MATERIAL_REQUEST_REJECTED': '❌',
      'MATERIAL_ARRIVED': '📦'
    }
    return iconMap[type] || '🔔'
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className="notification-center">
      <button
        className="notification-bell"
        onClick={() => setShowNotifications(!showNotifications)}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {showNotifications && (
        <>
          <div className="notification-overlay" onClick={() => setShowNotifications(false)} />
          
          <div className="notification-panel">
            <div className="notification-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="mark-all-btn"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <Check size={18} />
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <Bell size={32} />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                    style={{
                      borderLeftColor: getNotificationColor(notification.notification_type)
                    }}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatTime(notification.created_at)}
                      </div>
                    </div>

                    <div className="notification-actions">
                      {!notification.is_read && (
                        <button
                          className="action-btn read-btn"
                          onClick={() => markAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        className="action-btn delete-btn"
                        onClick={() => deleteNotification(notification.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="notification-footer">
                <p>{unreadCount} unread</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
