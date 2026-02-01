import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import DataTable from '../../components/Table/DataTable'
import { 
  Search, Clock, Eye, FileCheck, Package, CheckCircle, 
  XCircle, AlertCircle, TrendingUp, LayoutGrid, List as ListIcon,
  Filter, MoreVertical, ChevronRight, ClipboardList,
  Calendar, Building2, Truck, ShieldCheck, RefreshCcw,
  Layout, Grid3x3, Activity, Download, Settings2, X
} from 'lucide-react'

export default function GRNManagement() {
  const navigate = useNavigate()
  const toast = useToast()
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [filterStatus, setFilterStatus] = useState('')
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  
  // Default visible columns
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'grn_no', 'po_no', 'supplier_name', 'status', 'created_at', 'items_count'
  ]))

  useEffect(() => {
    fetchGRNs()
  }, [])

  const fetchGRNs = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/grn-requests')
      if (response.data.success) {
        setGrns(response.data.data || [])
      } else {
        toast.addToast(response.data.error || 'Failed to fetch GRNs', 'error')
      }
    } catch (err) {
      console.error('Error fetching GRNs:', err)
      toast.addToast('Error fetching GRNs', 'error')
      setError('Failed to connect to server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        label: 'Pending Inspection', 
        color: 'from-amber-500/10 to-amber-500/5', 
        border: 'border-amber-200 dark:border-amber-800/50', 
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800', 
        icon: Clock,
        iconColor: 'text-amber-500' 
      },
      inspecting: { 
        label: 'QC Review', 
        color: 'from-blue-500/10 to-blue-500/5', 
        border: 'border-blue-200 dark:border-blue-800/50', 
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800', 
        icon: FileCheck,
        iconColor: 'text-blue-500' 
      },
      awaiting_inventory_approval: { 
        label: 'Awaiting Storage', 
        color: 'from-purple-500/10 to-purple-500/5', 
        border: 'border-purple-200 dark:border-purple-800/50', 
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800', 
        icon: Package,
        iconColor: 'text-purple-500' 
      },
      approved: { 
        label: 'Completed', 
        color: 'from-emerald-500/10 to-emerald-500/5', 
        border: 'border-emerald-200 dark:border-emerald-800/50', 
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', 
        icon: CheckCircle,
        iconColor: 'text-emerald-500' 
      },
      rejected: { 
        label: 'Rejected', 
        color: 'from-rose-500/10 to-rose-500/5', 
        border: 'border-rose-200 dark:border-rose-800/50', 
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800', 
        icon: XCircle,
        iconColor: 'text-rose-500' 
      },
      sent_back: { 
        label: 'Sent Back', 
        color: 'from-orange-500/10 to-orange-500/5', 
        border: 'border-orange-200 dark:border-orange-800/50', 
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800', 
        icon: AlertCircle,
        iconColor: 'text-orange-500' 
      }
    }
    return configs[status] || configs.pending
  }

  const stats = useMemo(() => {
    const total = grns.length
    const pending = grns.filter(g => g.status === 'pending').length
    const inspecting = grns.filter(g => g.status === 'inspecting').length
    const awaiting = grns.filter(g => g.status === 'awaiting_inventory_approval').length
    const approved = grns.filter(g => g.status === 'approved').length
    const rejected = grns.filter(g => g.status === 'rejected').length

    return { total, pending, inspecting, awaiting, approved, rejected }
  }, [grns])

  const filteredGrns = useMemo(() => {
    return grns.filter(grn => {
      const matchesSearch = !searchTerm || 
        grn.grn_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = !filterStatus || grn.status === filterStatus
      
      return matchesStatus && matchesSearch
    })
  }, [grns, searchTerm, filterStatus])

  const handleViewGRN = useCallback((grnNo) => {
    navigate(`/inventory/grn/${grnNo}`)
  }, [navigate])

  const columns = useMemo(() => [
    {
      key: 'grn_no',
      label: 'GRN Number',
      render: (val) => (
        <span className=" text-neutral-900 dark:text-white  tracking-wider">{val}</span>
      )
    },
    {
      key: 'po_no',
      label: 'PO Number',
      render: (val) => (
        <span className="text-neutral-600 dark:text-neutral-400 font-medium">{val || 'N/A'}</span>
      )
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px]  text-neutral-500">
            {val?.charAt(0) || 'S'}
          </div>
          <span className="truncate max-w-[150px]">{val}</span>
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
      key: 'items_count',
      label: 'Items',
      render: (_, row) => (
        <Badge variant="secondary" className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400">
          {row.items?.length || 0} Items
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => (
        <div className="flex flex-col">
          <span className="text-neutral-700 dark:text-neutral-300">{new Date(val).toLocaleDateString()}</span>
          <span className="text-[10px] text-neutral-400">{new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewGRN(row.grn_no)}
            className="p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xs transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          <button
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xs transition-colors"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      )
    }
  ], [handleViewGRN])

  const kanbanColumns = [
    { status: 'pending', title: 'Pending Inspection', icon: Clock },
    { status: 'inspecting', title: 'QC Review', icon: ShieldCheck },
    { status: 'awaiting_inventory_approval', title: 'Awaiting Storage', icon: Package },
    { status: 'approved', title: 'Completed', icon: CheckCircle }
  ]

  if (loading && grns.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-5">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading Quality Control Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-2 sm:p-5 lg:p-3">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl  text-neutral-900 dark:text-white flex items-center gap-3">
              <ShieldCheck size={28} className="text-indigo-600" />
              Quality Control
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Manage Goods Received Notes & Inspections</p>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'table' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Table View"
                >
                  <ListIcon size={16} />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                  title="Kanban View"
                >
                  <Grid3x3 size={16} />
                </button>
              </div>
            
            <button 
              onClick={fetchGRNs}
              className="flex items-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-xs text-xs font-semibold border border-neutral-200 dark:border-neutral-800 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {error && <Alert type="danger" className="mb-6">{error}</Alert>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total GRNs', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { label: 'QC Review', value: stats.inspecting, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Awaiting Storage', value: stats.awaiting, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
            { label: 'Completed', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-xs p-3 border border-neutral-200 dark:border-neutral-800 flex flex-col gap-2 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors group shadow-sm">
              <div className={`w-8 h-8 rounded-xs ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search GRN, PO, or Supplier..."
                  className="w-full pl-9 pr-4 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all"
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
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="inspecting">QC Review</option>
                    <option value="awaiting_inventory_approval">Awaiting Storage</option>
                    <option value="approved">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="sent_back">Sent Back</option>
                  </select>
                </div>
              </div>

              { (searchTerm || filterStatus) && (
                <button
                  onClick={() => { setSearchTerm(''); setFilterStatus(''); }}
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

        {/* Main Content View */}
        {viewMode === 'table' ? (
          <div className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 ">
            <DataTable
              columns={columns}
              data={filteredGrns}
              loading={loading}
              externalVisibleColumns={visibleColumns}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            {kanbanColumns.map((column) => {
              const columnGrns = filteredGrns.filter(g => g.status === column.status)
              const config = getStatusConfig(column.status)
              const Icon = column.icon

              return (
                <div key={column.status} className="flex flex-col gap-3 h-full min-h-[500px]">
                  <div className={`flex items-center justify-between p-2 px-3 rounded-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 border-l-4 ${config.badge.split(' ')[0].replace('bg-', 'border-l-')} shadow-sm`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xs ${config.badge.split(' ')[0]} ${config.badge.split(' ')[1]} flex items-center justify-center shadow-sm`}>
                        <Icon size={14} />
                      </div>
                      <h2 className=" text-neutral-800 dark:text-neutral-200 text-xs tracking-tight ">{column.title}</h2>
                    </div>
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded-xs text-[10px] ">
                      {columnGrns.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {columnGrns.length > 0 ? (
                      columnGrns.map((grn) => {
                        const totalItems = grn.items?.length || 0
                        const acceptedItems = grn.items?.filter(i => i.item_status === 'accepted' || i.item_status === 'partially_accepted').length || 0

                        return (
                          <div 
                            key={grn.grn_no} 
                            onClick={() => handleViewGRN(grn.grn_no)}
                            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs p-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer group relative overflow-hidden shadow-sm"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className=" text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm ">
                                  {grn.grn_no}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1 text-neutral-400 text-[10px] font-medium">
                                  <ClipboardList size={12} />
                                  PO: {grn.po_no || 'MANUAL'}
                                </div>
                              </div>
                            </div>

                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300 text-[11px] mb-2 font-medium">
                                <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500  text-[9px]">
                                  {grn.supplier_name?.charAt(0) || 'S'}
                                </div>
                                <span className="truncate">{grn.supplier_name}</span>
                              </div>
                              
                              <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-[10px]">
                                  <span className="text-neutral-500   tracking-wider">Progress</span>
                                  <span className="text-neutral-900 dark:text-white ">{Math.round((acceptedItems / (totalItems || 1)) * 100)}%</span>
                                </div>
                                <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${config.iconColor.replace('text-', 'bg-')}`}
                                    style={{ width: `${(acceptedItems / (totalItems || 1)) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                               <div className="flex items-center gap-1.5 text-neutral-400 text-[10px]">
                                <Calendar size={12} />
                                {new Date(grn.created_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-neutral-50 dark:bg-neutral-800">
                                  {totalItems} Items
                                </Badge>
                                <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ChevronRight size={14} />
                                </div>
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
    </div>
  )
}
