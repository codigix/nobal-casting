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
  TrendingUp, TrendingDown, Package
} from 'lucide-react'
import StockMovementModal from '../../components/Inventory/StockMovementModal'

export default function StockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState(null)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
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

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesSearch = !searchTerm || 
        m.transaction_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPurpose = !purposeFilter || m.purpose === purposeFilter
      
      return matchesSearch && matchesPurpose
    })
  }, [movements, searchTerm, purposeFilter])

  const columns = useMemo(() => [
    {
      key: 'transaction_no',
      label: 'Transaction #',
      render: (val) => <span className=" text-neutral-900 dark:text-white  tracking-wider">{val}</span>
    },
    {
      key: 'item_code',
      label: 'Item',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900 dark:text-white">{val}</span>
          <span className="text-[10px] text-neutral-400  truncate max-w-[150px]">{row.item_name}</span>
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
          ) : (
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <ArrowUp size={12} /> OUT
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
      label: 'Warehouse',
      render: (val) => <span className="text-neutral-600 dark:text-neutral-400">{val}</span>
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
          {row.status === 'Pending' && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xs transition-colors"
                title="Approve"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => handleReject(row.id, 'Rejected by user')}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xs transition-colors"
                title="Reject"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
          <button className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xs transition-colors">
            <MoreVertical size={16} />
          </button>
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
              className="flex items-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-xs text-xs font-semibold border border-neutral-200 dark:border-neutral-800 transition-all shadow-sm"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => { setSelectedMovement(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xs text-xs font-semibold shadow-lg shadow-blue-200 dark:shadow-none transition-all"
            >
              <Plus size={16} />
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
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-xs p-3 border border-neutral-200 dark:border-neutral-800 flex flex-col gap-2 hover:border-blue-100 dark:hover:border-blue-900 transition-colors group shadow-sm">
              <div className={`w-8 h-8 rounded-xs ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                <stat.icon size={16} />
              </div>
              <div>
                <p className="text-[10px]  text-neutral-400  tracking-wider leading-none mb-1">{stat.label}</p>
                <h3 className="text-lg  text-neutral-900 dark:text-white leading-none">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Command Center Toolbar */}
        <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 shadow-sm mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between p-2 gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors" size={16} />
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xs border text-[11px] font-medium transition-all ${showColumnMenu ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
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

        {/* Content View */}
        <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 ">
          <DataTable
            columns={columns}
            data={filteredMovements}
            loading={loading}
            externalVisibleColumns={visibleColumns}
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <StockMovementModal
          onClose={() => { setShowModal(false); setSelectedMovement(null) }}
          onSuccess={() => { setShowModal(false); fetchMovements() }}
        />
      )}
    </div>
  )
}
