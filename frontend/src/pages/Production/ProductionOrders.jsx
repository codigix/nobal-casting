import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Truck, Trash2, Calendar, Package, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import * as productionService from '../../services/productionService'
import CreateWorkOrderModal from '../../components/Production/CreateWorkOrderModal'
import './Production.css'

export default function ProductionOrders() {
  const navigate = useNavigate()
  const [workOrders, setWorkOrders] = useState([])
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      
      const [ordersRes, dashRes] = await Promise.all([
        productionService.getWorkOrders({ limit: 100 }),
        productionService.getProductionDashboard(today)
      ])

      setWorkOrders(ordersRes.data || [])
      setDashboardData(dashRes || {})
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = () => {
    if (!workOrders.length) {
      return {
        totalOrders: 0,
        plannedOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        highPriorityOrders: 0,
        overdueOrders: 0,
        totalCost: 0,
        totalQuantity: 0
      }
    }

    const today = new Date()
    const metrics = {
      totalOrders: workOrders.length,
      plannedOrders: workOrders.filter(o => o.status === 'planned').length,
      inProgressOrders: workOrders.filter(o => o.status === 'in-progress').length,
      completedOrders: workOrders.filter(o => o.status === 'completed').length,
      highPriorityOrders: workOrders.filter(o => o.priority === 'high').length,
      overdueOrders: workOrders.filter(o => {
        if (o.status === 'completed' || o.status === 'cancelled') return false
        return o.required_date && new Date(o.required_date) < today
      }).length,
      totalCost: workOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0),
      totalQuantity: workOrders.reduce((sum, o) => sum + (o.qty_to_manufacture || 0), 0)
    }
    return metrics
  }

  const getStatusTrend = (count, previousCount = 0) => {
    if (!previousCount) return null
    const percentage = Math.round(((count - previousCount) / previousCount) * 100)
    return percentage > 0 ? `↑ ${percentage}%` : `↓ ${Math.abs(percentage)}%`
  }

  const handleEdit = (order) => {
    navigate(`/production/work-orders/form/${order.wo_id}`)
  }

  const handleTrack = (order) => {
    navigate(`/production/job-cards?wo_id=${order.wo_id}`)
  }

  const handleDelete = async (wo_id) => {
    if (window.confirm('Delete this work order?')) {
      try {
        await productionService.deleteWorkOrder(wo_id)
        setSuccess('Work order deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchData()
      } catch (err) {
        setError(err.message || 'Failed to delete work order')
      }
    }
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

  const getStatusIcon = (status) => {
    const icons = {
      draft: '📝',
      planned: '📋',
      'in-progress': '⚙️',
      completed: '✅',
      cancelled: '❌'
    }
    return icons[status] || '📋'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: { bg: '#fee2e2', text: '#991b1b' },
      medium: { bg: '#fef3c7', text: '#92400e' },
      low: { bg: '#dcfce7', text: '#166534' }
    }
    return colors[priority] || { bg: '#f3f4f6', text: '#6b7280' }
  }

  const getDepartmentColor = (index) => {
    const colors = [
      { bg: 'from-blue-50 to-blue-100', border: '#3b82f6', icon: '#3b82f6' },
      { bg: 'from-purple-50 to-purple-100', border: '#8b5cf6', icon: '#8b5cf6' },
      { bg: 'from-orange-50 to-orange-100', border: '#f59e0b', icon: '#f59e0b' },
      { bg: 'from-green-50 to-green-100', border: '#10b981', icon: '#10b981' },
      { bg: 'from-red-50 to-red-100', border: '#ef4444', icon: '#ef4444' },
      { bg: 'from-cyan-50 to-cyan-100', border: '#06b6d4', icon: '#06b6d4' }
    ]
    return colors[index % colors.length]
  }

  const metrics = calculateMetrics()
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })

  return (
    <div style={{ background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)', minHeight: '100vh', paddingBottom: '30px' }}>
      <div className="production-container">
        
        {/* Header with Date/Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px', paddingTop: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>Welcome back, Production! 👋</h1>
            <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Production Orders - Manage work orders and track manufacturing tasks</p>
          </div>
          <div style={{ textAlign: 'right', color: '#666' }}>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>{dateStr}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>{timeStr}</div>
          </div>
        </div>

        {success && (
          <div style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#16a34a',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#dc2626',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px', animation: 'spin 2s linear infinite' }}>⚙️</div>
            <div style={{ color: '#666', fontSize: '1.1rem' }}>Loading production data...</div>
          </div>
        ) : (
          <>
            {/* Stat Cards - 6 columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              {/* Total Orders */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.totalOrders}</div>
                  </div>
                  <div style={{ background: '#dbeafe', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={22} color='#3b82f6' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>📈 +8% from last week</div>
              </div>

              {/* Planned Orders */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planned</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.plannedOrders}</div>
                  </div>
                  <div style={{ background: '#f3e8ff', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={22} color='#8b5cf6' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>📈 +5% from last week</div>
              </div>

              {/* In Progress */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Progress</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.inProgressOrders}</div>
                  </div>
                  <div style={{ background: '#fef3c7', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={22} color='#f59e0b' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>📈 +12% from last week</div>
              </div>

              {/* Completed */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.completedOrders}</div>
                  </div>
                  <div style={{ background: '#dcfce7', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={22} color='#10b981' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>📈 +15% from last week</div>
              </div>

              {/* High Priority */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High Priority</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.highPriorityOrders}</div>
                  </div>
                  <div style={{ background: '#fee2e2', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={22} color='#ef4444' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626' }}>⚠️ Requires attention</div>
              </div>

              {/* Overdue */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overdue</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.overdueOrders}</div>
                  </div>
                  <div style={{ background: '#cffafe', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={22} color='#06b6d4' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626' }}>🔔 Action needed</div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              {/* Total Quantity */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Quantity</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>{metrics.totalQuantity}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>units to manufacture</div>
              </div>

              {/* Total Cost */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Cost</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>₹{(metrics.totalCost / 100000).toFixed(1)}L</div>
                <div style={{ fontSize: '12px', color: '#666' }}>production value</div>
              </div>

              {/* Avg Cost Per Order */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Avg Cost/Order</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>₹{(metrics.totalCost / Math.max(metrics.totalOrders, 1) / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: '12px', color: '#666' }}>per work order</div>
              </div>

              {/* Completion Rate */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Completion Rate</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>{Math.round((metrics.completedOrders / Math.max(metrics.totalOrders, 1)) * 100)}%</div>
                <div style={{ fontSize: '12px', color: '#666' }}>orders completed</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
              {/* Recent Work Orders Table */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0' }}>Recent Work Orders</h2>
                  <button onClick={() => navigate('/production/work-orders')} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>View All →</button>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.slice(0, 8).map((order, idx) => (
                        <tr key={order.wo_id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{order.wo_id}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>{order.item_name || order.item_code}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1a1a1a', textAlign: 'center', fontWeight: '500' }}>{order.qty_to_manufacture || 0}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              background: order.status === 'completed' ? '#dcfce7' : order.status === 'in-progress' ? '#fef3c7' : order.status === 'planned' ? '#dbeafe' : '#f3f4f6',
                              color: order.status === 'completed' ? '#16a34a' : order.status === 'in-progress' ? '#d97706' : order.status === 'planned' ? '#1e40af' : '#6b7280',
                              borderRadius: '4px',
                              fontWeight: '500',
                              fontSize: '12px',
                              textTransform: 'capitalize'
                            }}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1a1a1a', textAlign: 'right', fontWeight: '500' }}>₹{(order.total_cost || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions Sidebar */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                height: 'fit-content'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px 0' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => setShowModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <Plus size={16} /> Create Order
                  </button>

                  <button
                    onClick={() => navigate('/production/job-cards')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <Truck size={16} /> Track Jobs
                  </button>

                  <button
                    onClick={() => navigate('/production/entries')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <Package size={16} /> Production Entry
                  </button>

                  <button
                    onClick={() => navigate('/production/machines')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <TrendingUp size={16} /> Machines
                  </button>
                </div>

                {/* Status Summary */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>Status Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>📋 Planned</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.plannedOrders}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>⚙️ In Progress</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.inProgressOrders}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>✅ Completed</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.completedOrders}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateWorkOrderModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchData}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
