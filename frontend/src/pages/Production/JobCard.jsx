import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus, Edit2, Trash2, Eye, ChevronDown, ChevronRight, Zap, Trash,
  ClipboardList, Search, Filter, Calendar, Activity, CheckCircle2, Package, X,
  FileText, TrendingUp, Layers, Truck
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import CreateJobCardModal from '../../components/Production/CreateJobCardModal'
import ViewJobCardModal from '../../components/Production/ViewJobCardModal'
import SubcontractDispatchModal from '../../components/Production/SubcontractDispatchModal'
import SubcontractReceiptModal from '../../components/Production/SubcontractReceiptModal'
import { useToast } from '../../components/ToastContainer'
import DataTable from '../../components/Table/DataTable'

export default function JobCard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  
  // State management
  const [jobCards, setJobCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState({
    totalJobs: 0,
    inProgress: 0,
    completed: 0,
    efficiency: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    day: '',
    month: '',
    year: ''
  })

  // Modal and editing state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [preSelectedWorkOrderId, setPreSelectedWorkOrderId] = useState(null)
  const [viewingJobCardId, setViewingJobCardId] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [inlineEditingId, setInlineEditingId] = useState(null)
  const [inlineEditData, setInlineEditData] = useState({})
  
  // Master data state
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])

  // Subcontracting state
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchingJobCard, setDispatchingJobCard] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receivingJobCard, setReceivingJobCard] = useState(null)

  // 1. Core Data Fetching
  const fetchData = useCallback(async () => {
    try {
      const [wsRes, empRes, opsRes] = await Promise.all([
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList()
      ])
      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
      setOperations(opsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations/operators/operations:', err)
    }
  }, [])

  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await productionService.getJobCards(filters)
      const cards = response.data || []
      setJobCards(cards)

      const inProgress = cards.filter(jc => (jc.status || '').toLowerCase() === 'in-progress' || (jc.status || '').toLowerCase() === 'in_progress').length
      const completed = cards.filter(jc => (jc.status || '').toLowerCase() === 'completed').length
      const total = cards.length

      setStats({
        totalJobs: total,
        inProgress: inProgress,
        completed: completed,
        efficiency: total > 0 ? Math.round((completed / total) * 100) : 0
      })
    } catch (err) {
      toast.addToast(err.message || 'Failed to fetch job cards', 'error')
      setJobCards([])
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  // 2. Event Handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleDelete = useCallback(async (jobCardId) => {
    if (window.confirm('Delete this job card?')) {
      try {
        await productionService.deleteJobCard(jobCardId)
        toast.addToast('Job card deleted successfully', 'success')
        fetchJobCards()
      } catch (err) {
        toast.addToast(err.message || 'Failed to delete job card', 'error')
      }
    }
  }, [fetchJobCards, toast])

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL job cards. Are you sure?')) return
    try {
      setLoading(true)
      await productionService.truncateJobCards()
      toast.addToast('All job cards truncated successfully', 'success')
      fetchJobCards()
    } catch (err) {
      toast.addToast(err.message || 'Failed to truncate job cards', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 3. Inline Editing Handlers
  const handleInlineEdit = useCallback((card) => {
    setInlineEditingId(card.job_card_id)
    setInlineEditData({
      operation: card.operation || '',
      planned_quantity: parseFloat(card.planned_quantity) || 0,
      produced_quantity: parseFloat(card.produced_quantity) || 0,
      machine_id: card.machine_id || '',
      operator_id: card.operator_id || '',
      status: card.status || 'draft',
      scheduled_start_date: card.scheduled_start_date ? card.scheduled_start_date.split('T')[0] : '',
      scheduled_end_date: card.scheduled_end_date ? card.scheduled_end_date.split('T')[0] : ''
    })
  }, [])

  const handleInlineInputChange = (field, value) => {
    setInlineEditData(prev => ({ ...prev, [field]: value }))
  }

  const handleInlineSave = useCallback(async (jobCardId) => {
    try {
      const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
      const statusChanged = currentCard && (currentCard.status !== inlineEditData.status)

      const updateData = { ...inlineEditData }
      if (!statusChanged) {
        delete updateData.status
      }

      await productionService.updateJobCard(jobCardId, updateData)

      if (statusChanged) {
        await productionService.updateJobCardStatus(jobCardId, inlineEditData.status)
      }

      toast.addToast('Job card updated successfully', 'success')
      setInlineEditingId(null)
      setInlineEditData({})
      fetchJobCards()
    } catch (err) {
      toast.addToast(err.message || 'Failed to update job card', 'error')
    }
  }, [jobCards, inlineEditData, fetchJobCards, toast])

  const handleInlineCancel = useCallback(() => {
    setInlineEditingId(null)
    setInlineEditData({})
  }, [])

  // 4. Operation Handlers
  const canStartJobCard = useCallback((jobCardId) => {
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { canStart: false, reason: 'Job card not found' }

    const currentStatus = (currentCard.status || '').toLowerCase()
    if (!['draft', 'ready', 'pending'].includes(currentStatus)) {
      return { canStart: false, reason: 'Only draft, ready or pending job cards can be started' }
    }

    return { canStart: true }
  }, [jobCards])

  const handleStartJobCard = useCallback(async (jobCardId) => {
    try {
      const { canStart, reason } = canStartJobCard(jobCardId)

      if (!canStart) {
        toast.addToast(reason, 'error')
        return
      }

      setLoading(true)
      await productionService.updateJobCard(jobCardId, { status: 'in-progress' })
      toast.addToast('Job card started. Redirecting to production entry...', 'success')
      
      setTimeout(() => {
        navigate(`/manufacturing/job-cards/${jobCardId}/production-entry`)
      }, 500)
    } catch (err) {
      toast.addToast(err.message || 'Failed to start job card', 'error')
      setLoading(false)
    }
  }, [canStartJobCard, navigate, toast])

  const handleViewJobCard = useCallback((jobCardId) => {
    setViewingJobCardId(jobCardId)
    setShowViewModal(true)
  }, [])

  const handleDispatch = useCallback((card) => {
    setDispatchingJobCard(card)
    setShowDispatchModal(true)
  }, [])

  const handleDispatchSuccess = useCallback(() => {
    fetchJobCards()
  }, [fetchJobCards])

  const handleOpenReceiptModal = useCallback((card) => {
    setReceivingJobCard(card)
    setShowReceiptModal(true)
  }, [])

  const handleReceiptSuccess = useCallback(() => {
    fetchJobCards()
  }, [fetchJobCards])

  // 5. Helper Functions
  const getOperatorName = (operatorId) => {
    const operator = operators.find(op => op.employee_id === operatorId)
    return operator ? `${operator.first_name} ${operator.last_name}` : 'Unassigned'
  }

  const getWorkstationName = (wsId) => {
    const ws = workstations.find(w => w.name === wsId)
    return ws ? (ws.workstation_name || ws.name) : 'N/A'
  }

  const formatQuantity = (qty) => {
    return typeof qty === 'number' ? qty.toFixed(2) : parseFloat(qty || 0).toFixed(2)
  }

  const getWorkstationOptions = () => workstations.map(ws => ({
    value: ws.name,
    label: ws.workstation_name || ws.name
  }))

  const getOperatorOptions = () => operators.map(op => ({
    value: op.employee_id,
    label: `${op.first_name} ${op.last_name}`
  }))

  const getOperationOptions = () => operations.map(op => ({
    value: op.name || op.operation_name,
    label: op.operation_name || op.name
  }))

  // 6. UI Components
  const StatusBadge = ({ status }) => {
    const configs = {
      draft: { color: 'text-slate-600 ', icon: FileText, label: 'Draft' },
      ready: { color: 'text-blue-600  ', icon: Zap, label: 'Ready' },
      planned: { color: 'text-indigo-600  ', icon: Calendar, label: 'Planned' },
      'in-progress': { color: 'text-amber-600 ', icon: Activity, label: 'In-Progress' },
      in_progress: { color: 'text-amber-600 ', icon: Activity, label: 'In-Progress' },
      completed: { color: 'text-emerald-600 ', icon: CheckCircle2, label: 'Completed' },
      cancelled: { color: 'text-rose-600 ', icon: X, label: 'Cancelled' }
    }
    const normalized = (status || 'draft').toLowerCase()
    const s = normalized.replace('_', '-')
    const config = configs[normalized] || configs[s] || configs.draft
    const Icon = config.icon

    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
        <Icon size={12} className="stroke-[2.5]" />
        {config.label || status}
      </span>
    )
  }

  const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      amber: 'text-amber-600 ',
      rose: 'text-rose-600 bg-rose-50 border-rose-100',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      violet: 'text-violet-600 bg-violet-50 border-violet-100'
    }

    return (
      <div className="bg-slate-50/50 p-2 rounded border border-gray-100 hover:transition-all group relative">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-50 group-hover:scale-110 transition-transform" />
        <div className="relative flex justify-between items-start">
          <div className="">
            <p className="text-xs text-gray-400">{label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl text-gray-900">{value}</h3>
              {trend && (
                <span className={`text-xs ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded ${colorMap[color] || colorMap.blue} group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    )
  }

  // 7. Table Configuration
  const renderActions = useCallback((card) => {
    const isEditing = inlineEditingId === card.job_card_id

    if (isEditing) {
      return (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleInlineSave(card.job_card_id)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all"
            title="Save"
          >
            <CheckCircle2 size={16} />
          </button>
          <button
            onClick={handleInlineCancel}
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => handleViewJobCard(card.job_card_id)}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
          title="View Intelligence"
        >
          <Eye size={14} />
        </button>

        {card.execution_mode === 'OUTSOURCE' && (
          <>
            <button
              onClick={() => handleDispatch(card)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
              title="Vendor Dispatch"
            >
              <Truck size={14} />
            </button>
            <button
              onClick={() => handleOpenReceiptModal(card)}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
              title="Vendor Receipt"
            >
              <Package size={14} />
            </button>
          </>
        )}

        {(card.status || '').toLowerCase() === 'ready' && card.execution_mode !== 'OUTSOURCE' && (
          <button
            onClick={() => handleStartJobCard(card.job_card_id)}
            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all"
            title="Start Operation"
          >
            <Zap size={14} className="fill-current" />
          </button>
        )}
        {(card.status || '').toLowerCase() === 'in-progress' && (
          <button
            onClick={() => navigate(`/manufacturing/job-cards/${card.job_card_id}/production-entry`)}
            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-all"
            title="Production Entry"
          >
            <Zap size={14} className="fill-current" />
          </button>
        )}
        <button
          onClick={() => handleInlineEdit(card)}
          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
          title="Quick Edit"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => handleDelete(card.job_card_id)}
          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
          title="Remove Entry"
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }, [inlineEditingId, handleInlineSave, handleInlineCancel, handleViewJobCard, navigate, handleInlineEdit, handleDelete, handleStartJobCard, handleDispatch, handleOpenReceiptModal])

  const columns = useMemo(() => [
    {
      key: 'operation',
      label: 'Operation',
      render: (val, row) => {
        const isEditing = inlineEditingId === row.job_card_id
        if (isEditing) {
          return (
            <div className="flex flex-col gap-1">
              <select
                value={inlineEditData.operation}
                onChange={(e) => handleInlineInputChange('operation', e.target.value)}
                className="text-xs border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select Operation</option>
                {getOperationOptions().map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 ">{row.item_name || 'Generic Item'}</span>
            </div>
          )
        }
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900">{val}</span>
            <span className="text-[10px] text-gray-400 ">{row.item_name || 'Generic Item'}</span>
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => {
        const isEditing = inlineEditingId === row.job_card_id
        if (isEditing) {
          return (
            <select
              value={inlineEditData.status}
              onChange={(e) => handleInlineInputChange('status', e.target.value)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {['draft', 'ready', 'pending', 'in-progress', 'hold', 'completed', 'cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          )
        }
        return <StatusBadge status={val} />
      }
    },
    {
      key: 'planned_quantity',
      label: 'Qty To Manufacture',
      render: (val, row) => {
        const isEditing = inlineEditingId === row.job_card_id
        if (isEditing) {
          return (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inlineEditData.planned_quantity}
                onChange={(e) => handleInlineInputChange('planned_quantity', e.target.value)}
                className="w-16 text-xs border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-gray-400">units</span>
            </div>
          )
        }
        return (
          <div className="flex items-baseline gap-1">
            <span className="text-xs  text-gray-900">{formatQuantity(val)}</span>
            <span className="text-[10px] text-gray-400">units</span>
          </div>
        )
      }
    },
    {
      key: 'work_order_id',
      label: 'Work Order',
      render: (val) => {
        const parts = (val || '').split('-')
        const displayId = parts.length > 3 ? `${parts[0]}-${parts[1]}-..-${parts[parts.length-1]}` : val
        return (
          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100" title={val}>
            {displayId}
          </span>
        )
      }
    },
    {
      key: 'machine_name',
      label: 'Workstation',
      render: (val, row) => {
        const isEditing = inlineEditingId === row.job_card_id
        if (isEditing) {
          return (
            <select
              value={inlineEditData.machine_id}
              onChange={(e) => handleInlineInputChange('machine_id', e.target.value)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 w-full"
            >
              <option value="">Select Workstation</option>
              {getWorkstationOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )
        }
        return (
          <span className="text-xs text-gray-700">{getWorkstationName(row.machine_id) || val || 'N/A'}</span>
        )
      }
    },
    {
      key: 'operator_name',
      label: 'Assignee',
      render: (val, row) => {
        const isEditing = inlineEditingId === row.job_card_id
        if (isEditing) {
          return (
            <select
              value={inlineEditData.operator_id}
              onChange={(e) => handleInlineInputChange('operator_id', e.target.value)}
              className="text-xs border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 w-full"
            >
              <option value="">Select Operator</option>
              {getOperatorOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )
        }
        return (
          <span className="text-xs text-gray-700">{getOperatorName(row.operator_id) || val || 'Unassigned'}</span>
        )
      }
    },
    {
      key: 'job_card_id',
      label: 'ID',
      render: (val) => {
        const parts = (val || '').split('-')
        const displayId = parts.length > 3 ? `${parts[0]}-${parts[1]}-..-${parts[parts.length-1]}` : val
        return (
          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100" title={val}>
            {displayId}
          </span>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => renderActions(row)
    }
  ], [renderActions, inlineEditingId, inlineEditData])

  // 8. Lifecycle Effects
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchJobCards()
  }, [fetchJobCards])

  useEffect(() => {
    const filterWorkOrder = searchParams.get('filter_work_order')
    if (filterWorkOrder) {
      setFilters(prev => ({ ...prev, search: filterWorkOrder }))
    }
  }, [searchParams])

  // 9. Main Render
  return (
    <div className="h-screen bg-[#fbfcfd] p-3 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between h-24">
          <div className="flex items-center gap-2">
            <div className="bg-gray-900 p-2 rounded shadow-gray-200 group transition-all hover:scale-105">
              <ClipboardList className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl text-gray-900">Job Cards</h1>
                <span className="bg-indigo-50 text-indigo-600 rounded text-xs p-1 border border-indigo-100">
                  Live Operations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Manufacturing Intelligence</span>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="text-xs text-indigo-500">Operational Controls</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end mr-6 border-r border-gray-100 pr-6">
              <p className="text-xs text-gray-400 mb-1">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded animate-pulse" />
                <span className="text-xs text-gray-900">
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
            <button
              onClick={handleTruncate}
              className="group flex items-center gap-2 p-2 py-2 text-rose-600 hover:bg-rose-50 rounded transition-all duration-300"
            >
              <Trash size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="text-xs">Reset Queue</span>
            </button>
            <button
              onClick={() => { setEditingId(null); setPreSelectedWorkOrderId(null); setShowModal(true) }}
              className="flex items-center gap-1 p-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-all duration-300 shadow-gray-200 active:scale-95"
            >
              <Plus size={10} className="stroke-[3]" />
              <span className="text-xs">Create Job Card</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-3 flex-shrink-0">
          <StatCard
            label="Total Operations"
            value={stats.totalJobs}
            icon={Layers}
            color="indigo"
            subtitle="Active Work Orders"
          />
          <StatCard
            label="In Production"
            value={stats.inProgress}
            icon={Activity}
            color="amber"
            subtitle="Current Throughput"
            trend={12}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            color="emerald"
            subtitle="Finalized Today"
            trend={5}
          />
          <StatCard
            label="Completion Rate"
            value={`${stats.efficiency}%`}
            icon={TrendingUp}
            color="violet"
            subtitle="Work Order Progress"
          />
        </div>

        {/* Filters */}
        <div className="my-3 flex flex-col md:flex-row items-center gap-6 flex-shrink-0">
          <div className="flex-1 relative w-full group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            </div>
            <input
              type="text"
              name="search"
              placeholder="Search by Work Order ID or Item name..."
              value={filters.search}
              onChange={handleFilterChange}
              className="w-full pl-16 pr-8 p-2 bg-white border border-gray-100 rounded text-xs text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative min-w-[240px] group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Filter className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              </div>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full pl-14 pr-12 py-2 bg-white border border-gray-100 rounded text-xs text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">All Operational States</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Production</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-gray-100">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 text-xl text-gray-900">Syncing Production Queue</h3>
            <p className="mt-2 text-sm text-gray-400">Retrieving live operational data...</p>
          </div>
        ) : jobCards.length > 0 ? (
          <div className="flex-1 overflow-auto border border-gray-100 bg-white rounded-xl shadow-sm">
            <DataTable
              data={jobCards}
              columns={columns}
              loading={loading}
              searchable={false}
              pagination={true}
            />
          </div>
        ) : (
          <div className="flex-1 bg-white rounded-[3rem] flex flex-col items-center justify-center p-24 text-center border border-gray-100">
            <div className="w-24 h-24 bg-gray-50 rounded flex items-center justify-center mx-auto mb-8">
              <ClipboardList className="text-gray-300" size={48} />
            </div>
            <h3 className="text-xl text-gray-900 mb-2">Operational Pipeline Empty</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">No job cards were found matching your filters. Create a new work order to begin production tracking.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateJobCardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchJobCards()
          setShowModal(false)
        }}
        editingId={editingId}
        preSelectedWorkOrderId={preSelectedWorkOrderId}
      />

      <ViewJobCardModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        jobCardId={viewingJobCardId}
      />

      <SubcontractDispatchModal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        jobCard={dispatchingJobCard}
        onDispatchSuccess={handleDispatchSuccess}
      />

      <SubcontractReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        jobCard={receivingJobCard}
        onReceiptSuccess={handleReceiptSuccess}
      />
    </div>
  )
}
