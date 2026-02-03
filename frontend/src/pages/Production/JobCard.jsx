import React, { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, Eye, CheckCircle, ChevronDown, ChevronRight, AlertCircle, Zap, Trash,
  ClipboardList, Search, Filter, Calendar, Activity, CheckCircle2, Factory, Clock, Package, MoreVertical, X,
  FileText, TrendingUp, BarChart3, Layers
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import Card from '../../components/Card/Card'
import CreateJobCardModal from '../../components/Production/CreateJobCardModal'
import ViewJobCardModal from '../../components/Production/ViewJobCardModal'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../components/ToastContainer'

export default function JobCard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const [workOrders, setWorkOrders] = useState([])
  const [jobCardsByWO, setJobCardsByWO] = useState({})
  const [expandedWO, setExpandedWO] = useState(null)
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
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [preSelectedWorkOrderId, setPreSelectedWorkOrderId] = useState(null)
  const [viewingJobCardId, setViewingJobCardId] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [inlineEditingId, setInlineEditingId] = useState(null)
  const [inlineEditData, setInlineEditData] = useState({})
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchWorkOrders()
  }, [filters])

  useEffect(() => {
    const filterWorkOrder = searchParams.get('filter_work_order')
    if (filterWorkOrder && workOrders.length > 0) {
      fetchJobCardsForWO(filterWorkOrder, true)
    }
  }, [searchParams, workOrders])

  const fetchData = async () => {
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
  }

  const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      amber: 'text-amber-600 bg-amber-50 border-amber-100',
      rose: 'text-rose-600 bg-rose-50 border-rose-100',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      violet: 'text-violet-600 bg-violet-50 border-violet-100'
    }

    return (
      <div className="bg-slate-50/50 p-2 rounded border border-gray-100  hover:shadow-md transition-all group  relative">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-50 group-hover:scale-110 transition-transform" />
        <div className="relative flex justify-between items-start">
          <div className="">
            <p className="text-xs  text-gray-400 ">{label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl  text-gray-900 ">{value}</h3>
              {trend && (
                <span className={`text-xs  ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs  text-gray-500 ">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 roundedl ${colorMap[color] || colorMap.blue}  group-hover:scale-110 transition-transform`}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    )
  }

  const StatusBadge = ({ status }) => {
    const configs = {
      draft: { color: 'text-slate-600 bg-slate-50 border-slate-100', icon: FileText },
      planned: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Calendar },
      'in-progress': { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Activity },
      completed: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
      cancelled: { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: X }
    }
    const normalized = (status || 'draft').toLowerCase()
    const config = configs[normalized] || configs.draft
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 p-2  py-1 rounded-full text-xs   border ${config.color}`}>
        <Icon size={12} />
        {status}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await productionService.getWorkOrders(filters)
      const orders = response.data || []
      setWorkOrders(orders)

      // Simple stat calculation based on WOs since job cards are nested
      const inProgress = orders.filter(wo => wo.status === 'in-progress').length
      const completed = orders.filter(wo => wo.status === 'completed').length
      const total = orders.length

      setStats({
        totalJobs: total,
        inProgress: inProgress,
        completed: completed,
        efficiency: total > 0 ? Math.round((completed / total) * 100) : 0
      })

      setJobCardsByWO({})
      setExpandedWO(null)
    } catch (err) {
      toast.addToast(err.message || 'Failed to fetch work orders', 'error')
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchJobCardsForWO = async (wo_id, skipToggle = false) => {
    try {
      if (jobCardsByWO[wo_id] && jobCardsByWO[wo_id].length > 0) {
        if (!skipToggle) {
          setExpandedWO(expandedWO === wo_id ? null : wo_id)
        } else {
          setExpandedWO(wo_id)
        }
        return
      }

      // First fetch existing job cards
      const response = await productionService.getJobCards({ work_order_id: wo_id })
      let jobCards = response.data || []

      // If no job cards exist, try to auto-generate them once
      if (jobCards.length === 0) {
        try {
          // This call will create job cards from WO operations or BOM fallback
          const genRes = await productionService.generateJobCardsForWorkOrder(wo_id)
          if (genRes.success || (Array.isArray(genRes.data) && genRes.data.length > 0) || (Array.isArray(genRes.jobCards) && genRes.jobCards.length > 0)) {
            // Re-fetch to get full job card objects with all fields
            const refreshRes = await productionService.getJobCards({ work_order_id: wo_id })
            jobCards = refreshRes.data || []
          }
        } catch (genErr) {
          console.error('Automatic job card generation failed:', genErr)
          // We don't toast error here because it might just mean no operations are defined yet
        }
      }

      setJobCardsByWO(prev => ({
        ...prev,
        [wo_id]: jobCards
      }))
      setExpandedWO(wo_id)
    } catch (err) {
      toast.addToast(err.message || 'Failed to fetch job cards', 'error')
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (job_card_id) => {
    if (window.confirm('Delete this job card?')) {
      try {
        await productionService.deleteJobCard(job_card_id)
        toast.addToast('Job card deleted successfully', 'success')
        fetchWorkOrders()
      } catch (err) {
        toast.addToast(err.message || 'Failed to delete job card', 'error')
      }
    }
  }

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL job cards. Are you sure?')) return
    try {
      setLoading(true)
      await productionService.truncateJobCards()
      toast.addToast('All job cards truncated successfully', 'success')
      fetchWorkOrders()
    } catch (err) {
      toast.addToast(err.message || 'Failed to truncate job cards', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoGenerate = async (woId) => {
    try {
      setLoading(true)
      const response = await productionService.generateJobCardsForWorkOrder(woId)
      if (response.success || (Array.isArray(response.data) && response.data.length > 0) || (Array.isArray(response.jobCards) && response.jobCards.length > 0)) {
        toast.addToast('Job cards generated automatically from BOM', 'success')
        fetchJobCardsForWO(woId, true)
      } else {
        toast.addToast('Could not find operations/BOM for this item to auto-generate', 'warning')
      }
    } catch (err) {
      toast.addToast(err.message || 'Failed to auto-generate job cards', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (card) => {
    setEditingId(card.job_card_id)
    setShowModal(true)
  }



  const handleInlineEdit = (card) => {
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
  }

  const handleInlineInputChange = (field, value) => {
    setInlineEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validatePlannedQuantity = (jobCardId, woId, newPlannedQty) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { valid: true }

    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)
    if (currentCardIndex === 0) return { valid: true }

    const previousCard = jobCards[currentCardIndex - 1]
    const previousProduced = parseFloat(previousCard?.produced_quantity) || 0
    const newPlanned = parseFloat(newPlannedQty) || 0

    if (newPlanned > previousProduced) {
      return {
        valid: false,
        message: `Planned quantity cannot exceed previous task's production. Previous task produced: ${previousProduced.toFixed(2)}, but you set: ${newPlanned.toFixed(2)}`
      }
    }

    return { valid: true }
  }

  const validateProducedQuantity = (jobCardId, woId, newProducedQty) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { valid: true }

    const workOrder = workOrders.find(wo => wo.wo_id === woId)
    if (!workOrder) return { valid: true }

    const plannedTotal = parseFloat(workOrder.quantity || workOrder.qty_to_manufacture || 0)

    const alreadyProduced = jobCards.reduce((sum, card) => {
      if (card.job_card_id === jobCardId) {
        return sum
      }
      return sum + (parseFloat(card.produced_quantity) || 0)
    }, 0)

    const availableProduction = plannedTotal - alreadyProduced
    const newProduced = parseFloat(newProducedQty) || 0

    if (newProduced > availableProduction) {
      return {
        valid: false,
        message: `Cannot produce ${newProduced}. Only ${availableProduction} units remaining. (Total Planned: ${plannedTotal}, Already Produced: ${alreadyProduced})`
      }
    }

    return { valid: true }
  }

  const handleInlineSave = async (jobCardId) => {
    try {
      const currentWO = Array.from(Object.entries(jobCardsByWO)).find(([woId, cards]) =>
        cards.some(c => c.job_card_id === jobCardId)
      )

      if (currentWO) {
        const plannedValidation = validatePlannedQuantity(jobCardId, currentWO[0], inlineEditData.planned_quantity)
        if (!plannedValidation.valid) {
          toast.addToast(plannedValidation.message, 'error')
          return
        }

        const producedValidation = validateProducedQuantity(jobCardId, currentWO[0], inlineEditData.produced_quantity)
        if (!producedValidation.valid) {
          toast.addToast(producedValidation.message, 'error')
          return
        }
      }

      const currentCard = jobCardsByWO[currentWO?.[0]]?.find(c => c.job_card_id === jobCardId)
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
      fetchWorkOrders()
    } catch (err) {
      toast.addToast(err.message || 'Failed to update job card', 'error')
    }
  }

  const handleInlineCancel = () => {
    setInlineEditingId(null)
    setInlineEditData({})
  }

  const handleViewJobCard = (jobCardId) => {
    setViewingJobCardId(jobCardId)
    setShowViewModal(true)
  }

  const getOperatorName = (operatorId) => {
    const operator = operators.find(op => op.employee_id === operatorId)
    return operator ? `${operator.first_name} ${operator.last_name}` : 'Unassigned'
  }

  const getWorkstationName = (wsId) => {
    const ws = workstations.find(w => w.name === wsId)
    return ws ? (ws.workstation_name || ws.name) : 'N/A'
  }

  const canStartJobCard = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)

    if (!currentCard || (currentCard.status || '').toLowerCase() !== 'draft') {
      return { canStart: false, reason: 'Only draft job cards can be started' }
    }

    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)

    if (currentCardIndex === 0) {
      return { canStart: true }
    }

    const previousCard = jobCards[currentCardIndex - 1]
    const prevStatus = (previousCard.status || '').toLowerCase()

    if (prevStatus !== 'completed') {
      return {
        canStart: false,
        reason: `Previous operation must be completed first. Current status: ${prevStatus.toUpperCase()}`
      }
    }

    return { canStart: true }
  }

  const handleStartJobCard = async (jobCardId, woId) => {
    try {
      const { canStart, reason } = canStartJobCard(jobCardId, woId)

      if (!canStart) {
        toast.addToast(reason, 'error')
        return
      }

      setLoading(true)

      await productionService.updateJobCard(jobCardId, { status: 'in-progress' })

      await new Promise(resolve => setTimeout(resolve, 300))

      try {
        const jobCardsResponse = await productionService.getJobCards({ work_order_id: woId })
        setJobCardsByWO(prev => ({
          ...prev,
          [woId]: jobCardsResponse.data || []
        }))
      } catch (err) {
        console.error('Failed to refresh job cards:', err)
      }

      await fetchWorkOrders()

      toast.addToast('Job card started. Redirecting to production entry...', 'success')

      await new Promise(resolve => setTimeout(resolve, 500))
      navigate(`/manufacturing/job-cards/${jobCardId}/production-entry`)
    } catch (err) {
      toast.addToast(err.message || 'Failed to start job card', 'error')
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'status-draft',
      pending: 'status-planned',
      'in-progress': 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      'quality-check': 'status-planned',
      delivered: 'status-completed',
      open: 'status-in-progress'
    }
    return colors[status] || 'status-draft'
  }

  const formatQuantity = (qty) => {
    return typeof qty === 'number' ? qty.toFixed(2) : parseFloat(qty || 0).toFixed(2)
  }

  const getWorkstationOptions = () => {
    return workstations.map(ws => ({
      value: ws.name,
      label: ws.workstation_name || ws.name
    }))
  }

  const getOperatorOptions = () => {
    return operators.map(op => ({
      value: op.employee_id,
      label: `${op.first_name} ${op.last_name}`
    }))
  }

  const getOperationOptions = () => {
    return operations.map(op => ({
      value: op.name || op.operation_name,
      label: op.operation_name || op.name
    }))
  }

  const getStatusWorkflow = () => {
    return {
      'draft': ['in-progress', 'hold', 'completed'],
      'in-progress': ['completed', 'hold'],
      'hold': ['in-progress', 'completed'],
      'completed': ['completed'],
      'open': ['in-progress', 'hold', 'completed'],
      'pending': ['in-progress', 'hold', 'completed'],
      'cancelled': ['cancelled']
    }
  }

  const getAllowedStatuses = (currentStatus) => {
    const workflow = getStatusWorkflow()
    return workflow[(currentStatus || '').toLowerCase()] || []
  }

  const getMaxPlannableQty = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)

    if (currentCardIndex === 0) return Infinity

    const previousCard = jobCards[currentCardIndex - 1]
    return parseFloat(previousCard?.produced_quantity) || 0
  }

  const getMaxProducibleQty = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const workOrder = workOrders.find(wo => wo.wo_id === woId)
    if (!workOrder) return 0

    const plannedTotal = parseFloat(workOrder.quantity || workOrder.qty_to_manufacture || 0)
    const alreadyProduced = jobCards.reduce((sum, card) => {
      if (card.job_card_id === jobCardId) return sum
      return sum + (parseFloat(card.produced_quantity) || 0)
    }, 0)

    return plannedTotal - alreadyProduced
  }

  return (
    <div className="min-h-screen bg-[#fbfcfd] p-3">
      {/* Sticky Modern Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-2">
              <div className=" bg-gray-900 p-2 rounded shadow-lg shadow-gray-200 group transition-all hover:scale-105">
                <ClipboardList className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl  text-gray-900 ">Job Cards</h1>
                  <span className=" bg-indigo-50 text-indigo-600 rounded text-xs p-1  border border-indigo-100">
                    Live Operations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs  text-gray-400 ">Manufacturing Intelligence</span>
                  <ChevronRight size={14} className="text-gray-300" />
                  <span className="text-xs text-indigo-500 ">Operational Controls</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end mr-6 border-r border-gray-100 pr-6">
                <p className="text-xs  text-gray-400  mb-1">System Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded animate-pulse" />
                  <span className="text-xs  text-gray-900 ">
                    {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
              <button
                onClick={handleTruncate}
                className="group flex items-center gap-2 p-2  py-2 text-rose-600 hover:bg-rose-50 rounded  transition-all duration-300"
              >
                <Trash size={18} className="group-hover:rotate-12 transition-transform" />
                <span className="text-xs  ">Reset Queue</span>
              </button>
              <button
                onClick={() => { setEditingId(null); setPreSelectedWorkOrderId(null); setShowModal(true) }}
                className="flex items-center gap-1 p-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-all duration-300  shadow-gray-200 active:scale-95"
              >
                <Plus size={10} className="stroke-[3]" />
                <span className="text-xs  ">Create Job Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className=" ">
        {/* Intelligence Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6   my-3">
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
            label="Efficiency"
            value={`${stats.efficiency}%`}
            icon={TrendingUp}
            color="violet"
            subtitle="Completion Rate"
          />
        </div>

        {/* Search & Intelligence Filters */}
        <div className="  my-3 flex flex-col md:flex-row items-center gap-6">
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
              className="w-full pl-16 pr-8 p-2 bg-white border border-gray-100 rounded text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all "
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
                className="w-full pl-14 pr-12 py-2 bg-white border border-gray-100 rounded text-xs   text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all  appearance-none cursor-pointer"
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-22 bg-white rounded-[3rem] border border-gray-100 ">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Activity className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <h3 className="mt-8 text-xl  text-gray-900 ">Syncing Production Queue</h3>
            <p className="mt-2 text-sm  text-gray-400 ">Retrieving live operational data...</p>
          </div>
        ) : workOrders.length > 0 ? (
          <div className="space-y-6">
            {workOrders.map(wo => {
              const isExpanded = expandedWO === wo.wo_id
              return (
                <div 
                  key={wo.wo_id} 
                  className={`group bg-slate-50/50 rounded border transition-all duration-500  ${
                    isExpanded 
                      ? 'border-indigo-200 shadow-2xl shadow-indigo-100 -translate-y-2' 
                      : 'border-gray-100 hover:border-indigo-100 hover:shadow  hover:shadow-gray-100'
                  }`}
                >
                  <div
                    className={`p-2 cursor-pointer transition-colors ${isExpanded ? 'bg-white' : ''}`}
                    onClick={() => fetchJobCardsForWO(wo.wo_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded flex items-center justify-center transition-all duration-500 ${
                          isExpanded ? 'bg-indigo-600 text-white rotate-6 shadow-lg shadow-indigo-200' : 'bg-gray-50 text-gray-400'
                        }`}>
                          <Package size={14} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs  text-gray-900 ">
                              {wo.item_name || wo.item_code || 'Generic Work Order'}
                              </span>
                            <StatusBadge status={wo.status} />
                          </div>
                          <p className="text-xs  text-gray-500  max-w-[250px] truncate">
                            {wo.wo_id}
                          </p>
                        </div>
                      </div>

                      <div className="hidden xl:grid grid-cols-3 gap-12 items-center flex-1 mx-12">
                        <div>
                          <p className="text-xs  text-gray-400  mb-1.5">Priority Level</p>
                          <span className={`inline-flex items-center p-2  py-1 rounded-full text-xs   border ${
                            wo.priority === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            wo.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {wo.priority}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs  text-gray-400  mb-1.5">Total Quantity</p>
                          <p className="text-xs  text-gray-900 ">
                            {wo.quantity || wo.qty_to_manufacture || 0} <span className="text-xs  text-gray-400">Units</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs  text-gray-400  mb-1.5">Scheduled End</p>
                          <div className="flex items-center gap-2 text-gray-900  ">
                            <Calendar size={14} className="text-indigo-500" />
                            <span>{formatDate(wo.planned_end_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded transition-all duration-500 ${
                          isExpanded ? 'rotate-180 bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 bg-gray-50'
                        }`}>
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-2 animate-in fade-in slide-in-from-top-4 duration-500">
                      {jobCardsByWO[wo.wo_id] && jobCardsByWO[wo.wo_id].length > 0 ? (
                        <div className="rounded border border-gray-100  bg-gray-50/30">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-gray-100/50">
                                <th className="p-2 text-xs  text-gray-500 ">Operational Phase</th>
                                <th className="p-2 text-xs  text-gray-500 ">Assignment</th>
                                <th className="p-2 text-xs  text-gray-500  text-center">Status</th>
                                <th className="p-2 text-xs  text-gray-500  text-right">Metrics</th>
                                <th className="p-2 text-xs  text-gray-500  text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {jobCardsByWO[wo.wo_id].map((card, idx) => (
                                inlineEditingId === card.job_card_id ? (
                                  <tr key={card.job_card_id} className="bg-indigo-50/50 border-y-2 border-indigo-200">
                                    <td colSpan="5" className="p-2 ">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="bg-indigo-600 p-2 rounded  text-white">
                                          <Edit2 size={16} />
                                        </div>
                                        <div>
                                          <h4 className="text-xs  text-gray-900 ">Modify Operational Step</h4>
                                          <p className="text-xs  text-gray-500 ">{card.job_card_id}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Operation</label>
                                          <SearchableSelect
                                            value={inlineEditData.operation}
                                            onChange={(val) => handleInlineInputChange('operation', val)}
                                            options={getOperationOptions()}
                                            placeholder="Select Operation"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Workstation</label>
                                          <SearchableSelect
                                            value={inlineEditData.machine_id}
                                            onChange={(val) => handleInlineInputChange('machine_id', val)}
                                            options={getWorkstationOptions()}
                                            placeholder="Select Workstation"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Status</label>
                                          <select 
                                            value={inlineEditData.status} 
                                            onChange={(e) => handleInlineInputChange('status', e.target.value)} 
                                            className="w-full p-2  bg-white border border-gray-100 rounded  text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all "
                                          >
                                            {(() => {
                                              const currentStatus = (inlineEditData.status || 'draft').toLowerCase()
                                              const allowedStatuses = getAllowedStatuses(currentStatus)
                                              const statusLabels = {
                                                'draft': 'Draft',
                                                'pending': 'Pending',
                                                'in-progress': 'In Progress',
                                                'hold': 'Hold',
                                                'completed': 'Completed',
                                                'cancelled': 'Cancelled',
                                                'open': 'Open'
                                              }
                                              const optionsToShow = [currentStatus, ...allowedStatuses].filter((status, idx, arr) => arr.indexOf(status) === idx)
                                              return optionsToShow.map(status => (
                                                <option key={status} value={status}>{statusLabels[status] || status}</option>
                                              ))
                                            })()}
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Operator</label>
                                          <SearchableSelect
                                            value={inlineEditData.operator_id}
                                            onChange={(val) => handleInlineInputChange('operator_id', val)}
                                            options={getOperatorOptions()}
                                            placeholder="Select Operator"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Planned Qty</label>
                                          {(() => {
                                            const maxPlannableQty = getMaxPlannableQty(card.job_card_id, wo.wo_id)
                                            const isFirstTask = maxPlannableQty === Infinity
                                            return (
                                              <div>
                                                <input
                                                  type="number"
                                                  value={inlineEditData.planned_quantity}
                                                  onChange={(e) => handleInlineInputChange('planned_quantity', e.target.value)}
                                                  step="0.01"
                                                  max={isFirstTask ? undefined : maxPlannableQty}
                                                  className="w-full p-2  bg-white border border-gray-100 rounded  text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all "
                                                />
                                                {!isFirstTask && isFinite(maxPlannableQty) && (
                                                  <p className="text-xs  text-amber-600 mt-1 ml-1">Cap: {maxPlannableQty.toFixed(2)}</p>
                                                )}
                                              </div>
                                            )
                                          })()}
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Produced Qty</label>
                                          {(() => {
                                            const maxProducibleQty = getMaxProducibleQty(card.job_card_id, wo.wo_id)
                                            const isValidProducibleNumber = typeof maxProducibleQty === 'number' && isFinite(maxProducibleQty)
                                            return (
                                              <div>
                                                <input
                                                  type="number"
                                                  value={inlineEditData.produced_quantity}
                                                  onChange={(e) => handleInlineInputChange('produced_quantity', e.target.value)}
                                                  step="0.01"
                                                  max={isValidProducibleNumber ? maxProducibleQty : undefined}
                                                  className="w-full p-2  bg-white border border-gray-100 rounded  text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all "
                                                />
                                                {isValidProducibleNumber && (
                                                  <p className="text-xs  text-emerald-600 mt-1 ml-1">Limit: {maxProducibleQty.toFixed(2)}</p>
                                                )}
                                              </div>
                                            )
                                          })()}
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">Start Date</label>
                                          <input 
                                            type="date" 
                                            value={inlineEditData.scheduled_start_date} 
                                            onChange={(e) => handleInlineInputChange('scheduled_start_date', e.target.value)} 
                                            className="w-full p-2  bg-white border border-gray-100 rounded  text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all "
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-xs  text-gray-400  ml-1">End Date</label>
                                          <input 
                                            type="date" 
                                            value={inlineEditData.scheduled_end_date} 
                                            onChange={(e) => handleInlineInputChange('scheduled_end_date', e.target.value)} 
                                            className="w-full p-2  bg-white border border-gray-100 rounded  text-xs  text-gray-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all "
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-indigo-100">
                                        <button 
                                          className="p-2  text-xs   bg-gray-50 text-gray-500 hover:bg-gray-100 rounded  transition-all"
                                          onClick={handleInlineCancel}
                                        >
                                          Discard
                                        </button>
                                        <button 
                                          className="p-2  text-xs   bg-indigo-600 text-white hover:bg-indigo-700 rounded  transition-all shadow-lg shadow-indigo-100"
                                          onClick={() => handleInlineSave(card.job_card_id)}
                                        >
                                          Commit Changes
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={card.job_card_id} className="group hover:bg-indigo-50/30 transition-colors">
                                    <td className="p-2 ">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded  bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-indigo-600 transition-all">
                                          <Activity size={16} />
                                        </div>
                                        <div>
                                          <p className="text-xs  text-gray-900 ">{card.operation || 'N/A'}</p>
                                          <p className="text-xs  text-gray-400 ">{card.job_card_id}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2 ">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-xs  text-gray-700">
                                          <Factory size={12} className="text-gray-400" />
                                          {getWorkstationName(card.machine_id)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs  text-gray-500">
                                          <Activity size={10} className="text-gray-400" />
                                          {getOperatorName(card.operator_id)}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2  text-center">
                                      <StatusBadge status={card.status} />
                                    </td>
                                    <td className="p-2  text-right">
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs  text-gray-400 ">Efficiency</span>
                                          <span className="text-xs  text-gray-900">
                                            {card.planned_quantity > 0 
                                              ? `${Math.round((card.produced_quantity / card.planned_quantity) * 100)}%` 
                                              : '0%'}
                                          </span>
                                        </div>
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full ">
                                          <div 
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, (card.produced_quantity / (card.planned_quantity || 1)) * 100)}%` }}
                                          />
                                        </div>
                                        <p className="text-xs  text-gray-500">
                                          {formatQuantity(card.produced_quantity)} / {formatQuantity(card.planned_quantity)}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="p-2  text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {(card.status || '').toLowerCase() === 'draft' ? (
                                          <button
                                            className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded  text-xs   transition-all  active:scale-95"
                                            onClick={() => handleStartJobCard(card.job_card_id, wo.wo_id)}
                                            disabled={loading}
                                          >
                                            <Zap size={14} className="fill-current" />
                                            Start
                                          </button>
                                        ) : (
                                          <>
                                            <button 
                                              className="p-2 bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded  transition-all group/btn" 
                                              title="View Intelligence" 
                                              onClick={() => handleViewJobCard(card.job_card_id)}
                                            >
                                              <Eye size={18} className="group-hover/btn:scale-110 transition-transform" />
                                            </button>
                                            {(card.status || '').toLowerCase() === 'in-progress' && (
                                              <button 
                                                className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded  transition-all shadow-lg shadow-indigo-100 group/btn" 
                                                title="Production Entry" 
                                                onClick={() => navigate(`/manufacturing/job-cards/${card.job_card_id}/production-entry`)}
                                              >
                                                <Zap size={18} className="fill-current group-hover/btn:scale-110 transition-transform" />
                                              </button>
                                            )}
                                          </>
                                        )}
                                        <button 
                                          className="p-2 bg-gray-50 text-gray-400 hover:bg-amber-50 hover:text-amber-600 rounded  transition-all" 
                                          title="Quick Edit" 
                                          onClick={() => handleInlineEdit(card)}
                                        >
                                          <Edit2 size={18} />
                                        </button>
                                        <button 
                                          className="p-2 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded  transition-all" 
                                          title="Remove Entry" 
                                          onClick={() => handleDelete(card.job_card_id)}
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-indigo-50/50 rounded p-12 text-center border border-indigo-100">
                          <div className="w-8 h-8 bg-white rounded  flex items-center justify-center mx-auto mb-4 ">
                            <Layers className="text-indigo-400" size={32} />
                          </div>
                          <h4 className="text-xs  text-gray-900  mb-1">No Operations Defined</h4>
                          <p className="text-xs  text-gray-500">Job cards could not be generated because no operations were found in the Work Order or BOM.</p>
                        </div>
                      )}
                    </div>

                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-gray-100 ">
            <div className="w-24 h-24 bg-gray-50 rounded flex items-center justify-center mx-auto mb-8">
              <ClipboardList className="text-gray-300" size={48} />
            </div>
            <h3 className="text-xl   text-gray-900  mb-2">Operational Pipeline Empty</h3>
            <p className="text-sm  text-gray-400  max-w-md mx-auto">No work orders were found matching your filters. Create a new work order to begin production tracking.</p>
          </div>
        )}
      </div>

      <CreateJobCardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchWorkOrders()
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
    </div>
  )
}