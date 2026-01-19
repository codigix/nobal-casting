import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import { useNavigate } from 'react-router-dom'
import { 
  Edit2, Eye, Package, CheckCircle, Trash2, Plus, TrendingUp, AlertTriangle, AlertCircle,
  Truck, Clock, Calendar, DollarSign, Check, Search, Trash, Factory
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
  delivered: { icon: Package, color: '#059669', bg: '#d1fae5', text: '#065f46', label: 'Delivered' }
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

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      production: 0,
      complete: 0,
      on_hold: 0,
      dispatched: 0,
      delivered: 0,
      total_value: 0,
      avg_value: 0,
      pending_delivery: 0
    }

    data.forEach((order) => {
      if (order.status) {
        const status = order.status.toLowerCase()
        newStats[status] = (newStats[status] || 0) + 1
      }
      newStats.total_value += parseFloat(order.total_value || 0)
      if (order.status === 'production' || order.status === 'complete' || order.status === 'on_hold' || order.status === 'dispatched') {
        newStats.pending_delivery += 1
      }
    })

    newStats.avg_value = data.length > 0 ? newStats.total_value / data.length : 0
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
      <div className="relative inline-block w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between  px-3 py-1 text-xs font-medium rounded-xs border-2 transition-all"
          style={{
            backgroundColor: config.bg,
            borderColor: config.color,
            color: config.text
          }}
        >
          <div className="flex items-center gap-2">
            <config.icon size={16} style={{ color: config.color }} />
            <span>{config.label}</span>
          </div>
          <span className="text-xs opacity-60">▼</span>
        </button>
        
        {isOpen && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-xs shadow-xl z-20 overflow-hidden min-w-max">
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
                  className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-medium transition-all border-b last:border-b-0 ${
                    isSelected 
                      ? 'bg-gray-50 border-l-4' 
                      : 'hover:bg-gray-50'
                  }`}
                  style={isSelected ? { borderLeftColor: cfg.color } : {}}
                >
                  <cfg.icon size={16} style={{ color: cfg.color }} />
                  <span style={{ color: cfg.text }}>{cfg.label}</span>
                  {isSelected && (
                    <span className="ml-auto">✓</span>
                  )}
                </button>
              )
            })}
          </div>
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

  const ActionButton = ({ icon: Icon, label, onClick, danger = false }) => {
    const [isHovered, setIsHovered] = useState(false)
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center gap-1.5 p-2 text-xs rounded border transition-all whitespace-nowrap ${
          danger
            ? isHovered
              ? 'bg-red-50 border-red-400 text-red-600'
              : 'bg-white border-gray-300 text-red-600'
            : isHovered
            ? 'bg-gray-100 border-gray-400 text-gray-700'
            : 'bg-white border-gray-300 text-gray-700'
        }`}
      >
        <Icon size={14} /> {label}
      </button>
    )
  }

  const ActionDropdown = ({ row }) => {
    return (
      <div className="flex gap-1 flex-nowrap justify-center">
        <ActionButton
          icon={Eye}
          onClick={() => navigate(`/manufacturing/sales-orders/${row.sales_order_id}?readonly=true`)}
        />
        {row.status?.toLowerCase() === 'draft' && (
          <>
            <ActionButton
              icon={Edit2}
              onClick={() => navigate(`/manufacturing/sales-orders/${row.sales_order_id}`)}
            />
            <ActionButton
              icon={CheckCircle}
              onClick={() => handleConfirmOrder(row.sales_order_id)}
            />
          </>
        )}
        {row.status?.toLowerCase() === 'confirmed' && (
          <>
            <ActionButton
              icon={Factory}
              onClick={() => setGeneratingPlanForOrder(row.sales_order_id)}
              title="Generate Production Plan"
            />
            <ActionButton
              icon={Truck}
              onClick={() => navigate(`/selling/delivery-notes/new?order=${row.sales_order_id}`)}
            />
          </>
        )}
        <ActionButton
          icon={Trash2}
          onClick={() => handleDeleteOrder(row.sales_order_id)}
          danger={true}
        />
      </div>
    )
  }

  const columns = [
    { 
      label: 'Order ID', 
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
          <div className="text-left">
            <button
              onClick={() => navigate(`/manufacturing/sales-orders/${value}?readonly=true`)}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
            >
              {value}
            </button>
            {productName && <div className="text-xs text-gray-600 mt-1">{productName}</div>}
          </div>
        )
      }
    },
    { label: 'Customer', key: 'customer_name' },
    { 
      label: 'Items Summary', 
      key: 'items_summary',
      render: (value, row) => {
        if (!row || !row.items || row.items.length === 0) return 'No items'
        const itemCount = row.items.length
        const firstFewItems = row.items.slice(0, 2).map(item => `${item.item_name || item.item_code}`).join(', ')
        const itemList = row.items.map(item => `${item.item_name || item.item_code} (Qty: ${item.qty})`).join(', ')
        const summaryText = itemCount > 2 ? `${firstFewItems}... (+${itemCount - 2} more)` : firstFewItems
        return (
          <div className="group relative inline-block max-w-xs">
            <span className="inline-block truncate text-xs text-slate-700 hover:text-blue-600 cursor-help font-medium">
              {summaryText}
            </span>
            <div className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-900 text-white text-xs rounded-md px-3 py-2 z-50 shadow-lg whitespace-normal max-w-sm break-words pointer-events-none">
              {itemList}
            </div>
          </div>
        )
      }
    },
    { 
      label: 'Items Qty', 
      key: 'qty',
      render: (value, row) => {
        if (!row) return '0'
        
        if (row.qty) return parseFloat(row.qty).toFixed(2)
        
        if (row.items && row.items.length > 0) {
          const totalQty = row.items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0)
          return totalQty.toFixed(2)
        }
        
        return '0'
      }
    },
    { 
      label: 'Amount', 
      key: 'order_amount', 
      render: (val, row) => {
        if (!row) return '₹0.00'
        
        if (row.order_amount && parseFloat(row.order_amount) > 0) {
          return `₹${parseFloat(row.order_amount).toFixed(2)}`
        }
        
        if (row.items && row.items.length > 0) {
          const totalAmount = row.items.reduce((sum, item) => {
            const itemQty = parseFloat(item.qty) || 0
            const itemRate = parseFloat(item.amount) || parseFloat(item.rate) || 0
            return sum + (itemQty * itemRate)
          }, 0)
          return `₹${totalAmount.toFixed(2)}`
        }
        
        return '₹0.00'
      }
    },
    { 
      label: 'Sales Order Price', 
      key: 'sales_order_price',
      render: (val, row) => {
        if (!row) return '₹0.00'
        
        if (row.items && row.items.length > 0) {
          const fgItems = row.items.filter(item => item.fg_sub_assembly === 'FG' || item.fg_sub_assembly === 'Finished Good')
          
          const fgUnitCost = fgItems.reduce((sum, item) => sum + (parseFloat(item.rate) || 0), 0)
          const qty = parseFloat(row.qty) || 1
          const baseCost = fgUnitCost * qty
          
          const profitMarginPct = parseFloat(row.profit_margin_percentage) || 0
          const profitAmount = baseCost * (profitMarginPct / 100)
          const costWithProfit = baseCost + profitAmount
          
          const cgstRate = parseFloat(row.cgst_rate) || 0
          const sgstRate = parseFloat(row.sgst_rate) || 0
          const totalGstRate = (cgstRate + sgstRate) / 100
          const gstAmount = costWithProfit * totalGstRate
          const grandTotal = costWithProfit + gstAmount
          
          return `₹${grandTotal.toFixed(2)}`
        }
        
        return '₹0.00'
      }
    },
    { 
      label: 'Delivery Date', 
      key: 'delivery_date',
      render: (val) => {
        if (!val) return '-'
        try {
          return new Date(val).toLocaleDateString('en-IN')
        } catch (e) {
          return '-'
        }
      }
    },
    { 
      label: 'Status', 
      key: 'status',
      minWidth: '140px',
      render: (val, row) => <StatusDropdown currentStatus={val} orderId={row.sales_order_id} />
    },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => {
        if (!row) return null
        return <ActionDropdown row={row} />
      }
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className=" mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Sales Orders</h1>
            <p className="text-slate-600 text-xs">Manage and track all your sales orders</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/manufacturing/sales-orders/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-semibold text-xs flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus size={15} /> New Order
            </button>
            <button 
              onClick={handleTruncate}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded font-semibold text-xs flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              title="Delete all sales orders"
            >
              <Trash size={15} /> Truncate All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="Nobg-white rounded-xs shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-2">
            
            <div className='flex justify-between items-center'>
              <div className="text-md font-bold text-slate-900 mb-0.5">{stats.total}</div>
            <div className="flex items-start mb-3">
              <div className="p-2.5 bg-blue-100 rounded-md">
                <Package size={18} color={iconColorMap.primary} />
              </div>
            </div>
            </div>
            <p className="text-xs text-slate-600 font-medium">Total Orders</p>
          </div>

          <div className="Nobg-white rounded-xs shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-2">
            <div className='flex justify-between items-center'>
              <div className="text-md font-bold text-slate-900 mb-0.5">{stats.draft}</div>
            <div className="flex items-start mb-3">
              <div className="p-2.5 bg-orange-100 rounded-md">
                <Edit2 size={18} color={iconColorMap.warning} />
              </div>
            </div>
            </div>
            
            <p className="text-xs text-slate-600 font-medium">Draft Orders</p>
          </div>

          <div className="Nobg-white rounded-xs shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-2">
                        <div className='flex justify-between items-center'>
                          <div className="text-md font-bold text-slate-900 mb-0.5">{stats.confirmed || 0}</div>

            <div className="flex items-start mb-3">
              <div className="p-2.5 bg-green-100 rounded-md">
                <Check size={18} color={iconColorMap.success} />
              </div>
            </div>
                        </div>
            <p className="text-xs text-slate-600 font-medium">Confirmed</p>
          </div>

          <div className="Nobg-white rounded-xs shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-2">
                       <div className='flex justify-between items-center'>
                         <div className="text-md font-bold text-slate-900 mb-0.5">₹{(stats.total_value / 100000).toFixed(1)}L</div>

            <div className="flex items-start mb-3">
              <div className="p-2.5 bg-emerald-100 rounded-md">
                <DollarSign size={18} color={iconColorMap.success} />
              </div>
            </div>
                       </div>
            <p className="text-xs text-slate-600 font-medium">Total Revenue</p>
          </div>

          <div className="Nobg-white rounded-xs shadow-sm hover:shadow-md transition-shadow border border-slate-200 p-2">
            <div className='flex justify-between items-center'>

            <div className="text-md font-bold text-slate-900 mb-0.5">{stats.pending_delivery}</div>
            <div className="flex items-start mb-3">
              <div className="p-2.5 bg-red-100 rounded-md">
                <Truck size={18} color={iconColorMap.danger} />
              </div>
            </div>
            </div>
            
            <p className="text-xs text-slate-600 font-medium">Pending Delivery</p>
          </div>
        </div>

        <div className="bg-white rounded-xs shadow-sm border border-slate-200 p-2 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Search Orders</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Order ID, Customer, or Item..."
                  value={filters.globalSearch}
                  onChange={(e) => setFilters({ ...filters, globalSearch: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Status Filter</label>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="dispatched">Dispatched</option>
                <option value="invoiced">Invoiced</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-md p-3 mb-6 text-red-800 text-xs flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div >
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <div className="animate-spin mx-auto mb-3">
                <Package size={28} />
              </div>
              <p className="text-xs font-medium">Loading sales orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="bg-slate-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <Package size={28} className="text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No Sales Orders Found</h3>
              <p className="text-xs text-slate-600 mb-4">Get started by creating your first sales order</p>
              <button
                onClick={() => navigate('/manufacturing/sales-orders/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md font-semibold text-xs inline-flex items-center gap-2 transition-all"
              >
                <Plus size={16} /> Create First Order
              </button>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredOrders} filterable={false} />
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
