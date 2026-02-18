import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import CreatePurchaseOrderModal from '../../components/Buying/CreatePurchaseOrderModal'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Edit2, Send, Download, Eye, Package, AlertCircle, CheckCircle, XCircle,
  Clock, Plus, TrendingUp, AlertTriangle, RefreshCw, ClipboardList, IndianRupee,
  LayoutGrid, List, Search, Filter, ArrowRight, MoreVertical, Calendar, Building2,
  ChevronRight, ArrowUpRight, History, Settings2, X
} from 'lucide-react'
import './Buying.css'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive, description }) => {
  const colorMap = {
    primary: 'from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
    success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400',
    danger: 'from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400',
    info: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400',
    indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
    orange: 'from-orange-500/10 to-orange-500/5 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
  }

  return (
    <Card
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-2 border-1 transition-all duration-300 hover:shadow  hover:-translate-y-1 relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-blue-500 border-transparent shadow-blue-500/20' : ''}`}
    >
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-current opacity-5 rounded-full group-hover:scale-125 transition-transform" />
        <div className="flex items-start justify-between relative z-0">
          <div>
            <span className="text-xs    text-neutral-500 dark:text-neutral-400">{label}</span>
            <p className="text-2xl  mt-1 text-neutral-900 dark:text-white">{value}</p>
            {description && <p className="text-xs mt-1 text-neutral-400 dark:text-neutral-500">{description}</p>}
          </div>
          <div className={`p-2 rounded bg-white dark:bg-neutral-900  border border-inherit transition-transform group-hover:rotate-12`}>
            <Icon size={20} className="text-inherit" />
          </div>
        </div>
      
    </Card>
  )
}

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showGRNModal, setShowGRNModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [visibleColumns, setVisibleColumns] = useState(null)
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/purchase-orders')
      const data = response.data
      if (data.success) {
        setOrders(data.data || [])
        setRefreshTime(new Date())
      } else {
        setError(data.error || 'Failed to fetch orders')
        toast.addToast(data.error || 'Failed to fetch orders', 'error')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Error fetching purchase orders')
      toast.addToast('Error fetching purchase orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = orders.length
    const draft = orders.filter(o => o.status === 'draft').length
    const submitted = orders.filter(o => o.status === 'submitted').length
    const to_receive = orders.filter(o => o.status === 'to_receive').length
    const partially_received = orders.filter(o => o.status === 'partially_received').length
    const completed = orders.filter(o => o.status === 'completed').length
    const total_value = orders.reduce((acc, o) => acc + parseFloat(o.total_value || 0), 0)

    return { total, draft, submitted, to_receive, partially_received, completed, total_value }
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesFilter = !activeFilter || order.status === activeFilter

      const matchesSearch =
        order.po_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesFilter && matchesSearch
    })
  }, [orders, activeFilter, searchQuery])

  const handleSubmitPO = async (po_no) => {
    try {
      setActionLoading(po_no)
      const response = await api.post(`/purchase-orders/${po_no}/submit`)
      const data = response.data

      if (data.success) {
        toast.addToast('Purchase Order submitted successfully', 'success')
        fetchOrders()
      } else {
        toast.addToast(data.error || 'Failed to submit PO', 'error')
      }
    } catch (err) {
      console.error('Error submitting PO:', err)
      toast.addToast('Error submitting PO', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReceiveMaterial = (po) => {
    setSelectedPO(po)
    setShowGRNModal(true)
  }

  const getStatusConfig = (status) => {
    const configs = {
      draft: {
        label: 'Draft',
        color: 'from-amber-500/10 to-amber-500/5',
        border: 'border-amber-200 dark:border-amber-800/50',
        badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
        iconColor: 'text-amber-500',
        icon: FileText
      },
      submitted: {
        label: 'Submitted',
        color: 'from-blue-500/10 to-blue-500/5',
        border: 'border-blue-200 dark:border-blue-800/50',
        badge: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
        iconColor: 'text-blue-500',
        icon: Send
      },
      to_receive: {
        label: 'To Receive',
        color: 'from-indigo-500/10 to-indigo-500/5',
        border: 'border-indigo-200 dark:border-indigo-800/50',
        badge: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
        iconColor: 'text-indigo-500',
        icon: Download
      },
      partially_received: {
        label: 'Partially Received',
        color: 'from-orange-500/10 to-orange-500/5',
        border: 'border-orange-200 dark:border-orange-800/50',
        badge: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50',
        iconColor: 'text-orange-500',
        icon: AlertTriangle
      },
      completed: {
        label: 'Completed',
        color: 'from-emerald-500/10 to-emerald-500/5',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
        iconColor: 'text-emerald-500',
        icon: CheckCircle
      },
      cancelled: {
        label: 'Cancelled',
        color: 'from-rose-500/10 to-rose-500/5',
        border: 'border-rose-200 dark:border-rose-800/50',
        badge: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
        iconColor: 'text-rose-500',
        icon: XCircle
      }
    }
    return configs[status] || {
      label: status?.replace('_', ' ').toUpperCase(),
      color: 'from-neutral-500/10 to-neutral-500/5',
      border: 'border-neutral-200 dark:border-neutral-800/50',
      badge: 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800',
      iconColor: 'text-neutral-400',
      icon: AlertCircle
    }
  }

  const kanbanColumns = [
    { status: 'draft', title: 'Draft Orders', icon: FileText },
    { status: 'submitted', title: 'Sent to Supplier', icon: Send },
    { status: 'to_receive', title: 'Expected Arrival', icon: Download },
    { status: 'partially_received', title: 'Partial Delivery', icon: AlertTriangle },
    { status: 'completed', title: 'Fulfilled', icon: CheckCircle }
  ]

  const getDaysUntilExpiry = (expectedDate) => {
    if (!expectedDate) return null
    const today = new Date()
    const expiry = new Date(expectedDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const columns = [
    {
      key: 'po_details',
      label: 'PO Details',
      width: '15%',
      render: (_, row) => (
        <div className="flex flex-col gap-1.5 py-1">
          <span className="text-xs  text-indigo-600 dark:text-indigo-400  leading-none group-hover:scale-105 transition-transform origin-left">
            {row.po_no}
          </span>
          {row.mr_id ? (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800  w-fit">
              <FileText size={10} className="text-neutral-400" />
              <span className="text-xs  text-neutral-500 dark:text-neutral-400  ">#{row.mr_id}</span>
            </div>
          ) : (
            <span className="text-xs  text-neutral-400 dark:text-neutral-500   opacity-50">Direct PO</span>
          )}
        </div>
      )
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      width: '12%',
      render: (val) => (
        <div className="flex flex-col">
          <span className="text-xs  text-neutral-900 dark:text-white truncate max-w-[180px]">
            {val || 'N/A'}
          </span>
          <span className="text-xs  text-neutral-400 dark:text-neutral-500  ">Active Vendor</span>
        </div>
      )
    },
    {
      key: 'timeline',
      label: 'Order -- Expected',
      width: '20%',
      render: (_, row) => {
        const orderDate = row.order_date ? new Date(row.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'
        const expectedVal = row.expected_date
        const days = getDaysUntilExpiry(expectedVal)
        const expectedDate = expectedVal ? new Date(expectedVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'

        return (
          <div className="flex items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                <Calendar size={8} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs  text-neutral-700 dark:text-neutral-300">{orderDate}</span>
              </div>
            </div>

            <ArrowRight size={10} className="text-neutral-300 dark:text-neutral-700" />

            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 flex items-center justify-center rounded border-1 transition-all ${
                days < 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rotate-3' :
                days < 3 ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400' :
                'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
              }`}>
                <Clock size={8} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  {expectedVal && days !== null && row.status !== 'completed' && row.status !== 'cancelled' && (
                    <span className={`text-[9px]    ${
                      days < 0 ? 'text-rose-600' : days < 3 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {days < 0 ? 'Overdue' : `${days}d`}
                    </span>
                  )}
                </div>
                <span className="text-[11px]  text-neutral-900 dark:text-white">{expectedDate}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'total_value',
      label: 'Amount',
      width: '10%',
      render: (val) => (
        <div className="flex flex-col">
          <span className="text-sm  text-neutral-900 dark:text-white ">
            ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs  text-emerald-600 dark:text-emerald-400  ">Net Value</span>
        </div>
      )
    },
    {
      key: 'fulfillment',
      label: 'Fulfillment',
      width: '12%',
      render: (_, row) => {
        const received = parseFloat(row.total_received_qty) || 0
        const ordered = parseFloat(row.total_ordered_qty) || 0
        const percentage = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0

        return (
          <div className="w-full pr-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs  text-neutral-500 dark:text-neutral-400  ">{received}/{ordered}</span>
              <span className={`text-xs    ${percentage === 100 ? 'text-emerald-600' : 'text-indigo-600 dark:text-indigo-400'}`}>{percentage}%</span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-inner">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      width: '12%',
      render: (val) => {
        const config = getStatusConfig(val)
        const Icon = config.icon
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded bg-gradient-to-br ${config.color} ${config.iconColor}`}>
              <Icon size={10} />
            </div>
            <Badge className={`${config.badge}  border `}>
              {config.label.toUpperCase()}
            </Badge>
          </div>
        )
      }
    },
  
  ]

  const renderActions = (row) => (
    <div className="flex items-center gap-1.5 justify-center">
      <Button
        size="xs"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/purchase-orders/${row.po_no}`)
        }}
        className="w-5 h-5 rounded items-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-neutral-200 dark:border-neutral-700 transition-all active:scale-90"
        title="View Details"
      >
        <Eye size={12} />
      </Button>

      {row.status === 'draft' && (
        <>
          <Button
            size="xs"
            variant="icon"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/buying/purchase-orders/${row.po_no}/edit`)
            }}
            className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-neutral-200 dark:border-neutral-700 transition-all active:scale-90"
            title="Edit Order"
          >
            <Edit2 size={12} />
          </Button>
          <Button
            size="xs"
            variant="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleSubmitPO(row.po_no)
            }}
            className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 border border-neutral-200 dark:border-neutral-700 transition-all active:scale-90"
            disabled={actionLoading === row.po_no}
            title="Submit Order"
          >
            <Send size={12} className={actionLoading === row.po_no ? 'animate-pulse' : ''} />
          </Button>
        </>
      )}

      {(row.status === 'submitted' || row.status === 'to_receive' || row.status === 'partially_received') && (
        <Button
          size="xs"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleReceiveMaterial(row)
          }}
          className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-neutral-200 dark:border-neutral-700 transition-all active:scale-90"
          title="Receive Material"
        >
          <Download size={12} />
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 transition-colors duration-300 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-2">
        {/* Modern Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white dark:bg-neutral-900  ">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded  bg-indigo-600 flex items-center justify-center text-white  shadow-indigo-600/20">
              <Package size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs   text-neutral-500 dark:text-neutral-400 ">
                <span>Buying</span>
                <ChevronRight size={12} />
                <span>Procurement</span>
              </div>
              <h1 className="text-xl  text-neutral-900 dark:text-white ">Purchase Orders</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 ">Manage procurement cycles and supplier orders</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 ">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 p-2 rounded text-xs   transition-all ${viewMode === 'kanban'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400  ring-1 ring-black/5'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-indigo-600'
                  }`}
              >
                <LayoutGrid size={14} />
                KANBAN
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 p-2 rounded text-xs   transition-all ${viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400  ring-1 ring-black/5'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-indigo-600'
                  }`}
              >
                <List size={14} />
                LIST
              </button>
            </div>

            <div className="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>

            <button
              onClick={fetchOrders}
              className="p-2 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded border border-neutral-200 dark:border-neutral-700 transition-all active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded  shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none text-xs  "
            >
              <Plus size={18} strokeWidth={3} />
              Create Order
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-4 w-full">
          {/* Improved Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { id: '', label: 'Total Orders', value: stats.total, icon: ClipboardList, color: 'indigo', description: `Total: ₹${stats.total_value.toLocaleString()}` },
              { id: 'draft', label: 'Draft', value: stats.draft, icon: FileText, color: 'amber', description: 'Pending submission' },
              { id: 'submitted', label: 'Submitted', value: stats.submitted, icon: Send, color: 'blue', description: 'Active orders' },
              { id: 'to_receive', label: 'To Receive', value: stats.to_receive, icon: Download, color: 'indigo', description: 'Awaiting delivery' },
              { id: 'partially_received', label: 'Partial', value: stats.partially_received, icon: AlertTriangle, color: 'orange', description: 'Incomplete receipts' },
              { id: 'completed', label: 'Fulfilled', value: stats.completed, icon: CheckCircle, color: 'success', description: 'Fully received' }
            ].map((stat) => (
              <StatCard
                key={stat.label}
                {...stat}
                onClick={() => setActiveFilter(stat.id)}
                isActive={activeFilter === stat.id}
              />
            ))}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 dark:bg-neutral-900   my-3   dark:border-neutral-800 ">
            <div className="relative flex-1 group max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search by PO # or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded  text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded ">
                <Filter size={14} className="text-neutral-400" />
                <span className="text-xs  text-neutral-500 dark:text-neutral-400  ">Status:</span>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="bg-transparent text-xs  text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer  border-0"
                >
                  <option value="">All Orders</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="to_receive">To Receive</option>
                  <option value="partially_received">Partially Received</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="relative">
                <Button
                  variant="secondary"
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="flex items-center gap-2 p-2 rounded  border-2 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                >
                  <Settings2 size={15} />
                </Button>

                {showColumnMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded  border border-neutral-200 dark:border-neutral-700  z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-xs  text-neutral-400  ">Display Columns</span>
                      <button onClick={() => setShowColumnMenu(false)} className="text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
                    </div>
                    <div className="space-y-1">
                      {columns.map(col => (
                        <label key={col.key} className="flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 rounded cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns?.has(col.key) ?? true}
                            onChange={() => {
                              const newSet = new Set(visibleColumns || columns.map(c => c.key))
                              if (newSet.has(col.key)) newSet.delete(col.key)
                              else newSet.add(col.key)
                              setVisibleColumns(newSet)
                            }}
                            className="w-4 h-4 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs  text-neutral-700 dark:text-neutral-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */ }
  {
    loading && orders.length === 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(n => (
          <div key={n} className="bg-white dark:bg-neutral-900 h-64 rounded  border border-neutral-100 dark:border-neutral-800 animate-pulse"></div>
        ))}
      </div>
    ) : viewMode === 'kanban' ? (
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
        {kanbanColumns.map(column => {
          const columnOrders = orders.filter(o => o.status === column.status &&
            (!searchQuery ||
              o.po_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              o.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
          const config = getStatusConfig(column.status)

          return (
            <div key={column.status} className="flex-shrink-0 w-[350px] flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded bg-gradient-to-br ${config.color} ${config.iconColor}`}>
                    <column.icon size={20} />
                  </div>
                  <h3 className="text-neutral-900 dark:text-neutral-100  text-xs  ">{column.title}</h3>
                  <span className="bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2.5 py-0.5 rounded-full text-xs ">
                    {columnOrders.length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 min-h-[500px] p-2 bg-neutral-100/50 dark:bg-neutral-900/50 rounded  border border-neutral-200/50 dark:border-neutral-800/50 border-dashed">
                {columnOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/buying/purchase-orders/${order.po_no}`)}
                    className="group bg-white dark:bg-neutral-900 p-5 rounded  border border-neutral-200 dark:border-neutral-800 hover:shadow  hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${config.color.replace('from-', 'bg-').split(' ')[0]}`}></div>

                    <div className="flex justify-between items-start mb-4">
                      <div className="">
                        <span className="text-xs   text-indigo-600 dark:text-indigo-400 ">#{order.po_no}</span>
                        <h4 className="text-sm  text-neutral-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{order.supplier_name}</h4>
                      </div>
                      <div className={`px-2.5 py-1 rounded text-xs   border ${config.badge}`}>
                        {config.label.toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                        <Calendar size={14} />
                        <span className="text-xs ">{new Date(order.order_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded  border border-neutral-100 dark:border-neutral-800">
                        <div className="flex flex-col">
                          <span className="text-xs  text-neutral-400  ">Amount</span>
                          <span className="text-sm  text-neutral-900 dark:text-white">₹{(parseFloat(order.total_value) || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                          <TrendingUp size={12} className="text-emerald-500" />
                          <span>{order.items?.length || 0} items</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                      {order.status === 'draft' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2  rounded  text-xs  "
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubmitPO(order.po_no)
                          }}
                          disabled={actionLoading === order.po_no}
                        >
                          <Send size={14} strokeWidth={3} />
                          SUBMIT PO
                        </Button>
                      ) : (order.status === 'submitted' || order.status === 'to_receive' || order.status === 'partially_received') ? (
                        <Button
                          variant="success"
                          size="sm"
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2  rounded  text-xs  "
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReceiveMaterial(order)
                          }}
                        >
                          <Download size={14} strokeWidth={3} />
                          RECEIVE
                        </Button>
                      ) : (
                        <div className="w-full text-center py-2  text-xs   text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 rounded  border border-neutral-100 dark:border-neutral-800 ">
                          View Details
                        </div>
                      )}
                      <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded  hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors border border-neutral-100 dark:border-neutral-700">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </div>
                ))}
                {columnOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-40">
                    <div className="p-4 bg-neutral-200 dark:bg-neutral-800 rounded-full mb-3">
                      <column.icon size={24} className="text-neutral-400" />
                    </div>
                    <p className="text-xs  text-neutral-500  ">No {column.title}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <div className="">
        <DataTable
          columns={columns}
          data={filteredOrders}
          loading={loading}
          renderActions={renderActions}
          onRowClick={(row) => navigate(`/buying/purchase-orders/${row.po_no}`)}
          className="modern-table"
          hideColumnToggle={true}
          externalVisibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
        />
      </div>
    )
  }
      </div>

      <CreatePurchaseOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchOrders}
      />

      {showGRNModal && selectedPO && (
        <CreateGRNModal
          isOpen={showGRNModal}
          onClose={() => {
            setShowGRNModal(false)
            setSelectedPO(null)
          }}
          purchaseOrder={selectedPO}
          onSuccess={() => {
            setShowGRNModal(false)
            setSelectedPO(null)
            fetchOrders()
          }}
        />
      )}
    </div>
  )
}
