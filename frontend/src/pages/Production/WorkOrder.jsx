import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronDown, AlertCircle, Layers, ClipboardList,
  CheckCircle2, Factory, Clock, Package, Plus, Edit2, Trash2, Eye, Trash, Search, Filter, Calendar, Activity,
  Truck, Download, Printer
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import DataTable from '../../components/Table/DataTable'

// --- Helpers & Sub-components (Moved outside to prevent re-mount issues) ---

const getPriorityInfo = (priority) => {
  const p = (priority || 'medium').toLowerCase()
  switch (p) {
    case 'high': return { color: 'text-rose-600', dot: 'bg-rose-500', label: 'high priority' }
    case 'medium': return { color: 'text-amber-600', dot: 'bg-amber-500', label: 'medium priority' }
    case 'low': return { color: 'text-emerald-600', dot: 'bg-emerald-500', label: 'low priority' }
    default: return { color: 'text-gray-600', dot: 'bg-gray-400', label: 'normal priority' }
  }
}

// --- Hierarchy & Sorting Helpers ---
const getDepth = (order, allOrders) => {
  let depth = 0
  let current = order
  const visited = new Set()
  const ordersMap = Object.fromEntries(allOrders.map(o => [o.wo_id, o]))
  
  while (current && current.parent_wo_id && ordersMap[current.parent_wo_id] && !visited.has(current.wo_id)) {
    visited.add(current.wo_id)
    depth++
    current = ordersMap[current.parent_wo_id]
  }
  return depth
}

const sortWorkOrders = (ordersData) => {
  return [...ordersData].sort((a, b) => {
    const depthA = getDepth(a, ordersData)
    const depthB = getDepth(b, ordersData)
    if (depthA !== depthB) {
      return depthB - depthA // Deepest/Low-level first
    }
    return (a.created_at || '').localeCompare(b.created_at || '') // Oldest/Created first for same depth
  })
}

const StatusBadge = ({ status }) => {
  const config = {
    draft: { color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Clock, label: 'Draft' },
    ready: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: CheckCircle2, label: 'Ready' },
    planned: { color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Calendar, label: 'Planned' },
    'in-progress': { color: 'text-amber-600', icon: Activity, label: 'In-Progress' },
    in_progress: { color: 'text-amber-600', icon: Activity, label: 'In-Progress' },
    completed: { color: 'text-emerald-600 ', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: AlertCircle, label: 'Cancelled' }
  }
  const s = (status || 'draft').toLowerCase().replace('_', '-')
  const statusKey = (status || 'draft').toLowerCase()
  const { color, icon: Icon, label } = config[statusKey] || config[s] || config.draft

  return (
    <span className={` text-xs  ${color}`}>
      {/* <Icon size={10} className="stroke-[2.5]" /> */}
      {label || status}
    </span>
  )
}

