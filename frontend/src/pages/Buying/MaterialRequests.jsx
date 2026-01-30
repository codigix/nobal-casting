import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import CreateMaterialRequestModal from '../../components/Buying/CreateMaterialRequestModal'
import ViewMaterialRequestModal from '../../components/Buying/ViewMaterialRequestModal'
import { 
  Plus, Eye, CheckCircle, XCircle, Trash2, AlertCircle, FileText,
  CheckCheck, Clock, ClipboardList, Search, Filter, 
  ArrowUpRight, ArrowDownRight, Package, ShoppingBag, 
  Activity, RefreshCw, LayoutGrid, List, History, 
  Building2, ChevronRight, TrendingUp, Calendar, ArrowRight,
  MoreVertical, Info, FileCheck, Truck, ShieldCheck
} from 'lucide-react'

export default function MaterialRequests() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [departments, setDepartments] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedMrId, setSelectedMrId] = useState(null)
  const [stockData, setStockData] = useState({})
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [viewMode, setViewMode] = useState('list')

  const checkItemsAvailability = useCallback(async (requestsList) => {
    try {
      const allStockData = {}
      
      for (const request of requestsList) {
        const warehouse = request.source_warehouse || 'warehouse'
        
        for (const item of request.items || []) {
          const key = `${item.item_code}-${warehouse}`
          
          if (allStockData[key]) continue
          
          try {
            const res = await api.get(`/stock/stock-balance`, {
              params: {
                item_code: item.item_code,
                warehouse_id: warehouse
              }
            })
            
            const balance = res.data.data || res.data
            let availableQty = 0
            
            if (Array.isArray(balance)) {
              availableQty = balance.reduce((sum, b) => sum + (parseFloat(b.available_qty || b.current_qty || 0)), 0)
            } else if (balance && typeof balance === 'object') {
              availableQty = parseFloat(balance.available_qty || balance.current_qty || 0)
            }
            
            allStockData[key] = {
              available: availableQty,
              requested: parseFloat(item.qty),
              status: availableQty >= parseFloat(item.qty) ? 'available' : 'unavailable'
            }
          } catch (err) {
            allStockData[key] = {
              available: 0,
              requested: parseFloat(item.qty),
              status: 'unavailable'
            }
          }
        }
      }
      
      setStockData(allStockData)
    } catch (err) {
      console.error('Error checking stock availability:', err)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('/material-requests')
      const data = response.data.data || []
      setRequests(data)
      await checkItemsAvailability(data)
      setRefreshTime(new Date())
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material requests')
      toast.addToast('Failed to fetch material requests', 'error')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [checkItemsAvailability, toast])

  const stats = useMemo(() => {
    const total = requests.length
    const draft = requests.filter(r => r.status === 'draft').length
    const approved = requests.filter(r => r.status === 'approved').length
    const converted = requests.filter(r => r.status === 'converted').length
    const completed = requests.filter(r => r.status === 'completed').length
    const cancelled = requests.filter(r => r.status === 'cancelled').length

    return { total, draft, approved, converted, completed, cancelled }
  }, [requests])

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesFilter = !activeFilter || req.status === activeFilter
      
      const matchesSearch = 
        req.mr_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesFilter && matchesSearch
    })
  }, [requests, activeFilter, searchQuery])

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await api.get('/material-requests/departments')
      setDepartments(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
    fetchDepartments()
  }, [fetchRequests, fetchDepartments])

  useEffect(() => {
    const handleMaterialRequestApproved = () => {
      fetchRequests()
    }
    
    window.addEventListener('materialRequestApproved', handleMaterialRequestApproved)
    return () => window.removeEventListener('materialRequestApproved', handleMaterialRequestApproved)
  }, [fetchRequests])

  const handleApprove = async (id) => {
    try {
      const response = await api.patch(`/material-requests/${id}/approve`)
      const message = response.data.message || 'Material request approved successfully'
      toast.addToast(message, 'success')
      fetchRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to approve', 'error')
    }
  }

  const handleSend = async (id) => {
    try {
      const response = await api.patch(`/material-requests/${id}/submit`)
      const message = response.data.message || 'Material request sent for approval'
      toast.addToast(message, 'success')
      fetchRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to send request', 'error')
    }
  }

  const handleReject = async (id) => {
    try {
      await api.patch(`/material-requests/${id}/reject`)
      toast.addToast('Material request rejected', 'success')
      fetchRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to reject', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this material request?')) {
      try {
        await api.delete(`/material-requests/${id}`)
        toast.addToast('Material request deleted', 'success')
        fetchRequests()
      } catch (err) {
        toast.addToast(err.response?.data?.error || 'Failed to delete', 'error')
      }
    }
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
      pending: { 
        label: 'Pending Approval', 
        color: 'from-orange-50 to-orange-100/50', 
        border: 'border-orange-200', 
        badge: 'bg-orange-50 text-orange-600 border-orange-100', 
        iconColor: 'text-orange-500', 
        icon: Clock 
      },
      approved: { 
        label: 'Approved', 
        color: 'from-blue-50 to-blue-100/50', 
        border: 'border-blue-200', 
        badge: 'bg-blue-50 text-blue-600 border-blue-100', 
        iconColor: 'text-blue-500', 
        icon: ShieldCheck 
      },
      converted: { 
        label: 'Processing', 
        color: 'from-indigo-50 to-indigo-100/50', 
        border: 'border-indigo-200', 
        badge: 'bg-indigo-50 text-indigo-600 border-indigo-100', 
        iconColor: 'text-indigo-500', 
        icon: RefreshCw 
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
      label: status?.toUpperCase(), 
      color: 'from-slate-50 to-slate-100/50', 
      border: 'border-slate-200', 
      badge: 'bg-slate-50 text-slate-600 border-slate-100', 
      iconColor: 'text-slate-400', 
      icon: Info 
    }
  }

  const kanbanColumns = [
    { status: 'draft', title: 'Draft Requests', icon: FileText },
    { status: 'pending', title: 'Pending Approval', icon: Clock },
    { status: 'approved', title: 'Ready for PO', icon: ShieldCheck },
    { status: 'converted', title: 'Being Processed', icon: RefreshCw },
    { status: 'completed', title: 'Fulfilled', icon: CheckCircle }
  ]

  const getItemsAvailabilityStatus = (row) => {
    const warehouse = row.source_warehouse || 'warehouse'
    const items = row.items || []
    
    if (items.length === 0) return { all: 'available', available: 0, unavailable: 0 }
    
    let availableCount = 0
    let unavailableCount = 0
    
    for (const item of items) {
      const key = `${item.item_code}-${warehouse}`
      const itemStock = stockData[key]
      
      if (itemStock && itemStock.status === 'available') {
        availableCount++
      } else {
        unavailableCount++
      }
    }
    
    return {
      all: unavailableCount === 0 ? 'available' : (availableCount === 0 ? 'unavailable' : 'partial'),
      available: availableCount,
      unavailable: unavailableCount
    }
  }

  const columns = [
    { 
      key: 'mr_id', 
      label: 'MR ID', 
      width: '10%',
      render: (val) => <span className=" text-indigo-600">#{val}</span>
    },
    { key: 'requested_by_name', label: 'Requested By', width: '12%' },
    { key: 'department', label: 'Department', width: '10%' },
    { 
      key: 'required_by_date', 
      label: 'Required By', 
      width: '10%',
      render: (val) => (
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="font-medium">{val ? new Date(val).toLocaleDateString() : '-'}</span>
        </div>
      )
    },
    {
      key: 'stock_availability',
      label: 'Availability',
      width: '12%',
      render: (val, row) => {
        const status = getItemsAvailabilityStatus(row)
        const configs = { 
          available: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
          unavailable: { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: XCircle },
          partial: { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertCircle }
        }
        const config = configs[status.all]
        const Icon = config.icon
        return (
          <Badge className={`${config.color} border flex items-center gap-1.5`}>
            <Icon size={12} />
            {status.all.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      key: 'linked_po',
      label: 'Linked PO',
      width: '12%',
      render: (val, row) => {
        if (!row.linked_po_no) return <span className="text-slate-400 text-xs italic">Not Linked</span>
        
        return (
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-indigo-600">#{row.linked_po_no}</span>
            <Badge className={`text-xs px-1 py-0 h-4 border ${
              row.po_status === 'received' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              row.po_status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' :
              'bg-blue-50 text-blue-700 border-blue-100'
            }`}>
              {row.po_status?.toUpperCase() || 'CREATED'}
            </Badge>
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
              <Icon size={12} />
            </div>
            <Badge className={`${config.badge}  border shadow-sm`}>
              {config.label.toUpperCase()}
            </Badge>
          </div>
        )
      }
    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center gap-1">
      <Button 
        size="sm"
        variant="icon"
        onClick={() => {
          setSelectedMrId(row.mr_id)
          setViewModalOpen(true)
        }}
        className="text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'draft' && (
        <Button 
          size="sm"
          variant="icon"
          onClick={() => handleSend(row.mr_id)}
          className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
          title="Send for Approval"
        >
          <ArrowRight size={16} />
        </Button>
      )}
      {(row.status === 'draft' || row.status === 'pending') && (
        <Button 
          size="sm"
          variant="icon"
          onClick={() => {
            const isTransferOrIssue = ['material_transfer', 'material_issue'].includes(row.purpose)
            if (isTransferOrIssue) {
              setSelectedMrId(row.mr_id)
              setViewModalOpen(true)
              toast.addToast('Please select a source warehouse in the details view to approve this request', 'info')
            } else {
              handleApprove(row.mr_id)
            }
          }}
          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
          title={['material_transfer', 'material_issue'].includes(row.purpose) ? "Open details to select warehouse and approve" : "Approve"}
        >
          <CheckCircle size={16} />
        </Button>
      )}
      {row.status === 'draft' && (
        <Button 
          size="sm"
          variant="icon"
          onClick={() => handleDelete(row.mr_id)}
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
        >
          <Trash2 size={16} />
        </Button>
      )}
      <Button
        size="sm"
        variant="icon"
        className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
      >
        <MoreVertical size={16} />
      </Button>
    </div>
  )

  const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }) => {
    const colorMap = {
      primary: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
      success: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
      warning: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
      danger: 'from-rose-50 to-rose-100 border-rose-200 text-rose-700',
      info: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700'
    }
    
    return (
      <div
        onClick={onClick}
        className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-4 rounded-md border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : ''}`}
      >
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition-transform" />
        <div className="flex items-start justify-between mb-2 relative z-10">
          <span className="text-xs  text-gray-500 ">{label}</span>
          <div className="p-1.5 bg-white/50 rounded shadow-sm">
            <Icon size={16} className="text-gray-700" />
          </div>
        </div>
        <p className="text-xl   text-gray-900 relative z-10">{value}</p>
      </div>
    )
  }

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
                <span className="text-indigo-600 bg-indigo-50 p-1 rounded ">Material Requests</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded  shadow-lg shadow-indigo-200">
                  <ClipboardList className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl   text-slate-900 tracking-tight">Material Requests</h1>
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
                onClick={() => { fetchRequests() }}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all border border-transparent hover:border-indigo-100"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>

              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none  text-sm uppercase tracking-wide"
              >
                <Plus size={18} strokeWidth={3} />
                <span>New Request</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { id: '', label: 'Total Requests', value: stats.total, icon: ClipboardList, color: 'indigo' },
            { id: 'draft', label: 'Draft', value: stats.draft, icon: FileText, color: 'amber' },
            { id: 'approved', label: 'Approved', value: stats.approved, icon: ShieldCheck, color: 'blue' },
            { id: 'converted', label: 'Processing', value: stats.converted, icon: RefreshCw, color: 'indigo' },
            { id: 'completed', label: 'Fulfilled', value: stats.completed, icon: CheckCircle, color: 'emerald' },
            { id: 'cancelled', label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'rose' }
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
              placeholder="Search by ID, requester or department..."
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
                <option value="approved">Approved</option>
                <option value="converted">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading && requests.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white h-64 rounded-2xl border border-slate-100 animate-pulse"></div>
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex gap-2 overflow-x-auto  p-2 custom-scrollbar min-h-[600px]">
            {kanbanColumns.map(column => {
              const columnRequests = requests.filter(r => r.status === column.status && 
                (!searchQuery || 
                  r.mr_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()) || 
                  r.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.department?.toLowerCase().includes(searchQuery.toLowerCase())
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
                        {columnRequests.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 min-h-[500px] p-2 bg-slate-100/50 rounded-2xl border border-slate-200/50 border-dashed">
                    {columnRequests.map(req => {
                      const availability = getItemsAvailabilityStatus(req)
                      const availabilityColors = { 
                        available: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                        unavailable: 'bg-rose-50 text-rose-600 border-rose-100',
                        partial: 'bg-amber-50 text-amber-600 border-amber-100'
                      }
                      
                      return (
                        <div
                          key={req.mr_id}
                          onClick={() => {
                            setSelectedMrId(req.mr_id)
                            setViewModalOpen(true)
                          }}
                          className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${config.color.replace('from-', 'bg-').split(' ')[0]}`}></div>
                          
                          <div className="flex justify-between items-start mb-4">
                            <div className="">
                              <span className="text-xs  text-indigo-600 ">#{req.mr_id}</span>
                              <h4 className=" text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{req.requested_by_name}</h4>
                              <p className="text-xs  text-slate-400 ">{req.department}</p>
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg text-xs  er ${config.badge} border shadow-sm`}>
                              {config.label}
                            </div>
                          </div>

                          <div className="space-y-3 mb-5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                                <Calendar size={14} />
                                <span>{new Date(req.required_by_date).toLocaleDateString()}</span>
                              </div>
                              <div className={`px-2 py-0.5 rounded-md text-xs  border ${availabilityColors[availability.all]}`}>
                                {availability.all.toUpperCase()}
                              </div>
                            </div>
                            
                            <div className="p-3 bg-slate-50 rounded  border border-slate-100 space-y-2">
                              <div className="flex items-center justify-between text-xs  text-slate-400 ">
                                <span>Purpose</span>
                                <span className="text-indigo-600">{req.purpose?.replace('_', ' ')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {[1, 2, 3].slice(0, req.items?.length || 0).map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                      <Package size={12} className="text-slate-400" />
                                    </div>
                                  ))}
                                  {(req.items?.length || 0) > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm text-[8px]  text-slate-500">
                                      +{(req.items?.length || 0) - 3}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs  text-slate-600">{(req.items?.length || 0)} Items requested</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                            {req.status === 'draft' ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white  py-2 rounded "
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleApprove(req.mr_id)
                                }}
                              >
                                <CheckCircle size={14} />
                                Approve
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
                      )
                    })}
                    {columnRequests.length === 0 && (
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
              data={filteredRequests}
              loading={loading}
              renderActions={renderActions}
              onRowClick={(row) => {
                setSelectedMrId(row.mr_id)
                setViewModalOpen(true)
              }}
              className="modern-table"
            />
          </div>
        )}
      </div>

      <CreateMaterialRequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchRequests()
          toast.addToast('Material request created successfully', 'success')
        }}
      />

      <ViewMaterialRequestModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false)
          setSelectedMrId(null)
        }}
        mrId={selectedMrId}
        onStatusChange={() => {
          fetchRequests()
        }}
      />
    </div>
  )
}
