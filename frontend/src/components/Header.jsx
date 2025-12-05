import React, { useState } from 'react'
import { useAuth } from '../hooks/AuthContext'
import ThemeToggle from './ThemeToggle'
import CommonHeaderButton from './CommonHeaderButton'
import { Bell, LogOut, User, Menu } from 'lucide-react'
import './Header.css'
import { Link } from 'react-router-dom'

export default function Header({ sidebarCollapsed, setSidebarCollapsed }) {
  const { user, logout } = useAuth()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <div className="sidebar-brand">
            <Link to="/dashboard">
              <span className="brand-icon">🏭</span>
              <span className="brand-text">Aluminium ERP</span>
            </Link>
          </div>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="header-right">
          <CommonHeaderButton
            className="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            isActive={showNotifications}
          >
            <Bell size={20} />
            <span className="notification-badge">3</span>
            {showNotifications && (
              <div className="notifications-popover">
                <div className="notification-item">New purchase order received</div>
                <div className="notification-item">Shipment delivered</div>
                <div className="notification-item">Inventory low alert</div>
              </div>
            )}
          </CommonHeaderButton>

          <ThemeToggle />

          <div className="header-divider"></div>

          <div className="profile-section">
            <button
              className="profile-button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title={user?.full_name}
            >
              <div className="profile-avatar">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <p className="profile-name">{user?.full_name}</p>
                <p className="profile-dept">{user?.department}</p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="profile-popover">
                <button className="profile-menu-item">
                  <User size={18} />
                  View Profile
                </button>
                <button
                  className="profile-menu-item logout-item"
                  onClick={() => {
                    logout()
                    setShowProfileMenu(false)
                  }}
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showProfileMenu || showNotifications) && (
        <div
          className="header-overlay"
          onClick={() => {
            setShowProfileMenu(false)
            setShowNotifications(false)
          }}
        />
      )}
    </header>
  )
}
