import { useState, useEffect } from 'react'
import DataTable from '../../components/Table/DataTable'
import { useNavigate } from 'react-router-dom'
import {
  Eye, Package, Trash2, Plus,
  Calendar, DollarSign, Factory,
  RefreshCcw, ArrowUpRight, ShoppingCart, Activity, Receipt, Truck,
  AlertTriangle, CheckCircle, TrendingUp, Search, Filter, ChevronDown, Download, AlertCircle, Clock, GitBranch, ClipboardList
} from 'lucide-react'
import ViewSalesOrderModal from '../../components/Selling/ViewSalesOrderModal'
import ProductionPlanGenerationModal from '../../components/Production/ProductionPlanGenerationModal'
import CreateInvoiceModal from '../../components/Selling/CreateInvoiceModal'
import api from '../../services/api'
import './Selling.css'

export default function SalesOrder() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [viewOrderId, setViewOrderId] = useState(null)
  const [generatingPlanForOrder, setGeneratingPlanForOrder] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedOrderIdForInvoice, setSelectedOrderIdForInvoice] = useState(null)
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
      const params = {}
      if (filters.status) {
        params.status = filters.status
      }
      const res = await api.get('/selling/sales-orders', { params })
      const data = res.data
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
    let status = order.status?.toLowerCase() || 'draft'

    // Map legacy status to unified status
    if (status === 'ready_for_production') {
      status = 'under_production'
    }

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
      under_production: 0,
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
      }
      newStats.total_value += parseFloat(order.total_value || 0)
      if ([ 'under_production', 'complete', 'on_hold', 'dispatched', 'overdue'].includes(status)) {
        newStats.pending_delivery += 1
      }
    })

    newStats.avg_value = data.length > 0 ? newStats.total_value / data.length : 0
    newStats.fulfillment_rate = data.length > 0
      ? ((newStats.complete + newStats.delivered) / data.length * 100).toFixed(1)
      : 0
    setStats(newStats)
  }

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sales order?')) return
    try {
      const res = await api.delete(`/selling/sales-orders/${id}`)
      if (res.data.success) {
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
      const res = await api.delete('/selling/sales-orders/truncate/all')
      if (res.data.success) {
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
      label: 'Customer Name',
      key: 'customer_name',
      render: (val, row) => (
        <div className="flex items-center gap-3 ">
          <div>
            <div className="text-xs font-medium text-slate-700 leading-none">{val}</div>
            <div className="text-[10px] text-slate-400 leading-none mt-1">{row.customer_id}</div>
          </div>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (val, row) => {
        const status = getDisplayStatus(row)
        const statusConfig = {
          overdue: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: AlertCircle },
          draft: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', icon: Clock },
          confirmed: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: CheckCircle },
          under_production: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: Factory },
          complete: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: CheckCircle },
          dispatched: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', icon: Truck },
          delivered: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
          on_hold: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: AlertTriangle }
        }

        const config = statusConfig[status] || statusConfig.draft
        const Icon = config.icon

        return (
          <div className={`inline-flex items-center gap-1.5   ${config.text} `}>
            <Icon size={12} className={status === 'overdue' ? 'animate-pulse' : ''} />
            <span className="text-xs ">
              {status.replace('_', ' ')}
            </span>
          </div>
        )
      }
    },
    {
      label: 'Delivery Date',
      key: 'delivery_date',
      render: (value) => {
        const date = value ? new Date(value) : null
        const isOverdue = date && date < new Date()
        return (
          <div className={`flex items-center gap-2 text-xs ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-700'}`}>
            <Calendar size={12} className={isOverdue ? 'animate-pulse' : 'text-slate-400'} />
            {value ? new Date(value).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'Not Specified'}
          </div>
        )
      }
    },
    {
      label: 'ID',
      key: 'sales_order_id',
      render: (value) => (
        <div
          onClick={() => navigate(`/manufacturing/sales-orders/${value}?readonly=true`)}
          className="text-xs font-mono text-slate-500 hover:text-blue-600 cursor-pointer transition-colors"
        >
          {value}
        </div>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (_, row) => row ? (
        <div className="flex items-center  gap-1 ">
          <button
            onClick={() => navigate(`/manufacturing/sales-orders/${row.sales_order_id}?readonly=true`)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded  transition-all"
            title="Strategic View"
          >
            <Eye size={15} />
          </button>

          <button
            onClick={() => navigate(`/manufacturing/sales-orders/${row.sales_order_id}/hierarchy`)}
            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all"
            title="Production Hierarchy"
          >
            <GitBranch size={15} />
          </button>

          <button
            onClick={() => navigate(`/selling/delivery-notes/new?order=${row.sales_order_id}`)}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded  transition-all"
            title="Logistics Dispatch"
          >
            <Truck size={15} />
          </button>

          {['confirmed', 'under_production', 'complete', 'dispatched', 'delivered'].includes(row.status?.toLowerCase()) && (
            <button
              onClick={() => {
                setSelectedOrderIdForInvoice(row.sales_order_id);
                setShowInvoiceModal(true);
              }}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all"
              title="Generate Invoice"
            >
              <Receipt size={15} />
            </button>
          )}

          <button
            onClick={() => handleDeleteOrder(row.sales_order_id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all"
            title="Terminate Order"
          >
            <Trash2 size={15} />
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
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleTruncate}
            className="inline-flex items-center gap-2 rounded  bg-white p-2.5 text-xs  text-rose-600 border border-rose-100 hover:bg-rose-50 transition-all active:scale-95  "
          >
            <Trash2 size={15} />
            Reset All
          </button>
          <button
            onClick={() => navigate('/manufacturing/sales-orders/new')}
            className="inline-flex items-center gap-2 rounded  bg-slate-900 p-2 text-xs  text-white shadow  shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Plus size={15} />
            Initialize Order
          </button>
        </div>
      </div>

      {/* Redesigned Stats Cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value Card */}
        <div className="bg-white rounded border border-slate-200 p-2 ">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign size={20} />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp size={12} />
              {stats.growth}%
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] ">Total Pipeline Value</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl  text-slate-900">₹{(stats.total_value / 100000).toFixed(2)}L</span>
              <span className="text-[10px] font-medium text-slate-400">INR</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] border-t border-slate-50 pt-3">
              <span className="text-slate-400 font-medium">Fulfillment Rate</span>
              <span className="font-bold text-blue-600">{stats.fulfillment_rate}%</span>
            </div>
          </div>
        </div>

        {/* Active Fulfillment Card */}
        <div className="bg-white rounded border border-slate-200 p-2">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold  tracking-tight">Active</span>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] ">Active Fulfillment</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl  text-slate-900">{(stats.under_production || 0) + (stats.confirmed || 0)}</span>
              <span className="text-[10px] font-medium text-slate-400">Orders</span>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[8px] text-slate-400 font-bold  tracking-tighter">
                <span>Production Queue</span>
                <span>{stats.under_production || 0} Units</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${stats.total > 0 ? ((stats.under_production || 0) / stats.total * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Critical Alerts Card */}
        <div className="bg-white rounded border border-slate-200 p-2">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.overdue > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={20} />
            </div>
            {stats.overdue > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
            )}
          </div>
          <div>
            <p className="text-slate-500 text-[10px] ">Critical Alerts</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.overdue}</span>
              <span className="text-[10px] font-medium text-slate-400">Overdue</span>
            </div>
            <p className="mt-4 text-[9px] text-slate-400 border-t border-slate-50 pt-3 font-medium  tracking-tight">
              Requires immediate operational attention
            </p>
          </div>
        </div>

        {/* Successful Deliveries Card */}
        <div className="bg-white rounded border border-slate-200 p-2">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle size={20} />
            </div>
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold  tracking-tight">Completed</span>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] ">Successful Deliveries</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl  text-slate-900">{stats.delivered + stats.complete || 0}</span>
              <span className="text-[10px] font-medium text-slate-400">Success</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 border-t border-slate-50 pt-3  tracking-tight">
              <TrendingUp size={12} />
              <span>+5.4% from last period</span>
            </div>
          </div>
        </div>
      </div>

        {/* Intelligence Filters Section */}
      <div className="glass-filters p-2 mb-2  flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
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
              <option value="under_production">Active Manufacturing</option>
              <option value="dispatched">Logistics Phase</option>
              <option value="complete">Finalized Execution</option>
              <option value="on_hold">Deferred Action</option>
              <option value="cancelled">Nullified Orders</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={14} />
          </div>

          <button className="p-2 rounded  bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all  ">
            <Download size={15} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-2  flex items-center gap-3 rounded  border border-rose-100 bg-rose-50/50 p-4 text-rose-800 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
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
            <p className="text-xs animate-pulse">Syncing Operational Data...</p>
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
              <Plus size={15} />
              Initialize New Order
            </button>
          </div>
        ) : (
          <div className="glass-table border-none">
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

    <CreateInvoiceModal
      isOpen={showInvoiceModal}
      onClose={() => {
        setShowInvoiceModal(false);
        setSelectedOrderIdForInvoice(null);
      }}
      onSuccess={() => {
        fetchOrders();
        navigate('/selling/sales-invoices');
      }}
      initialOrderId={selectedOrderIdForInvoice}
    />
  </div>
)
}
