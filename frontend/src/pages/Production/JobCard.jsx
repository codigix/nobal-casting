import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus, Edit2, Trash2, Eye, ChevronDown, ChevronRight, Zap, Trash,
  ClipboardList, Search, Filter, Calendar, Activity, CheckCircle2, Package, X,
  FileText, TrendingUp, Layers, Truck
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import CreateJobCardModal from '../../components/Production/CreateJobCardModal'
import EditJobCardModal from '../../components/Production/EditJobCardModal'
import ShipmentJobCardModal from '../../components/Production/ShipmentJobCardModal'
import ViewJobCardModal from '../../components/Production/ViewJobCardModal'
import SubcontractDispatchModal from '../../components/Production/SubcontractDispatchModal'
import SchedulingGanttView from '../../components/Production/SchedulingGanttView'
import ResourceEngagementModal from '../../components/Production/ResourceEngagementModal'
import { useToast } from '../../components/ToastContainer'
import DataTable from '../../components/Table/DataTable'
import SearchableSelect from '../../components/SearchableSelect'
import Modal from '../../components/Modal/Modal'
import Alert from '../../components/Alert/Alert'
import Button from '../../components/Button/Button'
import { AlertTriangle, Calendar as CalendarIcon, Clock, ArrowRight, Bell, Users, Cpu, CheckCircle } from 'lucide-react'

// Helper functions for date handling
const parseUTCDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr);
};

const formatForDateTimeInput = (dateStr) => {
  if (!dateStr) return ''
  let d = new Date(dateStr)

  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    // Treat string from DB as UTC if it lacks timezone info
    const utcDate = new Date(dateStr.replace(' ', 'T') + 'Z')
    if (!isNaN(utcDate.getTime())) {
      d = utcDate
    }
  } else if (dateStr instanceof Date) {
    d = dateStr;
  }

  if (isNaN(d.getTime())) return ''

  // Convert to local time components for datetime-local input
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatToLocalDisplay = (dateStr) => {
  if (!dateStr) return 'N/A'
  let d = new Date(dateStr)

  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    // Treat string from DB as UTC if it lacks timezone info
    const utcDate = new Date(dateStr.replace(' ', 'T') + 'Z')
    if (!isNaN(utcDate.getTime())) {
      d = utcDate
    }
  } else if (dateStr instanceof Date) {
    d = dateStr;
  }

  if (isNaN(d.getTime())) return 'N/A'

  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toUpperCase()
}

const formatScheduleTime = (dateStr) => {
  const d = parseUTCDate(dateStr);
  if (!d || isNaN(d.getTime())) return 'N/A';

  // Format: DD/MM HH:MM AM/PM
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')

  let hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'

  hours = hours % 12
  hours = hours ? hours : 12
  const strHours = String(hours).padStart(2, '0')

  return `${day}/${month} ${strHours}:${minutes}${ampm}`
}

