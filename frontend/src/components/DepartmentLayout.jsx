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
  Grid3x3
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
  const [expandedMenu, setExpandedMenu] = useState(null)
  const [popoverMenu, setPopoverMenu] = useState(null)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  const userDept = user?.department?.toLowerCase() || 'buying'

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
    const dashboardItem = {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      section: 'NAVIGATION'
    }

    const masterItems = {
      id: 'masters',
      label: 'Masters',
      icon: Settings,
      section: 'APPS',
      submenu: [
        { label: 'Suppliers', path: '/masters/suppliers', icon: Building2 },
        { label: 'Items', path: '/masters/items', icon: Package },
      ]
    }

    // BUYING DEPARTMENT MENU
    if (userDept === 'buying') {
      return [
        dashboardItem,
        {
          id: 'buying',
          label: 'Buying Module',
          icon: ShoppingCart,
          section: 'APPS',
          submenu: [
            { label: 'Material Requests', path: '/buying/material-requests', icon: FileText },
            { label: 'RFQs', path: '/buying/rfqs', icon: Send },
            { label: 'Quotations', path: '/buying/quotations', icon: DollarSign },
            { label: 'Purchase Orders', path: '/buying/purchase-orders', icon: Clipboard },
            { label: 'Purchase Receipts', path: '/buying/purchase-receipts', icon: Package },
            { label: 'Purchase Invoices', path: '/buying/purchase-invoices', icon: Receipt }
          ]
        },
        masterItems,
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          section: 'APPS',
          submenu: [
            { label: 'Buying Analytics', path: '/analytics/buying', icon: TrendingUp }
          ]
        }
      ]
    }

    // SELLING DEPARTMENT MENU
    if (userDept === 'selling') {
      return [
        dashboardItem,
        {
          id: 'selling',
          label: 'Selling Module',
          icon: TrendingUp,
          section: 'APPS',
          submenu: [
            { label: 'Quotations', path: '/selling/quotations', icon: DollarSign },
            { label: 'Sales Orders', path: '/selling/sales-orders', icon: Clipboard },
            { label: 'Delivery Notes', path: '/selling/delivery-notes', icon: Package },
            { label: 'Sales Invoices', path: '/selling/sales-invoices', icon: Receipt },
            { label: 'Customers', path: '/selling/customers', icon: Building2 }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          section: 'APPS',
          submenu: [
            { label: 'Sales Analytics', path: '/analytics/selling', icon: TrendingUp }
          ]
        }
      ]
    }

    // INVENTORY DEPARTMENT MENU
    if (userDept === 'inventory') {
      return [
        dashboardItem,
        {
          id: 'inventory',
          label: 'Inventory Module',
          icon: Warehouse,
          section: 'APPS',
          submenu: [
            { label: 'GRN Requests', path: '/inventory/grn-requests', icon: CheckCircle },
            { label: 'Stock Entries', path: '/inventory/stock-entries', icon: FileText },
            { label: 'Stock Balance', path: '/inventory/stock-balance', icon: Package },
            { label: 'Stock Ledger', path: '/inventory/stock-ledger', icon: BarChart3 },
            { label: 'Warehouses', path: '/inventory/warehouses', icon: Warehouse }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          section: 'APPS',
          submenu: [
            { label: 'Inventory Analytics', path: '/analytics/inventory', icon: TrendingUp }
          ]
        }
      ]
    }

    // ADMIN DEPARTMENT MENU - Full Access
    if (userDept === 'admin') {
      return [
        dashboardItem,
        {
          id: 'buying',
          label: 'Buying Module',
          icon: ShoppingCart,
          section: 'APPS',
          submenu: [
            { label: 'Material Requests', path: '/buying/material-requests', icon: FileText },
            { label: 'RFQs', path: '/buying/rfqs', icon: Send },
            { label: 'Quotations', path: '/buying/quotations', icon: DollarSign },
            { label: 'Purchase Orders', path: '/buying/purchase-orders', icon: Clipboard },
            { label: 'Purchase Receipts', path: '/buying/purchase-receipts', icon: Package },
            { label: 'Purchase Invoices', path: '/buying/purchase-invoices', icon: Receipt }
          ]
        },
        {
          id: 'selling',
          label: 'Selling Module',
          icon: TrendingUp,
          section: 'APPS',
          submenu: [
            { label: 'Quotations', path: '/selling/quotations', icon: DollarSign },
            { label: 'Sales Orders', path: '/selling/sales-orders', icon: Clipboard },
            { label: 'Delivery Notes', path: '/selling/delivery-notes', icon: Package },
            { label: 'Sales Invoices', path: '/selling/sales-invoices', icon: Receipt },
            { label: 'Customers', path: '/selling/customers', icon: Building2 }
          ]
        },
        {
          id: 'inventory',
          label: 'Inventory Module',
          icon: Warehouse,
          section: 'APPS',
          submenu: [
            { label: 'GRN Requests', path: '/inventory/grn-requests', icon: CheckCircle },
            { label: 'Stock Entries', path: '/inventory/stock-entries', icon: FileText },
            { label: 'Stock Balance', path: '/inventory/stock-balance', icon: Package },
            { label: 'Stock Ledger', path: '/inventory/stock-ledger', icon: BarChart3 },
            { label: 'Warehouses', path: '/inventory/warehouses', icon: Warehouse }
          ]
        },
        masterItems,
        {
          id: 'analytics',
          label: 'Analytics',
          icon: TrendingUp,
          section: 'APPS',
          submenu: [
            { label: 'Buying Analytics', path: '/analytics/buying', icon: TrendingUp },
            { label: 'Sales Analytics', path: '/analytics/selling', icon: TrendingUp },
            { label: 'Inventory Analytics', path: '/analytics/inventory', icon: TrendingUp }
          ]
        },
        {
          id: 'admin',
          label: 'Administration',
          icon: Users,
          section: 'APPS',
          submenu: [
            { label: 'User Management', path: '/admin/users', icon: Users },
            { label: 'Settings', path: '/admin/settings', icon: Settings }
          ]
        }
      ]
    }

    // PRODUCTION DEPARTMENT MENU
    if (userDept === 'production') {
      return [
        dashboardItem,
        {
          id: 'billOfMaterials',
          label: 'Bill of Materials',
          icon: Clipboard,
          section: 'APPS',
          submenu: [
            { label: 'BOM', path: '/production/boms', icon: Clipboard },
            { label: 'Workstations', path: '/production/workstations', icon: Grid3x3 },
            { label: 'Operations', path: '/production/operations', icon: Wrench }
          ]
        },
        {
          id: 'production',
          label: 'Production',
          icon: Package,
          section: 'APPS',
          submenu: [
            { label: 'Work Order', path: '/production/work-orders', icon: Clipboard },
            { label: 'Job Card', path: '/production/job-cards', icon: FileText },
            { label: 'Production Plan', path: '/production/plans', icon: Calendar },
            { label: 'Production Orders', path: '/production/orders', icon: Package },
            { label: 'Quality Records', path: '/production/quality', icon: CheckCircle }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Production Analytics', path: '/analytics/production', icon: TrendingUp }
          ]
        }
      ]
    }

    // TOOLROOM DEPARTMENT MENU
    if (userDept === 'toolroom') {
      return [
        dashboardItem,
        {
          id: 'toolroom',
          label: 'Tool Room Module',
          icon: Settings,
          section: 'APPS',
          submenu: [
            { label: 'Tools', path: '/toolroom/tools', icon: Package },
            { label: 'Die Register', path: '/toolroom/die-register', icon: Clipboard },
            { label: 'Maintenance', path: '/toolroom/maintenance', icon: AlertCircle },
            { label: 'Rework Logs', path: '/toolroom/reworks', icon: FileText }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Tool Analytics', path: '/analytics/toolroom', icon: TrendingUp }
          ]
        }
      ]
    }

    // QUALITY CONTROL DEPARTMENT MENU
    if (userDept === 'quality') {
      return [
        dashboardItem,
        {
          id: 'quality',
          label: 'Quality Control Module',
          icon: CheckCircle,
          section: 'APPS',
          submenu: [
            { label: 'Inspections', path: '/quality/inspections', icon: FileText },
            { label: 'Defects Log', path: '/quality/defects', icon: AlertCircle },
            { label: 'Reports', path: '/quality/reports', icon: BarChart3 },
            { label: 'Certifications', path: '/quality/certifications', icon: CheckCircle }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Quality Analytics', path: '/analytics/quality', icon: TrendingUp }
          ]
        }
      ]
    }

    // DISPATCH DEPARTMENT MENU
    if (userDept === 'dispatch') {
      return [
        dashboardItem,
        {
          id: 'dispatch',
          label: 'Dispatch & Logistics',
          icon: Truck,
          section: 'APPS',
          submenu: [
            { label: 'Shipments', path: '/dispatch/shipments', icon: FileText },
            { label: 'Routes', path: '/dispatch/routes', icon: Activity },
            { label: 'Vehicle Fleet', path: '/dispatch/vehicles', icon: Truck },
            { label: 'Tracking', path: '/dispatch/tracking', icon: Eye }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Dispatch Analytics', path: '/analytics/dispatch', icon: TrendingUp }
          ]
        }
      ]
    }

    // ACCOUNTS/FINANCE DEPARTMENT MENU
    if (userDept === 'accounts') {
      return [
        dashboardItem,
        {
          id: 'accounts',
          label: 'Accounts & Finance',
          icon: DollarSign,
          section: 'APPS',
          submenu: [
            { label: 'Invoices', path: '/accounts/invoices', icon: Receipt },
            { label: 'Payments', path: '/accounts/payments', icon: DollarSign },
            { label: 'Statements', path: '/accounts/statements', icon: FileText },
            { label: 'Reports', path: '/accounts/reports', icon: BarChart3 }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'Financial Reports', path: '/analytics/accounts', icon: TrendingUp }
          ]
        }
      ]
    }

    // HR/PAYROLL DEPARTMENT MENU
    if (userDept === 'hr') {
      return [
        dashboardItem,
        {
          id: 'hr',
          label: 'HR & Payroll',
          icon: Users,
          section: 'APPS',
          submenu: [
            { label: 'Employees', path: '/hr/employees', icon: Users },
            { label: 'Attendance', path: '/hr/attendance', icon: CheckCircle },
            { label: 'Payroll', path: '/hr/payroll', icon: DollarSign },
            { label: 'Leave Management', path: '/hr/leaves', icon: Calendar }
          ]
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          section: 'APPS',
          submenu: [
            { label: 'HR Analytics', path: '/analytics/hr', icon: TrendingUp }
          ]
        }
      ]
    }

    // Default fallback to buying menu
    return [dashboardItem]
  }

  const menuItems = getDepartmentMenuItems()

  // Get department badge color
  const getDepartmentBadgeColor = () => {
    const colors = {
      'buying': '#4F46E5',       // Blue
      'selling': '#7C3AED',      // Purple
      'inventory': '#059669',    // Green
      'production': '#F59E0B',   // Amber
      'toolroom': '#8B5CF6',     // Violet
      'quality': '#06B6D4',      // Cyan
      'dispatch': '#EC4899',     // Pink
      'accounts': '#14B8A6',     // Teal
      'hr': '#3B82F6',           // Blue
      'admin': '#DC2626'         // Red
    }
    return colors[userDept] || '#4F46E5'
  }

  const getDepartmentLabel = () => {
    const labels = {
      'buying': 'Buying/Procurement',
      'selling': 'Selling/Sales',
      'inventory': 'Inventory/Stock',
      'production': 'Production/Manufacturing',
      'toolroom': 'Tool Room/Maintenance',
      'quality': 'Quality Control',
      'dispatch': 'Dispatch/Logistics',
      'accounts': 'Accounts/Finance',
      'hr': 'HR/Payroll',
      'admin': 'Administration'
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
                                      key={subitem.path}
                                      to={subitem.path}
                                      className={`nav-subitem ${isActive(subitem.path) ? 'active' : ''}`}
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
                  key={subitem.path}
                  to={subitem.path}
                  className={`popover-item ${isActive(subitem.path) ? 'active' : ''}`}
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