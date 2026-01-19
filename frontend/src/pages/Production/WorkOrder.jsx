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
    navigate(`/manufacturing/job-cards?filter_work_order=${order.wo_id}`)
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
      <div className=" mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xs bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                📋
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Work Orders</h1>
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
          <div className="bg-white rounded-xs p-3 border-l-4 border-blue-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">Total</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.totalOrders}</div>
          </div>
          <div className="bg-white rounded-xs p-3 border-l-4 border-amber-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">In Progress</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-xs p-3 border-l-4 border-green-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">Completed</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-xs p-3 border-l-4 border-gray-400 shadow-sm">
            <div className="text-xs text-gray-600 font-semibold">Pending</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{stats.pending}</div>
          </div>
        </div>

        <div className="bg-white rounded-xs shadow-sm p-3 mb-3">
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

        {!loading && orders.length > 0 && (
          <div className="mb-4 p-4 rounded-xs bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">📊 Scheduling Analyzer</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded border border-red-100">
                <div className="text-gray-600 font-semibold mb-1">High Priority</div>
                <div className="text-lg font-bold text-red-600">
                  {orders.filter(o => o.priority === 'high' && ['draft', 'planned'].includes(o.status)).length}
                </div>
                <div className="text-gray-500 mt-1">Pending execution</div>
              </div>
              <div className="bg-white p-3 rounded border border-amber-100">
                <div className="text-gray-600 font-semibold mb-1">Due This Week</div>
                <div className="text-lg font-bold text-amber-600">
                  {orders.filter(o => {
                    if (!o.planned_end_date) return false
                    const dueDate = new Date(o.planned_end_date)
                    const today = new Date()
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                    return dueDate >= today && dueDate <= weekFromNow
                  }).length}
                </div>
                <div className="text-gray-500 mt-1">Urgent attention needed</div>
              </div>
              <div className="bg-white p-3 rounded border border-orange-100">
                <div className="text-gray-600 font-semibold mb-1">Overdue</div>
                <div className="text-lg font-bold text-orange-600">
                  {orders.filter(o => {
                    if (!o.planned_end_date) return false
                    return new Date(o.planned_end_date) < new Date() && o.status !== 'completed'
                  }).length}
                </div>
                <div className="text-gray-500 mt-1">Delayed orders</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-100">
                <div className="text-gray-600 font-semibold mb-1">On Schedule</div>
                <div className="text-lg font-bold text-green-600">
                  {orders.filter(o => o.status === 'completed').length}
                </div>
                <div className="text-gray-500 mt-1">Completed successfully</div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xs p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading work orders...</div>
          </div>
        ) : orders.length > 0 ? (
          <div className="bg-white rounded-xs shadow-sm">
            
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Item To Manufacture</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Status</th>
                    <th className="px-3 py-2 text-right text-gray-700 font-semibold">Qty To Manufacture</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Planned Start</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Manufactured</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">Process Logs</th>
                    <th className="px-3 py-2 text-left text-gray-700 font-semibold">ID</th>
                    <th className="px-3 py-2 text-center text-gray-700 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => {
                    const statusConfig = getStatusBadge(order.status)
                    return (
                      <tr key={order.wo_id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="px-3 py-2 text-gray-700">{order.item_name || order.item_code}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border text-xs capitalize`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{order.qty_to_manufacture || order.quantity}</td>
                        <td className="px-3 py-2 text-gray-700">{order.planned_start_date ? new Date(order.planned_start_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-3 py-2 text-gray-700">{order.planned_end_date ? new Date(order.planned_end_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handleTrack(order)}
                            title="View Process Logs"
                            className="p-1 hover:bg-blue-50 rounded transition"
                          >
                            <Eye size={14} className="text-blue-600" />
                          </button>
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{order.wo_id}</td>
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
                              onClick={() => handleDelete(order.wo_id)} 
                              title="Delete"
                              className="p-1 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            
          </div>
        ) : (
          <div className="bg-white rounded-xs p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-semibold  text-gray-900">No work orders found</div>
            <div className="text-xs text-gray-600 mt-1">Create a new work order to get started</div>
          </div>
        )}
      </div>
    </div>
  )
}
