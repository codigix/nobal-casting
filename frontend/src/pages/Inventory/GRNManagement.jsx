import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { Search, Clock, Eye, FileCheck, Package, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react'

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grn-requests`)
      const data = await response.json()
      if (data.success) {
        setGrns(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch GRNs')
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
      return grn.status === status && matchesSearch
    })
  }

  const getStatusIcon = (status) => {
    const iconProps = { size: 20 }
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
    <div className="p-4 m-4 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Quality Control Workflow</h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Manage GRNs through inspection, approval, and storage stages</p>
          </div>
          <Button
            variant="primary"
            onClick={fetchGRNs}
            className="flex items-center gap-2 text-sm px-4 py-2"
          >
            <TrendingUp size={16} /> Refresh
          </Button>
        </div>

        {error && <Alert type="danger" className="mb-2">{error}</Alert>}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total GRNs', count: stats.total, color: 'from-slate-50 to-slate-100', textColor: 'text-slate-700', icon: '📊' },
          { label: 'Pending', count: stats.pending, color: 'from-amber-50 to-amber-100', textColor: 'text-amber-700', icon: '⏳' },
          { label: 'QC Review', count: stats.inspecting, color: 'from-blue-50 to-blue-100', textColor: 'text-blue-700', icon: '🔍' },
          { label: 'Awaiting Storage', count: stats.awaiting, color: 'from-purple-50 to-purple-100', textColor: 'text-purple-700', icon: '📦' },
          { label: 'Completed', count: stats.approved, color: 'from-green-50 to-green-100', textColor: 'text-green-700', icon: '✓' },
          { label: 'Rejected', count: stats.rejected, color: 'from-red-50 to-red-100', textColor: 'text-red-700', icon: '✗' }
        ].map((stat, idx) => (
          <div key={idx} className={`bg-gradient-to-br ${stat.color} p-4 rounded-lg border border-opacity-50 transition-all hover:shadow-md`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-xs text-neutral-600 font-medium">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.textColor} mt-1`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-3.5 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by GRN #, PO #, or Supplier name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
        />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-96">
        {kanbanColumns.map((column) => {
          const columnGrns = getFilteredGrns(column.status)
          const config = getStatusConfig(column.status)

          return (
            <div key={column.status} className="flex flex-col">
              {/* Column Header */}
              <div className={`bg-gradient-to-r ${config.color} border-2 ${config.border} rounded-t-lg p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(column.status)}
                  <h2 className="font-bold text-sm text-neutral-900">{column.title}</h2>
                </div>
                <div className="text-2xl font-bold text-neutral-700">{columnGrns.length}</div>
              </div>

              {/* Cards Container */}
              <div className={`flex-1 border-l-2 border-r-2 border-b-2 ${config.border} rounded-b-lg bg-neutral-50 p-3 space-y-3 overflow-y-auto max-h-96`}>
                {columnGrns.length > 0 ? (
                  columnGrns.map((grn) => {
                    const itemStats = getItemStats(grn)
                    const qcStats = getQCStats(grn)

                    return (
                      <Card key={grn.grn_no} className={`p-4 border-l-4 ${config.border} hover:shadow-lg transition-all cursor-pointer group`}>
                        {/* GRN Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-sm text-neutral-900">{grn.grn_no}</h3>
                            <p className="text-xs text-neutral-500">PO: {grn.po_no}</p>
                          </div>
                          <Badge variant="solid" className={`text-xs ${config.badge}`}>
                            {column.title}
                          </Badge>
                        </div>

                        {/* Supplier Info */}
                        <p className="text-xs text-neutral-700 mb-3 font-medium truncate">{grn.supplier_name}</p>

                        {/* Item Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs font-bold text-blue-700">{itemStats.total}</p>
                            <p className="text-xs text-blue-600">Items</p>
                          </div>
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-xs font-bold text-green-700">{itemStats.accepted}</p>
                            <p className="text-xs text-green-600">Accepted</p>
                          </div>
                          <div className="bg-red-50 rounded p-2">
                            <p className="text-xs font-bold text-red-700">{itemStats.rejected}</p>
                            <p className="text-xs text-red-600">Rejected</p>
                          </div>
                        </div>

                        {/* QC Progress (for inspecting status) */}
                        {grn.status === 'inspecting' && (
                          <div className="mb-3 bg-amber-50 rounded p-2">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-xs font-semibold text-amber-700">QC Progress</p>
                              <span className="text-xs font-bold text-amber-700">{qcStats.qcPassedItems}/{qcStats.acceptedItems}</span>
                            </div>
                            <div className="w-full bg-amber-200 rounded-full h-1.5">
                              <div 
                                className="bg-amber-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${qcStats.acceptedItems > 0 ? (qcStats.qcPassedItems / qcStats.acceptedItems) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
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
                      </Card>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center h-32 text-center">
                    <div>
                      <Package size={24} className="mx-auto text-neutral-300 mb-2" />
                      <p className="text-xs text-neutral-500">No GRNs in this stage</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Other Statuses Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['rejected', 'sent_back'].map((status) => {
          const columnGrns = getFilteredGrns(status)
          const config = getStatusConfig(status)

          return (
            <Card key={status} className="p-4">
              <div className="flex items-center gap-3 mb-4">
                {getStatusIcon(status)}
                <h3 className="font-bold text-neutral-900">{config.label}</h3>
                <Badge variant="solid" className={`ml-auto text-sm ${config.badge}`}>{columnGrns.length}</Badge>
              </div>

              {columnGrns.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {columnGrns.map((grn) => (
                    <div 
                      key={grn.grn_no}
                      onClick={() => handleViewGRN(grn.grn_no)}
                      className="p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 cursor-pointer transition-all border-l-4 border-neutral-300"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm text-neutral-900">{grn.grn_no}</p>
                          <p className="text-xs text-neutral-600">{grn.supplier_name}</p>
                        </div>
                        <Eye size={14} className="text-neutral-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 text-center py-8">No GRNs in this status</p>
              )}
            </Card>
          )
        })}
      </div>

      {/* Info Section */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <h4 className="font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <FileCheck size={18} className="text-blue-600" />
          Workflow Guide
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="font-semibold text-amber-700 mb-1">1. Pending Inspection</p>
            <p className="text-neutral-600">GRN received and ready for physical inspection</p>
          </div>
          <div>
            <p className="font-semibold text-blue-700 mb-1">2. QC Review</p>
            <p className="text-neutral-600">Items undergoing quality control checks</p>
          </div>
          <div>
            <p className="font-semibold text-purple-700 mb-1">3. Awaiting Storage</p>
            <p className="text-neutral-600">QC approved, waiting for inventory approval</p>
          </div>
          <div>
            <p className="font-semibold text-green-700 mb-1">4. Completed</p>
            <p className="text-neutral-600">GRN approved and items stored in inventory</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
