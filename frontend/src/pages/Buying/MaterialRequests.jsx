import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
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
  MoreVertical, Info, FileCheck, Truck, ShieldCheck, Download, Settings2, X
} from 'lucide-react'

export default function MaterialRequests() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedMrId, setSelectedMrId] = useState(null)
  const [stockData, setStockData] = useState({})
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [viewMode, setViewMode] = useState('table')
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'mr_id', 'requested_by_name', 'department', 'status', 'required_by_date', 'stock_availability', 'actions'
  ]))

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
              params: { item_code: item.item_code, warehouse_id: warehouse }
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
            allStockData[key] = { available: 0, requested: parseFloat(item.qty), status: 'unavailable' }
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
  }, [toast, checkItemsAvailability])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const stats = useMemo(() => {
    const s = { total: 0, draft: 0, approved: 0, converted: 0, completed: 0, cancelled: 0 }
    requests.forEach(r => {
      s.total++
      if (s.hasOwnProperty(r.status)) s[r.status]++
    })
    return s
  }, [requests])

  const getStatusConfig = (status) => {
    const configs = {
      draft: { label: 'Draft', color: 'from-amber-500/10 to-amber-500/5', iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: FileText },
      pending: { label: 'Pending', color: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Clock },
      approved: { label: 'Approved', color: 'from-indigo-500/10 to-indigo-500/5', iconColor: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', icon: ShieldCheck },
      converted: { label: 'Processing', color: 'from-purple-500/10 to-purple-500/5', iconColor: 'text-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800', icon: RefreshCw },
      completed: { label: 'Fulfilled', color: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'from-rose-500/10 to-rose-500/5', iconColor: 'text-rose-500', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: XCircle },
      rejected: { label: 'Rejected', color: 'from-rose-500/10 to-rose-500/5', iconColor: 'text-rose-600', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: XCircle }
    }
    return configs[status] || configs.draft
  }

  const getItemsAvailabilityStatus = useCallback((request) => {
    if (!request.items?.length) return { all: 'available', details: [] }
    const items = request.items.map(item => {
      const key = `${item.item_code}-${request.source_warehouse || 'warehouse'}`
      return stockData[key]?.status || 'unavailable'
    })
    if (items.every(s => s === 'available')) return { all: 'available' }
    if (items.some(s => s === 'available')) return { all: 'partial' }
    return { all: 'unavailable' }
  }, [stockData])

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = !searchQuery || 
        r.mr_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.requested_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = !activeFilter || r.status === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [requests, searchQuery, activeFilter])

  const handleSend = async (id) => {
    try {
      await api.patch(`/material-requests/${id}/submit`)
      toast.addToast('Material request sent for approval', 'success')
      fetchRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to send request', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return
    try {
      await api.delete(`/material-requests/${id}`)
      toast.addToast('Material request deleted', 'success')
      fetchRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to delete request', 'error')
    }
  }

  const columns = useMemo(() => [
    {
      key: 'mr_id',
      label: 'ID',
      render: (val) => <span className=" text-neutral-900 dark:text-white  tracking-wider">MR-{val}</span>
    },
    {
      key: 'requested_by_name',
      label: 'Requester',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900 dark:text-white">{val}</span>
          <span className="text-[10px] text-neutral-400  tracking-widest">{row.department}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const config = getStatusConfig(val)
        const Icon = config.icon
        return (
          <Badge className={`${config.badge} flex items-center gap-1.5 w-fit border`}>
            <Icon size={12} />
            {config.label.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      key: 'required_by_date',
      label: 'Required By',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
          <Calendar size={14} className="opacity-50" />
          <span>{new Date(val).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'stock_availability',
      label: 'Availability',
      render: (_, row) => {
        const status = getItemsAvailabilityStatus(row)
        const configs = { 
          available: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
          unavailable: { color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: XCircle },
          partial: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: AlertCircle }
        }
        const config = configs[status.all]
        const Icon = config.icon
        return (
          <Badge className={`${config.color} border flex items-center gap-1.5 w-fit`}>
            <Icon size={12} />
            {status.all.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSelectedMrId(row.mr_id); setViewModalOpen(true); }}
            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xs transition-colors"
            title={['material_issue', 'material_transfer'].includes(row.purpose) && row.status === 'pending' ? "View & Release Materials" : "View Details"}
          >
            <Eye size={16} />
          </button>
          {row.status === 'draft' && (
            <button
              onClick={() => handleSend(row.mr_id)}
              className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xs transition-colors"
              title="Submit for Approval"
            >
              <ArrowRight size={16} />
            </button>
          )}
          {(row.status === 'draft' || row.status === 'pending') && (
            <button
              onClick={() => handleDelete(row.mr_id)}
              className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xs transition-colors"
              title="Delete Request"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ], [getItemsAvailabilityStatus])

  const kanbanColumns = [
    { status: 'draft', title: 'Draft', icon: FileText },
    { status: 'pending', title: 'Pending Approval', icon: Clock },
    { status: 'approved', title: 'Approved', icon: ShieldCheck },
    { status: 'converted', title: 'Processing', icon: RefreshCw },
    { status: 'completed', title: 'Fulfilled', icon: CheckCircle }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-2 sm:p-5 lg:p-3">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl  text-neutral-900 dark:text-white flex items-center gap-3">
              <ClipboardList size={28} className="text-indigo-600" />
              Material Requests
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium flex items-center gap-2">
              <History size={12} className="text-indigo-400" />
              Updated {refreshTime.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'table' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Table View"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Kanban View"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            
            <button 
              onClick={fetchRequests}
              className="flex items-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-xs text-xs  border border-neutral-200 dark:border-neutral-800 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xs text-xs  shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
            >
              <Plus size={16} />
              New Request
            </button>
          </div>
        </div>

        {error && <Alert type="danger" className="mb-6">{error}</Alert>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { id: '', label: 'Total Requests', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
            { id: 'draft', label: 'Draft', value: stats.draft, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { id: 'approved', label: 'Approved', value: stats.approved, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { id: 'converted', label: 'Processing', value: stats.converted, icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
            { id: 'completed', label: 'Fulfilled', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { id: 'cancelled', label: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' }
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setActiveFilter(stat.id)}
              className={`bg-white dark:bg-neutral-900 rounded-xs p-3 border flex flex-col gap-2 transition-all group shadow-sm text-left ${activeFilter === stat.id ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-md' : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'}`}
            >
              <div className={`w-8 h-8 rounded-xs ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                <stat.icon size={16} />
              </div>
              <div>
                <p className="text-[10px]  text-neutral-400  tracking-wider leading-none mb-1">{stat.label}</p>
                <h3 className="text-lg  text-neutral-900 dark:text-white leading-none">{stat.value}</h3>
              </div>
            </button>
          ))}
        </div>

        {/* Command Center Toolbar */}
        <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 shadow-sm mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-2 gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search by ID, requester or department..."
                  className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />
                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs">
                  <Filter size={14} className="text-neutral-400" />
                  <select
                    className="bg-transparent border-none text-[11px] font-medium text-neutral-600 dark:text-neutral-400 focus:ring-0 cursor-pointer p-0 pr-6"
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="converted">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              { (searchQuery || activeFilter) && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveFilter(''); }}
                  className="text-[11px] font-medium text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <X size={14} />
                  Clear Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xs border text-[11px] font-medium transition-all ${showColumnMenu ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
              >
                <Settings2 size={14} />
                Columns
              </button>
              
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all shadow-sm">
                <Download size={14} />
                Export
              </button>
            </div>
          </div>

          {showColumnMenu && (
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {columns.filter(c => c.key !== 'actions').map(col => (
                <label key={col.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-3 h-3 rounded-xs border-neutral-300 dark:border-neutral-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-neutral-900"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => {
                      const next = new Set(visibleColumns)
                      if (next.has(col.key)) next.delete(col.key)
                      else next.add(col.key)
                      setVisibleColumns(next)
                    }}
                  />
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors capitalize">
                    {col.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        {viewMode === 'table' ? (
          <div className=" dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 ">
            <DataTable
              columns={columns}
              data={filteredRequests}
              loading={loading}
              externalVisibleColumns={visibleColumns}
            />
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[600px] items-start">
            {kanbanColumns.map(column => {
              const columnRequests = filteredRequests.filter(r => r.status === column.status)
              const config = getStatusConfig(column.status)
              
              return (
                <div key={column.status} className="flex-shrink-0 w-[300px] flex flex-col gap-3">
                  <div className={`flex items-center justify-between p-2 px-3 rounded-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-l-4 ${config.badge.split(' ')[0].replace('bg-', 'border-l-')} shadow-sm`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xs ${config.badge.split(' ')[0]} ${config.badge.split(' ')[1]} flex items-center justify-center shadow-sm`}>
                        <column.icon size={14} />
                      </div>
                      <h3 className=" text-neutral-800 dark:text-neutral-200 text-xs tracking-tight ">{column.title}</h3>
                    </div>
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-xs text-[10px] ">
                      {columnRequests.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {columnRequests.length > 0 ? (
                      columnRequests.map(req => {
                        const availability = getItemsAvailabilityStatus(req)
                        const availabilityConfigs = { 
                          available: { bg: 'bg-emerald-500', text: 'text-emerald-500' },
                          unavailable: { bg: 'bg-rose-500', text: 'text-rose-500' },
                          partial: { bg: 'bg-amber-500', text: 'text-amber-500' }
                        }
                        const avail = availabilityConfigs[availability.all]
                        
                        return (
                          <div
                            key={req.mr_id}
                            onClick={() => { setSelectedMrId(req.mr_id); setViewModalOpen(true); }}
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer group relative overflow-hidden shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <span className="text-[10px]  text-indigo-600 dark:text-indigo-400  tracking-wider">MR-{req.mr_id}</span>
                                <h4 className=" text-neutral-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm truncate">{req.requested_by_name}</h4>
                                <p className="text-[10px]  text-neutral-400  tracking-widest mt-0.5">{req.department}</p>
                              </div>
                            </div>

                            <div className="space-y-3 mb-4">
                              <div className="flex items-center justify-between text-[11px] font-medium">
                                <div className="flex items-center gap-1.5 text-neutral-500">
                                  <Calendar size={14} className="opacity-50" />
                                  <span>{new Date(req.required_by_date).toLocaleDateString()}</span>
                                </div>
                                <span className={`${avail.text}   text-[9px]`}>{availability.all}</span>
                              </div>
                              
                              <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                <div className={`h-full ${avail.bg} w-full opacity-50`}></div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-neutral-50 dark:bg-neutral-800">
                                {req.items?.length || 0} Items
                              </Badge>
                              <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight size={14} />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-4 bg-neutral-50/50 dark:bg-neutral-900/30 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xs text-neutral-400">
                        <Activity size={24} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-medium  tracking-widest">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CreateMaterialRequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRequests}
      />

      <ViewMaterialRequestModal 
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        mrId={selectedMrId}
        onStatusChange={fetchRequests}
      />
    </div>
  )
}
