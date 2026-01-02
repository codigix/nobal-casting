import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import { Plus, Edit2, Trash2, Truck, Eye, Trash } from 'lucide-react'

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
    pending: 0
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

    setStats({ totalOrders: total, inProgress, completed, pending })
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

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL work orders. Are you sure?')) return
    try {
      setLoading(true)
      await productionService.truncateWorkOrders()
      setSuccess('All work orders truncated successfully')
      setTimeout(() => setSuccess(null), 3000)
      fetchWorkOrders()
    } catch (err) {
      setError(err.message || 'Failed to truncate work orders')
    } finally {
      setLoading(false)
    }
  }

  const handleView = (order) => {
    navigate(`/manufacturing/work-orders/${order.wo_id}?readonly=true`)
  }

  const handleEdit = (order) => {
    navigate(`/manufacturing/work-orders/${order.wo_id}`)
  }

  const handleTrack = (order) => {
    navigate(`/manufacturing/work-orders/tracking/${order.wo_id}`)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
      planned: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      'in-progress': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    }
    return statusConfig[status] || statusConfig.draft
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
      medium: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
      low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' }
    }
    return priorityConfig[priority] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                📋
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
                <p className="text-xs text-gray-600 mt-0">Manage and track production work</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/manufacturing/work-orders/new')}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-blue-400 to-blue-600 "
            >
              <Plus size={16} /> Create Work Order
            </button>
            <button 
              onClick={handleTruncate}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-red-400 to-red-600"
              title="Delete all work orders"
            >
              <Trash size={16} /> Truncate All
            </button>
          </div>
        </div>

        {success && (
          <div className="mb-2 p-2 pl-3 bg-green-50 border-l-4 border-green-400 rounded text-xs text-green-800 flex gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-2 p-2 pl-3 bg-red-50 border-l-4 border-red-400 rounded text-xs text-red-800 flex gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-lg p-3 border-l-4 border-blue-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">Total</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalOrders}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border-l-4 border-amber-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">In Progress</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border-l-4 border-green-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">Completed</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border-l-4 border-gray-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">Pending</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.pending}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
              <select 
                name="status" 
                value={filters.status} 
                onChange={handleFilterChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Search</label>
              <input 
                type="text" 
                name="search" 
                placeholder="Order ID or item..." 
                value={filters.search} 
                onChange={handleFilterChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading work orders...</div>
          </div>
        ) : orders.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">WO ID</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Item</th>
                    <th className="px-3 py-2 text-right text-gray-700 font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right text-gray-700 font-semibold">Unit Cost</th>
                    <th className="px-3 py-2 text-right text-gray-700 font-semibold">Total Cost</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Priority</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Due Date</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Status</th>
                    <th className="px-3 py-2 text-center text-gray-700 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => {
                    const statusConfig = getStatusBadge(order.status)
                    const priorityConfig = getPriorityBadge(order.priority)
                    return (
                      <tr key={order.wo_id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2 font-semibold text-gray-900">{order.wo_id}</td>
                        <td className="px-3 py-2 text-gray-700">{order.item_name || order.item_code}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{order.qty_to_manufacture || order.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-700">₹{order.unit_cost?.toFixed(0) || '0'}</td>
                        <td className="px-3 py-2 text-right text-gray-700 font-semibold">₹{order.total_cost?.toFixed(0) || '0'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded border ${priorityConfig.bg} ${priorityConfig.text} ${priorityConfig.border} border text-xs capitalize`}>
                            {order.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{order.planned_end_date ? new Date(order.planned_end_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border text-xs capitalize`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleView(order)}
                              title="View"
                              className="p-1 hover:bg-blue-50 rounded transition"
                            >
                              <Eye size={14} className="text-blue-600" />
                            </button>
                            {order.status === 'draft' && (
                              <button 
                                onClick={() => handleEdit(order)} 
                                title="Edit"
                                className="p-1 hover:bg-amber-50 rounded transition"
                              >
                                <Edit2 size={14} className="text-amber-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleTrack(order)}
                              title="Track"
                              className="p-1 hover:bg-green-50 rounded transition"
                            >
                              <Truck size={14} className="text-green-600" />
                            </button>
                            {order.status === 'draft' && (
                              <button 
                                onClick={() => handleDelete(order.wo_id)} 
                                title="Delete"
                                className="p-1 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-semibold  text-gray-900">No work orders found</div>
            <div className="text-xs text-gray-600 mt-1">Create a new work order to get started</div>
          </div>
        )}
      </div>
    </div>
  )
}
