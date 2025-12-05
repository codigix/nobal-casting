import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import { Plus, Edit2, Trash2, Truck, CheckCircle, AlertCircle, Clock, Zap, TrendingUp } from 'lucide-react'
import './Production.css'

export default function WorkOrder() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
    totalCost: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })

  useEffect(() => {
    fetchWorkOrders()
  }, [filters])

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await productionService.getWorkOrders({ ...filters, limit: 1000 })
      const ordersData = response.data || []
      setOrders(ordersData)
      calculateStats(ordersData)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch work orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (ordersData) => {
    const total = ordersData.length
    const inProgress = ordersData.filter(o => o.status === 'in-progress').length
    const completed = ordersData.filter(o => o.status === 'completed').length
    const pending = ordersData.filter(o => ['draft', 'planned'].includes(o.status)).length
    const totalCost = ordersData.reduce((sum, o) => sum + (o.total_cost || 0), 0)

    setStats({ totalOrders: total, inProgress, completed, pending, totalCost })
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (wo_id) => {
    if (window.confirm('Delete this work order?')) {
      try {
        await productionService.deleteWorkOrder(wo_id)
        setSuccess('Work order deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchWorkOrders()
      } catch (err) {
        setError(err.message || 'Failed to delete work order')
      }
    }
  }

  const handleEdit = (order) => {
    navigate(`/production/work-orders/form/${order.wo_id}`)
  }

  const handleTrack = (order) => {
    navigate(`/production/work-orders/track/${order.wo_id}`)
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'status-draft',
      planned: 'status-planned',
      'in-progress': 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    }
    return colors[status] || 'status-draft'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: { bg: '#fee2e2', text: '#991b1b' },
      medium: { bg: '#fef3c7', text: '#92400e' },
      low: { bg: '#dcfce7', text: '#166534' }
    }
    return colors[priority] || { bg: '#f3f4f6', text: '#6b7280' }
  }

  return (
    <div className="wo-dashboard">
      <div className="wo-dashboard-header">
        <div className="wo-header-content">
          <h1>Work Orders</h1>
          <p>Manage and track production work orders</p>
          <div className="wo-header-subtitle">Production Department • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button
          onClick={() => navigate('/production/work-orders/form')}
          className="wo-new-order-btn"
        >
          <Plus size={18} /> New Work Order
        </button>
      </div>

      {success && (
        <div className="wo-alert wo-alert-success">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="wo-alert wo-alert-error">
          ✕ {error}
        </div>
      )}

      <div className="wo-kpi-section">
        <div className="wo-kpi-row">
          <div className="wo-kpi-card wo-kpi-primary">
            <div className="wo-kpi-icon">
              <Zap size={24} />
            </div>
            <div className="wo-kpi-details">
              <div className="wo-kpi-label">Total Orders</div>
              <div className="wo-kpi-value-row">
                <span className="wo-kpi-value">{stats.totalOrders}</span>
              </div>
            </div>
          </div>

          <div className="wo-kpi-card wo-kpi-warning">
            <div className="wo-kpi-icon">
              <Clock size={24} />
            </div>
            <div className="wo-kpi-details">
              <div className="wo-kpi-label">In Progress</div>
              <div className="wo-kpi-value-row">
                <span className="wo-kpi-value">{stats.inProgress}</span>
              </div>
            </div>
          </div>

          <div className="wo-kpi-card wo-kpi-success">
            <div className="wo-kpi-icon">
              <CheckCircle size={24} />
            </div>
            <div className="wo-kpi-details">
              <div className="wo-kpi-label">Completed</div>
              <div className="wo-kpi-value-row">
                <span className="wo-kpi-value">{stats.completed}</span>
              </div>
            </div>
          </div>

          <div className="wo-kpi-card wo-kpi-info">
            <div className="wo-kpi-icon">
              <AlertCircle size={24} />
            </div>
            <div className="wo-kpi-details">
              <div className="wo-kpi-label">Pending</div>
              <div className="wo-kpi-value-row">
                <span className="wo-kpi-value">{stats.pending}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wo-content-grid">
        <div className="wo-col-main">
          <div className="wo-filter-section">
            <div className="wo-filter-group">
              <label>Status</label>
              <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="wo-filter-group">
              <label>Search</label>
              <input type="text" name="search" placeholder="Search order ID or item..." value={filters.search} onChange={handleFilterChange} />
            </div>
          </div>

          {loading ? (
            <div className="wo-loading">
              <div className="wo-loading-icon">⏳</div>
              <div className="wo-loading-text">Loading work orders...</div>
            </div>
          ) : orders.length > 0 ? (
            <div className="wo-table-container">
              <table className="wo-table">
                <thead>
                  <tr>
                    <th>WO ID</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total Cost</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.wo_id}>
                      <td><strong>{order.wo_id}</strong></td>
                      <td>{order.item_name || order.item_code}</td>
                      <td>{order.qty_to_manufacture || order.quantity}</td>
                      <td>₹{order.unit_cost?.toFixed(2) || '0.00'}</td>
                      <td>₹{order.total_cost?.toFixed(2) || '0.00'}</td>
                      <td>
                        <span className={`wo-priority-badge ${order.priority}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td>{order.required_date ? new Date(order.required_date).toLocaleDateString() : 'N/A'}</td>
                      <td><span className={`wo-status-badge ${getStatusColor(order.status)}`}>{order.status}</span></td>
                      <td>
                        <div className="wo-entry-actions">
                          <button
                            className="wo-btn-track"
                            onClick={() => handleTrack(order)}
                            title="Track"
                          >
                            <Truck size={14} />
                          </button>
                          <button className="wo-btn-edit" onClick={() => handleEdit(order)} title="Edit"><Edit2 size={14} /></button>
                          <button className="wo-btn-delete" onClick={() => handleDelete(order.wo_id)} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="wo-empty-state">
              <div className="wo-empty-icon">📭</div>
              <div className="wo-empty-title">No work orders found</div>
              <div className="wo-empty-text">Create a new work order to get started</div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  )
}