const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 ',
    amber: 'text-amber-600',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100'
  }

  return (
    <div className="bg-white p-2 rounded border border-gray-100   hover: transition-all group overflow-hidden relative">
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
            <p className="text-xs   text-gray-500 ">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 roundedl ${colorMap[color] || colorMap.blue}   group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

const WorkOrderRow = React.memo(({ 
  order, 
  depth = 0, 
  layout = 'flat',
  navigate,
  handleView,
  handleEdit,
  handleDelete
}) => {
  const [rowExpanded, setRowExpanded] = useState(false)
  const hasSubAssemblies = order.subAssemblies && order.subAssemblies.length > 0

  if (layout === 'flat') {
    return (
      <div className="group/row">
        <div className="flex items-center gap-4 p-4 hover:bg-indigo-50/30 transition-all border-b border-gray-50">
          

          <div className="flex-1">
            <p className="text-xs font-medium text-gray-900">{order.item_name}</p>
            {/* <p className="text-[10px] text-gray-400 mt-0.5">
              {(order.bom_no || '').startsWith('BOM-') ? order.bom_no : `BOM-${order.bom_no || order.wo_id.split('-')[1] || 'STANDARD'}`}
            </p> */}
          </div>

          <div className=" flex justify-center">
            <StatusBadge status={order.status} />
          </div>

          <div className="">
            <span className="text-xs font-semibold text-gray-900">{parseFloat(order.quantity).toFixed(2)}</span>
            <span className="text-[10px] text-gray-400 ml-1">units</span>
          </div>

          <div className="">
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <Calendar size={10} className="text-gray-400" />
              <span>{order.planned_start_date ? new Date(order.planned_start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>

          <div className="w-20">
            <div className="flex justify-between text-[10px] mb-1.5">
              <span className="font-medium text-gray-700">{parseFloat(order.produced_qty || 0).toFixed(2)} / {parseFloat(order.quantity).toFixed(2)}</span>
              <span className="text-indigo-600 font-semibold">{Math.round(((order.produced_qty || 0) / (order.quantity || 1)) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full transition-all duration-700 ${order.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(((order.produced_qty || 0) / (order.quantity || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="w-24">
            <span className={`text-xs font-medium ${parseFloat(order.scrap_qty) > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
              {parseFloat(order.scrap_qty).toFixed(2)}
            </span>
          </div>

          <div className="">
            <span className="text-[10px] text-indigo-600 ">
              {order.wo_id}
            </span>
          </div>

          <div className=" flex items-center justify-end gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); handleView(order); }}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all"
              title="View"
            >
              <Eye size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/manufacturing/job-cards?filter_work_order=${order.wo_id}`); }}
              className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded  transition-all"
              title="Track"
            >
              <Activity size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
              className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded  transition-all"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(order.wo_id); }}
              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all"
              title="Delete"
            >
              <Trash size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div 
        onClick={(e) => {
          if (hasSubAssemblies) {
            e.stopPropagation();
            setRowExpanded(prev => !prev);
          }
        }}
        className={`p-4 hover:bg-gray-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${depth > 0 ? 'bg-gray-50/10' : ''} ${hasSubAssemblies ? 'cursor-pointer' : ''}`} 
        style={{ paddingLeft: `${depth * 1.5 + 1}rem` }}
      >
        <div className="flex items-center gap-4 flex-1">
          {hasSubAssemblies ? (
            <div className="p-1 text-gray-500">
              {rowExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          ) : depth > 0 ? (
            <div className="w-6" />
          ) : null}
          <div className="w-8 h-8 rounded border border-gray-100 flex items-center justify-center text-gray-400 bg-white  ">
            <ClipboardList size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {(() => {
                const parts = (order.wo_id || '').split('-')
                const displayId = parts.length > 3 ? `${parts[0]}-${parts[1]}-..-${parts[parts.length-1]}` : order.wo_id
                return (
                  <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded" title={order.wo_id}>
                    {displayId}
                  </span>
                )
              })()}
              <span className="text-sm font-medium text-gray-900 truncate">{order.item_name}</span>
              {hasSubAssemblies && (
                <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium">
                  {order.subAssemblies.length} Sub-assemblies
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
              <span className={order.priority === 'high' ? 'text-rose-500 font-medium' : ''}>
                {order.priority.toUpperCase()} priority
              </span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>BOM: {(order.bom_no || '').startsWith('BOM-') ? order.bom_no : `BOM-${order.bom_no || order.wo_id.split('-')[1] || 'STANDARD'}`}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 min-w-[320px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1">
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((order.produced_qty / order.quantity) * 100)}%</span>
            </div>
            <div className=" h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${order.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'} transition-all duration-500`}
                style={{ width: `${Math.min((order.produced_qty / order.quantity) * 100, 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
              <span>{parseFloat(order.produced_qty).toFixed(2)} / {parseFloat(order.quantity).toFixed(2)} units</span>
              {(parseFloat(order.scrap_qty) > 0 || parseFloat(order.rejected_qty) > 0) && (
                <span className="text-rose-500 font-medium">
                  Loss: {(parseFloat(order.scrap_qty) + parseFloat(order.rejected_qty)).toFixed(2)} units
                </span>
              )}
            </div>
          </div>

          <div className="w-24 flex justify-center">
            <StatusBadge status={order.status} />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleView(order)}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
              title="View"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => navigate(`/manufacturing/job-cards?filter_work_order=${order.wo_id}`)}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
              title="Track"
            >
              <Activity size={14} />
            </button>
            <button
              onClick={() => handleEdit(order)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => handleDelete(order.wo_id)}
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
              title="Delete"
            >
              <Trash size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {rowExpanded && hasSubAssemblies && (
        <div className="divide-y divide-gray-50 border-l-2 border-indigo-100/50 bg-gray-50/5">
          {order.subAssemblies.map(sub => (
            <WorkOrderRow 
              key={sub.wo_id} 
              order={sub} 
              depth={depth + 1} 
              layout="grouped"
              navigate={navigate}
              handleView={handleView}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
})

const groupOrdersBySalesOrder = (ordersData) => {
  const sortedOrders = sortWorkOrders(ordersData)
  const groups = {}
  
  const ordersMap = {}
  sortedOrders.forEach(order => {
    ordersMap[order.wo_id] = { ...order, subAssemblies: [] }
  })

  const getEffectiveSOData = (order) => {
    if (order.sales_order_id && order.sales_order_id !== 'NO_SALES_ORDER') {
      return {
        id: order.sales_order_id,
        customer_name: order.customer_name || 'Individual Order'
      }
    }
    if (order.parent_wo_id && ordersMap[order.parent_wo_id]) {
      return getEffectiveSOData(ordersMap[order.parent_wo_id])
    }
    return {
      id: 'NO_SALES_ORDER',
      customer_name: 'Individual Order'
    }
  }

  sortedOrders.forEach(order => {
    const { id: soId, customer_name: custName } = getEffectiveSOData(order)
    
    if (!groups[soId]) {
      groups[soId] = {
        id: soId,
        customer_name: custName,
        orders: [],
        allCompleted: true,
        totalProduced: 0,
        totalQuantity: 0,
        totalScrap: 0,
        fgProduced: 0,
        fgQuantity: 0,
        earliestStart: null,
        latestEnd: null
      }
    }
    
    const group = groups[soId]
    group.orders.push(order)
    
    if ((order.status || '').toLowerCase() !== 'completed') {
      group.allCompleted = false
    }
    group.totalProduced += parseFloat(order.produced_qty) || 0
    group.totalQuantity += parseFloat(order.quantity) || 0
    group.totalScrap += parseFloat(order.scrap_qty) || 0
    
    const startDate = order.planned_start_date ? new Date(order.planned_start_date) : null
    const endDate = order.planned_end_date ? new Date(order.planned_end_date) : null
    
    if (startDate && (!group.earliestStart || startDate < group.earliestStart)) {
      group.earliestStart = startDate
    }
    if (endDate && (!group.latestEnd || endDate > group.latestEnd)) {
      group.latestEnd = endDate
    }
  })

  Object.values(groups).forEach(group => {
    const localOrderMap = {}
    group.orders.forEach(o => {
      localOrderMap[o.wo_id] = { ...o, subAssemblies: [] }
    })

    const rootOrders = []
    Object.values(localOrderMap).forEach(o => {
      if (o.parent_wo_id && localOrderMap[o.parent_wo_id]) {
        localOrderMap[o.parent_wo_id].subAssemblies.push(o)
      } else {
        rootOrders.push(o)
      }
    })
    group.hierarchicalOrders = rootOrders
    group.fgQuantity = rootOrders.reduce((sum, o) => sum + (parseFloat(o.quantity) || 0), 0)
    group.fgProduced = rootOrders.reduce((sum, o) => sum + (parseFloat(o.produced_qty) || 0), 0)
  })

  return Object.values(groups).sort((a, b) => {
    if (a.id === 'NO_SALES_ORDER') return 1
    if (b.id === 'NO_SALES_ORDER') return -1
    return b.id.localeCompare(a.id)
  })
}

export default function WorkOrder() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState({
    totalOrders: 0,
    inProgress: 0,
    completed: 0,
    pending: 0,
    completionRate: 0
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

  const fetchWorkOrders = useCallback(async () => {
    try {
      setLoading(true)
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      )
      const response = await productionService.getWorkOrders({ ...cleanFilters, limit: 1000 })
      const ordersData = response.data || []
      const sortedData = sortWorkOrders(ordersData)
      setOrders(sortedData)
      calculateStats(sortedData)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch work orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  const calculateStats = useCallback((ordersData) => {
    const total = ordersData.length
    const inProgress = ordersData.filter(o => (o.status || '').toLowerCase() === 'in-progress').length
    const completed = ordersData.filter(o => (o.status || '').toLowerCase() === 'completed').length
    const pending = ordersData.filter(o => ['draft', 'planned'].includes((o.status || '').toLowerCase())).length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    setStats({ totalOrders: total, inProgress, completed, pending, completionRate })
  }, [])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = useCallback(async (wo_id) => {
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
  }, [fetchWorkOrders])

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

  const handleView = useCallback((order) => {
    navigate(`/manufacturing/work-orders/${order.wo_id}?readonly=true`)
  }, [navigate])

  const handleEdit = useCallback((order) => {
    navigate(`/manufacturing/work-orders/${order.wo_id}`)
  }, [navigate])

  const handleShipment = useCallback(async (salesOrderId, groupOrders) => {
    if (!window.confirm(`Send all completed work orders for ${salesOrderId} to shipment?`)) return
    
    try {
      setLoading(true)
      const orderIds = new Set(groupOrders.map(o => o.wo_id))
      const fgOrders = groupOrders.filter(o => !o.parent_wo_id || !orderIds.has(o.parent_wo_id))
      const totalQty = fgOrders.reduce((sum, o) => sum + (parseFloat(o.produced_qty) || 0), 0)
      
      const response = await api.post('/selling/delivery-notes', {
        sales_order_id: salesOrderId,
        delivery_date: new Date().toISOString().split('T')[0],
        total_qty: totalQty,
        remarks: `Auto-generated from completed Work Orders: ${fgOrders.map(o => o.wo_id).join(', ')}`
      })
      
      if (response.data.success) {
        setSuccess(`Delivery Note ${response.data.data.delivery_note_id} created successfully!`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create shipment')
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePrintReport = useCallback((salesOrderId, groupOrders) => {
    const printWindow = window.open('', '_blank')
    const customerName = groupOrders[0]?.customer_name || 'N/A'
    
    const html = `
      <html>
        <head>
          <title>Work Order Report - ${salesOrderId}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { bg-color: #f8f9fa; }
            .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .summary { margin-top: 20px; text-align: right; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Work Order Collective Report</h1>
            <p><strong>Sales Order:</strong> ${salesOrderId}</p>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>WO ID</th>
                <th>Item Name</th>
                <th>Priority</th>
                <th>Target Qty</th>
                <th>Produced Qty</th>
                <th>Rejection/Scrap</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${groupOrders.map(o => `
                <tr>
                  <td>${o.wo_id}</td>
                  <td>${o.item_name}</td>
                  <td>${o.priority}</td>
                  <td>${o.quantity}</td>
                  <td>${o.produced_qty}</td>
                  <td>${(parseFloat(o.rejected_qty) || 0) + (parseFloat(o.scrap_qty) || 0)}</td>
                  <td>${o.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <p>Total Items: ${groupOrders.length}</p>
            <p>Total Quantity: ${groupOrders.reduce((sum, o) => sum + parseFloat(o.quantity), 0)}</p>
            <p>Total Produced: ${groupOrders.reduce((sum, o) => sum + parseFloat(o.produced_qty), 0)}</p>
            <p>Total Rejection/Scrap: ${groupOrders.reduce((sum, o) => sum + (parseFloat(o.rejected_qty) || 0) + (parseFloat(o.scrap_qty) || 0), 0)}</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }, [])

  const handleDownloadReport = useCallback((salesOrderId, groupOrders) => {
    const headers = ['Work Order ID', 'Item', 'Target Qty', 'Produced Qty', 'Rejected', 'Scrap', 'Status', 'Start Date', 'End Date']
    const data = groupOrders.map(o => [
      o.wo_id,
      o.item_name,
      o.quantity,
      o.produced_qty,
      o.rejected_qty || 0,
      o.scrap_qty || 0,
      o.status,
      o.planned_start_date,
      o.planned_end_date
    ])
    
    const csvContent = [
      `Work Order Report for Sales Order: ${salesOrderId}`,
      `Customer: ${groupOrders[0]?.customer_name || 'N/A'}`,
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `WorkOrder_Report_${salesOrderId}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccess('Report downloaded successfully')
    setTimeout(() => setSuccess(null), 3000)
  }, [])

  const memoizedGroups = useMemo(() => groupOrdersBySalesOrder(orders), [orders])

  const columns = useMemo(() => [
    {
      key: 'item_name',
      label: 'Item To Manufacture',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-900">{val}</span>
          <span className="text-[10px] text-gray-400 truncate">
            {(row.bom_no || '').startsWith('BOM-') ? row.bom_no : `BOM-${row.bom_no || row.wo_id.split('-')[1] || 'STANDARD'}`}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'quantity',
      label: 'Qty To Manufacture',
      render: (val) => (
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-semibold text-gray-900">{val}</span>
          <span className="text-[10px] text-gray-400">units</span>
        </div>
      )
    },
    {
      key: 'planned_start_date',
      label: 'Planned Start Date',
      render: (val) => (
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <Calendar size={10} className="text-gray-400" />
          <span>{val ? new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'progress',
      label: 'Manufacturing Progress',
      render: (_, row) => (
        <div className="w-25">
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="font-medium text-gray-700">{row.produced_qty || 0} / {row.quantity}</span>
            <span className="text-indigo-600 font-semibold">{Math.round(((row.produced_qty || 0) / (row.quantity || 1)) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full transition-all duration-700 ${(row.status || '').toLowerCase() === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${Math.min(((row.produced_qty || 0) / (row.quantity || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      key: 'scrap_qty',
      label: 'Process Loss',
      render: (val) => (
        <span className={`text-xs font-medium ${parseFloat(val) > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
          {parseFloat(val || 0).toFixed(1)}
        </span>
      )
    },
    {
      key: 'wo_id',
      label: 'Work Order ID',
      render: (val) => {
        const parts = (val || '').split('-')
        const displayId = parts.length > 5 ? `${parts[0]}-${parts[1]}-..-${parts[parts.length-1]}` : val
        return (
          <span className="text-[10px]  text-indigo-600 " title={val}>
            {displayId}
          </span>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center " onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleView(row)}
            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
            title="View"
          >
            <Eye size={12} />
          </button>
          <button
            onClick={() => navigate(`/manufacturing/job-cards?filter_work_order=${row.wo_id}`)}
            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
            title="Track"
          >
            <Activity size={12} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
            title="Edit"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => handleDelete(row.wo_id)}
            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
            title="Delete"
          >
            <Trash size={12} />
          </button>
        </div>
      )
    }
  ], [navigate, handleView, handleEdit, handleDelete])

  return (
    <div className="min-h-screen bg-white p-2">
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-100 p-2">
        <div className="">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 ">
            <div className="flex items-center gap-2 ">
             
              <div>
                <h1 className="text-xl  text-gray-900 ">Work Orders</h1>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 text-xs   text-indigo-600  ">
                    <Factory size={12} />
                    Production
                  </span>
                  <span className="flex items-center gap-2 text-xs   text-amber-600 ">
                    <Clock size={12} />
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/manufacturing/work-orders/new')}
                className="group flex items-center gap-2  p-2 bg-gray-900 text-white rounded hover:bg-indigo-600 transition-all duration-500  shadow-gray-200 hover:shadow-indigo-200"
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
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white  shadow-emerald-200">
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
            <div className="w-6 h-6 rounded bg-rose-500 flex items-center justify-center text-white  shadow-rose-200">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs   text-rose-600  mb-0.5">Error</p>
              <p className="text-xs  text-rose-900">{error}</p>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2  mb-2">
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
        <div className="bg-gray-50/50  ">
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
        
        {/* Orders Grouped View */}
        <div className="space-y-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded border border-gray-100 p-4 animate-pulse">
                <div className="h-6 bg-gray-50 rounded w-1/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-10 bg-gray-50 rounded w-full" />
                  <div className="h-10 bg-gray-50 rounded w-full" />
                </div>
              </div>
            ))
          ) : orders.length === 0 ? (
            <div className="bg-white rounded border border-gray-100 p-2 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded flex items-center justify-center text-gray-300 mx-auto mb-6">
                <Package size={40} />
              </div>
              <h3 className="text-lg text-gray-900 mb-2">No Work Orders Found</h3>
              <p className="text-xs text-gray-400 mb-8">Try adjusting filters or create a new order.</p>
              <button
                onClick={() => navigate('/manufacturing/work-orders/new')}
                className="p-2  bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
              >
                Create First Order
              </button>
            </div>
          ) : (
            <>
              {/* Active Work Orders Section */}
              {(() => {
                const groups = memoizedGroups;
                const completedGroups = groups.filter(g => g.allCompleted);
                const completedOrderIds = new Set(completedGroups.flatMap(g => g.orders.map(o => o.wo_id)));
                const activeOrders = orders.filter(o => !completedOrderIds.has(o.wo_id));

                return (
                  <>
                    {activeOrders.length > 0 && (
                      <div className="bg-white rounded border border-gray-100 overflow-hidden">
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-sm font-semibold text-gray-900">Active Work Orders</h2>
                              <p className="text-[10px] text-gray-500 mt-0.5">Real-time production tracking</p>
                            </div>
                            <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-medium flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {activeOrders.length} Orders Active
                            </div>
                          </div>
                        </div>
                        
                        <DataTable 
                          columns={columns}
                          data={activeOrders}
                          pageSize={50}
                          sortable={true}
                        />
                      </div>
                    )}

                    {/* Completed Production Groups */}
                    {completedGroups.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                          <div className="h-px flex-1 bg-gray-100" />
                          <h2 className="text-[10px]  text-gray-400  ">Completed Production Flow</h2>
                          <div className="h-px flex-1 bg-gray-100" />
                        </div>
                        
                        {completedGroups.map((group) => {
                          const isExpanded = expandedGroups[group.id]
                          return (
                            <div key={group.id} className="bg-white rounded border border-gray-100 overflow-hidden   hover: transition-shadow">
                              {/* Group Header */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }));
                                }}
                                className="bg-gray-50/50 p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-100/50 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="text-gray-400">
                                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                  </div>
                                  <div className={`p-2 rounded  ${group.allCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}   border ${group.allCompleted ? 'border-emerald-100' : 'border-indigo-100'}`}>
                                    {group.allCompleted ? <CheckCircle2 size={24} /> : <Layers size={24} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-semibold text-gray-900">{group.customer_name}</h3>
                                      <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500  ">
                                        {group.id === 'NO_SALES_ORDER' ? 'Direct Production' : group.id}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-[10px] text-gray-400">
                                      <span className="flex items-center gap-1.5">
                                        <Package size={10} />
                                        {group.orders.length} items
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        <Calendar size={10} />
                                        {group.earliestStart ? group.earliestStart.toLocaleDateString() : 'N/A'} - {group.latestEnd ? group.latestEnd.toLocaleDateString() : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handlePrintReport(group.id, group.orders)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors  "
                                  >
                                    <Printer size={12} />
                                    Print
                                  </button>
                                  <button
                                    onClick={() => handleDownloadReport(group.id, group.orders)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-[10px] font-medium text-gray-600 hover:bg-gray-50 transition-colors  "
                                  >
                                    <Download size={12} />
                                    CSV
                                  </button>
                                  {group.allCompleted && group.id !== 'NO_SALES_ORDER' && (
                                    <button
                                      onClick={() => handleShipment(group.id, group.orders)}
                                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-medium hover:bg-indigo-700 transition-colors  shadow-indigo-100"
                                    >
                                      <Truck size={12} />
                                      Send to Shipment
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Group Items (Hierarchical Accordion View) */}
                              {isExpanded && (
                                <div className="divide-y divide-gray-50 bg-gray-50/5 animate-in slide-in-from-top-2 duration-300">
                                  {(group.hierarchicalOrders || []).map((order) => (
                                    <WorkOrderRow 
                                      key={order.wo_id} 
                                      order={order} 
                                      layout="grouped" 
                                      navigate={navigate}
                                      handleView={handleView}
                                      handleEdit={handleEdit}
                                      handleDelete={handleDelete}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Group Footer */}
                              <div className="bg-gray-50/30 px-4 py-2 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400">
                                <span className="italic">Aggregated production lifecycle for {group.id}</span>
                                <div className="flex gap-6">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                    <span>Target FG: <strong>{group.fgQuantity}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-emerald-600 font-medium">Delivered: {group.fgProduced} units</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