const formatToUTC = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

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
    efficiency: 0,
    allocatedMachines: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    production_plan_id: '',
    day: '',
    month: '',
    year: ''
  })

  // Modal and editing state
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [preSelectedWorkOrderId, setPreSelectedWorkOrderId] = useState(null)
  const [viewingJobCardId, setViewingJobCardId] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  // Pre-selection states
  const [preSelectedMachine, setPreSelectedMachine] = useState(null)
  const [preSelectedStartTime, setPreSelectedStartTime] = useState(null)

  // Master data state
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [vendors, setVendors] = useState([])
  const [operations, setOperations] = useState([])

  // Subcontracting state
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchingJobCard, setDispatchingJobCard] = useState(null)
  const [activeTab, setActiveTab] = useState('list') // 'list' or 'scheduling'

  // Switch tab based on URL search param
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'scheduling') {
      setActiveTab('scheduling')
    } else if (tab === 'list') {
      setActiveTab('list')
    }
  }, [searchParams])

  const [conflictModalData, setConflictModalData] = useState(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [notifyingResourceId, setNotifyingResourceId] = useState(null)

  // 1. Core Data Fetching
  const fetchData = useCallback(async () => {
    try {
      const [wsRes, empRes, opsRes, vendorRes] = await Promise.all([
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList(),
        productionService.getVendors()
      ])
      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
      setOperations(opsRes.data || [])
      setVendors(vendorRes.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations/operators/operations/vendors:', err)
    }
  }, [])

  const fetchJobCards = useCallback(async () => {
    try {
      setLoading(true)
      const response = await productionService.getJobCards(filters)
      let cards = response.data || []

      // We rely on the backend sort: Plan ID (DESC), Operation Type (SA before FG), Operation Sequence (ASC)
      // This ensures manufacturing flow for recent projects appears correctly.
      setJobCards(cards)

      const inProgress = cards.filter(jc => (jc.status || '').toLowerCase() === 'in-progress' || (jc.status || '').toLowerCase() === 'in_progress').length
      const completed = cards.filter(jc => (jc.status || '').toLowerCase() === 'completed').length
      const total = cards.length

      // Count unique allocated machines
      const allocatedSet = new Set()
      cards.forEach(jc => {
        if (jc.machine_status === 'allocated' && jc.machine_id) {
          allocatedSet.add(jc.machine_id)
        }
      })

      setStats({
        totalJobs: total,
        inProgress: inProgress,
        completed: completed,
        efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
        allocatedMachines: allocatedSet.size
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

  const handleEditJobCard = useCallback((card) => {
    setEditingId(card.job_card_id)
    if ((card.operation || '').toLowerCase().includes('shipment') || (card.operation || '').toLowerCase().includes('dispatch')) {
      setShowShipmentModal(true)
    } else {
      setShowEditModal(true)
    }
  }, [])

  // 4. Operation Handlers
  const canStartJobCard = useCallback((jobCardId) => {
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { canStart: false, reason: 'Job card not found' }

    // Use 'draft' as fallback to match StatusBadge behavior
    const currentStatus = (currentCard.status || 'draft').toLowerCase().trim()
    if (!['draft', 'ready', 'pending', 'open', 'planned'].includes(currentStatus)) {
      return { canStart: false, reason: 'Only draft, planned, ready, pending or open job cards can be started' }
    }

    // Validation for In-house operations
    const isOutsource = (currentCard.execution_mode || '').toUpperCase().trim() === 'OUTSOURCE' || (currentCard.execution_mode || '').toUpperCase().trim() === 'SUBCONTRACT';
    const isShipment = (currentCard.operation || '').toLowerCase().includes('shipment') || 
                      (currentCard.operation || '').toLowerCase().includes('dispatch') ||
                      (currentCard.operation || '').toLowerCase().includes('delivery') ||
                      currentCard.is_shipment;

    if (!isOutsource) {
      if (!currentCard.operator_id) {
        return { canStart: false, reason: 'Please assign an operator before starting the job card' }
      }
      if (!currentCard.machine_id && !isShipment) {
        return { canStart: false, reason: 'Please assign a workstation before starting the job card' }
      }
      if (!currentCard.scheduled_start_date) {
        return { canStart: false, reason: 'Please set a scheduled start date and time before starting the job card' }
      }
    } else {
      // Validation for Outsource operations
      if (!currentCard.vendor_id) {
        return { canStart: false, reason: 'Please assign a vendor before starting this outsourced job card' }
      }
    }

    return { canStart: true }
  }, [jobCards])

  const handleStartJobCard = useCallback(async (jobCardId) => {
    try {
      const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
      if (!currentCard) {
        toast.addToast('Job card not found', 'error')
        return
      }

      const { canStart: uiCanStart, reason: uiReason } = canStartJobCard(jobCardId)

      if (!uiCanStart) {
        toast.addToast(uiReason, 'error')
        return
      }

      setLoading(true)
      const api = (await import('../../services/api')).default

      toast.addToast('⏳ Validating start conditions...', 'info')

      // 1. Backend validation (MR, Sequence, and now Assignment)
      const validateRes = await api.post(`/production/job-cards/${jobCardId}/validate-start`, { auto_create_mr: true })
      const validation = validateRes.data?.data || validateRes.data

      if (validation && !validation.can_start) {
        if (validation.requirements && validation.requirements.length > 0) {
          validation.requirements.forEach(req => {
            toast.addToast(`${req.title}: ${req.message}`, 'error')
          })
        } else {
          toast.addToast(validation.reason || validation.message || "We couldn't start this job card. Please make sure materials are received and a machine/operator is assigned.", 'error')
        }
        setLoading(false)
        return
      }

      // 2. Check dependencies (sub-assemblies)
      toast.addToast('⏳ Checking sub-assembly readiness...', 'info')
      const depRes = await api.get(`/production/work-orders/${currentCard.work_order_id}/dependencies`)
      const dependencies = depRes.data?.data || depRes.data || []

      const missingDeps = dependencies.filter(dep => {
        const finished = parseFloat(dep.child_accepted_qty || 0)
        const planned = parseFloat(dep.child_planned_qty || 0)
        return finished < planned
      })

      if (missingDeps.length > 0) {
        const depNames = missingDeps.map(d => d.child_item_name || d.child_item_code).join(', ')
        const confirmProceed = window.confirm(`⚠️ Sub-assemblies not finished: ${depNames}. \n\nStarting this operation might lead to material shortages. Proceed anyway?`)
        if (!confirmProceed) {
          setLoading(false)
          return
        }
      }

      // 3. Finalize start
      toast.addToast('✅ Starting job card...', 'success')
      await productionService.updateJobCard(jobCardId, { status: 'in-progress' })

      setTimeout(() => {
        navigate(`/manufacturing/job-cards/${jobCardId}/production-entry`)
      }, 500)
    } catch (err) {
      const errorData = err.response?.data
      const errorMsg = errorData?.message || err.message || 'Failed to start job card'

      // Handle Conflict (409) or validation failure with conflict info
      if (err.response?.status === 409 && errorData?.conflict) {
        setConflictModalData({
          ...errorData.details,
          message: errorData.message,
          jobCardId: jobCardId
        });
        setShowConflictModal(true);
        setLoading(false);
        return;
      }

      toast.addToast(errorMsg, 'error')
      setLoading(false)
    }
  }, [canStartJobCard, navigate, toast, jobCards])

  const handleBulkStart = async () => {
    try {
      const filterWorkOrder = filters.search || searchParams.get('filter_work_order');
      const filterPlan = filters.production_plan_id || searchParams.get('filter_plan') || searchParams.get('filter_production_plan');

      if (!filterPlan && !filterWorkOrder) {
        toast.addToast('Please filter by Work Order or Production Plan to bulk start operations', 'warning');
        return;
      }

      const confirmMsg = filterPlan
        ? `This will set ALL job cards for Production Plan ${filterPlan} to "in-progress". Proceed?`
        : `This will set ALL job cards for Work Order ${filterWorkOrder} to "in-progress". Proceed?`;

      if (!window.confirm(confirmMsg)) return;

      setLoading(true);
      let res;
      if (filterPlan) {
        res = await productionService.bulkStartPlanJobCards(filterPlan);
      } else {
        res = await productionService.bulkStartJobCards(filterWorkOrder);
      }

      if (res.success) {
        toast.addToast(res.message, 'success');
        fetchJobCards();
      }
    } catch (err) {
      toast.addToast(err.message || 'Failed to bulk start', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  // Conflict Resolution Handlers
  const handleApplyNextAvailable = async (slot) => {
    try {
      const jobCardId = conflictModalData?.jobCardId;
      if (!jobCardId || !slot) return;

      setLoading(true);
      await productionService.updateJobCard(jobCardId, {
        scheduled_start_date: slot.start,
        scheduled_end_date: slot.end
      });

      toast.addToast(`Rescheduled to ${new Date(slot.start).toLocaleString()}`, 'success');
      setShowConflictModal(false);
      setConflictModalData(null);
      fetchJobCards();
    } catch (err) {
      toast.addToast(err.message || 'Failed to reschedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAlternative = async (resource) => {
    try {
      const jobCardId = conflictModalData?.jobCardId;
      if (!jobCardId || !resource) return;

      setLoading(true);
      const updateData = {};
      if (conflictModalData.resource_type === 'machine') {
        updateData.machine_id = resource.name;
      } else {
        updateData.operator_id = resource.name;
      }

      await productionService.updateJobCard(jobCardId, updateData);

      toast.addToast(`Switched to ${resource.workstation_name || resource.name}`, 'success');
      setShowConflictModal(false);
      setConflictModalData(null);
      fetchJobCards();
    } catch (err) {
      toast.addToast(err.message || 'Failed to switch resource', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyWhenAvailable = async (resourceId) => {
    try {
      setNotifyingResourceId(resourceId);
      // Simulate API call for availability alert
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.addToast(`We'll notify you as soon as ${resourceId} is free.`, 'info');
    } catch (err) {
      toast.addToast('Failed to set alert', 'error');
    }
  };

  // 5. Helper Functions
  const getOperatorName = (operatorId, row = null) => {
    if (row && row.operator_name) return row.operator_name
    if (!operatorId) return 'Unassigned'
    const operator = operators.find(op => op.employee_id === operatorId || op.operator_id === operatorId)
    return operator ? `${operator.first_name} ${operator.last_name}` : operatorId
  }

  const getVendorName = (vendorId, row = null) => {
    if (row && row.vendor_name) return row.vendor_name
    if (!vendorId) return 'N/A'
    const vendor = vendors.find(v => v.supplier_id === vendorId || v.id === vendorId || v.name === vendorId)
    return vendor ? (vendor.name || vendor.supplier_name) : vendorId
  }

  const getWorkstationName = (wsId, row = null) => {
    if (row && row.machine_name) return row.machine_name
    if (!wsId) return 'N/A'
    const ws = workstations.find(w => w.name === wsId || w.machine_id === wsId)
    return ws ? (ws.workstation_name || ws.name) : wsId
  }

  const checkMachineConflict = (machineId, start, end, currentJobCardId) => {
    if (!machineId || !start || !end) return { hasConflict: false };

    const startTime = parseUTCDate(start).getTime();
    const endTime = parseUTCDate(end).getTime();

    if (isNaN(startTime) || isNaN(endTime)) return { hasConflict: false };

    const workstation = workstations.find(ws => ws.name === machineId);
    const capacity = workstation ? (workstation.parallel_capacity || 1) : 1;

    const conflicts = jobCards.filter(jc => {
      if (jc.job_card_id === currentJobCardId) return false;
      if (jc.machine_id !== machineId) return false;
      if (['completed', 'cancelled'].includes((jc.status || '').toLowerCase())) return false;

      const jcStart = parseUTCDate(jc.scheduled_start_date).getTime();
      const jcEnd = parseUTCDate(jc.scheduled_end_date).getTime();

      if (isNaN(jcStart) || isNaN(jcEnd)) return false;

      return jcStart < endTime && jcEnd > startTime;
    });

    if (conflicts.length >= capacity) {
      return {
        hasConflict: true,
        conflict: conflicts[0],
        message: `Machine busy with ${conflicts[0].job_card_id}`
      };
    }

    return { hasConflict: false };
  };

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

  const getVendorOptions = () => vendors.map(v => ({
    value: v.supplier_id || v.id || v.name,
    label: v.name || v.supplier_name
  }))

  const getOperationOptions = () => operations.map(op => ({
    value: op.name || op.operation_name,
    label: op.operation_name || op.name
  }))

  const getPreviousOpEndTime = useCallback((row) => {
    if (!row.work_order_id || !row.operation_sequence) return null

    // Find all job cards for same work order with lower sequence
    const predecessors = jobCards
      .filter(jc =>
        jc.work_order_id === row.work_order_id &&
        jc.operation_sequence < row.operation_sequence &&
        jc.status !== 'cancelled'
      )
      .sort((a, b) => b.operation_sequence - a.operation_sequence)

    return predecessors.length > 0 ? predecessors[0].scheduled_end_date : null
  }, [jobCards])

  // 6. UI Components
  const SubcontractBadge = ({ status }) => {
    const configs = {
      DRAFT: { color: 'bg-slate-100 text-slate-600', label: 'Draft' },
      READY: { color: 'bg-blue-100 text-blue-600', label: 'Ready' },
      'SENT_TO_VENDOR': { color: 'bg-indigo-100 text-indigo-600', label: 'Sent' },
      SENT: { color: 'bg-indigo-100 text-indigo-600', label: 'Sent' },
      'PARTIALLY_SENT': { color: 'bg-amber-100 text-amber-600', label: 'Partially Sent' },
      'PARTIALLY SENT': { color: 'bg-amber-100 text-amber-600', label: 'Partially Sent' },
      'PARTIALLY_RECEIVED': { color: 'bg-emerald-100 text-emerald-600', label: 'Partially Received' },
      'PARTIALLY RECEIVED': { color: 'bg-emerald-100 text-emerald-600', label: 'Partially Received' },
      RECEIVED: { color: 'bg-emerald-500 text-white', label: 'Received' },
      COMPLETED: { color: 'bg-green-600 text-white', label: 'Completed' }
    }
    const config = configs[status] || configs[status?.toUpperCase()] || { color: 'bg-slate-50 text-slate-400', label: status || 'N/A' }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const StatusBadge = ({ status }) => {
    const configs = {
      draft: { color: 'text-slate-600 ', icon: FileText, label: 'Draft' },
      ready: { color: 'text-blue-600  ', icon: Zap, label: 'Ready' },
      planned: { color: 'text-indigo-600  ', icon: Calendar, label: 'Planned' },
      'in-progress': { color: 'text-amber-600 ', icon: Activity, label: 'In-Progress' },
      in_progress: { color: 'text-amber-600 ', icon: Activity, label: 'In-Progress' },
      shipped: { color: 'text-indigo-600 ', icon: Truck, label: 'Shipped' },
      delivered: { color: 'text-emerald-700 ', icon: CheckCircle, label: 'Delivered' },
      completed: { color: 'text-emerald-600 ', icon: CheckCircle2, label: 'Completed' },
      cancelled: { color: 'text-rose-600 ', icon: X, label: 'Cancelled' }
    }
    const normalized = (status || 'draft').toLowerCase()
    const s = normalized.replace('_', '-')
    const config = configs[normalized] || configs[s] || configs.draft
    const Icon = config.icon

    return (
      <span className={`flex items-center gap-1.5 text-xs  ${config.color}`}>
        {/* <Icon size={12} className="stroke-[2.5]" /> */}
        {config.label || status}
      </span>
    )
  }

  const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100',
      emerald: 'text-emerald-600 ',
      amber: 'text-amber-600 ',
      rose: 'text-rose-600 bg-rose-50 border-rose-100',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      violet: 'text-violet-600 bg-violet-50 border-violet-100'
    }

    return (
      <div className="bg-slate-50/50 p-2 z-0 rounded border border-gray-100 hover:transition-all group relative">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded  opacity-50 group-hover:scale-110 transition-transform" />
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
    const status = (card.status || 'draft').toLowerCase().trim();
    const isOutsource = (card.execution_mode || '').toUpperCase().trim() === 'OUTSOURCE' || (card.execution_mode || '').toUpperCase().trim() === 'SUBCONTRACT';

    return (
      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Production Entry / Start Zap Icon - Moved to front for visibility */}
        {!isOutsource && !['completed', 'cancelled'].includes(status) && (
          <button
            onClick={() => {
              if (['in-progress', 'in_progress'].includes(status)) {
                navigate(`/manufacturing/job-cards/${card.job_card_id}/production-entry`);
              } else {
                handleStartJobCard(card.job_card_id);
              }
            }}
            className={`p-1 rounded transition-all ${['in-progress', 'in_progress'].includes(status)
              ? 'text-indigo-600 hover:bg-indigo-50'
              : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            title={['in-progress', 'in_progress'].includes(status) ? "Production Entry" : "Start Operation"}
          >
            <Zap size={14} className="fill-current" />
          </button>
        )}

        <button
          onClick={() => handleViewJobCard(card.job_card_id)}
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
          title="View Intelligence"
        >
          <Eye size={14} />
        </button>

        {isOutsource && (
          <button
            onClick={() => handleDispatch(card)}
            disabled={
              status === 'completed' ||
              (parseFloat(card.planned_quantity || 0) > 0 && parseFloat(card.total_dispatched || 0) >= parseFloat(card.planned_quantity || 0)) ||
              parseFloat(card.max_allowed_quantity || 0) <= 0
            }
            className={`p-1 rounded transition-all ${status === 'completed' ||
              (parseFloat(card.planned_quantity || 0) > 0 && parseFloat(card.total_dispatched || 0) >= parseFloat(card.planned_quantity || 0)) ||
              parseFloat(card.max_allowed_quantity || 0) <= 0
              ? 'text-gray-300 cursor-not-allowed bg-transparent opacity-50'
              : 'text-blue-600 hover:bg-blue-50 bg-blue-50/50'
              }`}
            title={parseFloat(card.max_allowed_quantity || 0) <= 0 ? "Waiting for units from previous operation" : "Vendor Dispatch"}
          >
            <Truck size={14} />
          </button>
        )}

        <button
          onClick={() => handleEditJobCard(card)}
          className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
          title="Edit Intelligence"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() => handleDelete(card.job_card_id)}
          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
          title="Remove Entry"
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }, [handleViewJobCard, navigate, handleEditJobCard, handleDelete, handleStartJobCard, handleDispatch])

  const columns = useMemo(() => [
    {
      key: 'project_name',
      label: 'Project',
      render: (val, row, isFirst) => {
        if (!isFirst) {
          return (
            <div className="flex items-center gap-2 pl-4 opacity-40">
              <div className="w-px h-4 bg-gray-300" />
              <span className="text-[10px] text-gray-400 font-medium italic">same project</span>
            </div>
          )
        }
        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-8 bg-indigo-600 rounded" />
              <div className="flex flex-col">
                <span className="text-xs  text-indigo-700  ">{val || 'General'}</span>
                <span className="text-[10px] text-gray-500 font-medium">Ref: {row.sales_order_id || 'Internal'}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'operation',
      label: 'Operation/ID',
      render: (val, row) => {
        const parts = (row.job_card_id || '').split('-')
        const displayId = parts.length > 4 ? `${parts[0]}-${parts[2]}-..${parts[parts.length - 2].slice(-4)}-${parts[parts.length - 1]}` : row.job_card_id

        return (
          <div className="flex flex-col gap-1.5 cursor-pointer group/op" onClick={() => handleViewJobCard(row.job_card_id)}>
            <div className="flex flex-col">
              <span className="text-xs  text-gray-900 group-hover/op:text-indigo-600 transition-colors ">{val}</span>
            </div>
            <div className="flex  flex-col">
              <StatusBadge
                status={
                  (['in-progress', 'ready'].includes(row.status) && parseFloat(row.max_allowed_quantity || 0) <= 0 && parseFloat(row.produced_quantity || 0) <= 0 && parseFloat(row.sent_qty || 0) <= 0)
                    ? 'Waiting'
                    : row.status
                }
              />
              <span className="text-xs text-indigo-400  group-hover/op:opacity-100 transition-opacity" title={`Job Card: ${row.job_card_id}`}>
                {displayId}
              </span>

            </div>
          </div>
        )
      }
    },
    {
      key: 'item_name',
      label: 'Item group',
      render: (val, row) => {
        const isSubAsm = (row.item_group || '').toLowerCase().includes('sub-assembly') || (row.work_order_id || '').includes('-SA-')
        const isFG = (row.item_group || '').toLowerCase().includes('finished good') || (row.work_order_id || '').includes('-FG-')

        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-2">

              <span className="text-xs  text-gray-900 leading-tight" title={val}>{val || 'N/A'}</span>
            </div>
            <div className="flex  flex-col gap-2">
              {isSubAsm && <span className="text-[10px] text-amber-500 p-1 rounded w-fit    leading-none">Sub-Assembly</span>}
              {isFG && <span className="text-[10px] text-indigo-500 p-1 w-fit rounded    leading-none">Finished Good</span>}
            </div>
          </div>
        )
      }
    },
    {
      key: 'execution_mode',
      label: 'Execution',
      render: (val, row) => {
        const isSubcontract = (val || '').toLowerCase() === 'outsource' || (val || '').toLowerCase() === 'subcontract'
        return (
          <span className={`text-xs  ${isSubcontract
            ? ' text-amber-600 '
            : ' text-blue-600 '
            }`}>
            {isSubcontract ? 'Subcontract' : 'In-house'}
          </span>
        )
      }
    },
    {
      key: 'assignment',
      label: 'Assignment',
      render: (_, row) => {
        const isSubcontract = (row.execution_mode || '').toLowerCase() === 'outsource' || (row.execution_mode || '').toLowerCase() === 'subcontract'

        // Assignee part
        let assignee;
        if (isSubcontract) {
          assignee = getVendorName(row.vendor_id, row) || 'Unassigned Vendor'
        } else {
          assignee = getOperatorName(row.operator_id, row) || row.operator_name || 'Unassigned'
        }

        // Workstation part
        let workstation;
        let wsStatus;
        if (isSubcontract) {
          let challanType = ''
          if (row.notes?.startsWith('[Challan Type:')) {
            const match = row.notes.match(/^\[Challan Type: ([^\]]+)\]/)
            if (match) challanType = match[1]
          }
          workstation = challanType || 'Subcontract'
        } else {
          workstation = getWorkstationName(row.machine_id, row) || row.machine_name || 'N/A'
          const isAllocated = row.machine_status === 'allocated'
          if (row.machine_id) {
            wsStatus = (
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded  ${isAllocated ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className={`text-[10px]  ${isAllocated ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isAllocated ? 'Allocated' : 'Available'}
                </span>
              </div>
            )
          }
        }

        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col">
              <span className="text-xs text-gray-900 font-medium">{workstation}</span>
              {wsStatus}
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600">

              <span className="text-[11px] font-medium">{assignee}</span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'quantities',
      label: 'Production Progress',
      render: (_, row) => {
        const planned = parseFloat(row.planned_quantity || 0)
        const produced = parseFloat(row.produced_quantity || 0)

        // Rejections and Scrap are non-additive (they represent the same loss)
        const rejected = parseFloat(row.rejected_quantity || 0)
        const scrap = parseFloat(row.scrap_quantity || 0)
        const consolidatedLoss = Math.max(rejected, scrap)

        // Accepted should ideally be (produced - consolidatedLoss), 
        // but we respect the backend accepted_quantity if it's explicitly set
        // However, for the progress bar, we calculate completion based on valid output
        const accepted = parseFloat(row.accepted_quantity || 0)

        // Readiness logic for ghost bar
        const hasSubDeps = parseInt(row.total_dependencies || 0) > (row.prev_op_transferred_qty !== null ? 1 : 0)
        const hasPrevOp = row.prev_op_transferred_qty !== null
        const producibleFromSub = row.producible_quantity !== null ? parseFloat(row.producible_quantity) : (hasSubDeps ? 0 : planned)
        const producibleFromPrev = row.prev_op_transferred_qty !== null ? parseFloat(row.prev_op_transferred_qty) : (hasPrevOp ? 0 : planned)
        const readyUnits = Math.min(planned, producibleFromSub, producibleFromPrev)

        const completionRate = planned > 0 ? (accepted / planned) * 100 : 0
        const readyRate = planned > 0 ? (readyUnits / planned) * 100 : 0

        return (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px]  text-slate-700">
                {Math.round(completionRate)}% Complete
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-emerald-600">{accepted.toLocaleString()}</span>
                {readyUnits > accepted && (
                  <>
                    <span className="text-[9px] text-slate-300">/</span>
                    <span className="text-[10px] font-medium text-amber-500" title="Ready to process">{Math.floor(readyUnits).toLocaleString()}</span>
                  </>
                )}
                <span className="text-[9px] text-slate-400">/ {planned.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden relative shadow-inner">
              {/* Ready units bar (amber shadow) */}
              <div
                className="absolute left-0 top-0 h-full bg-amber-200 transition-all duration-1000"
                style={{ width: `${Math.min(100, readyRate)}%` }}
              />
              {/* Accepted units bar (emerald/indigo) */}
              <div
                className={`absolute left-0 top-0 h-full transition-all duration-1000 z-10 ${completionRate >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(100, completionRate)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-0.5">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span className="text-[9px] text-slate-500">P: {produced.toLocaleString()}</span>
                </div>
                {(rejected > 0 || scrap > 0) && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1 rounded-full bg-rose-400" />
                    <span className="text-[9px] text-rose-500">R: {Math.round(consolidatedLoss)}</span>
                  </div>
                )}
              </div>
              {completionRate > 0 && completionRate < 100 && (
                <span className="text-[9px] text-slate-400 italic">
                  {Math.floor(planned - accepted)} left
                </span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'dependency_status',
      label: 'Readiness',
      render: (_, row) => {
        const total = parseInt(row.total_dependencies || 0)
        const completed = parseInt(row.completed_dependencies || 0)

        // Producible quantity logic
        const planned = parseFloat(row.planned_quantity || 0)
        const accepted = parseFloat(row.accepted_quantity || 0)

        // Use 0 as default if we have dependencies but no quantity recorded yet
        const hasSubDeps = parseInt(row.total_dependencies || 0) > (row.prev_op_transferred_qty !== null ? 1 : 0)
        const hasPrevOp = row.prev_op_transferred_qty !== null

        const producibleFromSub = row.producible_quantity !== null ? parseFloat(row.producible_quantity) : (hasSubDeps ? 0 : planned)
        const producibleFromPrev = row.prev_op_transferred_qty !== null ? parseFloat(row.prev_op_transferred_qty) : (hasPrevOp ? 0 : planned)

        // Actual ready quantity is the minimum of all constraints
        const readyUnits = Math.min(planned, producibleFromSub, producibleFromPrev)

        // Readiness status logic: Purely quantity-driven for "Ready" labels
        const isReady = readyUnits >= planned && planned > 0
        const isPartiallyReady = readyUnits > accepted && readyUnits < planned
        const isWaiting = readyUnits <= accepted && readyUnits < planned

        return (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex justify-between items-center mb-0.5">
              <span className={`text-[9px] font-bold   ${isReady ? 'text-emerald-600' : (isPartiallyReady ? 'text-amber-600' : 'text-slate-400')
                }`}>
                {isReady ? 'FULLY READY' : (isPartiallyReady ? 'PARTIALLY READY' : (isWaiting ? 'WAITING' : 'AWAITING INPUT'))}
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-black ${isPartiallyReady ? 'text-amber-600' : 'text-slate-700'}`}>{Math.floor(readyUnits).toLocaleString()}</span>
                <span className="text-[9px] text-slate-400">/ {planned.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex shadow-inner">
              <div
                className={`transition-all duration-500 ${isReady ? 'bg-emerald-500' : (isPartiallyReady ? 'bg-amber-500' : 'bg-slate-300')
                  }`}
                style={{ width: `${Math.min(100, (readyUnits / (planned || 1)) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-0.5">
              <div className="flex items-center gap-1">
                <Layers size={10} className={completed >= total ? 'text-emerald-500' : 'text-slate-300'} />
                <span className="text-[9px] text-slate-500">{completed}/{total} Deps</span>
              </div>
              {row.prev_op_transferred_qty !== null && (
                <span className="text-[9px] text-indigo-500 font-medium">
                  From Prev: {Math.floor(row.prev_op_transferred_qty).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'scheduled_start_date',
      label: 'Schedule',
      render: (val, row) => {
        if (!val && !row.scheduled_end_date) return <span className="text-xs w-fit text-gray-400">Not Scheduled</span>

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-slate-400 w-4">S:</span>
              <span className="text-xs text-slate-600 whitespace-nowrap">{formatScheduleTime(val)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-slate-400 w-4">E:</span>
              <span className="text-xs text-slate-500 whitespace-nowrap">{formatScheduleTime(row.scheduled_end_date)}</span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => renderActions(row)
    }
  ], [renderActions])

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
    const filterPlan = searchParams.get('filter_plan') || searchParams.get('filter_production_plan')

    if (filterWorkOrder) {
      setFilters(prev => ({ ...prev, search: filterWorkOrder }))
    } else if (filterPlan) {
      setFilters(prev => ({ ...prev, production_plan_id: filterPlan }))
    }
  }, [searchParams])

  // 9. Main Render
  return (
    <div className="bg-[#fbfcfd] p-4 flex flex-col ">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">

            <div>
              <div className="flex items-center gap-1 mb-1">
                <h1 className="text-xl text-gray-900">
                  {filters.production_plan_id ? `Job Cards for Plan: ${filters.production_plan_id}` :
                    filters.search ? `Job Cards for WO: ${filters.search}` : 'Job Cards'}
                </h1>
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
                  {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
            <button
              onClick={handleTruncate}
              className="group flex items-center gap-2 p-2 py-2 text-rose-600 hover:bg-rose-50 rounded transition-all duration-300"
            >
              <Trash size={15} className="group-hover:rotate-12 transition-transform" />
              <span className="text-xs">Clear Data</span>
            </button>
            <button
              onClick={handleBulkStart}
              className="group flex items-center gap-2 p-2 py-2 text-amber-600 hover:bg-amber-50 rounded transition-all duration-300"
              title="Start all operations for the filtered Plan/Work Order"
            >
              <Zap size={15} className="group-hover:scale-110 transition-transform" />
              <span className="text-xs">Start All Ops</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 my-3 flex-shrink-0">
          <StatCard
            label="Total Operations"
            value={stats.totalJobs}
            icon={Layers}
            color="indigo"
            subtitle="Active Work Orders"
          />
          <StatCard
            label="Machine Allocation"
            value={`${stats.allocatedMachines}/${workstations.length}`}
            icon={Zap}
            color="amber"
            subtitle="Units In Operation"
          />
          <StatCard
            label="In Production"
            value={stats.inProgress}
            icon={Activity}
            color="blue"
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

        {/* Tabs Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded border border-gray-100 w-fit ml-auto my-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-1.5 text-xs rounded transition-all ${activeTab === 'list' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`px-4 py-1.5 text-xs rounded transition-all ${activeTab === 'scheduling' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Scheduling View
          </button>
        </div>


        {activeTab === 'list' ? (
          <>
            {/* Filters */}
            <div className="my-3 flex flex-col md:flex-row items-center gap-6 flex-shrink-0">
              <div className="flex-1 relative w-full group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Search className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={15} />
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
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none ">
                    <Filter className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={15} />
                  </div>
                  <SearchableSelect
                    name="status"
                    value={filters.status}
                    onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'in-progress', label: 'In Production' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ]}
                    placeholder="All Operational States"
                    containerClassName="pl-10"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-hidden bg-white rounded border border-gray-100 shadow-sm mt-4">
              <DataTable
                columns={columns}
                data={jobCards}
                loading={loading}
                pagination={true}
                pageSize={10}
                groupBy="project_name"
                getRowClassName={(row, idx, isFirst) => isFirst ? 'group-header bg-indigo-50/40' : 'bg-white'}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <SchedulingGanttView
              filters={filters}
              onJobClick={(id) => {
                setViewingJobCardId(id)
                setShowViewModal(true)
              }}
              onSlotClick={(machineId, startTime) => {
                setPreSelectedMachine(machineId)
                setPreSelectedStartTime(startTime)
                setEditingId(null)
                setPreSelectedWorkOrderId(null)
                setShowModal(true)
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateJobCardModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setPreSelectedMachine(null)
          setPreSelectedStartTime(null)
        }}
        onSuccess={() => {
          fetchJobCards()
          setShowModal(false)
          setPreSelectedMachine(null)
          setPreSelectedStartTime(null)
        }}
        preSelectedWorkOrderId={preSelectedWorkOrderId}
        preSelectedMachine={preSelectedMachine}
        preSelectedStartTime={preSelectedStartTime}
        allJobCards={jobCards}
        allWorkstations={workstations}
        onConflict={(msg, id, details) => {
          if (details) {
            setConflictModalData({
              ...details,
              message: msg,
              jobCardId: id
            });
          } else {
            setConflictModalData({ message: msg, jobCardId: id });
          }
          setShowConflictModal(true);
        }}
      />

      <EditJobCardModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingId(null)
        }}
        onSuccess={() => {
          fetchJobCards()
          setShowEditModal(false)
          setEditingId(null)
        }}
        jobCardId={editingId}
        allJobCards={jobCards}
        allWorkstations={workstations}
        onConflict={(msg, id, details) => {
          if (details) {
            setConflictModalData({
              ...details,
              message: msg,
              jobCardId: id
            });
          } else {
            setConflictModalData({ message: msg, jobCardId: id });
          }
          setShowConflictModal(true);
        }}
      />

      <ShipmentJobCardModal
        isOpen={showShipmentModal}
        onClose={() => {
          setShowShipmentModal(false)
          setEditingId(null)
        }}
        onSuccess={() => {
          fetchJobCards()
          setShowShipmentModal(false)
          setEditingId(null)
        }}
        jobCardId={editingId}
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

      <ResourceEngagementModal
        isOpen={showConflictModal}
        onClose={() => { setShowConflictModal(false); setConflictModalData(null) }}
        conflictData={conflictModalData}
        onApplyNextAvailable={handleApplyNextAvailable}
        onApplyAlternative={handleApplyAlternative}
        onNotifyWhenAvailable={handleNotifyWhenAvailable}
        onViewAllSchedules={() => setActiveTab('scheduling')}
        notifyingResourceId={notifyingResourceId}
      />
    </div>
  )
}
