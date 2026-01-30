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
  ChevronRight, ArrowUpRight, History
} from 'lucide-react'
import './Buying.css'

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
        color: 'from-amber-50 to-amber-100/50', 
        border: 'border-amber-200', 
        badge: 'bg-amber-50 text-amber-600 border-amber-100', 
        iconColor: 'text-amber-500', 
        icon: FileText 
      },
      submitted: { 
        label: 'Submitted', 
        color: 'from-blue-50 to-blue-100/50', 
        border: 'border-blue-200', 
        badge: 'bg-blue-50 text-blue-600 border-blue-100', 
        iconColor: 'text-blue-500', 
        icon: Send 
      },
      to_receive: { 
        label: 'To Receive', 
        color: 'from-indigo-50 to-indigo-100/50', 
        border: 'border-indigo-200', 
        badge: 'bg-indigo-50 text-indigo-600 border-indigo-100', 
        iconColor: 'text-indigo-500', 
        icon: Download 
      },
      partially_received: { 
        label: 'Partially Received', 
        color: 'from-orange-50 to-orange-100/50', 
        border: 'border-orange-200', 
        badge: 'bg-orange-50 text-orange-600 border-orange-100', 
        iconColor: 'text-orange-500', 
        icon: AlertTriangle 
      },
      completed: { 
        label: 'Completed', 
        color: 'from-emerald-50 to-emerald-100/50', 
        border: 'border-emerald-200', 
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
        iconColor: 'text-emerald-500', 
        icon: CheckCircle 
      },
      cancelled: { 
        label: 'Cancelled', 
        color: 'from-rose-50 to-rose-100/50', 
        border: 'border-rose-200', 
        badge: 'bg-rose-50 text-rose-600 border-rose-100', 
        iconColor: 'text-rose-500', 
        icon: XCircle 
      }
    }
    return configs[status] || { 
      label: status?.replace('_', ' ').toUpperCase(), 
      color: 'from-slate-50 to-slate-100/50', 
      border: 'border-slate-200', 
      badge: 'bg-slate-50 text-slate-600 border-slate-100', 
      iconColor: 'text-slate-400', 
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
      key: 'po_no', 
      label: 'PO Number', 
      width: '10%',
      render: (val) => (
        <span className="font-semibold text-primary-600 dark:text-primary-400">
          {val}
        </span>
      )
    },
    {
      key: 'mr_id',
      label: 'Reference',
      width: '8%',
      render: (val) => val ? (
        <Badge className="text-indigo-600 bg-indigo-50 border-indigo-100 flex items-center gap-1 w-fit">
          <FileText size={10} />
          #{val}
        </Badge>
      ) : <span className="text-slate-400 text-xs italic">No Ref</span>
    },
    { 
      key: 'supplier_name', 
      label: 'Supplier', 
      width: '12%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {val || 'N/A'}
        </span>
      )
    },
    { 
      key: 'order_date', 
      label: 'Order Date', 
      width: '8%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'expected_date', 
      label: 'Expected Delivery', 
      width: '10%',
      render: (val, row) => {
        const days = getDaysUntilExpiry(val)
        if (!val) return 'N/A'
        const dateStr = new Date(val).toLocaleDateString()
        if (days !== null && row.status !== 'completed' && row.status !== 'cancelled') {
          const color = days < 0 ? 'text-red-600' : days < 3 ? 'text-orange-600' : 'text-green-600'
          const icon = days < 0 ? '🔴' : days < 3 ? '🟡' : '🟢'
          return (
            <div className="text-xs">
              <div>{dateStr}</div>
              <div className={`text-xs ${color} font-medium`}>
                {icon} {Math.abs(days)} days {days < 0 ? 'overdue' : 'left'}
              </div>
            </div>
          )
        }
        return dateStr
      }
    },
    { 
      key: 'total_value', 
      label: 'Amount', 
      width: '10%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
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
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-slate-500">{received}/{ordered}</span>
              <span className={`text-[10px] font-bold ${percentage === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{percentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200 shadow-inner">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  percentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
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
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.color} ${config.iconColor}`}>
              <Icon size={14} />
            </div>
            <Badge className={`${config.badge}  border shadow-sm`}>
              {config.label.toUpperCase()}
            </Badge>
          </div>
        )
      }
    },
    { 
      key: 'created_by', 
      label: 'Created By', 
      width: '10%',
      render: (val) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {val || 'System'}
        </span>
      )
    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/purchase-orders/${row.po_no}`)
        }}
        className="text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50"
      >
        <Eye size={16} />
      </Button>
      
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/buying/purchase-orders/${row.po_no}/edit`)
          }}
          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
        >
          <Edit2 size={16} />
        </Button>
      )}
      
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleSubmitPO(row.po_no)
          }}
          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
          disabled={actionLoading === row.po_no}
        >
          <Send size={16} />
        </Button>
      )}
      
      {(row.status === 'submitted' || row.status === 'to_receive' || row.status === 'partially_received') && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleReceiveMaterial(row)
          }}
          className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
        >
          <Download size={16} />
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Modern Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Building2 size={14} />
                <span>Buying</span>
                <ChevronRight size={14} />
                <span className="text-indigo-600 bg-indigo-50 p-1 rounded ">Orders</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded  shadow-lg shadow-indigo-200">
                  <Package className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl   text-slate-900 tracking-tight">Purchase Orders</h1>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <History size={14} className="animate-pulse text-indigo-400" />
                    <span>Updated {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-200 shadow-inner">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 p-2 rounded text-xs  transition-all duration-200 ${
                    viewMode === 'kanban' 
                      ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  <LayoutGrid size={16} />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 p-2 rounded text-xs  transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  <List size={16} />
                  <span>List View</span>
                </button>
              </div>

              <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

              <button
                onClick={() => { fetchOrders() }}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all border border-transparent hover:border-indigo-100"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>

              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none  text-sm uppercase tracking-wide"
              >
                <Plus size={18} strokeWidth={3} />
                <span>Create Order</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: '', label: 'Total Orders', value: stats.total, icon: ClipboardList, color: 'indigo' },
            { id: 'draft', label: 'Draft', value: stats.draft, icon: FileText, color: 'amber' },
            { id: 'submitted', label: 'Submitted', value: stats.submitted, icon: Send, color: 'blue' },
            { id: 'to_receive', label: 'To Receive', value: stats.to_receive, icon: Download, color: 'indigo' },
            { id: 'partially_received', label: 'Partial', value: stats.partially_received, icon: AlertTriangle, color: 'orange' },
            { id: 'completed', label: 'Fulfilled', value: stats.completed, icon: CheckCircle, color: 'emerald' }
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setActiveFilter(stat.id)}
              className={`group relative p-2 roundedborder-2 transition-all duration-300 text-left overflow-hidden hover:shadow-xl hover:-translate-y-1 ${
                activeFilter === stat.id 
                ? `bg-white border-${stat.color}-500 shadow-lg shadow-${stat.color}-100 ring-4 ring-${stat.color}-50` 
                : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
              }`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-500 bg-${stat.color}-600`}></div>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded  ${
                  activeFilter === stat.id ? `bg-${stat.color}-600 text-white shadow-lg` : `bg-${stat.color}-50 text-${stat.color}-600`
                } transition-colors duration-300`}>
                  <stat.icon size={22} />
                </div>
                {activeFilter === stat.id && (
                  <div className={`h-2 w-2 rounded-full bg-${stat.color}-500 animate-ping`}></div>
                )}
              </div>
              <p className="text-xs  text-slate-500  mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl  text-slate-900">{stat.value}</h3>
              </div>
            </button>
          ))}
        </div>

        {/* Filters & Actions Bar */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by PO # or supplier..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded  focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded  border border-slate-200">
              <Filter size={16} className="text-slate-400" />
              <span className="text-sm  text-slate-600">Filters:</span>
              <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
              <select 
                className="bg-transparent text-sm font-semibold text-indigo-600 focus:outline-none cursor-pointer"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="to_receive">To Receive</option>
                <option value="partially_received">Partially Received</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading && orders.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white h-64 rounded-2xl border border-slate-100 animate-pulse"></div>
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-2 overflow-x-auto  p-2 custom-scrollbar min-h-[600px]">
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
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} ${config.iconColor}`}>
                        <column.icon size={20} />
                      </div>
                      <h3 className=" text-slate-800 tracking-tight">{column.title}</h3>
                      <span className="bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full text-xs ">
                        {columnOrders.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 min-h-[500px] p-2 bg-slate-100/50 rounded-2xl border border-slate-200/50 border-dashed">
                    {columnOrders.map(order => (
                      <div
                        key={order.id}
                        onClick={() => navigate(`/buying/purchase-order/${order.po_no}`)}
                        className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${config.color.replace('from-', 'bg-').split(' ')[0]}`}></div>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div className="">
                            <span className="text-xs  text-indigo-600 ">#{order.po_no}</span>
                            <h4 className=" text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{order.supplier_name}</h4>
                          </div>
                          <div className={`px-2.5 py-1 rounded-lg text-xs  er ${config.badge} border shadow-sm`}>
                            {config.label}
                          </div>
                        </div>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Calendar size={14} />
                            <span className="text-xs font-semibold">{new Date(order.order_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded  border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-600 ">
                              <IndianRupee size={14} />
                              <span className="text-sm">{(parseFloat(order.total_value) || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <TrendingUp size={12} className="text-emerald-500" />
                              <span>{order.items?.length || 0} items</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                          {order.status === 'draft' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white  py-2 rounded "
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSubmitPO(order.po_no)
                              }}
                              disabled={actionLoading === order.po_no}
                            >
                              <Send size={14} />
                              Submit PO
                            </Button>
                          ) : (order.status === 'submitted' || order.status === 'to_receive' || order.status === 'partially_received') ? (
                            <Button
                              variant="success"
                              size="sm"
                              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white  py-2 rounded "
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReceiveMaterial(order)
                              }}
                            >
                              <Download size={14} />
                              Receive
                            </Button>
                          ) : (
                            <div className="w-full text-center py-2 text-xs  text-slate-400 bg-slate-50 rounded   border border-slate-100">
                              View Details
                            </div>
                          )}
                          <div className="p-2 bg-slate-50 text-slate-400 rounded  hover:bg-slate-100 transition-colors">
                            <ArrowUpRight size={18} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {columnOrders.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-40">
                        <div className="p-4 bg-slate-200 rounded-full mb-3">
                          <column.icon size={24} className="text-slate-400" />
                        </div>
                        <p className="text-xs  text-slate-500 ">No {column.title}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredOrders}
              loading={loading}
              renderActions={renderActions}
              onRowClick={(row) => navigate(`/buying/purchase-order/${row.po_no}`)}
              className="modern-table"
            />
          </div>
        )}
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
