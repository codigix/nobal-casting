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
  Layout, Grid3x3, Activity, Download, Settings2, X,
  Zap, Printer, ArrowRight, MapPin, Save, ClipboardCheck,
  Info
} from 'lucide-react'
import Modal from '../../components/Modal/Modal'

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
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalItems, setApprovalItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [storageData, setStorageData] = useState({})
  const [availableItems, setAvailableItems] = useState([])
  const [availableItemsLoading, setAvailableItemsLoading] = useState(false)
  
  // Default visible columns
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'grn_no', 'po_no', 'supplier_name', 'status', 'created_at', 'items_count', 'actions'
  ]))

  useEffect(() => {
    fetchGRNs()
    fetchWarehouses()
  }, [])

  // Pre-populate valuation rates when approval form opens
  useEffect(() => {
    if (showApprovalForm && selectedGRN?.items?.length > 0) {
      const fetchValuationRates = async () => {
        try {
          const itemCodes = selectedGRN.items.map(i => i.item_code).join(',')
          const response = await api.get(`/items?item_codes=${itemCodes}`)
          if (response.data.success) {
            const itemDetails = response.data.data
            setStorageData(prev => {
              const updated = { ...prev }
              selectedGRN.items.forEach(item => {
                const details = itemDetails.find(d => d.item_code === item.item_code)
                if (details) {
                  updated[item.id] = {
                    ...updated[item.id],
                    valuation_rate: details.valuation_rate || 0,
                    batch_no: updated[item.id]?.batch_no || item.batch_no || ''
                  }
                }
              })
              return updated
            })
          }
        } catch (err) {
          console.error('Error fetching valuation rates:', err)
        }
      }
      fetchValuationRates()
    }
  }, [showApprovalForm, selectedGRN])

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
    const grn = grns.find(g => g.grn_no === grnNo)
    if (grn) {
      setSelectedGRN(grn)
      setShowDetails(true)
    } else {
      navigate(`/inventory/grn/${grnNo}`)
    }
  }, [grns, navigate])

  const handleStartInspection = async (grnId) => {
    try {
      await api.post(`/grn-requests/${grnId}/start-inspection`)
      toast.addToast('Inspection started successfully', 'success')
      fetchGRNs()
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
      fetchGRNs()
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
      fetchGRNs()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to reject GRN', 'error')
    }
  }

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

    setLoading(true)
    try {
      const approvedItemsWithStorage = approvalItems.map(item => {
        const grnItem = selectedGRN.items.find(gi => gi.id === item.id)
        
        return {
          id: item.id,
          accepted_qty: Number(item.accepted_qty) || 0,
          rejected_qty: Number(item.rejected_qty) || 0,
          qc_status: item.qc_status || 'pass',
          bin_rack: storageData[item.id]?.bin_rack || '',
          batch_no: storageData[item.id]?.batch_no || '',
          valuation_rate: Number(storageData[item.id]?.valuation_rate) || 0,
          warehouse_name: grnItem?.warehouse_name || 'Main Warehouse'
        }
      })

      await api.post(`/grn-requests/${selectedGRN.id}/inventory-approve`, {
        approvedItems: approvedItemsWithStorage
      })
      
      toast.addToast('GRN approved! Materials stored in inventory.', 'success')
      setShowApprovalForm(false)
      setApprovalItems([])
      setStorageData({})
      fetchGRNs()
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

  const handlePrintGRN = (grn) => {
    window.print()
  }

  const getActionButton = (grn) => {
    if (grn.status === 'pending') {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleStartInspection(grn.id)
            }}
            className="flex items-center gap-2 text-[10px] py-1 px-2 w-fit justify-center bg-amber-600 hover:bg-amber-700 text-white border-none transition-all hover:scale-[1.02]"
          >
            <Zap size={12} /> Start QC
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleViewGRN(grn.grn_no)
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
          >
            <Eye size={14} />
          </Button>
        </div>
      )
    }

    if (grn.status === 'inspecting') {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedGRN(grn)
              setApprovalItems(grn.items.map(item => ({
                id: item.id,
                accepted_qty: item.received_qty,
                rejected_qty: 0,
                qc_status: 'pass'
              })))
              setShowApprovalForm(true)
            }}
            className="flex items-center gap-2 text-[10px] py-1 px-2 w-fit justify-center bg-blue-600 hover:bg-blue-700 text-white border-none transition-all hover:scale-[1.02]"
          >
            <ShieldCheck size={12} /> QC Inspect
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleViewGRN(grn.grn_no)
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
          >
            <Eye size={14} />
          </Button>
        </div>
      )
    }

    if (grn.status === 'awaiting_inventory_approval') {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedGRN(grn)
              setApprovalItems(grn.items.map(item => ({
                id: item.id,
                accepted_qty: item.accepted_qty || item.received_qty,
                rejected_qty: item.rejected_qty || 0,
                qc_status: item.qc_status || 'pass'
              })))
              setShowApprovalForm(true)
            }}
            className="flex items-center gap-2 text-[10px] py-1 px-2 w-fit justify-center bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-all hover:scale-[1.02]"
          >
            <Package size={12} /> Approve & Store
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleViewGRN(grn.grn_no)
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
          >
            <Eye size={14} />
          </Button>
        </div>
      )
    }

    if (grn.status === 'approved') {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handlePrintGRN(grn)
            }}
            className="flex items-center gap-2 text-[10px] py-1 px-2 w-fit justify-center border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
          >
            <Printer size={12} /> Print
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleViewGRN(grn.grn_no)
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
          >
            <Eye size={14} />
          </Button>
        </div>
      )
    }

    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          handleViewGRN(grn.grn_no)
        }}
        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
      >
        <Eye size={14} />
      </Button>
    )
  }

  const getStatusBadge = (status) => {
    const config = getStatusConfig(status)
    const Icon = config.icon
    return (
      <Badge className={`${config.badge} flex items-center gap-1.5 w-fit border`}>
        <Icon size={12} />
        {config.label.toUpperCase()}
      </Badge>
    )
  }

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
      render: (_, row) => getActionButton(row)
    }
  ], [handleViewGRN, getActionButton])

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
              className="flex items-center gap-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-4 py-2 rounded-xs text-xs  border border-neutral-200 dark:border-neutral-800 transition-all active:scale-95 shadow-sm"
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
                                <div onClick={(e) => e.stopPropagation()}>
                                  {getActionButton(grn)}
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

      {/* Details Modal */}
      <Modal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false)
          setRejectionReason('')
        }}
        title={selectedGRN ? `GRN Details - ${selectedGRN.grn_no}` : 'GRN Details'}
        size="4xl"
        footer={
          <div className="flex items-center gap-2 w-full">
            {selectedGRN?.status === 'inspecting' && (
              <Button
                variant="danger"
                className="px-6"
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
            {selectedGRN?.status === 'approved' && (
              <Button
                variant="secondary"
                className="px-6 flex items-center gap-2"
                onClick={() => handlePrintGRN(selectedGRN)}
              >
                <Printer size={16} />
                Print GRN
              </Button>
            )}
            <div className="ml-auto flex gap-2">
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
              {selectedGRN && (
                <div onClick={(e) => e.stopPropagation()}>
                  {getActionButton(selectedGRN)}
                </div>
              )}
            </div>
          </div>
        }
      >
        {selectedGRN && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-white dark:bg-neutral-900 flex items-center justify-center text-indigo-600 border border-neutral-200 dark:border-neutral-700">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider leading-none mb-1.5">Status</p>
                  {getStatusBadge(selectedGRN.status)}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider leading-none mb-1.5">Receipt Date</p>
                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                  {new Date(selectedGRN.receipt_date || selectedGRN.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider leading-none mb-2">PO Reference</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Truck size={16} className="text-indigo-500" />
                  {selectedGRN.po_no || 'Manual Entry'}
                </p>
              </div>
              <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider leading-none mb-2">Supplier</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-500" />
                  {selectedGRN.supplier_name}
                </p>
              </div>
            </div>

            {selectedGRN.rejection_reason && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4 flex gap-3 items-start">
                <AlertCircle className="text-rose-500 shrink-0" size={20} />
                <div>
                  <p className="text-[10px] text-rose-500 uppercase tracking-wider leading-none mb-1">Rejection Reason</p>
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-400 mt-1">{selectedGRN.rejection_reason}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Package size={14} className="text-indigo-500" />
                Received Items ({selectedGRN.items?.length || 0})
              </h4>
              <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3 text-right">Received Qty</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">QC Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                    {(selectedGRN.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-neutral-900 dark:text-white">{item.item_code}</div>
                          <div className="text-[10px] text-neutral-400 font-medium">{item.item_name}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-neutral-700 dark:text-neutral-300">
                          {item.received_qty}
                        </td>
                        <td className="p-3 text-neutral-500 dark:text-neutral-400 font-medium">{item.unit}</td>
                        <td className="p-3">
                           {item.qc_status ? (
                             <Badge variant={item.qc_status === 'pass' ? 'success' : 'danger'} size="sm">
                               {item.qc_status.toUpperCase()}
                             </Badge>
                           ) : (
                             <span className="text-[10px] text-neutral-400 italic">Pending</span>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedGRN.status === 'inspecting' && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  QC Decision & Feedback
                </h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide feedback or reason for rejection if necessary..."
                  className="w-full min-h-[100px] p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-all"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approval & Store Modal */}
      <Modal
        isOpen={showApprovalForm}
        onClose={() => {
          setShowApprovalForm(false)
          setApprovalItems([])
          setStorageData({})
        }}
        title={selectedGRN ? `Approve & Store - ${selectedGRN.grn_no}` : 'Approve & Store GRN'}
        size="5xl"
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
              className={`${selectedGRN?.status === 'inspecting' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white border-none px-6 shadow-lg shadow-indigo-500/20`}
              onClick={() => {
                if (selectedGRN.status === 'inspecting') {
                  handleApprove(selectedGRN.id)
                } else {
                  handleApproveAndStore()
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {selectedGRN?.status === 'inspecting' ? <ShieldCheck size={16} /> : <Save size={16} />}
                  {selectedGRN?.status === 'inspecting' ? 'Complete QC & Submit' : 'Approve & Store'}
                </div>
              )}
            </Button>
          </div>
        }
      >
        {selectedGRN && (
          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 flex gap-3 items-start">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                <span className="font-bold">Important:</span> Review the quantities accepted and rejected. Ensure the valuation rates and storage locations (Warehouse/Bin) are correctly assigned before final approval.
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck size={14} className="text-indigo-500" />
                Material Receipt & Storage Assignment
              </h4>
              <div className="border border-neutral-100 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                      <tr>
                        <th className="p-3 min-w-[180px]">Item Details</th>
                        <th className="px-2 py-3 text-center w-20">Recv.</th>
                        <th className="px-2 py-3 text-center w-24">Accept</th>
                        <th className="px-2 py-3 text-center w-24">Reject</th>
                        <th className="px-2 py-3 text-center w-28">QC Status</th>
                        <th className="px-2 py-3 w-32">Warehouse</th>
                        <th className="px-2 py-3 w-32">Bin/Rack</th>
                        <th className="px-2 py-3 w-32">Batch #</th>
                        <th className="p-3 text-right w-32">Rate (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                      {(selectedGRN.items || []).map((item, idx) => {
                        const approvalItem = approvalItems.find(ai => ai.id === item.id) || {}
                        const storage = storageData[item.id] || {}
                        return (
                          <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-neutral-900 dark:text-white">{item.item_code}</div>
                              <div className="text-[10px] text-neutral-400 font-medium truncate max-w-[150px]">{item.item_name}</div>
                            </td>
                            <td className="px-2 py-3 text-center font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-50/30 dark:bg-neutral-800/30">
                              {item.received_qty}
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                max={item.received_qty}
                                value={approvalItem.accepted_qty || 0}
                                onChange={(e) => handleApprovalItemChange(item.id, 'accepted_qty', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-center font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                max={item.received_qty}
                                value={approvalItem.rejected_qty || 0}
                                onChange={(e) => handleApprovalItemChange(item.id, 'rejected_qty', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-center font-bold text-rose-500 focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <select
                                value={approvalItem.qc_status || 'pass'}
                                onChange={(e) => handleApprovalItemChange(item.id, 'qc_status', e.target.value)}
                                className={`w-full px-2 py-1.5 border rounded text-[10px] font-bold outline-none cursor-pointer transition-colors ${
                                  approvalItem.qc_status === 'fail' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/30 text-rose-600' : 
                                  approvalItem.qc_status === 'rework' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30 text-amber-600' :
                                  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600'
                                }`}
                              >
                                <option value="pass">PASS</option>
                                <option value="fail">FAIL</option>
                                <option value="rework">REWORK</option>
                              </select>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded border border-blue-100 dark:border-blue-900/30 w-fit text-[10px] font-bold">
                                <MapPin size={10} />
                                {item.warehouse_name || 'Main'}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="text"
                                placeholder="Bin/Rack"
                                value={storage.bin_rack || ''}
                                onChange={(e) => handleStorageDataChange(item.id, 'bin_rack', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="text"
                                placeholder="Batch #"
                                value={storage.batch_no || item.batch_no || ''}
                                onChange={(e) => handleStorageDataChange(item.id, 'batch_no', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                placeholder="0.00"
                                value={storage.valuation_rate || ''}
                                onChange={(e) => handleStorageDataChange(item.id, 'valuation_rate', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-right font-bold text-neutral-700 dark:text-neutral-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
          </div>
        )}
      </Modal>
    </div>
  )
}
