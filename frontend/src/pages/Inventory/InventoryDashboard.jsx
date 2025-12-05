import React, { useState, useEffect } from 'react'
import { 
  Building2, Package, AlertCircle, Activity, Truck, BarChart3, 
  FileText, Zap, Plus, CheckCircle, Clock, Archive, TrendingUp,
  AlertTriangle, Warehouse, ArrowRight
} from 'lucide-react'
import axios from 'axios'
import './Inventory.css'

export default function InventoryDashboard({ user }) {
  const [stats, setStats] = useState({
    warehouseLocations: 0,
    totalStock: 0,
    lowStockItems: 0,
    stockMovements: 0,
    stockTransfers: 0,
    reconciliations: 0,
    grnRequests: 0,
    grnPending: 0,
    grnApproved: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const [warehouseRes, balanceRes, ledgerRes, transferRes, grnRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/stock/warehouses`, { headers }).catch(() => ({})),
        fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, { headers }).catch(() => ({})),
        fetch(`${import.meta.env.VITE_API_URL}/stock/ledger`, { headers }).catch(() => ({})),
        fetch(`${import.meta.env.VITE_API_URL}/stock/transfers`, { headers }).catch(() => ({})),
        axios.get('/api/grn-requests').catch(() => ({}))
      ])

      const [warehouses, balances, ledger, transfers] = await Promise.all([
        warehouseRes.json?.().catch(() => []),
        balanceRes.json?.().catch(() => []),
        ledgerRes.json?.().catch(() => []),
        transferRes.json?.().catch(() => [])
      ])

      const lowStockCount = Array.isArray(balances) 
        ? balances.filter(item => item.reorder_level && item.quantity_on_hand < item.reorder_level).length 
        : 0

      let grnData = { data: [] }
      if (grnRes.data) {
        grnData = grnRes.data
      }

      const grnRequests = Array.isArray(grnData.data) ? grnData.data : []
      const grnPending = grnRequests.filter(g => g.status === 'awaiting_inventory_approval').length
      const grnApproved = grnRequests.filter(g => g.status === 'approved').length

      setStats({
        warehouseLocations: Array.isArray(warehouses) ? warehouses.length : 0,
        totalStock: Array.isArray(balances) ? balances.length : 0,
        lowStockItems: lowStockCount,
        stockMovements: Array.isArray(ledger) ? ledger.length : 0,
        stockTransfers: Array.isArray(transfers) ? transfers.length : 0,
        reconciliations: 0,
        grnRequests: grnRequests.length,
        grnPending,
        grnApproved
      })

      setRecentActivity([
        { type: 'GRN Request', action: 'Awaiting Inventory Approval', time: '30 mins ago', status: 'pending', count: grnPending },
        { type: 'Stock Entry', action: 'Goods Received', time: '1 hour ago', status: 'completed' },
        { type: 'Stock Transfer', action: 'Inter-warehouse Movement', time: '3 hours ago', status: 'completed' },
        { type: 'Low Stock Alert', action: `${lowStockCount} items below reorder level`, time: '2 hours ago', status: 'alert' },
        { type: 'Stock Reconciliation', action: 'Physical count initiated', time: '5 hours ago', status: 'in-progress' }
      ])
    } catch (error) {
      console.error('Error fetching inventory stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="inv-dashboard inv-dashboard-loading"><p>Loading inventory data...</p></div>
  }

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
                <span className="inv-kpi-value">{stats.grnRequests}</span>
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
                <span className="inv-kpi-value inv-highlight">{stats.grnPending}</span>
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
                <span className="inv-kpi-value">{stats.grnApproved}</span>
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
                <span className="inv-kpi-value">{stats.lowStockItems}</span>
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
                  <span className="inv-stat-card-number">{stats.warehouseLocations}</span>
                </div>
              </div>

              <div className="inv-stat-card-item">
                <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <Package size={20} style={{ color: '#3B82F6' }} />
                </div>
                <div className="inv-stat-card-info">
                  <span className="inv-stat-card-label">Total Stock Items</span>
                  <span className="inv-stat-card-number">{stats.totalStock}</span>
                </div>
              </div>

              <div className="inv-stat-card-item">
                <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <Activity size={20} style={{ color: '#8B5CF6' }} />
                </div>
                <div className="inv-stat-card-info">
                  <span className="inv-stat-card-label">Stock Movements</span>
                  <span className="inv-stat-card-number">{stats.stockMovements}</span>
                </div>
              </div>

              <div className="inv-stat-card-item">
                <div className="inv-stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                  <Truck size={20} style={{ color: '#F59E0B' }} />
                </div>
                <div className="inv-stat-card-info">
                  <span className="inv-stat-card-label">Stock Transfers</span>
                  <span className="inv-stat-card-number">{stats.stockTransfers}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="inv-activity-section">
            <div className="inv-section-header">
              <h2>Recent Activity</h2>
            </div>
            <div className="inv-activity-list">
              {recentActivity.map((activity, idx) => {
                let IconComponent = Activity
                if (activity.type === 'GRN Request') IconComponent = CheckCircle
                else if (activity.type === 'Stock Entry') IconComponent = FileText
                else if (activity.type === 'Stock Transfer') IconComponent = Truck
                else if (activity.type === 'Low Stock Alert') IconComponent = AlertCircle
                else if (activity.type === 'Stock Reconciliation') IconComponent = BarChart3
                
                return (
                  <div key={idx} className={`inv-activity-row inv-activity-${activity.status}`}>
                    <div className="inv-activity-icon">
                      <IconComponent size={18} />
                    </div>
                    <div className="inv-activity-content">
                      <h4>{activity.type}</h4>
                      <p>{activity.action}</p>
                    </div>
                    <div className="inv-activity-time">
                      <span className={`inv-status-badge inv-badge-${activity.status}`}>{activity.status}</span>
                      <span className="inv-time-text">{activity.time}</span>
                    </div>
                  </div>
                )
              })}
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
                  <span className="inv-action-meta">{stats.grnPending} pending</span>
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
              <a href="/inventory/reconciliation" className="inv-action-btn inv-action-secondary">
                <BarChart3 size={18} />
                <div className="inv-action-content">
                  <span className="inv-action-title">Stock Reconciliation</span>
                  <span className="inv-action-meta">Physical count</span>
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
                <p>{stats.lowStockItems} items are below reorder level</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
