import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../services/api'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import DataTable from '../../components/Table/DataTable'
import { 
  ArrowDown, ArrowUp, Filter, RefreshCw, Plus, CheckCircle, 
  Clock, XCircle, AlertCircle, Search, ArrowRight, Eye, 
  MoreVertical, Download, Settings2, X, Activity, Database,
  TrendingUp, TrendingDown, Package, ChevronDown, ChevronRight
} from 'lucide-react'
import StockMovementModal from '../../components/Inventory/StockMovementModal'
import StockMovementDetailsModal from '../../components/Inventory/StockMovementDetailsModal'

export default function StockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState(null)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [expandedMR, setExpandedMR] = useState(new Set())
  const [viewMode, setViewMode] = useState('grouped') // 'grouped' or 'flat'
  const [materialRequests, setMaterialRequests] = useState({})
  const [loadingMR, setLoadingMR] = useState(new Set())
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'transaction_no', 'item_code', 'movement_type', 'purpose', 'quantity', 'warehouse_name', 'status', 'created_at'
  ]))

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.movement_type = typeFilter

      const response = await api.get('/stock/movements', { params })
      if (response.data.success) {
        setMovements(response.data.data || [])
        setError(null)
      } else {
        setError(response.data.error || 'Failed to fetch stock movements')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err.response?.data?.error || 'Failed to load stock movements')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  const stats = useMemo(() => {
    const s = { total: 0, in: 0, out: 0, pending: 0, completed: 0 }
    movements.forEach(m => {
      s.total++
      if (m.movement_type === 'IN') s.in += parseFloat(m.quantity)
      else if (m.movement_type === 'OUT') s.out += parseFloat(m.quantity)
      
      if (m.status === 'Pending') s.pending++
      else if (m.status === 'Completed') s.completed++
    })
    return s
  }, [movements])

  const handleApprove = async (movementId) => {
    try {
      const response = await api.post(`/stock/movements/${movementId}/approve`)
      if (response.data.success) {
        fetchMovements()
      }
    } catch (err) {
      alert('Failed to approve movement')
    }
  }

  const handleReject = async (movementId, reason) => {
    try {
      const response = await api.post(`/stock/movements/${movementId}/reject`, { reason })
      if (response.data.success) {
        fetchMovements()
      }
    } catch (err) {
      alert('Failed to reject movement')
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: Clock },
      Approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: CheckCircle },
      Completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
      Cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', icon: XCircle }
    }
    return configs[status] || { label: status, color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700', icon: AlertCircle }
  }

  const fetchMaterialRequest = useCallback(async (mrId) => {
    if (materialRequests[mrId] || loadingMR.has(mrId)) return
    
    try {
      setLoadingMR(prev => new Set([...prev, mrId]))
      const response = await api.get(`/material-requests/${mrId}`)
      if (response.data.success) {
        setMaterialRequests(prev => ({
          ...prev,
          [mrId]: response.data.data
        }))
      }
    } catch (err) {
      console.error('Error fetching material request:', err)
    } finally {
      setLoadingMR(prev => {
        const next = new Set(prev)
        next.delete(mrId)
        return next
      })
    }
  }, [materialRequests, loadingMR])

  const toggleMRExpand = (mrId) => {
    const next = new Set(expandedMR)
    if (next.has(mrId)) {
      next.delete(mrId)
    } else {
      next.add(mrId)
      fetchMaterialRequest(mrId)
    }
    setExpandedMR(next)
  }

  const filteredMovements = useMemo(() => {
    const filtered = movements.filter(m => {
      const matchesSearch = !searchTerm || 
        m.transaction_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPurpose = !purposeFilter || m.purpose === purposeFilter
      
      return matchesSearch && matchesPurpose
    })

    if (viewMode === 'flat') {
      return filtered
    }

    // Group by reference_name (Material Request ID)
    const grouped = {}
    filtered.forEach(m => {
      const mrId = m.reference_name || 'NO_REFERENCE'
      if (!grouped[mrId]) {
        grouped[mrId] = {
          reference_name: mrId,
          items: [],
          total_qty: 0,
          movement_types: new Set(),
          status: m.status,
          created_at: m.created_at
        }
      }
      grouped[mrId].items.push(m)
      grouped[mrId].total_qty += parseFloat(m.quantity || 0)
      grouped[mrId].movement_types.add(m.movement_type)
    })

    return Object.values(grouped)
  }, [movements, searchTerm, purposeFilter, viewMode])

  const columns = useMemo(() => [
    {
      key: 'transaction_no',
      label: 'Transaction #',
      render: (val) => <span className=" text-neutral-900 dark:text-white  ">{val}</span>
    },
    {
      key: 'item_code',
      label: 'Item',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900 dark:text-white">{val}</span>
          <span className="text-xs text-neutral-400  truncate max-w-[150px]">{row.item_name}</span>
        </div>
      )
    },
    {
      key: 'movement_type',
      label: 'Type',
      render: (val) => (
        <div className="flex items-center gap-1.5">
          {val === 'IN' ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ArrowDown size={12} /> IN
            </Badge>
          ) : val === 'OUT' ? (
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <ArrowUp size={12} /> OUT
            </Badge>
          ) : (
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <RefreshCw size={12} /> TRANSFER
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'purpose',
      label: 'Purpose',
      render: (val) => <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400">{val || 'Other'}</span>
    },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (val) => <span className=" text-neutral-900 dark:text-white">{parseFloat(val).toFixed(2)}</span>
    },
    {
      key: 'warehouse_name',
      label: 'Warehouse / Transfer Route',
      render: (val, row) => {
        if (row.movement_type === 'TRANSFER') {
          return (
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <span className="font-medium text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-xs text-xs">{row.source_warehouse_name}</span>
              <ArrowRight size={14} className="text-neutral-400" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-xs text-xs">{row.target_warehouse_name}</span>
            </div>
          )
        }
        return <span className="text-neutral-600 dark:text-neutral-400 font-medium">{val}</span>
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const config = getStatusConfig(val)
        const Icon = config.icon
        return (
          <Badge className={`${config.color} flex items-center gap-1.5 w-fit border`}>
            <Icon size={12} />
            {config.label.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => (
        <div className="flex flex-col text-[11px]">
          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{new Date(val).toLocaleDateString()}</span>
          <span className="text-neutral-400">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedMovement(row); setShowDetailsModal(true) }}
            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xs transition-colors"
            title="View Details"
          >
            <Eye size={15} />
          </button>
          {row.status === 'Pending' && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xs transition-colors"
                title="Approve"
              >
                <CheckCircle size={15} />
              </button>
              <button
                onClick={() => handleReject(row.id, 'Rejected by user')}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xs transition-colors"
                title="Reject"
              >
                <XCircle size={15} />
              </button>
            </>
          )}
        </div>
      )
    }
  ], [fetchMovements])

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-2 sm:p-5 lg:p-3">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl  text-neutral-900 dark:text-white flex items-center gap-3">
              <RefreshCw size={28} className="text-blue-500" />
              Stock Movements
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Track material IN/OUT transactions with approval workflow</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchMovements}
              className="flex items-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 p-2  rounded-xs text-xs  border border-neutral-200 dark:border-neutral-800 transition-all  "
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => { setSelectedMovement(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-2  rounded-xs text-xs   shadow-blue-200 dark:shadow-none transition-all"
            >
              <Plus size={15} />
              New Movement
            </button>
          </div>
        </div>

        {error && <Alert type="danger" className="mb-6">{error}</Alert>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Movements', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Stock IN', value: stats.in.toFixed(0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Stock OUT', value: stats.out.toFixed(0), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-xs p-3 border border-neutral-200 dark:border-neutral-800 flex flex-col gap-2 hover:border-blue-100 dark:hover:border-blue-900 transition-colors group  ">
              <div className={`w-8 h-8 rounded-xs ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110  `}>
                <stat.icon size={15} />
              </div>
              <div>
                <p className="text-xs  text-neutral-400   leading-none mb-1">{stat.label}</p>
                <h3 className="text-lg  text-neutral-900 dark:text-white leading-none">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Command Center Toolbar */}
        <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800   mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-2 gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors" size={15} />
                <input
                  type="text"
                  placeholder="Search transaction #, item code, or name..."
                  className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />
                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs">
                  <Filter size={14} className="text-neutral-400" />
                  <select
                    className="bg-transparent border-none text-[11px] font-medium text-neutral-600 dark:text-neutral-400 focus:ring-0 cursor-pointer p-0 pr-6"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs">
                  <Database size={14} className="text-neutral-400" />
                  <select
                    className="bg-transparent border-none text-[11px] font-medium text-neutral-600 dark:text-neutral-400 focus:ring-0 cursor-pointer p-0 pr-6"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="">All Types</option>
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs">
                  <Activity size={14} className="text-neutral-400" />
                  <select
                    className="bg-transparent border-none text-[11px] font-medium text-neutral-600 dark:text-neutral-400 focus:ring-0 cursor-pointer p-0 pr-6"
                    value={purposeFilter}
                    onChange={(e) => setPurposeFilter(e.target.value)}
                  >
                    <option value="">All Purposes</option>
                    <option value="Production Issue">Production Issue</option>
                    <option value="Production Transfer">Production Transfer</option>
                    <option value="Purchase Receipt">Purchase Receipt</option>
                    <option value="Internal Transfer">Warehouse Transfer</option>
                    <option value="Material Receipt">Material Receipt</option>
                    <option value="Material Issue">Material Issue</option>
                    <option value="Sales Issue">Sales Delivery</option>
                    <option value="Stock Adjustment">Stock Adjustment</option>
                  </select>
                </div>
              </div>

              { (searchTerm || statusFilter || typeFilter || purposeFilter) && (
                <button
                  onClick={() => { setSearchTerm(''); setStatusFilter(''); setTypeFilter(''); setPurposeFilter(''); }}
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
                className={`flex items-center gap-2 p-1 rounded-xs border text-[11px] font-medium transition-all ${showColumnMenu ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
              >
                <Settings2 size={14} />
                Columns
              </button>
              
              <button className="flex items-center gap-2 p-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs text-[11px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all  ">
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
                    className="w-3 h-3 rounded-xs border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 bg-white dark:bg-neutral-900"
                    checked={visibleColumns.has(col.key)}
                    onChange={() => {
                      const next = new Set(visibleColumns)
                      if (next.has(col.key)) next.delete(col.key)
                      else next.add(col.key)
                      setVisibleColumns(next)
                    }}
                  />
                  <span className="text-[11px] text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors capitalize">
                    {col.label.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('grouped')}
            className={`p-2  rounded-xs text-xs font-medium transition-all ${
              viewMode === 'grouped'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50'
            }`}
          >
            Grouped by Request
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`p-2  rounded-xs text-xs font-medium transition-all ${
              viewMode === 'flat'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50'
            }`}
          >
            Flat View
          </button>
        </div>

        {/* Content View */}
        {viewMode === 'grouped' ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={32} className="mx-auto mb-4 text-neutral-400" />
                <p className="text-neutral-600 dark:text-neutral-400">No stock movements found</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredMovements.map((group) => (
                  <div key={group.reference_name}>
                    <button
                      onClick={() => toggleMRExpand(group.reference_name)}
                      className="w-full p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        {expandedMR.has(group.reference_name) ? (
                          <ChevronDown size={18} className="text-blue-600 flex-shrink-0" />
                        ) : (
                          <ChevronRight size={18} className="text-neutral-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className=" text-neutral-900 dark:text-white">
                              {group.reference_name}
                            </h3>
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900 text-xs">
                              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                            </Badge>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">
                              {group.total_qty.toFixed(2)} units
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">
                            Created: {new Date(group.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          group.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          group.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                        } border text-xs`}>
                          {group.status}
                        </Badge>
                      </div>
                    </button>

                    {expandedMR.has(group.reference_name) && (
                      <div className="bg-neutral-50/50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-800">
                        {/* MR Details Section */}
                        {materialRequests[group.reference_name] ? (
                          <div className="p-2 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-neutral-500   ">Request ID</p>
                                <p className="text-neutral-900 dark:text-white ">{materialRequests[group.reference_name].mr_id}</p>
                              </div>
                              <div>
                                <p className="text-xs text-neutral-500   ">Department</p>
                                <p className="text-neutral-900 dark:text-white">{materialRequests[group.reference_name].department || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-neutral-500   ">Purpose</p>
                                <p className="text-neutral-900 dark:text-white text-xs">{materialRequests[group.reference_name].purpose || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-neutral-500   ">Status</p>
                                <Badge className={`mt-1 text-xs ${
                                  materialRequests[group.reference_name].status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  materialRequests[group.reference_name].status === 'draft' ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400' :
                                  materialRequests[group.reference_name].status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {materialRequests[group.reference_name].status?.toUpperCase()}
                                </Badge>
                              </div>
                            </div>

                            {materialRequests[group.reference_name].notes && (
                              <div>
                                <p className="text-xs text-neutral-500    mb-1">Notes</p>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300">{materialRequests[group.reference_name].notes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            {loadingMR.has(group.reference_name) ? (
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw size={14} className="animate-spin text-blue-500" />
                                <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading request details...</span>
                              </div>
                            ) : (
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">No request details available</span>
                            )}
                          </div>
                        )}

                        {/* Unified Materials & Movements Table */}
                        {((materialRequests[group.reference_name]?.items && materialRequests[group.reference_name].items.length > 0) || group.items.length > 0) && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0">
                                <tr>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Item</th>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Category</th>
                                  <th className="p-2 text-center text-neutral-600 dark:text-neutral-400 font-medium">Qty</th>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">UOM</th>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Movement Type</th>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Warehouse</th>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Status</th>
                                  <th className="p-2 text-left text-neutral-600 dark:text-neutral-400 font-medium">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {/* Requested Materials Rows */}
                                {materialRequests[group.reference_name]?.items && materialRequests[group.reference_name].items.length > 0 && materialRequests[group.reference_name].items.map((item, idx) => (
                                  <tr key={`req-${idx}`} className="bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors">
                                    <td className="p-2">
                                      <div>
                                        <div className="font-medium text-neutral-900 dark:text-white">{item.item_code}</div>
                                        <div className="text-[10px] text-neutral-500">{item.item_name || '-'}</div>
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      <div className="flex flex-col gap-1">
                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px] w-fit">
                                          Requested
                                        </Badge>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center text-neutral-900 dark:text-white">{parseFloat(item.qty || item.quantity).toFixed(2)}</td>
                                    <td className="p-2 text-neutral-600 dark:text-neutral-400">{item.uom || '-'}</td>
                                    <td className="p-2 text-neutral-600 dark:text-neutral-400">-</td>
                                    <td className="p-2 text-neutral-600 dark:text-neutral-400">-</td>
                                    <td className="p-2">
                                      <Badge className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 text-[10px]">
                                        PENDING
                                      </Badge>
                                    </td>
                                    <td className="p-2">-</td>
                                  </tr>
                                ))}

                                {/* Stock Movements Rows */}
                                {group.items.map((item) => (
                                  <tr key={`mov-${item.id}`} className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                                    <td className="p-2">
                                      <div>
                                        <div className="font-medium text-neutral-900 dark:text-white">{item.item_code}</div>
                                        <div className="text-[10px] text-neutral-500">{item.item_name || '-'}</div>
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      <div className="flex flex-col gap-1">
                                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 text-[10px] w-fit">
                                          Moved
                                        </Badge>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center text-neutral-900 dark:text-white">{parseFloat(item.quantity).toFixed(2)}</td>
                                    <td className="p-2 text-neutral-600 dark:text-neutral-400">-</td>
                                    <td className="p-2">
                                      {item.movement_type === 'IN' ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 flex items-center gap-1 w-fit text-[10px]">
                                          <ArrowDown size={11} /> IN
                                        </Badge>
                                      ) : item.movement_type === 'OUT' ? (
                                        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-900 flex items-center gap-1 w-fit text-[10px]">
                                          <ArrowUp size={11} /> OUT
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900 flex items-center gap-1 w-fit text-[10px]">
                                          <RefreshCw size={11} /> TRANSFER
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="p-2 text-neutral-600 dark:text-neutral-400">{item.warehouse_name || '-'}</td>
                                    <td className="p-2">
                                      <Badge className={`text-[10px] ${
                                        item.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900' :
                                        item.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900' :
                                        'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                                      } border`}>
                                        {item.status}
                                      </Badge>
                                    </td>
                                    <td className="p-2">
                                      <button
                                        onClick={() => { setSelectedMovement(item); setShowDetailsModal(true) }}
                                        className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                        title="View Details"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 ">
            <DataTable
              columns={columns}
              data={filteredMovements}
              loading={loading}
              externalVisibleColumns={visibleColumns}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <StockMovementModal
          onClose={() => { setShowModal(false); setSelectedMovement(null) }}
          onSuccess={() => { setShowModal(false); fetchMovements() }}
        />
      )}
      {showDetailsModal && (
        <StockMovementDetailsModal
          movement={selectedMovement}
          onClose={() => { setShowDetailsModal(false); setSelectedMovement(null) }}
        />
      )}
    </div>
  )
}
