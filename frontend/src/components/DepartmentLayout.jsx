import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/AuthContext'
import Header from './Header'
import '../styles/Sidebar.css'
import {
  LayoutDashboard,
  ShoppingCart,
  Settings,
  TrendingUp,
  FileText,
  Send,
  DollarSign,
  Clipboard,
  Package,
  Receipt,
  Building2,
  ChevronRight,
  Users,
  Warehouse,
  AlertCircle,
  BarChart3,
  Truck,
  CheckCircle,
  Calendar,
  Activity,
  Eye,
  Wrench,
  Grid3x3,
  Award,
  Zap,
  ArrowRightLeft,
  Star,
  CreditCard,
  Clock,
  TrendingDown,
  RefreshCw
} from 'lucide-react'

/**
 * DepartmentLayout Component
 * Provides department-aware navigation and layout
 * Shows different menu items based on user's department
 */
export default function DepartmentLayout({ children }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [popoverMenu, setPopoverMenu] = useState(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  let userDept = user?.department?.toLowerCase() || 'manufacturing'
  if (userDept === 'production') userDept = 'manufacturing'

  const getInitialExpandedMenu = () => {
    const deptMenus = {
      'inventory': 'inventory',
      'manufacturing': 'manufacturing',
      'admin': 'analytics',
      'accounts': 'accounts'
    }
    return deptMenus[userDept] || null
  }

  const [expandedMenu, setExpandedMenu] = useState(getInitialExpandedMenu())

  const isActive = (path) => location.pathname.startsWith(path)
  const sidebarWidth = sidebarCollapsed ? 80 : 280

  const toggleMenu = (menu) => {
    setExpandedMenu(expandedMenu === menu ? null : menu)
  }

  const handleCollapsedSubmenuClick = (item, event) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    setPopoverMenu(item.id === popoverMenu ? null : item.id)
    setPopoverPosition({
      top: rect.top,
      left: rect.right + 10
    })
  }

  const handleLinkClick = () => {
    setPopoverMenu(null)
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  // Define menu items for each department
  const getDepartmentMenuItems = () => {
    // Create dashboard item with dynamic path based on department
    const dashboardPaths = {
      'inventory': '/inventory/dashboard',
      'manufacturing': '/manufacturing/dashboard',
      'admin': '/admin/project-analysis',
      'accounts': '/accounts/dashboard'
    }
    
    const dashboardItem = {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: dashboardPaths[userDept] || '/manufacturing/dashboard',
      section: 'NAVIGATION'
    }

    // INVENTORY DEPARTMENT MENU
    if (userDept === 'inventory') {
      return [
        dashboardItem,
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Warehouse,
          section: 'APPS',
          submenu: [
            { label: 'Material Requests', path: '/inventory/material-requests', icon: FileText },
                        { label: 'Purchase Orders', path: '/buying/purchase-orders', icon: Package },

             { label: 'Purchase Receipt', path: '/inventory/purchase-receipts', icon: Receipt },
            { label: 'GRN Management', path: '/inventory/grn-management', icon: Package },
          
            { label: 'Stock Entries', path: '/inventory/stock-entries', icon: FileText },
            { label: 'Stock Balance', path: '/inventory/stock-balance', icon: Package },
            { label: 'Stock Ledger', path: '/inventory/stock-ledger', icon: BarChart3 },
            { label: 'Warehouses', path: '/inventory/warehouses', icon: Warehouse },
            { label: 'Stock Movements', path: '/inventory/stock-movements', icon: ArrowRightLeft },
            { label: 'Suppliers', path: '/inventory/suppliers', icon: Users },
           ]
        },
       
      ]
    }

    // MANUFACTURING DEPARTMENT MENU
    if (userDept === 'manufacturing') {
      return [
        dashboardItem,
        {
          id: 'manufacturing',
          label: 'Manufacturing',
          icon: Package,
          section: 'APPS',
          submenu: [
            { label: 'Customers', path: '/manufacturing/customers', icon: Users },
            { label: 'Items', path: '/manufacturing/items', icon: Package },
            { label: 'BOM', path: '/manufacturing/bom', icon: Clipboard },
            { label: 'Sales Orders', path: '/manufacturing/sales-orders', icon: ShoppingCart },
            { label: 'Production Planning', path: '/manufacturing/production-planning', icon: Calendar },
            { label: 'Work Orders', path: '/manufacturing/work-orders', icon: Clipboard },
            { label: 'Job Cards', path: '/manufacturing/job-cards', icon: FileText },
            { label: 'Workstations', path: '/manufacturing/workstations', icon: Grid3x3 },
            { label: 'Operations', path: '/manufacturing/operations', icon: Zap }
          ]
        },
        {
          id: 'buying',
          label: 'Buying',
          icon: ShoppingCart,
          section: 'APPS',
          submenu: [
            { label: 'Material Requests', path: '/inventory/material-requests', icon: FileText },
            { label: 'Purchase Orders', path: '/buying/purchase-orders', icon: Package },
            { label: 'Purchase Receipt', path: '/inventory/purchase-receipts', icon: Receipt },
            { label: 'Purchase Invoices', path: '/buying/purchase-invoices', icon: Receipt }
          ]
        },
        {
          id: 'selling',
          label: 'Selling',
          icon: Send,
          section: 'APPS',
          submenu: [
            { label: 'Sales Orders', path: '/manufacturing/sales-orders', icon: ShoppingCart },
            { label: 'Sales Invoices', path: '/selling/sales-invoices', icon: FileText }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Production Analytics', path: '/manufacturing/analytics', icon: TrendingUp }
          ]
        }
      ]
    }

    // ADMIN DEPARTMENT MENU
    if (userDept === 'admin') {
      return [
        dashboardItem,
      
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Project Analysis', path: '/admin/project-analysis', icon: TrendingUp, state: { filterSegment: 'all' } },
                        { label: 'Customer Statistics', path: '/admin/customer-statistics', icon: Award },

            // { label: 'Machine Analysis', path: '/admin/machine-analysis', icon: TrendingUp },
            { label: 'OEE Analysis', path: '/admin/oee', icon: TrendingUp },
            { label: 'Employees & Designations', path: '/admin/employees-designations', icon: Users }
          ]
        }
      ]
    }

    // ACCOUNTS DEPARTMENT MENU
    if (userDept === 'accounts') {
      return [
        dashboardItem,
        {
          id: 'accounts',
          label: 'Accounts',
          icon: Building2,
          section: 'APPS',
          submenu: [
            { label: 'Sales Invoices', path: '/selling/sales-invoices', icon: FileText },
            { label: 'Purchase Invoices', path: '/buying/purchase-invoices', icon: Receipt },
            { label: 'Payments', path: '/accounts/payments', icon: CreditCard },
            { label: 'Expenses', path: '/accounts/expenses', icon: TrendingDown },
            { label: 'Ledger', path: '/accounts/ledger', icon: Clipboard },
          ]
        },
        {
          id: 'financial_reports',
          label: 'Reports',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Profit & Loss', path: '/accounts/reports/profit-loss', icon: Activity },
            { label: 'Balance Sheet', path: '/accounts/reports/balance-sheet', icon: FileText },
            { label: 'Cash Flow', path: '/accounts/reports/cash-flow', icon: RefreshCw },
            { label: 'Ageing Analysis', path: '/accounts/reports/ageing', icon: Clock }
          ]
        }
      ]
    }

    // Default fallback menu
    return [dashboardItem]
  }

  const menuItems = getDepartmentMenuItems()

  // Get department badge color
  const getDepartmentBadgeColor = () => {
    const colors = {
      'inventory': '#059669',      // Green
      'manufacturing': '#F59E0B',  // Amber
      'admin': '#DC2626',           // Red
      'accounts': '#4F46E5'        // Indigo
    }
    return colors[userDept] || '#4F46E5'
  }

  const getDepartmentLabel = () => {
    const labels = {
      'inventory': 'Inventory',
      'manufacturing': 'Manufacturing',
      'admin': 'Administration',
      'accounts': 'Accounts & Finance'
    }
    return labels[userDept] || 'Unknown'
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Header - Fixed at top */}
      <Header sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />

      {/* Main container with sidebar and content */}
      <div style={{ display: 'flex', marginTop: '70px', minHeight: 'calc(100vh - 70px)' }}>
        {/* Overlay (Mobile) */}
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <nav className="sidebar-nav">
          {!sidebarCollapsed && (
            <>
              {Array.from(new Set(menuItems.map(item => item.section))).map((section) => (
                <div key={section}>
                  <div className="nav-section-label">{section}</div>
                  {menuItems.filter(item => item.section === section).map((item) => {
                    const IconComponent = item.icon
                    return (
                      <div key={item.id} className="nav-group">
                        {item.submenu ? (
                          <div>
                            <button
                              className={`nav-item submenu-toggle ${expandedMenu === item.id ? 'expanded' : ''}`}
                              onClick={() => toggleMenu(item.id)}
                              title={item.label}
                            >
                              <IconComponent className="nav-icon-lucide" size={20} />
                              <span className="nav-label">{item.label}</span>
                              <ChevronRight className="submenu-arrow-icon" size={18} />
                            </button>
                            {expandedMenu === item.id && (
                              <div className="submenu">
                                {item.submenu.map((subitem) => {
                                  const SubIconComponent = subitem.icon
                                  return (
                                    <Link
                                      key={subitem.id || subitem.path + (subitem.state?.filterSegment || '')}
                                      to={subitem.path}
                                      state={subitem.state}
                                      className={`nav-subitem ${isActive(subitem.path) && (!subitem.state || location.state?.filterSegment === subitem.state.filterSegment) ? 'active' : ''}`}
                                      onClick={handleLinkClick}
                                    >
                                      <SubIconComponent className="nav-icon-lucide" size={18} />
                                      <span className="nav-label">{subitem.label}</span>
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link
                            to={item.path}
                            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                            onClick={handleLinkClick}
                            title={item.label}
                            style={{ position: 'relative' }}
                          >
                            <IconComponent className="nav-icon-lucide" size={20} />
                            <span className="nav-label">{item.label}</span>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
          {sidebarCollapsed && (
            <>
              {menuItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <div key={item.id} className="nav-group">
                    {item.submenu ? (
                      <button
                        className={`nav-item submenu-toggle collapsed-submenu ${popoverMenu === item.id ? 'active' : ''}`}
                        onClick={(e) => handleCollapsedSubmenuClick(item, e)}
                        title={item.label}
                      >
                        <IconComponent className="nav-icon-lucide" size={20} />
                      </button>
                    ) : (
                      <Link
                        to={item.path}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        onClick={handleLinkClick}
                        title={item.label}
                      >
                        <IconComponent className="nav-icon-lucide" size={20} />
                      </Link>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </nav>

        </aside>

        {/* Collapsed Sidebar Popover Menu */}
        {sidebarCollapsed && popoverMenu && (
          <div
            className="nav-popover"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPopoverMenu(null)
              }
            }}
          >
            {menuItems.find(item => item.id === popoverMenu)?.submenu?.map((subitem) => {
              const SubIconComponent = subitem.icon
              return (
                <Link
                  key={subitem.id || subitem.path + (subitem.state?.filterSegment || '')}
                  to={subitem.path}
                  state={subitem.state}
                  className={`popover-item ${isActive(subitem.path) && (!subitem.state || location.state?.filterSegment === subitem.state.filterSegment) ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  <SubIconComponent className="nav-icon-lucide" size={18} />
                  <span className="popover-label">{subitem.label}</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Popover Overlay */}
        {sidebarCollapsed && popoverMenu && (
          <div
            className="popover-overlay"
            onClick={() => setPopoverMenu(null)}
          />
        )}

        {/* Main Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          marginLeft: `${sidebarWidth}px`,
          transition: 'margin-left 0.3s ease'
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}