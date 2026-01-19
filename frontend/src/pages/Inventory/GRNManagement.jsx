import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { Search, Clock, Eye, FileCheck, Package, CheckCircle, XCircle, AlertCircle, TrendingUp, LayoutGrid, List } from 'lucide-react'

export default function GRNManagement() {
  const navigate = useNavigate()
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('kanban')

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
        setError(response.data.error || 'Failed to fetch GRNs')
      }
    } catch (err) {
      console.error('Error fetching GRNs:', err)
      setError('Error fetching GRNs')
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
      return (status ? grn.status === status : true) && matchesSearch
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
      pending: { label: 'Pending Inspection', color: 'from-amber-50 to-amber-100', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-700' },
      inspecting: { label: 'Under QC Review', color: 'from-blue-50 to-blue-100', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-700' },
      awaiting_inventory_approval: { label: 'Approved - Awaiting Storage', color: 'from-purple-50 to-purple-100', border: 'border-purple-300', badge: 'bg-purple-100 text-purple-700' },
      approved: { label: 'Completed', color: 'from-green-50 to-green-100', border: 'border-green-300', badge: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejected', color: 'from-red-50 to-red-100', border: 'border-red-300', badge: 'bg-red-100 text-red-700' },
      sent_back: { label: 'Sent Back', color: 'from-orange-50 to-orange-100', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-700' }
    }
    return configs[status] || configs.pending
  }

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
      pending: { variant: 'primary', label: 'View & Inspect', icon: Eye },
      inspecting: { variant: 'success', label: 'QC Approval', icon: CheckCircle },
      awaiting_inventory_approval: { variant: 'info', label: 'Approve & Store', icon: Package },
      rejected: null,
      approved: null,
      sent_back: { variant: 'warning', label: 'Review', icon: Eye }
    }

    const config = buttonConfigs[grn.status]
    if (!config) return null

    const Icon = config.icon
    return (
      <Button
        variant={config.variant}
        size="sm"
        onClick={() => handleViewGRN(grn.grn_no)}
        className="flex items-center gap-2 text-xs px-3 py-2 w-full justify-center"
      >
        <Icon size={14} /> {config.label}
      </Button>
    )
  }

  const kanbanColumns = [
    { status: 'pending', title: 'Pending Inspection', priority: 1 },
    { status: 'inspecting', title: 'Under QC Review', priority: 2 },
    { status: 'awaiting_inventory_approval', title: 'Approved - Awaiting Storage', priority: 3 },
    { status: 'approved', title: 'Completed', priority: 4 }
  ]

  const getSummaryStats = () => {
    const total = grns.length
    const pending = grns.filter(g => g.status === 'pending').length
    const inspecting = grns.filter(g => g.status === 'inspecting').length
    const awaiting = grns.filter(g => g.status === 'awaiting_inventory_approval').length
    const approved = grns.filter(g => g.status === 'approved').length
    const rejected = grns.filter(g => g.status === 'rejected').length

    return { total, pending, inspecting, awaiting, approved, rejected }
  }

  if (loading) {
    return (
      <div className="p-6 m-4">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading GRNs...</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = getSummaryStats()

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quality Control Workflow</h1>
          <p className="text-xs text-gray-500 mt-1">Manage GRNs through inspection, approval, and storage stages</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white rounded-xs p-1 border border-gray-200 shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Kanban View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
          <Button
            variant="primary"
            onClick={fetchGRNs}
            className="flex items-center gap-2"
          >
            <TrendingUp size={16} /> Refresh
          </Button>
        </div>
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total GRNs', count: stats.total, color: 'slate', icon: '📊' },
          { label: 'Pending', count: stats.pending, color: 'amber', icon: '⏳' },
          { label: 'QC Review', count: stats.inspecting, color: 'blue', icon: '🔍' },
          { label: 'Awaiting Storage', count: stats.awaiting, color: 'purple', icon: '📦' },
          { label: 'Completed', count: stats.approved, color: 'green', icon: '✓' },
          { label: 'Rejected', count: stats.rejected, color: 'red', icon: '✗' }
        ].map((stat, idx) => {
          const colorMap = {
            slate: 'from-slate-50 to-slate-100 text-slate-700',
            amber: 'from-amber-50 to-amber-100 text-amber-700',
            blue: 'from-blue-50 to-blue-100 text-blue-700',
            purple: 'from-purple-50 to-purple-100 text-purple-700',
            green: 'from-green-50 to-green-100 text-green-700',
            red: 'from-red-50 to-red-100 text-red-700'
          }
          return (
            <div key={idx} className={`bg-gradient-to-br ${colorMap[stat.color]} p-2 rounded-sm border border-opacity-30 shadow-sm hover:shadow-md transition-all`}>
              <p className="text-xs font-medium text-gray-600">{stat.label}</p>
              <p className="text-xl font-bold">{stat.count}</p>
            </div>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by GRN #, PO #, or Supplier name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xs text-xs bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Views */}
      {viewMode === 'kanban' ? (
        <>
          {/* Kanban Board */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {kanbanColumns.map((column) => {
              const columnGrns = getFilteredGrns(column.status)
              const config = getStatusConfig(column.status)

              return (
                <div key={column.status} className="flex flex-col bg-white rounded-xs overflow-hidden border border-gray-200 shadow-sm">
                  {/* Column Header */}
                  <div className={`bg-gradient-to-r ${config.color} border-b-2 ${config.border} p-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(column.status)}
                        <div>
                          <h2 className="text-xs text-gray-900">{column.title}</h2>
                        </div>
                      </div>
                      <div className="bg-white bg-opacity-70 px-2.5 py-1 rounded-full">
                        <span className="text-xs font-bold text-gray-700">{columnGrns.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1p-2 space-y-3 overflow-y-auto max-h-[200px] bg-gray-50">
                    {columnGrns.length > 0 ? (
                      columnGrns.map((grn) => {
                        const itemStats = getItemStats(grn)
                        const qcStats = getQCStats(grn)

                        return (
                          <div 
                            key={grn.grn_no} 
                            onClick={() => handleViewGRN(grn.grn_no)}
                            className="bg-white border border-gray-200 rounded-xs p-3.5 hover:shadow-md transition-all cursor-pointer group"
                          >
                            {/* GRN Header */}
                            <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                              <div className="flex-1">
                                <h3 className="text-xs font-bold text-gray-900">{grn.grn_no}</h3>
                                <p className="text-xs text-gray-500 mt-1">PO: {grn.po_no}</p>
                              </div>
                              <Badge variant="solid" className={`text-xs whitespace-nowrap ml-2 ${config.badge}`}>
                                {config.label}
                              </Badge>
                            </div>

                            {/* Supplier Info */}
                            <p className="text-xs text-gray-700 font-medium mb-3 truncate">{grn.supplier_name}</p>

                            {/* Item Stats */}
                            <div className="flex flex-wrap gap-2">
                              <div className="bg-blue-50 rounded-xs p-1 text-center text-xs border border-blue-100">
                                <p className="text-xs font-bold text-blue-700">{itemStats.total}</p>
                                <p className="text-xs text-blue-600">Items</p>
                              </div>
                              <div className="bg-green-50 rounded-xs p-1 text-center text-xs border border-green-100">
                                <p className="text-xs font-bold text-green-700">{itemStats.accepted}</p>
                                <p className="text-xs text-green-600">Accepted</p>
                              </div>
                              <div className="bg-red-50 rounded-xs p-1 text-center text-xs border border-red-100">
                                <p className="text-xs font-bold text-red-700">{itemStats.rejected}</p>
                                <p className="text-xs text-red-600">Rejected</p>
                              </div>
                            </div>

                            {/* QC Progress (for inspecting status) */}
                            {grn.status === 'inspecting' && (
                              <div className="mb-3 bg-amber-50 rounded-xs p-2.5 border border-amber-100">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-xs font-semibold text-amber-700">QC Progress</p>
                                  <span className="text-xs font-bold text-amber-700">{qcStats.qcPassedItems}/{qcStats.acceptedItems}</span>
                                </div>
                                <div className="w-full bg-amber-200 rounded-full h-2">
                                  <div 
                                    className="bg-amber-600 h-2 rounded-full transition-all"
                                    style={{ width: `${qcStats.acceptedItems > 0 ? (qcStats.qcPassedItems / qcStats.acceptedItems) * 100 : 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Action Button */}
                            <div className="pt-2 border-t border-gray-100">
                              {getActionButton(grn) ? (
                                getActionButton(grn)
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewGRN(grn.grn_no)}
                                  className="w-full text-xs"
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex items-center justify-center h-40 text-center">
                        <div>
                          <Package size={28} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-xs text-gray-500">No GRNs in this stage</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Other Statuses Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {['rejected', 'sent_back'].map((status) => {
              const columnGrns = getFilteredGrns(status)
              const config = getStatusConfig(status)

              return (
                <div key={status} className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
                  <div className={`bg-gradient-to-r ${config.color} border-b-2 ${config.border} p-2 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <h3 className=" text-gray-900">{config.label}</h3>
                    </div>
                    <Badge variant="solid" className={`text-xs ${config.badge}`}>{columnGrns.length}</Badge>
                  </div>

                  <div className="p-4">
                    {columnGrns.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {columnGrns.map((grn) => (
                          <div 
                            key={grn.grn_no}
                            onClick={() => handleViewGRN(grn.grn_no)}
                            className="p-3 bg-gray-50 rounded-xs hover:bg-gray-100 cursor-pointer transition-colors border-l-4 border-gray-300 hover:border-gray-400"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-900">{grn.grn_no}</p>
                                <p className="text-xs text-gray-600 mt-1">{grn.supplier_name}</p>
                              </div>
                              <Eye size={16} className="text-gray-400 flex-shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-12">No GRNs in this status</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

        </>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-2 text-xs uppercase tracking-wide">GRN Number</th>
                  <th className="p-2 text-xs uppercase tracking-wide">Status</th>
                  <th className="p-2 text-xs uppercase tracking-wide">Supplier</th>
                  <th className="p-2 text-xs uppercase tracking-wide">PO Number</th>
                  <th className="p-2 text-center text-xs text-xs uppercase tracking-wide">Items</th>
                  <th className="p-2 text-center text-xs text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getFilteredGrns().length > 0 ? (
                  getFilteredGrns().map((grn, idx) => {
                    const config = getStatusConfig(grn.status)
                    const itemStats = getItemStats(grn)

                    return (
                      <tr key={grn.grn_no} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                        <td className="p-2 font-medium text-gray-900 text-xs">{grn.grn_no}</td>
                        <td className="p-2">
                          <Badge variant="solid" className={`text-xs ${config.badge}`}>
                            {config.label}
                          </Badge>
                        </td>
                        <td className="p-2 text-gray-700 text-xs">{grn.supplier_name}</td>
                        <td className="p-2 text-gray-700 text-xs">{grn.po_no}</td>
                        <td className="p-2 text-center text-xs">
                          <span className="font-semibold text-gray-900">{itemStats.total}</span>
                        </td>
                        <td className="p-2 text-center text-xs">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewGRN(grn.grn_no)}
                            className="text-xs inline-flex items-center"
                          >
                            <Eye size={16} />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Package size={32} className="mb-3 text-gray-300" />
                        <p className="text-xs">No GRNs found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xs border border-blue-200 p-6 shadow-sm">
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-3 text-lg">
          <FileCheck size={20} className="text-blue-600" />
          Workflow Guide
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-xs p-2 border border-blue-100">
            <p className="font-semibold text-amber-700 mb-2 text-xs">1. Pending Inspection</p>
            <p className="text-gray-600 text-xs">GRN received and ready for physical inspection</p>
          </div>
          <div className="bg-white rounded-xs p-2 border border-blue-100">
            <p className="font-semibold text-blue-700 mb-2 text-xs">2. QC Review</p>
            <p className="text-gray-600 text-xs">Items undergoing quality control checks</p>
          </div>
          <div className="bg-white rounded-xs p-2 border border-blue-100">
            <p className="font-semibold text-purple-700 mb-2 text-xs">3. Awaiting Storage</p>
            <p className="text-gray-600 text-xs">QC approved, waiting for inventory approval</p>
          </div>
          <div className="bg-white rounded-xs p-2 border border-blue-100">
            <p className="font-semibold text-green-700 mb-2 text-xs">4. Completed</p>
            <p className="text-gray-600 text-xs">GRN approved and items stored in inventory</p>
          </div>
        </div>
      </div>
    </div>
  )
}
