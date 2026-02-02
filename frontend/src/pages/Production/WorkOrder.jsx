import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronDown, AlertCircle, TrendingUp, BarChart3, Layers, ClipboardList,
  CheckCircle2, Factory, Clock, Package, MoreVertical, Plus, Edit2, Trash2, Eye, Trash, Search, Filter, Calendar, Activity
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import Card from '../../components/Card/Card'

export default function WorkOrder() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState({
    totalOrders: 0,
    inProgress: 0,
    completed: 0,
    pending: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    day: '',
    month: '',
    year: ''
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchWorkOrders()
  }, [filters])

  const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      amber: 'text-amber-600 bg-amber-50 border-amber-100',
      rose: 'text-rose-600 bg-rose-50 border-rose-100',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      violet: 'text-violet-600 bg-violet-50 border-violet-100'
    }

    return (
      <div className="bg-white p-2 rounded border border-gray-100   hover:shadow-md transition-all group overflow-hidden relative">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gray-50 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
        
        <div className="relative flex justify-between items-start">
          <div className="">
            <p className="text-xs   text-gray-400 ">{label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl  text-gray-900 ">{value}</h3>
              {trend && (
                <span className={`text-xs   ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs   text-gray-500 tracking-tight">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 roundedl ${colorMap[color] || colorMap.blue}   group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    )
  }

  const StatusBadge = ({ status }) => {
    const config = {
      draft: { color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Clock },
      planned: { color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Calendar },
      'in-progress': { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Activity },
      completed: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
      cancelled: { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertCircle }
    }
    const s = (status || 'draft').toLowerCase()
    const { color, icon: Icon } = config[s] || config.draft

    return (
      <span className={`inline-flex items-center gap-1.5 p-2  py-1 rounded-full text-xs    border ${color}`}>
        <Icon size={12} />
        {s}
      </span>
    )
  }

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      )
      const response = await productionService.getWorkOrders({ ...cleanFilters, limit: 1000 })
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
    <div className="min-h-screen bg-white p-2">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-100 p-2">
        <div className="">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 ">
            <div className="flex items-center gap-2 ">
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white shadow  shadow-indigo-100 rotate-3 hover:rotate-0 transition-transform duration-500">
                <ClipboardList size={15} />
              </div>
              <div>
                <h1 className="text-xl  text-gray-900 ">Work Orders</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-2 text-xs   text-indigo-600  bg-indigo-50 p-2  py-1 rounded-full">
                    <Factory size={12} />
                    Production
                  </span>
                  <span className="flex items-center gap-2 text-xs   text-amber-600  bg-amber-50 p-2  py-1 rounded-full">
                    <Clock size={12} />
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/manufacturing/work-orders/new')}
                className="group flex items-center gap-2  p-2 bg-gray-900 text-white rounded hover:bg-indigo-600 transition-all duration-500 shadow-lg shadow-gray-200 hover:shadow-indigo-200"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                <span className="text-xs  ">Create Order</span>
              </button>
              <button
                onClick={handleTruncate}
                className="p-2 bg-rose-50 text-rose-600 rounded hover:bg-rose-600 hover:text-white transition-all duration-500 border border-rose-100   shadow-rose-50"
                title="Truncate All"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2">
        {/* Alerts */}
        {success && (
          <div className="mb-10 p-2  bg-emerald-50 border border-emerald-100 rounded flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs   text-emerald-600  mb-0.5">Success</p>
              <p className="text-xs  text-emerald-900">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-10 p-2  bg-rose-50 border border-rose-100 rounded flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-6 h-6 rounded bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs   text-rose-600  mb-0.5">Error</p>
              <p className="text-xs  text-rose-900">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2  mb-5">
          <StatCard
            label="Total Orders"
            value={stats.totalOrders}
            icon={Layers}
            color="indigo"
            subtitle="Global manufacturing volume"
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon={Activity}
            color="amber"
            subtitle="Active production lines"
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            color="emerald"
            subtitle="Ready for delivery"
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={Clock}
            color="blue"
            subtitle="Awaiting scheduling"
          />
        </div>

        {/* Dynamic Filter Section */}
        <div className="bg-gray-50/50 rounded  border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[350px] relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search orders, items, or IDs..."
                className="w-full pl-14 pr-6 py-2  bg-white border border-gray-100 rounded   text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all  "
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 ">
              <div className="relative group">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500" size={16} />
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="pl-12 pr-10 py-2  bg-white border border-gray-100 rounded   text-xs   text-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none cursor-pointer   hover:bg-gray-50 transition-all"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>

              <div className="flex items-center gap-2 bg-white p-2 rounded   border border-gray-100  ">
                <select
                  name="month"
                  value={filters.month}
                  onChange={handleFilterChange}
                  className="p-2 bg-transparent border-none text-xs    text-gray-700 focus:ring-0 appearance-none cursor-pointer"
                >
                  <option value="">Month</option>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <div className="w-px h-4 bg-gray-100" />
                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="p-2 bg-transparent border-none text-xs    text-gray-700 focus:ring-0 appearance-none cursor-pointer"
                >
                  {['2024', '2025', '2026'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Scheduling Analyzer Section */}
        {!loading && orders.length > 0 && (
          <div className="mb-6 p-2 rounded bg-gray-900  shadow-gray-200  relative group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <BarChart3 size={180} className="text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2  mb-4">
                <div className="p-2 bg-indigo-500/20 rounded ">
                  <TrendingUp size={10} className="text-indigo-400" />
                </div>
                <h2 className="text-lg  text-white ">Scheduling Analyzer</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 ">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2  rounded hover:bg-white/10 transition-colors">
                  <p className="text-gray-400 text-xs    mb-2">High Priority Pending</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl  text-white">
                      {orders.filter(o => o.priority === 'high' && ['draft', 'planned'].includes(o.status)).length}
                    </p>
                    <span className="text-xs   text-rose-400">Critical</span>
                  </div>
                  <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" 
                      style={{ width: `${(orders.filter(o => o.priority === 'high').length / Math.max(orders.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2  rounded hover:bg-white/10 transition-colors">
                  <p className="text-gray-400 text-xs    mb-2">Due This Week</p>
                  <p className="text-xl  text-white">
                    {orders.filter(o => {
                      if (!o.planned_end_date) return false
                      const dueDate = new Date(o.planned_end_date)
                      const today = new Date()
                      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
                      return dueDate >= today && dueDate <= weekFromNow
                    }).length}
                  </p>
                  <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: '45%' }} />
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2  rounded hover:bg-white/10 transition-colors">
                  <p className="text-gray-400 text-xs    mb-2">Efficiency Rate</p>
                  <p className="text-xl  text-white">88<span className="text-lg text-indigo-400">%</span></p>
                  <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: '88%' }} />
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-2  rounded hover:bg-white/10 transition-colors">
                  <p className="text-gray-400 text-xs    mb-2">Ready for QC</p>
                  <p className="text-xl  text-white">
                    {orders.filter(o => o.status === 'in-progress').length}
                  </p>
                  <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '62%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table Section */}
        <div className="bg-white rounded  border border-gray-100   overflow-hidden">
          <div className="p-2 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
            <div>
              <h2 className="text-xl  text-gray-900 tracking-tight">Active Work Orders</h2>
              <p className="text-xs   text-gray-400  mt-1">Real-time production tracking</p>
            </div>
            <div className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded   ">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs   text-gray-600 ">{orders.length} Orders Active</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-white">
                  <th className="p-2 text-xs   text-gray-400  border-b border-gray-50">Order Identity</th>
                  <th className="p-2 text-xs   text-gray-400  border-b border-gray-50">Item Specification</th>
                  <th className="p-2 text-xs   text-gray-400  border-b border-gray-50">Status & Priority</th>
                  <th className="p-2 text-xs   text-gray-400  border-b border-gray-50 ">Progress</th>
                  <th className="p-2 text-xs   text-gray-400  border-b border-gray-50 ">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="p-2">
                        <div className="h-8 bg-gray-50 rounded  w-full" />
                      </td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-10 py-20 text-center">
                      <div className="max-w-xs mx-auto">
                        <div className="w-20 h-20 bg-gray-50 rounded flex items-center justify-center text-gray-300 mx-auto mb-6">
                          <Package size={40} />
                        </div>
                        <h3 className="text-lg  text-gray-900 mb-2 tracking-tight">No Work Orders Found</h3>
                        <p className="text-xs  text-gray-400 mb-8">No results match your current filters. Try adjusting them or create a new order.</p>
                        <button
                          onClick={() => navigate('/manufacturing/work-orders/new')}
                          className="p-6  py-2 bg-indigo-600 text-white text-xs    rounded  hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                        >
                          Create First Order
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.wo_id} className="group hover:bg-gray-50/50 transition-all duration-300">
                      <td className="p-2">
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 rounded bg-white border border-gray-100 flex items-center justify-center text-indigo-600   group-hover:scale-110 transition-transform">
                            <ClipboardList size={15} />
                          </div>
                          <div>
                            <div className=" text-gray-900 text-xs tracking-tight mb-1 group-hover:text-indigo-600 transition-colors">{order.wo_id}</div>
                            <div className="flex items-center gap-2 text-xs   text-gray-400 tracking-tight">
                              <Calendar size={10} />
                              {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          <div className=" text-gray-900 text-xs tracking-tight mb-1">{order.item_name || 'N/A'}</div>
                          <div className="flex items-center gap-2 ">
                            <div className="flex items-center gap-1.5">
                              <Package size={12} className="text-indigo-500" />
                              <span className="text-xs   text-gray-500 ">{order.qty_to_manufacture} Units</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-gray-200" />
                            <span className="text-xs   text-gray-400">BOM: {order.bom_no || 'Standard'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-2">
                          <StatusBadge status={order.status} />
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              order.priority === 'high' ? 'bg-rose-500' : 
                              order.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span className="text-xs    text-gray-400">{order.priority} priority</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <div className="inline-block text-right">
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <span className="text-xs   text-gray-900">{order.produced_qty || 0} / {order.qty_to_manufacture}</span>
                            <span className="text-xs   text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-full">
                              {Math.round(((order.produced_qty || 0) / (order.qty_to_manufacture || 1)) * 100)}%
                            </span>
                          </div>
                          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden ml-auto">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-1000 group-hover:bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.3)]" 
                              style={{ width: `${Math.min(((order.produced_qty || 0) / (order.qty_to_manufacture || 1)) * 100, 100)}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-2 ">
                          <button
                            onClick={() => handleTrack(order)}
                            className="p-2  bg-indigo-50 text-indigo-600 rounded  hover:bg-indigo-600 hover:text-white transition-all  "
                            title="Track Production"
                          >
                            <Activity size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(order)}
                            className="p-2  bg-amber-50 text-amber-600 rounded  hover:bg-amber-600 hover:text-white transition-all  "
                            title="Edit Order"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(order.wo_id)}
                            className="p-2  bg-rose-50 text-rose-600 rounded  hover:bg-rose-600 hover:text-white transition-all  "
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-2 bg-gray-50/30 border-t border-gray-50 flex justify-between items-center">
            <p className="text-xs   text-gray-400 ">Showing {orders.length} manufacturing sequences</p>
            <div className="flex gap-2">
              <button className="p-2 bg-white border border-gray-100 rounded  text-xs    text-gray-400 cursor-not-allowed">Previous</button>
              <button className="p-2 bg-white border border-gray-100 rounded  text-xs    text-gray-900 hover:bg-gray-50 transition-colors">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
