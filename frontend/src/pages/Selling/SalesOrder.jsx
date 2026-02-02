import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import { useNavigate } from 'react-router-dom'
import { 
  Edit2, Eye, Package, CheckCircle, Trash2, Plus, TrendingUp, AlertTriangle, AlertCircle,
  Truck, Clock, Calendar, DollarSign, Check, Search, Trash, Factory, ChevronDown,
  Filter, Download, RefreshCcw, MoreHorizontal, ArrowUpRight, ArrowDownRight,
  TrendingDown, ShoppingCart, Activity
} from 'lucide-react'
import ViewSalesOrderModal from '../../components/Selling/ViewSalesOrderModal'
import ProductionPlanGenerationModal from '../../components/Production/ProductionPlanGenerationModal'
import './Selling.css'

const iconColorMap = {
  primary: '#2563eb',
  warning: '#f97316',
  success: '#10b981',
  danger: '#ef4444'
}

const statusConfig = {
  draft: { icon: Edit2, color: '#f97316', bg: '#fef3c7', text: '#92400e', label: 'Draft' },
  production: { icon: Truck, color: '#06b6d4', bg: '#cffafe', text: '#164e63', label: 'Production' },
  complete: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Complete' },
  on_hold: { icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'On Hold' },
  dispatched: { icon: Truck, color: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6', label: 'Dispatched' },
  delivered: { icon: Package, color: '#059669', bg: '#d1fae5', text: '#065f46', label: 'Delivered' },
  overdue: { icon: AlertTriangle, color: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Overdue' }
}

export default function SalesOrder() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [viewOrderId, setViewOrderId] = useState(null)
  const [generatingPlanForOrder, setGeneratingPlanForOrder] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    production: 0,
    complete: 0,
    on_hold: 0,
    dispatched: 0,
    delivered: 0,
    total_value: 0,
    avg_value: 0,
    pending_delivery: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    globalSearch: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [bomCache, setBomCache] = useState({})

  useEffect(() => {
    fetchOrders()
  }, [filters.status])

  useEffect(() => {
    applyFilters()
  }, [filters.globalSearch, orders])

  const fetchBOMProductName = async (bomId) => {
    if (bomCache[bomId]) return bomCache[bomId]
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.status === 404) {
        console.warn('BOM not found:', bomId)
        setBomCache(prev => ({ ...prev, [bomId]: 'BOM Not Found' }))
        return 'BOM Not Found'
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch BOM: ${res.status}`)
      }
      const data = await res.json()
      const bomData = data.data || data
      let productName = ''
      
      if (bomData.product_name) {
        productName = bomData.product_name
      } else if (bomData.lines && bomData.lines.length > 0) {
        productName = bomData.lines[0].product_name || bomData.lines[0].item_name || ''
      } else if (bomData.bom_finished_goods && bomData.bom_finished_goods.length > 0) {
        productName = bomData.bom_finished_goods[0].product_name || bomData.bom_finished_goods[0].item_name || ''
      } else if (bomData.finished_goods && bomData.finished_goods.length > 0) {
        productName = bomData.finished_goods[0].product_name || bomData.finished_goods[0].item_name || ''
      } else if (bomData.item_code) {
        try {
          const itemRes = await fetch(`${import.meta.env.VITE_API_URL}/items/${bomData.item_code}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const itemData = await itemRes.json()
          const item = itemData.data || itemData
          productName = item.item_name || item.product_name || bomData.item_code
          console.log('Fetched item details for:', bomData.item_code, 'Name:', productName)
        } catch (itemErr) {
          console.error('Error fetching item:', bomData.item_code, itemErr)
          productName = bomData.item_code
        }
      }
      
      if (!productName) productName = bomData.item_code || ''
      console.log('BOM:', bomId, 'Product Name:', productName)
      setBomCache(prev => ({ ...prev, [bomId]: productName }))
      return productName
    } catch (err) {
      console.error('Error fetching BOM:', bomId, err)
      return ''
    }
  }

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (filters.status) {
        query.append('status', filters.status)
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders?${query}`)
      const data = await res.json()
      if (data.success) {
        const ordersData = data.data || []
        setOrders(ordersData)
        calculateStats(ordersData)
        
        const newBomCache = { ...bomCache }
        for (const order of ordersData) {
          if (order.bom_id && !newBomCache[order.bom_id]) {
            const productName = await fetchBOMProductName(order.bom_id)
            newBomCache[order.bom_id] = productName
          }
        }
        setBomCache(newBomCache)
      } else {
        setError(data.error || 'Failed to fetch sales orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Error fetching sales orders')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    if (!filters.globalSearch.trim()) {
      setFilteredOrders(orders)
      return
    }

    const searchTerm = filters.globalSearch.toLowerCase()
    const filtered = orders.filter((order) => {
      const orderIdMatch = order.sales_order_id?.toLowerCase().includes(searchTerm)
      const customerMatch = order.customer_name?.toLowerCase().includes(searchTerm)
      const itemsMatch = order.items?.some(item =>
        (item.item_name?.toLowerCase().includes(searchTerm) ||
          item.item_code?.toLowerCase().includes(searchTerm))
      )
      return orderIdMatch || customerMatch || itemsMatch
    })
    setFilteredOrders(filtered)
  }

  const getDisplayStatus = (order) => {
    const status = order.status?.toLowerCase() || 'draft'
    
    // Check if overdue: not complete/dispatched/delivered and delivery_date is in the past
    if (order.delivery_date && !['complete', 'dispatched', 'delivered'].includes(status)) {
      const deliveryDate = new Date(order.delivery_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (deliveryDate < today) {
        return 'overdue'
      }
    }
    
    return status
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      confirmed: 0,
      production: 0,
      complete: 0,
      on_hold: 0,
      dispatched: 0,
      delivered: 0,
      overdue: 0,
      total_value: 0,
      avg_value: 0,
      pending_delivery: 0,
      growth: 12.5, // Mock growth percentage
      fulfillment_rate: 0
    }

    data.forEach((order) => {
      const status = getDisplayStatus(order)
      if (status) {
        newStats[status] = (newStats[status] || 0) + 1
        if (status === 'confirmed') newStats.confirmed += 1
      }
      newStats.total_value += parseFloat(order.total_value || 0)
      if (['production', 'complete', 'on_hold', 'dispatched', 'overdue'].includes(status)) {
        newStats.pending_delivery += 1
      }
    })

    newStats.avg_value = data.length > 0 ? newStats.total_value / data.length : 0
    newStats.fulfillment_rate = data.length > 0 
      ? ((newStats.complete + newStats.delivered) / data.length * 100).toFixed(1) 
      : 0
    setStats(newStats)
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'warning'
      case 'production':
        return 'info'
      case 'complete':
        return 'success'
      case 'on_hold':
        return 'warning'
      case 'dispatched':
        return 'info'
      case 'delivered':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const handleConfirmOrder = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        fetchOrders()
      } else {
        alert('Failed to confirm order')
      }
    } catch (error) {
      console.error('Error confirming order:', error)
      alert('Error confirming order')
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        fetchOrders()
      } else {
        alert('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Error updating order status')
    }
  }

  const StatusDropdown = ({ currentStatus, orderId }) => {
    const statuses = ['draft', 'production', 'complete', 'on_hold', 'dispatched', 'delivered']
    const [isOpen, setIsOpen] = useState(false)
    const config = statusConfig[currentStatus?.toLowerCase()] || statusConfig.draft

    return (
      <div className="relative inline-block w-full min-w-[120px]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2  py-1.5 text-xs  text-xs rounded border transition-all  hover:shadow-md active:scale-95"
          style={{
            backgroundColor: config.bg,
            borderColor: `${config.color}40`,
            color: config.text
          }}
        >
          <div className="flex items-center gap-2">
            <config.icon size={12} style={{ color: config.color }} />
            <span>{config.label}</span>
          </div>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ opacity: 0.5 }} />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            <div className="absolute top-full mt-2 left-0 right-0 bg-white/90 backdrop-blur-md border border-slate-200 rounded  z-20 overflow-hidden min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-1">
                {statuses.map((status) => {
                  const cfg = statusConfig[status]
                  const isSelected = currentStatus?.toLowerCase() === status
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        handleStatusChange(orderId, status)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 p-2  py-2 text-[11px] font-medium transition-all rounded mb-0.5 last:mb-0 ${
                        isSelected 
                          ? 'bg-slate-100 text-slate-900 shadow-inner' 
                          : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <div className="p-1 rounded " style={{ backgroundColor: `${cfg.color}15` }}>
                        <cfg.icon size={12} style={{ color: cfg.color }} />
                      </div>
                      <span className="flex-1 text-left">{cfg.label}</span>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }}></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sales order?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchOrders()
      } else {
        alert('Failed to delete order')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Error deleting order')
    }
  }

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL sales orders. Are you sure?')) return
    try {
      setLoading(true)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/truncate/all`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchOrders()
        alert('All sales orders truncated successfully')
      } else {
        alert('Failed to truncate sales orders')
      }
    } catch (error) {
      console.error('Error truncating sales orders:', error)
      alert('Error truncating sales orders')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { 
      label: 'ID / PRODUCT', 
      key: 'sales_order_id',
      render: (value, row) => {
        let productName = ''
        
        if (row && row.bom_id && bomCache[row.bom_id]) {
          productName = bomCache[row.bom_id]
        } else if (row && row.product_name) {
          productName = row.product_name
        } else if (row && row.items && row.items.length > 0) {
          const fgItems = row.items.filter(item => 
            item.fg_sub_assembly === 'FG' || item.fg_sub_assembly === 'Finished Good'
          )
          if (fgItems.length > 0) {
            productName = fgItems[0].product_name || fgItems[0].item_name || ''
          } else if (row.items.length > 0) {
            productName = row.items[0].product_name || row.items[0].item_name || ''
          }
        }
        
        return (
          <div 
            onClick={() => navigate(`/manufacturing/sales-orders/${value}?readonly=true`)}
            className="flex items-center gap-4 group cursor-pointer "
          >
            <div className="w-10 h-10 rounded  bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all  ">
              <Package size={20} />
            </div>
            <div>
              <div className="text-xs  text-slate-900 group-hover:text-blue-600 transition-colors">
                {productName || 'Intelligence Formulation'}
              </div>
              <div className="text-xs  text-slate-400 ">
                {value}
              </div>
            </div>
          </div>
        )
      }
    },
    { 
      label: 'CUSTOMER ENTITY', 
      key: 'customer_name',
      render: (val, row) => (
        <div className="flex items-center gap-3 ">
          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-xs  text-white shadow-lg">
            {val ? val.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="text-xs  text-slate-700 leading-none">{val}</div>
            <div className="text-xs  text-slate-400 mt-1 ">{row.customer_id}</div>
          </div>
        </div>
      )
    },
    { 
      label: 'STRATEGIC STATUS', 
      key: 'status',
      render: (val, row) => {
        const displayStatus = row.production_plan_status || val || 'draft'
        const config = statusConfig[displayStatus.toLowerCase()] || statusConfig.draft
        return (
          <div className="p-2 min-w-[140px]">
            <div 
              className="w-full flex items-center justify-between p-2 py-1.5 text-xs rounded border transition-all  "
              style={{
                backgroundColor: config.bg,
                borderColor: `${config.color}40`,
                color: config.text
              }}
            >
              <div className="flex items-center gap-2">
                <config.icon size={12} style={{ color: config.color }} />
                <span className="">{config.label}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      label: 'DELIVERY VECTOR',
      key: 'delivery_date',
      render: (value) => {
        const date = value ? new Date(value) : null
        const isOverdue = date && date < new Date()
        return (
          <div className="p-2">
            <div className={`flex items-center gap-2 text-xs  ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
              <Calendar size={12} className={isOverdue ? 'animate-pulse' : 'text-slate-400'} />
              {value ? new Date(value).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              }) : 'Not Specified'}
            </div>
            <div className="text-xs  text-slate-400  mt-1">Expected Batch</div>
          </div>
        )
      }
    },
    {
      label: 'FINANCIAL VALUE',
      key: 'total_amount',
      render: (value, row) => (
        <div className="p-2 text-right">
          <div className="text-sm  text-slate-900">
            ₹{parseFloat(value || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs  text-emerald-600 bg-emerald-50 inline-block p-1 rounded">
            Valuation Inc. Tax
          </div>
        </div>
      )
    },
    {
      label: 'COMMANDS',
      key: 'actions',
      render: (value, row) => row ? (
        <div className="flex items-center justify-end gap-1 p-2">
          <button
            onClick={() => navigate(`/manufacturing/sales-orders/${row.sales_order_id}?readonly=true`)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded  transition-all"
            title="Strategic View"
          >
            <Eye size={18} />
          </button>
          
          <div className="w-px h-4 bg-slate-100 mx-1" />
          
          <button
            onClick={() => setGeneratingPlanForOrder(row.sales_order_id)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all"
            title="Production Planning"
          >
            <Factory size={18} />
          </button>
          
          <button
            onClick={() => navigate(`/selling/delivery-notes/new?order=${row.sales_order_id}`)}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded  transition-all"
            title="Logistics Dispatch"
          >
            <Truck size={18} />
          </button>
          
          <div className="w-px h-4 bg-slate-100 mx-1" />
          
          <button
            onClick={() => handleDeleteOrder(row.sales_order_id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all"
            title="Terminate Order"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ) : null
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 p-4 md:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Modern Page Header */}
        <div className="mb-2  flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <ShoppingCart className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl  text-slate-900 leading-tight ">
                Sales Order Command
              </h1>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-1">
                <Activity size={12} className="text-blue-500" />
                <span>Real-time Order Tracking</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span>{stats.total} Active Records</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchOrders}
              className="p-2 rounded  bg-white text-slate-400 border border-slate-200 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95  "
              title="Refresh Data"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handleTruncate}
              className="inline-flex items-center gap-2 rounded  bg-white p-2.5 text-xs  text-rose-600 border border-rose-100 hover:bg-rose-50 transition-all active:scale-95  "
            >
              <Trash2 size={18} />
              Reset All
            </button>
            <button 
              onClick={() => navigate('/manufacturing/sales-orders/new')}
              className="inline-flex items-center gap-2 rounded  bg-slate-900 p-2 text-xs  text-white shadow  shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
            >
              <Plus size={18} />
              Initialize Order
            </button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="mb-2  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Main Metric Card */}
          <div className="glass-card glass-card-primary p-2 relative group border-l-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <DollarSign size={20} />
              </div>
              <div className="flex items-center gap-1 text-xs  text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight size={10} />
                {stats.growth}%
              </div>
            </div>
            <div className="">
              <h3 className="text-slate-500 text-xs  ">Total Pipeline Value</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-xl  text-slate-900">₹{(stats.total_value / 100000).toFixed(2)}L</p>
                <span className="text-xs text-slate-400 font-medium text-xs">INR</span>
              </div>
              <div className=" flex items-center justify-between border-t border-slate-100/50 mt-2">
                <div className="text-xs text-slate-400  ">Efficiency</div>
                <div className="text-xs text-blue-600 ">{stats.fulfillment_rate}% Fulfillment</div>
              </div>
            </div>
          </div>

          <div className="glass-card glass-card-warning p-2 relative group border-l-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock size={20} />
              </div>
              <div className="text-xs  text-amber-600 bg-amber-50 px-2 py-1 rounded-full ">
                Pending
              </div>
            </div>
            <div className="">
              <h3 className="text-slate-500 text-xs  ">Active Fulfillment</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-xl  text-slate-900">{stats.production + stats.confirmed || 0}</p>
                <span className="text-xs text-slate-400 font-medium text-xs  ">Orders</span>
              </div>
              <div className="pt-4 space-y-2 mt-4">
                <div className="flex justify-between text-[8px]  text-slate-400 ">
                  <span>Production Queue</span>
                  <span>{stats.production} Units</span>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${stats.total > 0 ? (stats.production / stats.total * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card glass-card-danger p-2 relative group border-l-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              {stats.overdue > 0 && (
                <div className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping"></div>
              )}
            </div>
            <div className="">
              <h3 className="text-slate-500 text-xs  ">Critical Alerts</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-xl   text-rose-600">{stats.overdue}</p>
                <span className="text-xs text-rose-400  ">Overdue</span>
              </div>
              
            </div>
          </div>

          <div className="glass-card glass-card-success p-2 relative group border-l-4">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div className="text-xs  text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full ">
                Completed
              </div>
            </div>
            <div className="">
              <h3 className="text-slate-500 text-xs  ">Succesful Deliveries</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-xl  text-slate-900">{stats.delivered + stats.complete || 0}</p>
                <span className="text-xs text-slate-400  ">Success</span>
              </div>
              <div className="flex flex-col gap-1 mt-2 ">
                <div className="text-xs text-slate-500  ">Growth Vector</div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 ">
                  <TrendingUp size={12} />
                  +5.4% from last period
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Filters Section */}
        <div className="glass-filters p-4 mb-2  flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Query Intelligence Engine (ID, Customer, Item)..."
              value={filters.globalSearch}
              onChange={(e) => setFilters({ ...filters, globalSearch: e.target.value })}
              className="glass-input w-full pl-10 border-none bg-white border "
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Filter size={14} />
              </div>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="glass-input pl-10 pr-8 bg-white/50 border-none appearance-none cursor-pointer focus:bg-white"
              >
                <option value="">Strategic Overview</option>
                <option value="draft">Draft Protocol</option>
                <option value="confirmed">Confirmed Pipeline</option>
                <option value="production">Active Manufacturing</option>
                <option value="dispatched">Logistics Phase</option>
                <option value="complete">Finalized Execution</option>
                <option value="on_hold">Deferred Action</option>
                <option value="cancelled">Nullified Orders</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={14} />
            </div>

            <button className="p-2 rounded  bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all  ">
              <Download size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-2  flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-rose-800 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <p className="text-xs  tracking-wide">{error}</p>
          </div>
        )}

        {/* Data Matrix Section */}
        <div className="relative">
          {loading ? (
            <div className="glass-card flex flex-col items-center justify-center py-22 text-slate-400 border-none">
              <div className="relative mb-6">
                <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600 shadow  shadow-blue-50"></div>
                <ShoppingCart size={32} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" />
              </div>
              <p className="text-xs  tracking-[0.3em] animate-pulse">Syncing Operational Data...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-22 text-center border-none">
              <div className="mb-2  p-2 rounded-3xl bg-slate-50 text-slate-300">
                <Package size={64} strokeWidth={1} />
              </div>
              <h3 className="text-xl  text-slate-900">No Intelligence Records</h3>
              <p className="mx-auto mt-2 max-w-xs text-xs text-slate-500 leading-relaxed">
                The intelligence engine found no records matching your current strategic parameters.
              </p>
              <button
                onClick={() => navigate('/manufacturing/sales-orders/new')}
                className="mt-8 inline-flex items-center gap-2 rounded  bg-blue-600 p-2  text-xs  text-white shadow  shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Plus size={18} />
                Initialize New Order
              </button>
            </div>
          ) : (
            <div className="glass-table border-none overflow-hidden">
              <DataTable 
                columns={columns} 
                data={filteredOrders} 
                filterable={false}
                pageSize={10}
              />
            </div>
          )}
        </div>
      </div>

      <ViewSalesOrderModal 
        isOpen={!!viewOrderId}
        orderId={viewOrderId}
        onClose={() => setViewOrderId(null)}
      />

      <ProductionPlanGenerationModal
        isOpen={!!generatingPlanForOrder}
        onClose={() => setGeneratingPlanForOrder(null)}
        salesOrderId={generatingPlanForOrder}
      />
    </div>
  )
}
