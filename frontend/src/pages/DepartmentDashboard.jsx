import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { 
  FileText, Send, DollarSign, Building2, Clipboard, Receipt,
  Package, BarChart3, Zap, Activity, AlertCircle, Plus, Clock,
  CheckCircle, Truck, ShoppingCart, Users, ArrowUp, ArrowDown, ChevronRight,
  TrendingUp, TrendingDown, Warehouse, AlertTriangle, Archive, ArrowRight
} from 'lucide-react'
import './DepartmentDashboard.css'

export default function DepartmentDashboard() {
  const { user } = useAuth()
  const userDept = user?.department?.toLowerCase() || 'buying'
  const [stats, setStats] = useState({})
  const [boms, setBOMs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDepartmentStats()
  }, [userDept])

  const fetchDepartmentStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

      if (userDept === 'buying' || userDept === 'procurement') {
        const [mrRes, rfqRes, quotRes, supplierRes, poRes, invRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/material-requests`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/rfqs`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/quotations`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/suppliers`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/purchase-orders`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/purchase-invoices`, { headers }).catch(() => ({}))
        ])
        const [mrs, rfqs, quotations, suppliers, pos, invoices] = await Promise.all([
          mrRes.json?.().catch(() => []), rfqRes.json?.().catch(() => []), quotRes.json?.().catch(() => []),
          supplierRes.json?.().catch(() => []), poRes.json?.().catch(() => []), invRes.json?.().catch(() => [])
        ])
        setStats({
          materialRequests: Array.isArray(mrs) ? mrs.length : 0,
          rfqs: Array.isArray(rfqs) ? rfqs.length : 0,
          quotations: Array.isArray(quotations) ? quotations.length : 0,
          suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
          purchaseOrders: Array.isArray(pos) ? pos.length : 0,
          invoices: Array.isArray(invoices) ? invoices.length : 0
        })
      } else if (userDept === 'production') {
        setStats({
          workOrders: 15, boms: 8, plans: 5, jobCards: 22,
          completedToday: 6, inProgress: 9, pending: 3
        })
      } else if (userDept === 'selling' || userDept === 'sales') {
        setStats({
          orders: 28, quotations: 12, invoices: 35, customers: 42,
          pending: 5, delivered: 23, cancelled: 2
        })
        
        try {
          const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms`, { headers }).catch(() => ({}))
          const bomData = await bomRes.json?.().catch(() => [])
          setBOMs(Array.isArray(bomData?.data) ? bomData.data.slice(0, 5) : [])
        } catch (err) {
          console.error('Error fetching BOMs:', err)
        }
      } else if (userDept === 'inventory' || userDept === 'stock') {
        setStats({
          warehouseLocations: 5, totalStock: 150, lowStockItems: 8,
          stockMovements: 245, stockTransfers: 18, grnRequests: 12,
          grnPending: 3, grnApproved: 9
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="dashboard"><p>Loading department dashboard...</p></div>

  const renderBuyingDashboard = () => {
    const statCardStyle = {
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }

    const statHeaderStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    }

    const statLabelStyle = {
      fontSize: '12px',
      color: '#6b7280',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    }

    const statIconStyle = {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }

    const statValueStyle = {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '4px'
    }

    const statTrendStyle = {
      fontSize: '11px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }

    const actionButtonStyle = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px',
      marginBottom: '8px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      cursor: 'pointer',
      textDecoration: 'none',
      color: '#374151',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s'
    }

    return (
      <div style={{ maxWidth: '100%', margin: '2rem', padding: '0' }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          padding: '20px'
        }}>
          <div style={{
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0', color: '#1f2937' }}>
                Welcome to Buying Module, {user?.full_name}! 🛍️
              </h1>
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                Manage procurement, vendors, quotations, and purchase orders
              </p>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{...statCardStyle, borderLeft: '4px solid #007bff'}}>
              <div style={statHeaderStyle}>
                <span style={statLabelStyle}>Material Requests</span>
                <div style={{...statIconStyle, backgroundColor: '#eff6ff'}}>📋</div>
              </div>
              <div style={statValueStyle}>{stats.materialRequests || 0}</div>
              <div style={{...statTrendStyle, color: '#0284c7'}}>
                <FileText size={12} /> Active requests
              </div>
            </div>

            <div style={{...statCardStyle, borderLeft: '4px solid #8b5cf6'}}>
              <div style={statHeaderStyle}>
                <span style={statLabelStyle}>RFQs Sent</span>
                <div style={{...statIconStyle, backgroundColor: '#faf5ff'}}>📤</div>
              </div>
              <div style={statValueStyle}>{stats.rfqs || 0}</div>
              <div style={{...statTrendStyle, color: '#7c3aed'}}>
                <Send size={12} /> Awaiting quotes
              </div>
            </div>

            <div style={{...statCardStyle, borderLeft: '4px solid #10b981'}}>
              <div style={statHeaderStyle}>
                <span style={statLabelStyle}>Quotations</span>
                <div style={{...statIconStyle, backgroundColor: '#f0fdf4'}}>💰</div>
              </div>
              <div style={statValueStyle}>{stats.quotations || 0}</div>
              <div style={{...statTrendStyle, color: '#10b981'}}>
                <TrendingUp size={12} /> {Math.round((stats.quotations || 0) * 0.75)} evaluating
              </div>
            </div>

            <div style={{...statCardStyle, borderLeft: '4px solid #f59e0b'}}>
              <div style={statHeaderStyle}>
                <span style={statLabelStyle}>Suppliers</span>
                <div style={{...statIconStyle, backgroundColor: '#fffbeb'}}>🏢</div>
              </div>
              <div style={statValueStyle}>{stats.suppliers || 0}</div>
              <div style={{...statTrendStyle, color: '#f59e0b'}}>
                <AlertCircle size={12} /> Active vendors
              </div>
            </div>

            <div style={{...statCardStyle, borderLeft: '4px solid #ef4444'}}>
              <div style={statHeaderStyle}>
                <span style={statLabelStyle}>Purchase Orders</span>
                <div style={{...statIconStyle, backgroundColor: '#fef2f2'}}>📦</div>
              </div>
              <div style={statValueStyle}>{stats.purchaseOrders || 0}</div>
              <div style={{...statTrendStyle, color: '#ef4444'}}>
                <TrendingDown size={12} /> {Math.round((stats.purchaseOrders || 0) * 0.4)} pending
              </div>
            </div>

            <div style={{...statCardStyle, borderLeft: '4px solid #06b6d4'}}>
              <div style={statHeaderStyle}>
                <span style={statLabelStyle}>Invoices</span>
                <div style={{...statIconStyle, backgroundColor: '#ecfdf5'}}>💵</div>
              </div>
              <div style={statValueStyle}>{stats.invoices || 0}</div>
              <div style={{...statTrendStyle, color: '#06b6d4'}}>
                <Receipt size={12} /> Received
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Average Lead Time</div>
              <div style={{fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px'}}>
                7.2 days
              </div>
              <div style={{...statTrendStyle, color: '#10b981', marginTop: '8px'}}>
                <ArrowDown size={12} /> 1 day improvement
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Quote Success Rate</div>
              <div style={{fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px'}}>
                87%
              </div>
              <div style={{...statTrendStyle, color: '#10b981', marginTop: '8px'}}>
                <ArrowUp size={12} /> 5% increase
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Avg PO Value</div>
              <div style={{fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px'}}>
                ₹75K
              </div>
              <div style={{...statTrendStyle, color: '#6b7280', marginTop: '8px'}}>
                <Clock size={12} /> This quarter
              </div>
            </div>

            <div style={statCardStyle}>
              <div style={statLabelStyle}>Pending Approvals</div>
              <div style={{fontSize: '20px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px'}}>
                {Math.round((stats.purchaseOrders || 0) * 0.15)}
              </div>
              <div style={{...statTrendStyle, color: '#f59e0b', marginTop: '8px'}}>
                <AlertCircle size={12} /> Need action
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '16px'
          }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              Quick Actions
            </h2>
            
            <a 
              href="/buying/material-requests/new" 
              style={{...actionButtonStyle, backgroundColor: '#eff6ff', borderColor: '#bfdbfe'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#dbeafe'; e.target.style.borderColor = '#93c5fd' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#eff6ff'; e.target.style.borderColor = '#bfdbfe' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Create Material Request</span>
              </div>
              <ChevronRight size={16} color="#0284c7" />
            </a>

            <a 
              href="/buying/rfqs/new" 
              style={{...actionButtonStyle, backgroundColor: '#faf5ff', borderColor: '#e9d5ff'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#f3e8ff'; e.target.style.borderColor = '#ddd6fe' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#faf5ff'; e.target.style.borderColor = '#e9d5ff' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} />
                <span>Send RFQ to Suppliers</span>
              </div>
              <ChevronRight size={16} color="#8b5cf6" />
            </a>

            <a 
              href="/buying/quotations" 
              style={{...actionButtonStyle, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#dcfce7'; e.target.style.borderColor = '#86efac' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f0fdf4'; e.target.style.borderColor = '#bbf7d0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} />
                <span>View Quotations</span>
              </div>
              <ChevronRight size={16} color="#10b981" />
            </a>

            <a 
              href="/buying/purchase-orders" 
              style={{...actionButtonStyle, backgroundColor: '#fef2f2', borderColor: '#fecaca'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#fee2e2'; e.target.style.borderColor = '#fca5a5' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#fef2f2'; e.target.style.borderColor = '#fecaca' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clipboard size={16} />
                <span>View Purchase Orders</span>
              </div>
              <ChevronRight size={16} color="#ef4444" />
            </a>

            <a 
              href="/buying/suppliers" 
              style={{...actionButtonStyle, backgroundColor: '#fffbeb', borderColor: '#fde68a'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#fef3c7'; e.target.style.borderColor = '#fcd34d' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#fffbeb'; e.target.style.borderColor = '#fde68a' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} />
                <span>Manage Suppliers</span>
              </div>
              <ChevronRight size={16} color="#f59e0b" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  const renderProductionDashboard = () => (
    <div className="prod-dashboard">
      <div className="prod-dashboard-header">
        <div className="prod-header-content">
          <h1>Production Dashboard</h1>
          <p>Welcome back, <span className="prod-user-name">{user?.full_name}</span></p>
          <p className="prod-header-subtitle">Manage work orders, BOMs, production plans, and job cards</p>
        </div>
        <div className="prod-header-badge">
          <div className="prod-badge-status">
            <span className="prod-status-indicator"></span>
            Production Department
          </div>
        </div>
      </div>

      <div className="prod-kpi-section">
        <div className="prod-kpi-row">
          <div className="prod-kpi-card prod-kpi-primary">
            <div className="prod-kpi-icon">
              <Truck size={24} />
            </div>
            <div className="prod-kpi-details">
              <span className="prod-kpi-label">Work Orders</span>
              <div className="prod-kpi-value-row">
                <span className="prod-kpi-value">{stats.workOrders}</span>
                <span className="prod-kpi-subtitle">Total</span>
              </div>
            </div>
          </div>

          <div className="prod-kpi-card prod-kpi-warning">
            <div className="prod-kpi-icon">
              <Activity size={24} />
            </div>
            <div className="prod-kpi-details">
              <span className="prod-kpi-label">In Progress</span>
              <div className="prod-kpi-value-row">
                <span className="prod-kpi-value prod-highlight">{stats.inProgress}</span>
                <span className="prod-kpi-subtitle">Active</span>
              </div>
            </div>
          </div>

          <div className="prod-kpi-card prod-kpi-success">
            <div className="prod-kpi-icon">
              <CheckCircle size={24} />
            </div>
            <div className="prod-kpi-details">
              <span className="prod-kpi-label">Completed</span>
              <div className="prod-kpi-value-row">
                <span className="prod-kpi-value">{stats.completedToday}</span>
                <span className="prod-kpi-subtitle">Today</span>
              </div>
            </div>
          </div>

          <div className="prod-kpi-card prod-kpi-info">
            <div className="prod-kpi-icon">
              <AlertCircle size={24} />
            </div>
            <div className="prod-kpi-details">
              <span className="prod-kpi-label">Pending</span>
              <div className="prod-kpi-value-row">
                <span className="prod-kpi-value">{stats.pending}</span>
                <span className="prod-kpi-subtitle">Awaiting</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="prod-content-grid">
        <div className="prod-col-main">
          <div className="prod-stats-section">
            <div className="prod-section-header">
              <h2>Production Resources</h2>
            </div>
            <div className="prod-stat-cards-grid">
              <div className="prod-stat-card-item">
                <div className="prod-stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <BarChart3 size={20} style={{ color: '#F59E0B' }} />
                </div>
                <div className="prod-stat-card-info">
                  <span className="prod-stat-card-label">BOMs</span>
                  <span className="prod-stat-card-number">{stats.boms}</span>
                </div>
              </div>

              <div className="prod-stat-card-item">
                <div className="prod-stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <Clipboard size={20} style={{ color: '#3B82F6' }} />
                </div>
                <div className="prod-stat-card-info">
                  <span className="prod-stat-card-label">Production Plans</span>
                  <span className="prod-stat-card-number">{stats.plans}</span>
                </div>
              </div>

              <div className="prod-stat-card-item">
                <div className="prod-stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <FileText size={20} style={{ color: '#8B5CF6' }} />
                </div>
                <div className="prod-stat-card-info">
                  <span className="prod-stat-card-label">Job Cards</span>
                  <span className="prod-stat-card-number">{stats.jobCards}</span>
                </div>
              </div>

              <div className="prod-stat-card-item">
                <div className="prod-stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <TrendingUp size={20} style={{ color: '#10B981' }} />
                </div>
                <div className="prod-stat-card-info">
                  <span className="prod-stat-card-label">Efficiency Rate</span>
                  <span className="prod-stat-card-number">85%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="prod-activity-section">
            <div className="prod-section-header">
              <h2>Recent Activity</h2>
            </div>
            <div className="prod-activity-list">
              <div className="prod-activity-row prod-activity-completed">
                <div className="prod-activity-icon">
                  <CheckCircle size={18} />
                </div>
                <div className="prod-activity-content">
                  <h4>Work Order Completed</h4>
                  <p>WO-2024-001 finished assembly stage</p>
                </div>
                <div className="prod-activity-time">
                  <span className="prod-status-badge prod-badge-completed">completed</span>
                  <span className="prod-time-text">15 mins ago</span>
                </div>
              </div>

              <div className="prod-activity-row prod-activity-in-progress">
                <div className="prod-activity-icon">
                  <Activity size={18} />
                </div>
                <div className="prod-activity-content">
                  <h4>Production Plan Updated</h4>
                  <p>Daily plan for QC stage revised</p>
                </div>
                <div className="prod-activity-time">
                  <span className="prod-status-badge prod-badge-in-progress">in-progress</span>
                  <span className="prod-time-text">1 hour ago</span>
                </div>
              </div>

              <div className="prod-activity-row prod-activity-pending">
                <div className="prod-activity-icon">
                  <Truck size={18} />
                </div>
                <div className="prod-activity-content">
                  <h4>New Work Order Created</h4>
                  <p>WO-2024-015 added to production queue</p>
                </div>
                <div className="prod-activity-time">
                  <span className="prod-status-badge prod-badge-pending">pending</span>
                  <span className="prod-time-text">2 hours ago</span>
                </div>
              </div>

              <div className="prod-activity-row prod-activity-alert">
                <div className="prod-activity-icon">
                  <AlertCircle size={18} />
                </div>
                <div className="prod-activity-content">
                  <h4>Quality Issue Reported</h4>
                  <p>Rework required for batch #JC-2024-008</p>
                </div>
                <div className="prod-activity-time">
                  <span className="prod-status-badge prod-badge-alert">alert</span>
                  <span className="prod-time-text">3 hours ago</span>
                </div>
              </div>

              <div className="prod-activity-row prod-activity-completed">
                <div className="prod-activity-icon">
                  <BarChart3 size={18} />
                </div>
                <div className="prod-activity-content">
                  <h4>Daily Report Generated</h4>
                  <p>Production metrics for 01-Dec-2024</p>
                </div>
                <div className="prod-activity-time">
                  <span className="prod-status-badge prod-badge-completed">completed</span>
                  <span className="prod-time-text">5 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="prod-col-sidebar">
          <div className="prod-actions-section">
            <div className="prod-section-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="prod-action-list">
              <a href="/production/work-orders/new" className="prod-action-btn prod-action-primary">
                <Plus size={18} />
                <div className="prod-action-content">
                  <span className="prod-action-title">Create Work Order</span>
                  <span className="prod-action-meta">New production task</span>
                </div>
                <ArrowRight size={16} />
              </a>
              <a href="/production/work-orders" className="prod-action-btn prod-action-primary">
                <Truck size={18} />
                <div className="prod-action-content">
                  <span className="prod-action-title">Work Orders</span>
                  <span className="prod-action-meta">{stats.inProgress} in progress</span>
                </div>
                <ArrowRight size={16} />
              </a>
              <a href="/production/boms" className="prod-action-btn prod-action-secondary">
                <BarChart3 size={18} />
                <div className="prod-action-content">
                  <span className="prod-action-title">BOMs</span>
                  <span className="prod-action-meta">Bill of materials</span>
                </div>
                <ArrowRight size={16} />
              </a>
              <a href="/production/job-cards" className="prod-action-btn prod-action-secondary">
                <FileText size={18} />
                <div className="prod-action-content">
                  <span className="prod-action-title">Job Cards</span>
                  <span className="prod-action-meta">Track tasks</span>
                </div>
                <ArrowRight size={16} />
              </a>
              <a href="/production/plans" className="prod-action-btn prod-action-tertiary">
                <Clipboard size={18} />
                <div className="prod-action-content">
                  <span className="prod-action-title">Production Plans</span>
                  <span className="prod-action-meta">View schedules</span>
                </div>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="prod-alert-section">
            <div className="prod-section-header">
              <h2>Alerts</h2>
            </div>
            <div className="prod-alert-card">
              <AlertCircle size={20} />
              <div className="prod-alert-content">
                <h4>Quality Alert</h4>
                <p>1 batch requires rework inspection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSellingDashboard = () => {
    const sellingStatCards = [
      { label: 'Sales Orders', value: stats.orders || 0, icon: ShoppingCart, color: 'from-green-500 to-green-600', bgColor: 'bg-green-100' },
      { label: 'Quotations', value: stats.quotations || 0, icon: FileText, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-100' },
      { label: 'Invoices', value: stats.invoices || 0, icon: DollarSign, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-100' },
      { label: 'Customers', value: stats.customers || 0, icon: Users, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100' },
      { label: 'Pending', value: stats.pending || 0, icon: Clock, color: 'from-red-500 to-red-600', bgColor: 'bg-red-100' },
      { label: 'Delivered', value: stats.delivered || 0, icon: CheckCircle, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-100' }
    ]

    const getSellingIconColor = (color) => {
      const colorMap = {
        'from-green-500': 'text-green-600',
        'from-blue-500': 'text-blue-600',
        'from-purple-500': 'text-purple-600',
        'from-orange-500': 'text-orange-600',
        'from-red-500': 'text-red-600',
        'from-cyan-500': 'text-cyan-600'
      }
      return colorMap[color] || 'text-gray-600'
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Welcome back, {user?.full_name}! 👋</h1>
              <p className="text-gray-600 mt-2">Sales Dashboard - Manage quotations, orders, invoices & customers</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {sellingStatCards.map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-600 text-sm font-medium mb-2">{stat.label}</p>
                      <h3 className="text-4xl font-bold text-gray-900">{stat.value}</h3>
                      <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                        <ArrowUp size={14} /> 8% from last month
                      </p>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-lg flex-shrink-0`}>
                      <Icon size={24} className={getSellingIconColor(stat.color)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Sales Performance</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">This Week</button>
                  <button className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg">This Month</button>
                </div>
              </div>
              <div className="h-64 bg-gradient-to-t from-green-50 to-transparent rounded-lg flex items-end justify-center gap-2 p-4">
                <div className="w-12 h-32 bg-green-500 rounded-t opacity-80"></div>
                <div className="w-12 h-40 bg-green-600 rounded-t"></div>
                <div className="w-12 h-28 bg-green-500 rounded-t opacity-80"></div>
                <div className="w-12 h-36 bg-green-600 rounded-t"></div>
                <div className="w-12 h-24 bg-green-500 rounded-t opacity-80"></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Sales Metrics</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <div className="mt-1">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp size={16} className="text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Avg Order Value</p>
                    <p className="text-xs text-gray-500">₹18,500</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <div className="mt-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart size={16} className="text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Total Revenue</p>
                    <p className="text-xs text-gray-500">₹5.2M</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <div className="mt-1">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users size={16} className="text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New Customers</p>
                    <p className="text-xs text-gray-500">+12 this month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Available BOMs</h2>
                <a href="/production/boms" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View All <ChevronRight size={16} />
                </a>
              </div>
              {boms.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">BOM ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Cost</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boms.map((bom, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900 font-medium">{bom.bom_id}</td>
                          <td className="py-3 px-4 text-gray-700">{bom.item_code || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-700">{bom.product_name || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              bom.status === 'active' ? 'bg-green-100 text-green-700' :
                              bom.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {bom.status || 'Draft'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-700 font-medium">₹{parseFloat(bom.total_cost || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <a href={`/selling/quotations/new?bom_id=${bom.bom_id}`} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition">
                              Use in Quote
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No BOMs available. Create one in Production module.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
                <a href="/selling/orders" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
                  View All <ChevronRight size={16} />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Order ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'SO-001', amount: '₹25,000', status: 'Delivered' },
                      { id: 'SO-002', amount: '₹18,500', status: 'Processing' },
                      { id: 'SO-003', amount: '₹32,000', status: 'Pending' }
                    ].map((order, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900 font-medium">{order.id}</td>
                        <td className="py-3 px-4 text-gray-700">{order.amount}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="space-y-3">
                <a href="/selling/quotations/new" className="w-full flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition text-gray-700 hover:text-blue-600 group">
                  <div className="flex items-center gap-2">
                    <Plus size={18} />
                    <span className="text-sm font-medium">Create Quote</span>
                  </div>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                </a>
                <a href="/selling/orders" className="w-full flex items-center justify-between p-3 hover:bg-green-50 rounded-lg transition text-gray-700 hover:text-green-600 group">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={18} />
                    <span className="text-sm font-medium">Create Order</span>
                  </div>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                </a>
                <a href="/selling/invoices" className="w-full flex items-center justify-between p-3 hover:bg-purple-50 rounded-lg transition text-gray-700 hover:text-purple-600 group">
                  <div className="flex items-center gap-2">
                    <DollarSign size={18} />
                    <span className="text-sm font-medium">Create Invoice</span>
                  </div>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                </a>
                <a href="/selling/customers" className="w-full flex items-center justify-between p-3 hover:bg-orange-50 rounded-lg transition text-gray-700 hover:text-orange-600 group">
                  <div className="flex items-center gap-2">
                    <Users size={18} />
                    <span className="text-sm font-medium">View Customers</span>
                  </div>
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDashboard = () => {
    switch (userDept) {
      case 'buying':
      case 'procurement':
        return renderBuyingDashboard()
      case 'production':
        return renderProductionDashboard()
      case 'selling':
      case 'sales':
        return renderSellingDashboard()
      case 'inventory':
      case 'stock':
        return (
          <div className="inv-dashboard">
            <div className="inv-dashboard-header">
              <div className="inv-header-content">
                <h1>Inventory Dashboard</h1>
                <p>Welcome back, <span className="inv-user-name">{user?.full_name}</span></p>
                <p className="inv-header-subtitle">Manage warehouse stock, transfers, GRN requests, and inventory reconciliation</p>
              </div>
              <div className="inv-header-badge">
                <div className="inv-badge-status">
                  <span className="inv-status-indicator"></span>
                  Inventory Department
                </div>
              </div>
            </div>

            <div className="inv-kpi-section">
              <div className="inv-kpi-row">
                <div className="inv-kpi-card inv-kpi-primary">
                  <div className="inv-kpi-icon">
                    <CheckCircle size={24} />
                  </div>
                  <div className="inv-kpi-details">
                    <span className="inv-kpi-label">GRN Requests</span>
                    <div className="inv-kpi-value-row">
                      <span className="inv-kpi-value">{stats.grnRequests || 0}</span>
                      <span className="inv-kpi-subtitle">Total</span>
                    </div>
                  </div>
                </div>

                <div className="inv-kpi-card inv-kpi-warning">
                  <div className="inv-kpi-icon">
                    <Clock size={24} />
                  </div>
                  <div className="inv-kpi-details">
                    <span className="inv-kpi-label">Pending Approval</span>
                    <div className="inv-kpi-value-row">
                      <span className="inv-kpi-value inv-highlight">{stats.grnPending || 0}</span>
                      <span className="inv-kpi-subtitle">Awaiting</span>
                    </div>
                  </div>
                </div>

                <div className="inv-kpi-card inv-kpi-success">
                  <div className="inv-kpi-icon">
                    <Archive size={24} />
                  </div>
                  <div className="inv-kpi-details">
                    <span className="inv-kpi-label">GRN Approved</span>
                    <div className="inv-kpi-value-row">
                      <span className="inv-kpi-value">{stats.grnApproved || 0}</span>
                      <span className="inv-kpi-subtitle">Stored</span>
                    </div>
                  </div>
                </div>

                <div className="inv-kpi-card inv-kpi-danger">
                  <div className="inv-kpi-icon">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="inv-kpi-details">
                    <span className="inv-kpi-label">Low Stock Items</span>
                    <div className="inv-kpi-value-row">
                      <span className="inv-kpi-value">{stats.lowStockItems || 0}</span>
                      <span className="inv-kpi-subtitle">Alert</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="inv-content-grid">
              <div className="inv-col-main">
                <div className="inv-stats-section">
                  <div className="inv-section-header">
                    <h2>Warehouse & Inventory</h2>
                  </div>
                  <div className="inv-stat-cards-grid">
                    <div className="inv-stat-card-item">
                      <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                        <Warehouse size={20} style={{ color: '#10B981' }} />
                      </div>
                      <div className="inv-stat-card-info">
                        <span className="inv-stat-card-label">Warehouse Locations</span>
                        <span className="inv-stat-card-number">{stats.warehouseLocations || 0}</span>
                      </div>
                    </div>

                    <div className="inv-stat-card-item">
                      <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                        <Package size={20} style={{ color: '#3B82F6' }} />
                      </div>
                      <div className="inv-stat-card-info">
                        <span className="inv-stat-card-label">Total Stock Items</span>
                        <span className="inv-stat-card-number">{stats.totalStock || 0}</span>
                      </div>
                    </div>

                    <div className="inv-stat-card-item">
                      <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                        <Activity size={20} style={{ color: '#8B5CF6' }} />
                      </div>
                      <div className="inv-stat-card-info">
                        <span className="inv-stat-card-label">Stock Movements</span>
                        <span className="inv-stat-card-number">{stats.stockMovements || 0}</span>
                      </div>
                    </div>

                    <div className="inv-stat-card-item">
                      <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                        <Truck size={20} style={{ color: '#F59E0B' }} />
                      </div>
                      <div className="inv-stat-card-info">
                        <span className="inv-stat-card-label">Stock Transfers</span>
                        <span className="inv-stat-card-number">{stats.stockTransfers || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="inv-col-sidebar">
                <div className="inv-actions-section">
                  <div className="inv-section-header">
                    <h2>Quick Actions</h2>
                  </div>
                  <div className="inv-action-list">
                    <a href="/inventory/grn-requests" className="inv-action-btn inv-action-primary">
                      <CheckCircle size={18} />
                      <div className="inv-action-content">
                        <span className="inv-action-title">GRN Requests</span>
                        <span className="inv-action-meta">{stats.grnPending || 0} pending</span>
                      </div>
                      <ArrowRight size={16} />
                    </a>
                    <a href="/inventory/stock-entries" className="inv-action-btn inv-action-primary">
                      <Plus size={18} />
                      <div className="inv-action-content">
                        <span className="inv-action-title">Create Stock Entry</span>
                        <span className="inv-action-meta">Record goods</span>
                      </div>
                      <ArrowRight size={16} />
                    </a>
                    <a href="/inventory/stock-transfers" className="inv-action-btn inv-action-secondary">
                      <Truck size={18} />
                      <div className="inv-action-content">
                        <span className="inv-action-title">Stock Transfer</span>
                        <span className="inv-action-meta">Inter-warehouse move</span>
                      </div>
                      <ArrowRight size={16} />
                    </a>
                    <a href="/inventory/stock-balance" className="inv-action-btn inv-action-tertiary">
                      <Package size={18} />
                      <div className="inv-action-content">
                        <span className="inv-action-title">View Stock Balance</span>
                        <span className="inv-action-meta">Check inventory</span>
                      </div>
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>

                <div className="inv-alert-section">
                  <div className="inv-section-header">
                    <h2>Alerts</h2>
                  </div>
                  <div className="inv-alert-card">
                    <AlertCircle size={20} />
                    <div className="inv-alert-content">
                      <h4>Low Stock Warning</h4>
                      <p>{stats.lowStockItems || 0} items are below reorder level</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return renderBuyingDashboard()
    }
  }

  return renderDashboard()
}
