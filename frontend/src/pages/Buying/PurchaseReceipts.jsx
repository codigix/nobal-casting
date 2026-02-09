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
  Database, Boxes, History, FileCheck, Settings2, X, Printer 
} from 'lucide-react'
import Modal from '../../components/Modal/Modal'
import InventoryApprovalModal from '../../components/Buying/InventoryApprovalModal'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive, description }) => {
  const colorMap = {
    primary: 'from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
    success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400',
    warning: 'from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400',
    danger: 'from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400',
    info: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400',
    indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400'
  }
  
  return (
    <Card
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-2 overflow-hidden border-1 transition-all duration-300 hover:shadow  hover:-translate-y-1 relative rounded group cursor-pointer ${isActive ? 'ring-2 ring-indigo-500 border-transparent shadow-indigo-500/20' : ''}`}
    >
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-current opacity-5 rounded-full group-hover:scale-125 transition-transform" />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <span className="text-xs    text-neutral-500 dark:text-neutral-400">{label}</span>
          <p className="text-xl  mt-1 text-neutral-900 dark:text-white">{value}</p>
          {description && <p className="text-xs  mt-1 text-neutral-400 dark:text-neutral-500  ">{description}</p>}
        </div>
        <div className={`p-2 rounded bg-white dark:bg-neutral-900 shadow-sm border border-inherit transition-transform group-hover:rotate-12`}>
          <Icon size={20} className="text-inherit" />
        </div>
      </div>
    </Card>
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
  const [viewMode, setViewMode] = useState('list')
  const [currentTab, setCurrentTab] = useState('grn-requests')
  const [availableItems, setAvailableItems] = useState([])
  const [availableItemsLoading, setAvailableItemsLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleColumns, setVisibleColumns] = useState(null)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
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
      pending: { label: 'Pending Inspection', color: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-200 dark:border-amber-800/50', badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50', iconColor: 'text-amber-500', icon: Clock },
      inspecting: { label: 'QC Review', color: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-200 dark:border-blue-800/50', badge: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50', iconColor: 'text-blue-500', icon: FileCheck },
      awaiting_inventory_approval: { label: 'Awaiting Storage', color: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-200 dark:border-purple-800/50', badge: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50', iconColor: 'text-purple-500', icon: Package },
      approved: { label: 'Completed', color: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-200 dark:border-emerald-800/50', badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50', iconColor: 'text-emerald-500', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'from-rose-500/10 to-rose-500/5', border: 'border-rose-200 dark:border-rose-800/50', badge: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50', iconColor: 'text-rose-500', icon: XCircle },
      sent_back: { label: 'Sent Back', color: 'from-orange-500/10 to-orange-500/5', border: 'border-orange-200 dark:border-orange-800/50', badge: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/50', iconColor: 'text-orange-500', icon: ArrowRight }
    }
    return configs[status] || { label: status, color: 'from-neutral-500/10 to-neutral-500/5', border: 'border-neutral-200 dark:border-neutral-800/50', badge: 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800', iconColor: 'text-neutral-400', icon: Info }
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

    setLoading(true)
    try {
      const approvedItemsWithStorage = approvalItems.map(item => {
        // Find the item in the selectedGRN to get its pre-assigned warehouse
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
                accepted_qty: Number(item.accepted_qty || item.received_qty) || 0,
                rejected_qty: Number(item.rejected_qty) || 0,
                qc_status: item.qc_status || 'pass'
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
            variant="success"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedGRN(grn)
              if (grn.items && grn.items.length > 0) {
                setApprovalItems(grn.items.map(item => ({
                  id: item.id,
                  accepted_qty: Number(item.accepted_qty || item.received_qty) || 0,
                  rejected_qty: Number(item.rejected_qty) || 0,
                  qc_status: item.qc_status || 'pass'
                })))
              }
              setShowApprovalForm(true)
            }}
            className="flex items-center gap-2 text-[10px] py-1 px-2 w-fit justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-none transition-all hover:scale-[1.02]"
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

    return (
      <div className="flex items-center gap-1">
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleViewGRN(grn.grn_no)
          }}
          className="flex items-center gap-2 text-[10px] py-1 px-2 w-fit justify-center bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-all hover:scale-[1.02]"
        >
          <Eye size={12} /> View Details
        </Button>
        {grn.status === 'approved' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              window.print()
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
          >
            <Printer size={14} />
          </Button>
        )}
      </div>
    )
  }

  const getStatusBadge = (status) => {
    const config = getStatusConfig(status)
    const Icon = config.icon
    return (
      <Badge variant="solid" className={`flex items-center gap-1.5 text-xs   py-1 px-2.5 rounded  ${config.badge}`}>
        <Icon size={12} />
        {config.label}
      </Badge>
    )
  }

  const availableItemsColumns = [
    {
      key: 'item_details',
      label: 'Item Details',
      render: (_, row) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm  text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
            {row.item_code}
          </span>
          <span className="text-xs  text-neutral-400 dark:text-neutral-500   truncate max-w-[200px]">
            {row.item_name}
          </span>
        </div>
      )
    },
    {
      key: 'current_qty',
      label: 'Stock Level',
      render: (value) => (
        <div className="inline-flex flex-col items-center justify-center min-w-[80px] p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
          <span className="text-xs  text-emerald-600 dark:text-emerald-400 leading-none">{(parseFloat(value) || 0).toLocaleString()}</span>
          <span className="text-xs  text-emerald-500/70   mt-1">Available</span>
        </div>
      )
    },
    {
      key: 'reserved_qty',
      label: 'Reserved',
      render: (value) => (
        <div className="flex flex-col text-right pr-4">
          <span className="text-xs  text-neutral-600 dark:text-neutral-400">
            {(parseFloat(value) || 0).toLocaleString()}
          </span>
          <span className="text-xs  text-neutral-400  ">Locked</span>
        </div>
      )
    },
    {
      key: 'valuation_rate',
      label: 'Valuation',
      render: (value) => (
        <div className="flex flex-col text-right">
          <span className="text-sm  text-neutral-900 dark:text-white tracking-tight">
            ₹{(parseFloat(value) || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-xs  text-neutral-400 dark:text-neutral-500  ">Per Unit</span>
        </div>
      )
    },
    {
      key: 'total_value',
      label: 'Total Value',
      render: (_, row) => {
        const total = (parseFloat(row.current_qty) || 0) * (parseFloat(row.valuation_rate) || 0)
        return (
          <div className="flex flex-col text-right">
            <span className="text-sm  text-indigo-600 dark:text-indigo-400 tracking-tight">
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs  text-neutral-400 dark:text-neutral-500  ">Inv. Value</span>
          </div>
        )
      }
    },
    {
      key: 'warehouse_name',
      label: 'Location',
      render: (value) => (
        <div className="flex items-center gap-2 text-xs  text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded  border border-neutral-200 dark:border-neutral-700  ">
          <MapPin size={12} className="text-indigo-500" />
          {value || 'Unassigned'}
        </div>
      )
    },
    {
      key: 'last_receipt_date',
      label: 'Last Update',
      render: (value) => value ? (
        <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 text-xs   ">
          <History size={14} className="text-neutral-300 dark:text-neutral-700" />
          {new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      ) : '-'
    }
  ]

  const columns = [
    {
      key: 'grn_no',
      label: 'GRN Number',
      render: (value, row) => (
        <div className="flex flex-col">
          <span className=" text-neutral-900 dark:text-neutral-100">{row.grn_no}</span>
          <span className="text-xs text-neutral-400  ">PO: {row.po_no}</span>
        </div>
      )
    },
    {
      key: 'supplier_name',
      label: 'Supplier',
      render: (value, row) => (
        <div className="flex items-center gap-2 text-neutral-600 font-medium">
          <Building2 size={14} className="text-neutral-400" />
          {row.supplier_name}
        </div>
      )
    },
    {
      key: 'receipt_date',
      label: 'Receipt Date',
      render: (value, row) => (
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs ">
          <Calendar size={14} className="text-neutral-400" />
          {new Date(row.receipt_date).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => getStatusBadge(row.status)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-neutral-800 mb-4  ">
            <Package size={32} className="text-blue-500 animate-pulse" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading Goods Receipts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-2 transition-colors duration-300 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Modern Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white dark:bg-neutral-900   dark:border-neutral-800 ">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Truck size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs  text-indigo-600 dark:text-indigo-400  ">
                <span>Buying</span>
                <ChevronRight size={12} />
                <span>Procurement</span>
              </div>
              <h1 className="text-xl  text-neutral-900 dark:text-white ">Purchase Receipts</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Process material receipts and quality inspections</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-neutral-800 p-1 rounded border border-slate-200 dark:border-neutral-700 ">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 p-2 rounded text-xs   transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-indigo-600'
                }`}
              >
                <LayoutGrid size={14} />
                KANBAN
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 p-2 rounded text-xs   transition-all ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-md ring-1 ring-black/5' 
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-indigo-600'
                }`}
              >
                <List size={14} />
                LIST
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>
            
            <button 
              onClick={fetchGRNRequests}
              className="p-3 bg-white dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded border border-slate-200 dark:border-neutral-700 transition-all hover:shadow-md active:scale-95"
              title="Refresh Data"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            
            <Button 
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-none p-2 rounded shadow-indigo-600/20 transition-all active:scale-95 "
            >
              <Plus size={15} strokeWidth={3} /> 
              CREATE GRN
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {currentTab === 'grn-requests' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <StatCard
              label="Total Receipts"
              value={stats.total}
              icon={ClipboardList}
              color="indigo"
              onClick={() => setActiveFilter('')}
              isActive={activeFilter === ''}
              description="Total processing requests"
            />
            <StatCard
              label="Pending QC"
              value={stats.pending}
              icon={Clock}
              color="warning"
              onClick={() => setActiveFilter('pending')}
              isActive={activeFilter === 'pending'}
              description="Awaiting initial check"
            />
            <StatCard
              label="QC Review"
              value={stats.inspecting}
              icon={ShieldCheck}
              color="info"
              onClick={() => setActiveFilter('inspecting')}
              isActive={activeFilter === 'inspecting'}
              description="Quality check in progress"
            />
            <StatCard
              label="Awaiting Storage"
              value={stats.awaiting}
              icon={Package}
              color="primary"
              onClick={() => setActiveFilter('awaiting_inventory_approval')}
              isActive={activeFilter === 'awaiting_inventory_approval'}
              description="Pending warehouse entry"
            />
            <StatCard
              label="Completed"
              value={stats.approved}
              icon={CheckCircle}
              color="success"
              onClick={() => setActiveFilter('approved')}
              isActive={activeFilter === 'approved'}
              description="Successfully stored"
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color="danger"
              onClick={() => setActiveFilter('rejected')}
              isActive={activeFilter === 'rejected'}
              description="Failed quality criteria"
            />
          </div>
        )}

        {/* Improved Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-white dark:bg-neutral-900 rounded w-fit">
          <button
            onClick={() => setCurrentTab('grn-requests')}
            className={`flex items-center gap-2 p-2 rounded text-xs   transition-all ${
              currentTab === 'grn-requests'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardCheck size={16} />
            GRN Request
          </button>
          <button
            onClick={() => {
              setCurrentTab('available-items')
              fetchAvailableItems()
            }}
            className={`flex items-center gap-2 p-2 rounded text-xs   transition-all ${
              currentTab === 'available-items'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes size={16} />
            Available Stocks
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <Alert type="danger" className="rounded-2xl border-2 animate-in fade-in slide-in-from-top-4 duration-300">
            {error}
          </Alert>
        )}
        {success && (
          <Alert type="success" className="rounded-2xl border-2 animate-in fade-in slide-in-from-top-4 duration-300">
            {success}
          </Alert>
        )}

        {/* Main Content Area */}
        {currentTab === 'grn-requests' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="relative flex-1 group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Search by GRN #, PO #, or Supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all dark:text-white"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded">
                  <Filter size={14} className="text-slate-400" />
                  <span className="text-xs  text-neutral-500 dark:text-neutral-400  ">Status:</span>
                  <select 
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="bg-transparent text-xs border-0 text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer px-2"
                  >
                    <option value="">ALL STATUS</option>
                    <option value="pending">PENDING</option>
                    <option value="inspecting">QC REVIEW</option>
                    <option value="awaiting_inventory_approval">AWAITING STORAGE</option>
                    <option value="approved">COMPLETED</option>
                    <option value="rejected">REJECTED</option>
                    <option value="sent_back">SENT BACK</option>
                  </select>
                </div>

                <div className="relative">
                  <Button
                    variant="secondary"
                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                    className="flex items-center gap-2 p-2 rounded border-2 dark:bg-neutral-800 dark:border-neutral-700 dark:text-slate-400"
                  >
                    <Settings2 size={15} />
                  </Button>

                  {showColumnMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded border border-slate-200 dark:border-neutral-700 shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-xs  text-slate-400  ">Display Columns</span>
                        <button onClick={() => setShowColumnMenu(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                      </div>
                      <div className="space-y-1">
                        {columns.map(col => (
                          <label key={col.key} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded  cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={visibleColumns?.has(col.key) ?? true}
                              onChange={() => {
                                const newSet = new Set(visibleColumns || columns.map(c => c.key))
                                if (newSet.has(col.key)) newSet.delete(col.key)
                                else newSet.add(col.key)
                                setVisibleColumns(newSet)
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs  text-slate-700 dark:text-slate-300">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Views */}
            {viewMode === 'kanban' ? (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-start">
                {kanbanColumns.map((column) => {
                  const columnGrns = filteredGRNs.filter(g => g.status === column.status)
                  const config = getStatusConfig(column.status)
                  const Icon = column.icon

                  return (
                    <div key={column.status} className="flex flex-col gap-4">
                      <div className={`flex items-center justify-between p-3 rounded  bg-white border border-slate-200   border-b-4 ${config.border.replace('border-', 'border-b-')}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded  ${config.badge.split(' ')[0]} ${config.badge.split(' ')[1]} flex items-center justify-center`}>
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
                                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow  hover:border-indigo-200 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300 relative overflow-hidden"
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
                                  <Badge variant="solid" className={`text-[9px]   py-0.5 px-2 rounded  ${config.badge}`}>
                                    {config.label}
                                  </Badge>
                                </div>

                                <div className="space-y-3 mb-5">
                                  <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                                    <Building2 size={14} className="text-slate-400" />
                                    {grn.supplier_name}
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500 text-[11px] ">
                                    <Calendar size={14} className="text-slate-400" />
                                    {new Date(grn.receipt_date).toLocaleDateString()}
                                  </div>
                                </div>

                                <div className="bg-slate-50 rounded  p-3 mb-5">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs  text-slate-400 ">Items Status</span>
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
                                  <div className="flex justify-between mt-2 text-[9px]">
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
                  hideColumnToggle
                  externalVisibleColumns={visibleColumns}
                />
              </div>
            )}
          </div>
        )}

        {/* Available Items Section */}
        {currentTab === 'available-items' && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl  text-neutral-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Boxes size={24} />
                  </div>
                  Available Stock Balance
                </h2>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Real-time inventory levels across all warehouses</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm  text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded border border-indigo-100 dark:border-indigo-500/20">
                  {availableItems.length} Unique Items
                </div>
                <button 
                  onClick={fetchAvailableItems}
                  className="p-2.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-neutral-800 rounded transition-all border border-transparent hover:border-indigo-100 dark:hover:border-neutral-700"
                  title="Refresh Stock"
                >
                  <RefreshCw size={20} className={availableItemsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            
            <div className="p-0">
              {availableItemsLoading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium">Updating Stock Data...</p>
                </div>
              ) : availableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <Database size={48} className="text-neutral-300 dark:text-neutral-600" />
                  </div>
                  <h3 className="text-xl  text-neutral-900 dark:text-white mb-2">Inventory Empty</h3>
                  <p className="text-neutral-500 dark:text-neutral-400 font-medium">No items currently available in stock.</p>
                </div>
              ) : (
                <DataTable 
                  columns={availableItemsColumns} 
                  data={availableItems} 
                  hideColumnToggle
                />
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
            {selectedGRN?.status === 'approved' && (
              <Button
                variant="secondary"
                className="px-6 flex items-center gap-2"
                onClick={() => window.print()}
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
            </div>
          </div>
        }
      >
        {selectedGRN && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded  bg-white   flex items-center justify-center text-indigo-600">
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
              <div className="bg-white p-2 rounded-2xl border border-slate-100  ">
                <p className="text-xs  text-slate-400  leading-none mb-2">PO Reference</p>
                <p className="text-base  text-slate-900 flex items-center gap-2">
                  <Truck size={16} className="text-indigo-500" />
                  {selectedGRN.po_no}
                </p>
              </div>
              <div className="bg-white p-2 rounded-2xl border border-slate-100  ">
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
                  <p className="text-sm  text-rose-700">{selectedGRN.rejection_reason}</p>
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
                      <th className="p-2 ">Item</th>
                      <th className="p-2  text-right">Received Qty</th>
                      <th className="p-2 ">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(selectedGRN.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 ">
                          <div className=" text-slate-900 text-xs">{item.item_code}</div>
                          <div className="text-xs text-slate-400 font-medium">{item.item_name}</div>
                        </td>
                        <td className="p-2  text-right  text-slate-700 text-xs">
                          {item.received_qty}
                        </td>
                        <td className="p-2  text-slate-500 text-xs font-medium">{item.unit}</td>
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
              className={`${selectedGRN?.status === 'inspecting' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white border-none px-6`}
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
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
              <AlertCircle className="text-amber-500 shrink-0" size={20} />
              <div className="text-xs  text-amber-700  leading-none mt-1">
                Quantity Review & Storage Assignment
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck size={14} className="text-indigo-500" />
                Material Receipt & Storage Assignment
              </h4>
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="p-2  min-w-[180px]">Item Details</th>
                        <th className="px-2 py-3 text-center w-20">Recv.</th>
                        <th className="px-2 py-3 text-center w-24">Accept</th>
                        <th className="px-2 py-3 text-center w-24">Reject</th>
                        <th className="px-2 py-3 text-center w-28">QC Status</th>
                        <th className="px-2 py-3 w-32">Warehouse</th>
                        <th className="px-2 py-3 w-32">Bin/Rack</th>
                        <th className="px-2 py-3 w-32">Batch #</th>
                        <th className="p-2  text-right w-32">Rate (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                      {(selectedGRN.items || []).map((item, idx) => {
                        const approvalItem = approvalItems.find(ai => ai.id === item.id) || {}
                        const storage = storageData[item.id] || {}
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-2 ">
                              <div className="font-bold text-slate-900">{item.item_code}</div>
                              <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{item.item_name}</div>
                            </td>
                            <td className="px-2 py-3 text-center font-bold text-slate-700 bg-slate-50/30">
                              {item.received_qty}
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                max={item.received_qty}
                                value={approvalItem.accepted_qty || 0}
                                onChange={(e) => handleApprovalItemChange(item.id, 'accepted_qty', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-center font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="number"
                                min="0"
                                max={item.received_qty}
                                value={approvalItem.rejected_qty || 0}
                                onChange={(e) => handleApprovalItemChange(item.id, 'rejected_qty', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-center font-bold text-rose-500 focus:ring-2 focus:ring-rose-500 outline-none"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <select
                                value={approvalItem.qc_status || 'pass'}
                                onChange={(e) => handleApprovalItemChange(item.id, 'qc_status', e.target.value)}
                                className={`w-full px-2 py-1.5 border rounded text-[10px] font-bold outline-none cursor-pointer transition-colors ${
                                  approvalItem.qc_status === 'fail' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                                  approvalItem.qc_status === 'rework' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                  'bg-emerald-50 border-emerald-200 text-emerald-600'
                                }`}
                              >
                                <option value="pass">PASS</option>
                                <option value="fail">FAIL</option>
                                <option value="rework">REWORK</option>
                              </select>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 w-fit text-[10px] font-bold">
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
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <input
                                type="text"
                                placeholder="Batch #"
                                value={storage.batch_no || item.batch_no || ''}
                                onChange={(e) => handleStorageDataChange(item.id, 'batch_no', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="p-2  text-right">
                              <input
                                type="number"
                                placeholder="0.00"
                                value={storage.valuation_rate || ''}
                                onChange={(e) => handleStorageDataChange(item.id, 'valuation_rate', e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-right font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
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
