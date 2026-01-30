import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import DataTable from '../../components/Table/DataTable'

import { 
  CheckCircle, XCircle, Clock, AlertCircle, Eye, Package, ArrowRight, 
  Info, Save, MapPin, Zap, Plus, Grid3x3, List, RefreshCw, ClipboardCheck, 
  Truck, ShieldCheck, Search, Filter, RefreshCcw, LayoutGrid, MoreVertical,
  ChevronRight, ClipboardList, Calendar, Building2, TrendingUp, ArrowUpRight,
  Database, Boxes, History, FileCheck
} from 'lucide-react'
import Modal from '../../components/Modal/Modal'
import InventoryApprovalModal from '../../components/Buying/InventoryApprovalModal'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }) => {
  const colorMap = {
    primary: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700',
    success: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
    warning: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
    danger: 'from-rose-50 to-rose-100 border-rose-200 text-rose-700',
    info: 'from-sky-50 to-sky-100 border-sky-200 text-sky-700',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700'
  }
  
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-4 rounded-md border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 shadow-md border-indigo-300' : ''}`}
    >
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex items-start justify-between mb-2 relative z-10">
        <span className="text-xs  text-gray-500 ">{label}</span>
        <div className="p-1.5 bg-white/50 rounded shadow-sm">
          <Icon size={16} className="text-gray-700" />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-xl   text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function PurchaseReceipts() {
  const toast = useToast()
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalItems, setApprovalItems] = useState([])
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [warehouses, setWarehouses] = useState([])
  const [storageData, setStorageData] = useState({})
  const [viewMode, setViewMode] = useState('kanban')
  const [currentTab, setCurrentTab] = useState('grn-requests')
  const [availableItems, setAvailableItems] = useState([])
  const [availableItemsLoading, setAvailableItemsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()

  useEffect(() => {
    fetchGRNRequests()
    fetchWarehouses()
    
    // Check for search param in URL
    const params = new URLSearchParams(location.search)
    const searchParam = params.get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
      setViewMode('table') // Switch to table view to see results clearly
    }
  }, [location.search])

  const fetchGRNRequests = async () => {
    try {
      setLoading(true)
      const response = await api.get('/grn-requests')
      const data = response.data.data || []
      setGrns(data)
      setRefreshTime(new Date())
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch GRN requests')
      toast.addToast('Failed to fetch GRN requests', 'error')
    } finally {
      setLoading(false)
    }
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

  const filteredGRNs = useMemo(() => {
    return grns.filter(grn => {
      const matchesFilter = !activeFilter || 
        (activeFilter === 'awaiting' ? grn.status === 'awaiting_inventory_approval' : grn.status === activeFilter)
      
      const matchesSearch = 
        grn.grn_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.po_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        grn.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesFilter && matchesSearch
    })
  }, [grns, activeFilter, searchQuery])

  const handleStartInspection = async (grnId) => {
    try {
      await api.post(`/grn-requests/${grnId}/start-inspection`)
      toast.addToast('Inspection started successfully', 'success')
      fetchGRNRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to start inspection', 'error')
    }
  }

  const handleApprove = async (grnId) => {
    if (approvalItems.length === 0) {
      toast.addToast('Please add accepted items', 'warning')
      return
    }

    try {
      await api.post(`/grn-requests/${grnId}/approve`, {
        approvedItems: approvalItems
      })
      toast.addToast('GRN approved and stock entry created', 'success')
      setShowApprovalForm(false)
      setApprovalItems([])
      fetchGRNRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to approve GRN', 'error')
    }
  }

  const handleReject = async (grnId) => {
    if (!rejectionReason.trim()) {
      toast.addToast('Please provide rejection reason', 'warning')
      return
    }

    try {
      await api.post(`/grn-requests/${grnId}/reject`, {
        reason: rejectionReason
      })
      toast.addToast('GRN rejected successfully', 'success')
      setShowDetails(false)
      setRejectionReason('')
      fetchGRNRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to reject GRN', 'error')
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'Pending Inspection', color: 'from-amber-50 to-amber-100/50', border: 'border-amber-200', badge: 'bg-amber-50 text-amber-600 border-amber-100', iconColor: 'text-amber-500', icon: Clock },
      inspecting: { label: 'QC Review', color: 'from-blue-50 to-blue-100/50', border: 'border-blue-200', badge: 'bg-blue-50 text-blue-600 border-blue-100', iconColor: 'text-blue-500', icon: FileCheck },
      awaiting_inventory_approval: { label: 'Awaiting Storage', color: 'from-purple-50 to-purple-100/50', border: 'border-purple-200', badge: 'bg-purple-50 text-purple-600 border-purple-100', iconColor: 'text-purple-500', icon: Package },
      approved: { label: 'Completed', color: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-200', badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', iconColor: 'text-emerald-500', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'from-rose-50 to-rose-100/50', border: 'border-rose-200', badge: 'bg-rose-50 text-rose-600 border-rose-100', iconColor: 'text-rose-500', icon: XCircle },
      sent_back: { label: 'Sent Back', color: 'from-orange-50 to-orange-100/50', border: 'border-orange-200', badge: 'bg-orange-50 text-orange-600 border-orange-100', iconColor: 'text-orange-500', icon: ArrowRight }
    }
    return configs[status] || { label: status, color: 'from-slate-50 to-slate-100/50', border: 'border-slate-200', badge: 'bg-slate-50 text-slate-600 border-slate-100', iconColor: 'text-slate-400', icon: Info }
  }

  const getItemStats = (grn) => {
    const total = grn.items?.length || 0
    const accepted = grn.items?.filter(i => i.qc_status === 'pass').length || 0
    const rejected = grn.items?.filter(i => i.qc_status === 'fail').length || 0
    const pending = total - accepted - rejected
    return { total, accepted, rejected, pending }
  }

  const kanbanColumns = [
    { status: 'pending', title: 'Pending Inspection', icon: Clock },
    { status: 'inspecting', title: 'Under QC Review', icon: ShieldCheck },
    { status: 'awaiting_inventory_approval', title: 'Awaiting Storage', icon: Package },
    { status: 'approved', title: 'Completed', icon: CheckCircle }
  ]

  const handleApprovalItemChange = (itemId, field, value) => {
    setApprovalItems(prev => {
      const existing = prev.find(item => item.id === itemId)
      const numValue = ['accepted_qty', 'rejected_qty'].includes(field) ? Number(value) || 0 : value

      if (existing) {
        return prev.map(item =>
          item.id === itemId ? { ...item, [field]: numValue } : item
        )
      } else {
        return [...prev, { id: itemId, [field]: numValue }]
      }
    })
  }

  const handleStorageDataChange = (itemId, field, value) => {
    const finalValue = field === 'valuation_rate' ? (Number(value) || 0) : value

    setStorageData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: finalValue
      }
    }))
  }

  const handleApproveAndStore = async () => {
    if (approvalItems.length === 0) {
      toast.addToast('Please add accepted items', 'warning')
      return
    }

    const warehouseAssigned = approvalItems.every(item => {
      return storageData[item.id]?.warehouse_id
    })

    if (!warehouseAssigned) {
      toast.addToast('Please assign warehouse location for all items', 'warning')
      return
    }

    setLoading(true)
    try {
      const approvedItemsWithStorage = approvalItems.map(item => {
        const warehouseId = storageData[item.id]?.warehouse_id
        const selectedWarehouse = warehouses.find(w => String(w.id) === String(warehouseId))

        if (!selectedWarehouse) {
          throw new Error(`Warehouse not found for item ${item.id}`)
        }

        return {
          id: item.id,
          accepted_qty: Number(item.accepted_qty) || 0,
          rejected_qty: Number(item.rejected_qty) || 0,
          qc_status: item.qc_status || 'pass',
          bin_rack: storageData[item.id]?.bin_rack || '',
          batch_no: storageData[item.id]?.batch_no || '',
          valuation_rate: Number(storageData[item.id]?.valuation_rate) || 0,
          warehouse_name: selectedWarehouse.warehouse_name
        }
      })

      await api.post(`/grn-requests/${selectedGRN.id}/inventory-approve`, {
        approvedItems: approvedItemsWithStorage
      })
      
      toast.addToast('GRN approved! Materials stored in inventory.', 'success')
      setShowApprovalForm(false)
      setApprovalItems([])
      setStorageData({})
      fetchGRNRequests()
    } catch (err) {
      console.error('Approval error:', err)
      toast.addToast(err.response?.data?.error || err.message || 'Failed to approve and store GRN', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }

  const fetchAvailableItems = async () => {
    try {
      setAvailableItemsLoading(true)
      const response = await api.get('/stock/stock-balance')
      const items = response.data.data || []
      setAvailableItems(items.filter(item => item.current_qty > 0))
    } catch (err) {
      console.error('Error fetching available items:', err)
      toast.addToast('Failed to load available items', 'error')
    } finally {
      setAvailableItemsLoading(false)
    }
  }

  const handleViewGRN = (grnNo) => {
    // In Buying module, we might want to stay on this page or navigate to a detail page
    // For now, let's use the modal-based view logic
    const grn = grns.find(g => g.grn_no === grnNo)
    if (grn) {
      setSelectedGRN(grn)
      setShowDetails(true)
    }
  }

  const getActionButton = (grn) => {
    if (grn.status === 'awaiting_inventory_approval') {
      return (
        <Button
          variant="success"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedGRN(grn)
            if (grn.items && grn.items.length > 0) {
              setApprovalItems(grn.items.map(item => ({
                id: item.id,
                accepted_qty: Number(item.received_qty) || 0,
                rejected_qty: 0,
                qc_status: 'pass'
              })))
            }
            setShowApprovalForm(true)
          }}
          className="flex items-center gap-2 text-xs py-2 w-full justify-center shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white border-none transition-all hover:scale-[1.02]"
        >
          <Package size={14} /> Approve & Store
        </Button>
      )
    }

    return (
      <Button
        variant="primary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          handleViewGRN(grn.grn_no)
        }}
        className="flex items-center gap-2 text-xs py-2 w-full justify-center shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-all hover:scale-[1.02]"
      >
        <Eye size={14} /> View Details
      </Button>
    )
  }

  const getStatusBadge = (status) => {
    const config = getStatusConfig(status)
    const Icon = config.icon
    return (
      <Badge variant="solid" className={`flex items-center gap-1.5 text-xs   py-1 px-2.5 rounded-lg ${config.badge}`}>
        <Icon size={12} />
        {config.label}
      </Badge>
    )
  }

  const columns = [
    {
      header: 'GRN Number',
      accessor: 'grn_no',
      cell: (row) => (
        <div className="flex flex-col">
          <span className=" text-slate-900">{row.grn_no}</span>
          <span className="text-xs text-slate-400  ">PO: {row.po_no}</span>
        </div>
      )
    },
    {
      header: 'Supplier',
      accessor: 'supplier_name',
      cell: (row) => (
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <Building2 size={14} className="text-slate-400" />
          {row.supplier_name}
        </div>
      )
    },
    {
      header: 'Receipt Date',
      accessor: 'receipt_date',
      cell: (row) => (
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <Calendar size={14} className="text-slate-400" />
          {new Date(row.receipt_date).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => getStatusBadge(row.status)
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {getActionButton(row)}
        </div>
      )
    }
  ]

  if (loading && grns.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-neutral-800 mb-4 shadow-sm">
            <Package size={32} className="text-blue-500 animate-pulse" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading Goods Receipts...</p>
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
              <Truck size={28} />
            </div>
            <div>
              <h1 className="text-xl   text-slate-900 tracking-tight">Purchase Receipts</h1>
              <p className="text-slate-500 font-medium text-sm">Process material receipts and quality inspections</p>
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
              onClick={fetchGRNRequests}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded  text-sm font-semibold shadow-sm border border-slate-200 transition-all active:scale-95"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none p-2 rounded  shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <Plus size={18} strokeWidth={3} /> 
              <span className="  text-xs">Create GRN</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {currentTab === 'grn-requests' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <StatCard
              label="Total Receipts"
              value={stats.total}
              icon={ClipboardList}
              color="indigo"
              onClick={() => setActiveFilter('')}
              isActive={activeFilter === ''}
            />
            <StatCard
              label="Pending QC"
              value={stats.pending}
              icon={Clock}
              color="warning"
              onClick={() => setActiveFilter('pending')}
              isActive={activeFilter === 'pending'}
            />
            <StatCard
              label="QC Review"
              value={stats.inspecting}
              icon={ShieldCheck}
              color="info"
              onClick={() => setActiveFilter('inspecting')}
              isActive={activeFilter === 'inspecting'}
            />
            <StatCard
              label="Awaiting Storage"
              value={stats.awaiting}
              icon={Package}
              color="indigo"
              onClick={() => setActiveFilter('awaiting_inventory_approval')}
              isActive={activeFilter === 'awaiting_inventory_approval'}
            />
            <StatCard
              label="Completed"
              value={stats.approved}
              icon={CheckCircle}
              color="success"
              onClick={() => setActiveFilter('approved')}
              isActive={activeFilter === 'approved'}
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color="danger"
              onClick={() => setActiveFilter('rejected')}
              isActive={activeFilter === 'rejected'}
            />
          </div>
        )}

        {/* Improved Tab Navigation */}
        <div className="flex gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit mb-6">
          <button
            onClick={() => setCurrentTab('grn-requests')}
            className={`flex items-center gap-2 p-2 rounded   text-xs transition-all ${
              currentTab === 'grn-requests'
                ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200'
                : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <ClipboardCheck size={16} />
            GRN REQUESTS
          </button>
          <button
            onClick={() => {
              setCurrentTab('available-items')
              fetchAvailableItems()
            }}
            className={`flex items-center gap-2 p-2 rounded   text-xs transition-all ${
              currentTab === 'available-items'
                ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200'
                : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <Boxes size={16} />
            AVAILABLE STOCK
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-rose-500" size={20} />
              <p className="text-rose-700 font-medium">{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-emerald-500" size={20} />
              <p className="text-emerald-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {currentTab === 'grn-requests' && (
          <>
            {/* Filters Bar */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by GRN #, PO #, or Supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded  bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 transition-all"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto px-2">
                <Filter size={18} className="text-slate-400 hidden md:block" />
                <select 
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
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
                  const columnGrns = filteredGRNs.filter(g => g.status === column.status)
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

                                <div className="space-y-3 mb-5">
                                  <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                                    <Building2 size={14} className="text-slate-400" />
                                    {grn.supplier_name}
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-semibold">
                                    <Calendar size={14} className="text-slate-400" />
                                    {new Date(grn.receipt_date).toLocaleDateString()}
                                  </div>
                                </div>

                                <div className="bg-slate-50 rounded  p-3 mb-5">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs  text-slate-400 uppercase">Items Status</span>
                                    <span className="text-xs  text-slate-600">{itemStats.accepted}/{itemStats.total}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all" 
                                      style={{ width: `${(itemStats.accepted / itemStats.total) * 100}%` }}
                                    ></div>
                                    <div 
                                      className="h-full bg-rose-500 transition-all" 
                                      style={{ width: `${(itemStats.rejected / itemStats.total) * 100}%` }}
                                    ></div>
                                  </div>
                                  <div className="flex justify-between mt-2 text-[9px]  er">
                                    <span className="text-emerald-600">{itemStats.accepted} Accepted</span>
                                    <span className="text-rose-600">{itemStats.rejected} Rejected</span>
                                    <span className="text-amber-600">{itemStats.pending} Pending</span>
                                  </div>
                                </div>

                                {getActionButton(grn)}
                              </div>
                            )
                          })
                        ) : (
                          <div className="border-2 border-dashed border-slate-200 rounded-2xl py-12 flex flex-col items-center justify-center bg-slate-50/30">
                            <Package className="text-slate-300 mb-2" size={32} />
                            <p className="text-slate-400 text-xs  ">No Requests</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded border border-slate-200 ">
                <DataTable 
                  columns={columns} 
                  data={filteredGRNs} 
                  onRowClick={(row) => handleViewGRN(row.grn_no)}
                />
              </div>
            )}
          </>
        )}

        {/* Available Items Section */}
        {currentTab === 'available-items' && (
          <div className="bg-white rounded border border-slate-200  animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg  text-slate-900 flex items-center gap-2">
                  <Boxes className="text-indigo-600" size={20} />
                  Available Stock Balance
                </h2>
                <p className="text-slate-500 text-xs font-medium mt-0.5">Real-time inventory levels across all warehouses</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs  text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                  {availableItems.length} Unique Items
                </div>
                <button 
                  onClick={fetchAvailableItems}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all"
                  title="Refresh Stock"
                >
                  <RefreshCw size={18} className={availableItemsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {availableItemsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500  text-xs ">Updating Stock Data...</p>
                </div>
              ) : availableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-slate-50/30">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Database size={40} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg  text-slate-900 mb-1">Inventory Empty</h3>
                  <p className="text-slate-500 text-sm font-medium">No items currently available in stock.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400  uppercase text-xs tracking-widest border-b border-slate-100">
                      <th className="p-2 ">Item Details</th>
                      <th className="p-2  text-right">Available Qty</th>
                      <th className="p-2  text-right">Reserved</th>
                      <th className="p-2  text-right">Valuation Rate</th>
                      <th className="p-2  text-right">Total Value</th>
                      <th className="p-2 ">Warehouse</th>
                      <th className="p-2 ">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {availableItems.map((item, idx) => {
                      const totalValue = (parseFloat(item.current_qty) || 0) * (parseFloat(item.valuation_rate) || 0)
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2 ">
                            <div className=" text-slate-900 group-hover:text-indigo-600 transition-colors">{item.item_code}</div>
                            <div className="text-[11px] text-slate-400   truncate max-w-[200px]">{item.item_name}</div>
                          </td>
                          <td className="p-2  text-right">
                            <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs  border border-emerald-100 shadow-sm">
                              {(parseFloat(item.current_qty) || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-2  text-right">
                            <span className="text-slate-600  text-xs">
                              {(parseFloat(item.reserved_qty) || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-2  text-right">
                            <span className="text-slate-500 font-medium text-xs">
                              ₹{(parseFloat(item.valuation_rate) || 0).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="p-2  text-right">
                            <div className="text-slate-900  text-xs">
                              ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                          </td>
                          <td className="p-2 ">
                            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs bg-slate-100 px-3 py-1 rounded-lg w-fit">
                              <MapPin size={12} className="text-slate-400" />
                              {item.warehouse_name || 'Unassigned'}
                            </div>
                          </td>
                          <td className="p-2  text-slate-400 text-xs  uppercase">
                            {item.last_receipt_date ? (
                              <div className="flex items-center gap-1.5">
                                <History size={12} />
                                {new Date(item.last_receipt_date).toLocaleDateString()}
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetails && !showApprovalForm}
        onClose={() => {
          setShowDetails(false)
          setRejectionReason('')
        }}
        title={selectedGRN ? `GRN Details - ${selectedGRN.grn_no}` : 'GRN Details'}
        size="2xl"
        footer={
          <div className="flex gap-3 justify-between w-full">
            {selectedGRN?.status === 'inspecting' && (
              <Button
                variant="danger"
                className="bg-rose-600 hover:bg-rose-700 text-white border-none px-6"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    toast.addToast('Please provide rejection reason', 'warning')
                    return
                  }
                  handleReject(selectedGRN.id)
                }}
              >
                <XCircle size={16} className="mr-2" />
                Reject GRN
              </Button>
            )}
            <div className="ml-auto">
              <Button
                variant="secondary"
                className="px-6"
                onClick={() => {
                  setShowDetails(false)
                  setRejectionReason('')
                }}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedGRN && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded  bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <p className="text-xs  text-slate-400  leading-none mb-1">Status</p>
                  {getStatusBadge(selectedGRN.status)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs  text-slate-400  leading-none mb-1">Receipt Date</p>
                <p className="text-sm  text-slate-700">{new Date(selectedGRN.receipt_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs  text-slate-400  leading-none mb-2">PO Reference</p>
                <p className="text-base  text-slate-900 flex items-center gap-2">
                  <Truck size={16} className="text-indigo-500" />
                  {selectedGRN.po_no}
                </p>
              </div>
              <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs  text-slate-400  leading-none mb-2">Supplier</p>
                <p className="text-base  text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-500" />
                  {selectedGRN.supplier_name}
                </p>
              </div>
            </div>

            {selectedGRN.rejection_reason && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start">
                <AlertCircle className="text-rose-500 shrink-0" size={20} />
                <div>
                  <p className="text-xs  text-rose-400  leading-none mb-1">Rejection Reason</p>
                  <p className="text-sm font-semibold text-rose-700">{selectedGRN.rejection_reason}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs  text-slate-900  flex items-center gap-2">
                <Package size={14} className="text-indigo-500" />
                Received Items
              </h4>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs  text-slate-400 ">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-right">Received Qty</th>
                      <th className="px-4 py-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedGRN.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className=" text-slate-900 text-xs">{item.item_code}</div>
                          <div className="text-xs text-slate-400 font-medium">{item.item_name}</div>
                        </td>
                        <td className="px-4 py-3 text-right  text-slate-700 text-xs">
                          {item.received_qty}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs font-medium">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedGRN.status === 'inspecting' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs  text-slate-900 ">
                  QC Decision & Feedback
                </h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide feedback or reason for rejection..."
                  className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-700 transition-all placeholder:text-slate-300"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showApprovalForm}
        onClose={() => {
          setShowApprovalForm(false)
          setApprovalItems([])
          setStorageData({})
        }}
        title={selectedGRN ? `Approve & Store - ${selectedGRN.grn_no}` : 'Approve & Store GRN'}
        size="4xl"
        footer={
          <div className="flex gap-3 justify-end w-full">
            <Button
              variant="secondary"
              className="px-6"
              onClick={() => {
                setShowApprovalForm(false)
                setApprovalItems([])
                setStorageData({})
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none px-6"
              onClick={handleApproveAndStore}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save size={16} />
                  Approve & Store
                </div>
              )}
            </Button>
          </div>
        }
      >
        {selectedGRN && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <div className="text-xs  text-amber-700  leading-none mt-1">
                Quantity Review & Storage Assignment
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs  text-slate-900  flex items-center gap-2">
                <ClipboardCheck size={14} className="text-indigo-500" />
                Items Approval
              </h4>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-xs  text-slate-400 ">
                    <tr>
                      <th className="px-4 py-3">Item Details</th>
                      <th className="px-4 py-3 text-center">Received</th>
                      <th className="px-4 py-3 text-center">Accept Qty</th>
                      <th className="px-4 py-3 text-center">Reject Qty</th>
                      <th className="px-4 py-3 text-center">QC Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedGRN.items || []).map((item, idx) => {
                      const approvalItem = approvalItems.find(ai => ai.id === item.id) || {}
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className=" text-slate-900">{item.item_code}</div>
                            <div className="text-xs text-slate-400 font-medium">{item.item_name}</div>
                          </td>
                          <td className="px-4 py-4 text-center  text-slate-700">
                            {item.received_qty}
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              max={item.received_qty}
                              value={approvalItem.accepted_qty || 0}
                              onChange={(e) => handleApprovalItemChange(item.id, 'accepted_qty', e.target.value)}
                              className="w-20 mx-auto block px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center  text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="number"
                              min="0"
                              max={item.received_qty}
                              value={approvalItem.rejected_qty || 0}
                              onChange={(e) => handleApprovalItemChange(item.id, 'rejected_qty', e.target.value)}
                              className="w-20 mx-auto block px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-center  text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={approvalItem.qc_status || 'pass'}
                              onChange={(e) => handleApprovalItemChange(item.id, 'qc_status', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg  text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                              <option value="pass">Pass</option>
                              <option value="fail">Fail</option>
                              <option value="rework">Rework</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs  text-slate-900  flex items-center gap-2">
                <MapPin size={14} className="text-indigo-500" />
                Warehouse & Valuation
              </h4>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-xs  text-slate-400 ">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Warehouse</th>
                      <th className="px-4 py-3">Bin/Rack</th>
                      <th className="px-4 py-3">Batch No</th>
                      <th className="px-4 py-3 text-right">Valuation Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedGRN.items || []).map((item, idx) => {
                      const storage = storageData[item.id] || {}
                      const hasWarehouse = storage.warehouse_id
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className=" text-slate-900">{item.item_code}</div>
                          </td>
                          <td className="px-4 py-4">
                            <select
                              value={storage.warehouse_id || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'warehouse_id', e.target.value)}
                              className={`w-full px-3 py-1.5 border rounded-lg  text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-all ${hasWarehouse ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200'}`}
                            >
                              <option value="">Select Location</option>
                              {warehouses.map(wh => (
                                <option key={wh.id} value={wh.id}>{wh.warehouse_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              placeholder="e.g. A-102"
                              value={storage.bin_rack || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'bin_rack', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <input
                              type="text"
                              placeholder="Batch #"
                              value={storage.batch_no || item.batch_no || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'batch_no', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input
                              type="number"
                              placeholder="0.00"
                              value={storage.valuation_rate || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'valuation_rate', e.target.value)}
                              className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-right  text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <CreateGRNModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newGRN) => {
          toast.addToast('GRN Request created successfully!', 'success')
          setShowCreateModal(false)
          fetchGRNRequests()
        }}
      />
    </div>
  )
}
