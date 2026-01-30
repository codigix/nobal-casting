import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { 
  Search, Clock, Eye, FileCheck, Package, CheckCircle, 
  XCircle, AlertCircle, TrendingUp, LayoutGrid, List,
  Filter, MoreVertical, ChevronRight, ClipboardList,
  Calendar, Building2, Truck, ShieldCheck, RefreshCcw
} from 'lucide-react'

export default function GRNManagement() {
  const navigate = useNavigate()
  const toast = useToast()
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('kanban')
  const [filterStatus, setFilterStatus] = useState('')

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
    } finally {
      setLoading(false)
    }
  }

  const getFilteredGrns = (status) => {
    return grns.filter(grn => {
      const matchesSearch = !searchTerm || 
        grn.grn_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const effectiveStatus = status || filterStatus
      const matchesStatus = !effectiveStatus || grn.status === effectiveStatus
      
      return matchesStatus && matchesSearch
    })
  }

  const getStatusIcon = (status) => {
    const iconProps = { size: 15 }
    switch (status) {
      case 'pending':
        return <Clock {...iconProps} className="text-amber-600" />
      case 'inspecting':
        return <FileCheck {...iconProps} className="text-blue-600" />
      case 'awaiting_inventory_approval':
        return <Package {...iconProps} className="text-purple-600" />
      case 'approved':
        return <CheckCircle {...iconProps} className="text-green-600" />
      case 'rejected':
        return <XCircle {...iconProps} className="text-red-600" />
      case 'sent_back':
        return <AlertCircle {...iconProps} className="text-orange-600" />
      default:
        return null
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Pending Inspection', color: 'from-amber-50 to-amber-100/50', border: 'border-amber-200', badge: 'bg-amber-50 text-amber-600 border-amber-100', iconColor: 'text-amber-500' },
      inspecting: { label: 'QC Review', color: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', badge: 'bg-blue-50 text-blue-600 border-blue-100', iconColor: 'text-blue-500' },
      awaiting_inventory_approval: { label: 'Awaiting Storage', color: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', badge: 'bg-purple-50 text-purple-600 border-purple-100', iconColor: 'text-purple-500' },
      approved: { label: 'Completed', color: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', iconColor: 'text-emerald-500' },
      rejected: { label: 'Rejected', color: 'from-rose-50 to-rose-100/50', border: 'border-rose-200', badge: 'bg-rose-50 text-rose-600 border-rose-100', iconColor: 'text-rose-500' },
      sent_back: { label: 'Sent Back', color: 'from-orange-50 to-orange-100/50', border: 'border-orange-200', badge: 'bg-orange-50 text-orange-600 border-orange-100', iconColor: 'text-orange-500' }
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

  const getItemStats = (grn) => {
    const total = grn.items?.length || 0
    const accepted = grn.items?.filter(i => i.item_status === 'accepted' || i.item_status === 'partially_accepted').length || 0
    const rejected = grn.items?.filter(i => i.item_status === 'rejected').length || 0
    const pending = total - accepted - rejected
    return { total, accepted, rejected, pending }
  }

  const getQCStats = (grn) => {
    const qcPassedItems = grn.items?.filter(i => {
      if (i.item_status !== 'accepted' && i.item_status !== 'partially_accepted') return false
      const checks = typeof i.qc_checks === 'string' ? JSON.parse(i.qc_checks) : i.qc_checks
      if (!checks) return false
      const passedCount = Object.values(checks).filter(Boolean).length
      return passedCount === 4
    }).length || 0
    const acceptedItems = grn.items?.filter(i => i.item_status === 'accepted' || i.item_status === 'partially_accepted').length || 0
    return { qcPassedItems, acceptedItems }
  }

  const handleViewGRN = (grnNo) => {
    navigate(`/inventory/grn/${grnNo}`)
  }

  const getActionButton = (grn) => {
    const buttonConfigs = {
      pending: { variant: 'primary', label: 'View & Inspect', icon: Eye, className: 'bg-indigo-600 hover:bg-indigo-700 text-white border-none' },
      inspecting: { variant: 'success', label: 'QC Approval', icon: CheckCircle, className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-none' },
      awaiting_inventory_approval: { variant: 'info', label: 'Approve & Store', icon: Package, className: 'bg-blue-600 hover:bg-blue-700 text-white border-none' },
      rejected: null,
      approved: null,
      sent_back: { variant: 'warning', label: 'Review', icon: Eye, className: 'bg-amber-600 hover:bg-amber-700 text-white border-none' }
    }

    const config = buttonConfigs[grn.status]
    if (!config) return null

    const Icon = config.icon
    return (
      <Button
        variant={config.variant}
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          handleViewGRN(grn.grn_no)
        }}
        className={`flex items-center gap-2 text-xs py-2 w-full justify-center shadow-sm transition-all hover:scale-[1.02] ${config.className}`}
      >
        <Icon size={14} /> {config.label}
      </Button>
    )
  }

  const kanbanColumns = [
    { status: 'pending', title: 'Pending Inspection', icon: Clock },
    { status: 'inspecting', title: 'Under QC Review', icon: ShieldCheck },
    { status: 'awaiting_inventory_approval', title: 'Awaiting Storage', icon: Package },
    { status: 'approved', title: 'Completed', icon: CheckCircle }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading Quality Control Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded  bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-xl   text-slate-900 tracking-tight">Quality Control</h1>
              <p className="text-slate-500 font-medium text-sm">Manage Goods Received Notes & Inspections</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded  border border-slate-200 shadow-sm">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Kanban
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                List
              </button>
            </div>
            <button 
              onClick={fetchGRNs}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded  text-sm font-semibold shadow-sm border border-slate-200 transition-all active:scale-95"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {error && <Alert type="danger" className="mb-6 rounded-2xl border-none shadow-sm">{error}</Alert>}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total GRNs', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'QC Review', value: stats.inspecting, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Awaiting Storage', value: stats.awaiting, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Completed', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-indigo-100 transition-colors group">
              <div className={`w-10 h-10 rounded  ${stat.bg} ${stat.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs  text-slate-400  leading-none mb-1">{stat.label}</p>
                <h3 className="text-xl   text-slate-900 leading-none">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by GRN #, PO #, or Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded  bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto px-2">
            <Filter size={18} className="text-slate-400 hidden md:block" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border-none rounded  p-2.5 text-sm  text-slate-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[160px] transition-all"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="inspecting">QC Review</option>
              <option value="awaiting_inventory_approval">Awaiting Storage</option>
              <option value="approved">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="sent_back">Sent Back</option>
            </select>
          </div>
        </div>

        {/* Views */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {kanbanColumns.map((column) => {
              const columnGrns = getFilteredGrns(column.status)
              const config = getStatusConfig(column.status)
              const Icon = column.icon

              return (
                <div key={column.status} className="flex flex-col gap-4">
                  <div className={`flex items-center justify-between p-3 rounded  bg-white border border-slate-200 shadow-sm border-b-4 ${config.border.replace('border-', 'border-b-')}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.badge.split(' ')[0]} ${config.badge.split(' ')[1]} flex items-center justify-center`}>
                        <Icon size={18} />
                      </div>
                      <h2 className=" text-slate-800 text-sm">{column.title}</h2>
                    </div>
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs ">
                      {columnGrns.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 min-h-[500px]">
                    {columnGrns.length > 0 ? (
                      columnGrns.map((grn) => {
                        const itemStats = getItemStats(grn)
                        const qcStats = getQCStats(grn)

                        return (
                          <div 
                            key={grn.grn_no} 
                            onClick={() => handleViewGRN(grn.grn_no)}
                            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden"
                          >
                            <div className={`absolute top-0 left-0 w-1 h-full ${config.badge.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                            
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className=" text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {grn.grn_no}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1 text-slate-400  text-xs ">
                                  <ClipboardList size={12} />
                                  PO: {grn.po_no}
                                </div>
                              </div>
                              <Badge variant="solid" className={`text-[9px]   py-0.5 px-2 rounded-md ${config.badge}`}>
                                {config.label}
                              </Badge>
                            </div>

                            <div className="mb-5">
                              <div className="flex items-center gap-2 text-slate-700  text-xs mb-4">
                                <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center flex-shrink-0">
                                  <Building2 size={14} className="text-slate-400" />
                                </div>
                                <span className="truncate">{grn.supplier_name}</span>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-slate-50 rounded  p-2 text-center border border-slate-100/50">
                                  <p className="text-xs  text-slate-900">{itemStats.total}</p>
                                  <p className="text-[9px]  text-slate-400 er">Items</p>
                                </div>
                                <div className="bg-emerald-50 rounded  p-2 text-center border border-emerald-100/30">
                                  <p className="text-xs  text-emerald-600">{itemStats.accepted}</p>
                                  <p className="text-[9px]  text-emerald-400 er">OK</p>
                                </div>
                                <div className="bg-rose-50 rounded  p-2 text-center border border-rose-100/30">
                                  <p className="text-xs  text-rose-600">{itemStats.rejected}</p>
                                  <p className="text-[9px]  text-rose-400 er">NO</p>
                                </div>
                              </div>
                            </div>

                            {grn.status === 'inspecting' && (
                              <div className="mb-5 bg-blue-50/50 rounded  p-3 border border-blue-100/30">
                                <div className="flex justify-between items-center mb-1.5">
                                  <p className="text-xs  text-blue-700 ">QC Progress</p>
                                  <span className="text-xs  text-blue-700">{qcStats.qcPassedItems}/{qcStats.acceptedItems}</span>
                                </div>
                                <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${qcStats.acceptedItems > 0 ? (qcStats.qcPassedItems / qcStats.acceptedItems) * 100 : 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                              {getActionButton(grn) || (
                                <button className="w-full py-2 text-xs  text-indigo-600 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1 ">
                                  View Details <ChevronRight size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-4 rounded-3xl bg-slate-50/50 border-2 border-dashed border-slate-200">
                        <Package size={40} className="text-slate-200 mb-3" />
                        <p className="text-slate-400  text-xs text-center ">Empty Stage</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded border border-slate-200  animate-in fade-in duration-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 font-sans">
                    <th className="p-2  text-xs  text-slate-400 ">GRN Identification</th>
                    <th className="p-2  text-xs  text-slate-400 ">Workflow Status</th>
                    <th className="p-2  text-xs  text-slate-400 ">Supplier Entity</th>
                    <th className="p-2  text-xs  text-slate-400  text-center">Batch Size</th>
                    <th className="p-2  text-xs  text-slate-400  text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getFilteredGrns().length > 0 ? (
                    getFilteredGrns().map((grn) => {
                      const config = getStatusConfig(grn.status)
                      const itemStats = getItemStats(grn)

                      return (
                        <tr key={grn.grn_no} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleViewGRN(grn.grn_no)}>
                          <td className="p-2 ">
                            <p className=" text-slate-900 group-hover:text-indigo-600 transition-colors">{grn.grn_no}</p>
                            <p className="text-xs text-slate-400  er mt-0.5">Reference Document</p>
                          </td>
                          <td className="p-2 ">
                            <Badge variant="solid" className={`text-[9px]   py-0.5 px-2 rounded-md ${config.badge}`}>
                              {config.label}
                            </Badge>
                          </td>
                          <td className="p-2 ">
                            <div className="flex items-center gap-2 text-slate-700  text-sm">
                              <Building2 size={14} className="text-slate-400" />
                              {grn.supplier_name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-slate-400  text-xs ">
                              <ClipboardList size={12} />
                              PO: {grn.po_no}
                            </div>
                          </td>
                          <td className="p-2  text-center">
                            <div className="inline-flex flex-col items-center justify-center px-3 py-1 rounded-lg bg-slate-50 border border-slate-100  text-slate-900 text-xs shadow-sm">
                              {itemStats.total}
                            </div>
                          </td>
                          <td className="p-2  text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewGRN(grn.grn_no)
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all shadow-sm bg-white border border-slate-100"
                              >
                                <Eye size={18} />
                              </button>
                              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded  transition-all border border-transparent">
                                <MoreVertical size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
                            <Package size={40} className="text-slate-200" />
                          </div>
                          <p className="text-slate-500  text-lg">No matching records</p>
                          <p className="text-slate-400 text-sm font-medium mt-1">Refine your search parameters or check status filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Workflow Guide */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-12">
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded  bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className=" text-slate-900">Standard QC Workflow</h4>
                <p className="text-slate-400 text-xs  ">Protocol Guidelines</p>
              </div>
            </div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Arrival Inspection', desc: 'Initial physical verification and GRN matching', color: 'amber' },
              { step: '02', title: 'Quality Assurance', desc: 'Detailed technical inspection and parameter checks', color: 'blue' },
              { step: '03', title: 'Inventory Release', desc: 'QC validation complete, awaiting storage slotting', color: 'purple' },
              { step: '04', title: 'Stock Absorption', desc: 'Final approval and warehouse balance update', color: 'emerald' }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="flex flex-col gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${item.color}-50 text-${item.color}-600 border border-${item.color}-100 flex items-center justify-center  text-lg shadow-sm group-hover:scale-110 group-hover:bg-${item.color}-600 group-hover:text-white transition-all duration-300`}>
                    {item.step}
                  </div>
                  <div>
                    <p className=" text-slate-800 text-sm mb-2 uppercase tracking-wide">{item.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
                {i < 3 && (
                  <div className="hidden lg:block absolute top-6 left-16 w-[calc(100%-16px)] h-px bg-slate-100 z-0"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
