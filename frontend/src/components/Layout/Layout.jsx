import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Layout.css'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Suppliers', path: '/suppliers', icon: '🏭' },
    { name: 'Material Requests', path: '/material-requests', icon: '📋' },
    { name: 'RFQs', path: '/rfqs', icon: '✉️' },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: '📑' },
    { name: 'GRN', path: '/grn', icon: '📦' },
    { name: 'Invoices', path: '/invoices', icon: '💰' },
    { name: 'Stock', path: '/stock', icon: '📊' },
    { name: 'Buying Analytics', path: '/buying/analytics', icon: '📈' },
  ]

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300`} style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}>
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">ERP</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded transition-colors"
            style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-hover)' }}
          >
            ☰
          </button>
        </div>

        <nav className="mt-8">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 transition-colors"
              style={{ color: 'var(--sidebar-text)', backgroundColor: 'transparent', opacity: 0.8 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.opacity = '0.8' }}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-4 flex-between border-b" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)' }}>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Aluminium Precision Casting ERP</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your operations efficiently</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg transition-colors hover:bg-opacity-80" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}>🔔</button>
            <button className="p-2 rounded-lg transition-colors hover:bg-opacity-80" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-tertiary)' }}>👤</button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-8 py-4 text-center text-sm border-t" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--header-border)', color: 'var(--text-secondary)' }}>
          <p>&copy; 2025 Aluminium Precision Casting ERP. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
