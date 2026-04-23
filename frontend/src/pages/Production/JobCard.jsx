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
import ViewJobCardModal from '../../components/Production/ViewJobCardModal'
import SubcontractDispatchModal from '../../components/Production/SubcontractDispatchModal'
import SchedulingGanttView from '../../components/Production/SchedulingGanttView'
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
    setShowEditModal(true)
  }, [])

  // 4. Operation Handlers
  const canStartJobCard = useCallback((jobCardId) => {
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { canStart: false, reason: 'Job card not found' }

    const currentStatus = (currentCard.status || '').toLowerCase()
    if (!['draft', 'ready', 'pending', 'open'].includes(currentStatus)) {
      return { canStart: false, reason: 'Only draft, ready, pending or open job cards can be started' }
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

      const { canStart, reason } = canStartJobCard(jobCardId)

      if (!canStart) {
        toast.addToast(reason, 'error')
        return
      }

      setLoading(true)

      const api = (await import('../../services/api')).default

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
        toast.addToast(`⚠️ Sub-assemblies not finished: ${depNames}. Proceeding anyway...`, 'warning')
      }

      toast.addToast('⏳ Checking material status...', 'info')
      const materialStatusRes = await api.get(`/production/job-cards/${jobCardId}/material-request-status`)
      const materialStatus = materialStatusRes.data?.data

      if (materialStatus?.has_material_request && materialStatus?.mr_status !== 'received' && materialStatus?.mr_status !== 'completed') {
        toast.addToast(
          `ℹ️ Material request status: ${String(materialStatus.mr_status || 'UNKNOWN').toUpperCase()}. Proceeding anyway...`,
          'info'
        )
      } else if (!materialStatus?.has_material_request) {
        toast.addToast('ℹ️ No material request found. Proceeding anyway...', 'info')
      }

      toast.addToast('✅ Starting job card...', 'success')
      await productionService.updateJobCard(jobCardId, { status: 'in-progress' })

      setTimeout(() => {
        navigate(`/manufacturing/job-cards/${jobCardId}/production-entry`)
      }, 500)
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start job card'
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

  const renderConflictModal = () => {
    if (!conflictModalData) return null

    const handleApplySuggested = async () => {
      if (!conflictModalData.next_available_slot || !conflictModalData.jobCardId) return;

      try {
        setLoading(true);
        await productionService.updateJobCard(conflictModalData.jobCardId, {
          scheduled_start_date: formatToUTC(parseUTCDate(conflictModalData.next_available_slot.start)),
          scheduled_end_date: formatToUTC(parseUTCDate(conflictModalData.next_available_slot.end))
        });
        toast.addToast('Job card rescheduled successfully', 'success');
        setShowConflictModal(false);
        setShowEditModal(false);
        setConflictModalData(null);
        fetchJobCards();
      } catch (err) {
        toast.addToast(err.message || 'Failed to reschedule job card', 'error');
      } finally {
        setLoading(false);
      }
    }

    const handleApplyAlternative = async (resourceName) => {
      if (!conflictModalData.jobCardId) return;

      try {
        setLoading(true);
        const updateData = {};
        if (conflictModalData.resource_type === 'machine') {
          updateData.machine_id = resourceName;
        } else {
          updateData.operator_id = resourceName;
        }

        await productionService.updateJobCard(conflictModalData.jobCardId, updateData);
        toast.addToast(`${conflictModalData.resource_type === 'machine' ? 'Machine' : 'Operator'} switched successfully`, 'success');
        setShowConflictModal(false);
        setShowEditModal(false);
        setConflictModalData(null);
        fetchJobCards();
      } catch (err) {
        toast.addToast(err.message || 'Failed to switch resource', 'error');
      } finally {
        setLoading(false);
      }
    }

    const handleApplyNextAvailable = async () => {
      if (!conflictModalData.next_available_slot || !conflictModalData.jobCardId) return;

      try {
        setLoading(true);
        await productionService.updateJobCard(conflictModalData.jobCardId, {
          scheduled_start_date: formatToUTC(parseUTCDate(conflictModalData.next_available_slot.start)),
          scheduled_end_date: formatToUTC(parseUTCDate(conflictModalData.next_available_slot.end))
        });
        toast.addToast('Job card updated to next available slot', 'success');
        setShowConflictModal(false);
        setShowEditModal(false);
        setConflictModalData(null);
        fetchJobCards();
      } catch (err) {
        toast.addToast(err.message || 'Failed to update job card', 'error');
      } finally {
        setLoading(false);
      }
    }

    const handleNotifyWhenAvailable = async () => {
      try {
        await productionService.requestResourceNotification({
          resource_type: conflictModalData.resource_type,
          resource_id: conflictModalData.resource_id
        })
        setNotifyingResourceId(conflictModalData.resource_id)
        toast.addToast(`Notification request sent. We'll notify you once ${conflictModalData.resource_id} is available.`, 'success')
      } catch (err) {
        toast.addToast('Failed to request notification', 'error')
      }
    }

    const getWaitTimeText = (endTime) => {
      if (!endTime) return null;
      const end = parseUTCDate(endTime);
      const now = new Date();
      const diffMs = end - now;
      if (diffMs <= 0) return "Becoming free now";

      const diffMins = Math.ceil(diffMs / 60000);
      if (diffMins < 60) return `${diffMins} mins`;

      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}m`;
    };

    return (
      <Modal
        isOpen={showConflictModal}
        onClose={() => { setShowConflictModal(false); setConflictModalData(null) }}
        title={conflictModalData.conflict_with ? "Resource Engagement Info" : "Scheduling Alert"}
        size="lg"
      >
        <div className="p-2 space-y-2">
          {/* Header Engagement Section */}
          <div className='flex gap-2'>
            <div className={`flex flex-col items-start gap-2 p-2 ${conflictModalData.conflict_with ? 'bg-indigo-50/40 border-indigo-100' : 'bg-amber-50 border-amber-100'} border rounded  overflow-hidden relative`}>
              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded  ${conflictModalData.conflict_with ? 'bg-indigo-500/5' : 'bg-amber-500/5'}`} />

             <div className='flex gap-2 items-center'>
               <div className={`flex-shrink-0 p-2 rounded ${conflictModalData.conflict_with ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-amber-100 text-amber-600'} `}>
                {conflictModalData.resource_type === 'machine' ? <Cpu size={15} strokeWidth={2.5} /> : (conflictModalData.resource_type === 'operator' ? <Users size={15} strokeWidth={2.5} /> : <AlertTriangle size={15} strokeWidth={2.5} />)}
              </div>

              <div className="flex-1 ">
                <div>
                  <h3 className={`${conflictModalData.conflict_with ? 'text-indigo-900' : 'text-amber-900'}  text-sm  leading-none`}>
                    {conflictModalData.conflict_with
                      ? `${conflictModalData.resource_type === 'machine' ? 'Machine' : 'Operator'} is Already Engaged`
                      : "Scheduling Sequence Alert"
                    }
                  </h3>
                  <p className={`${conflictModalData.conflict_with ? 'text-indigo-600/80' : 'text-amber-700'} text-xs  leading-relaxed `}>
                    {conflictModalData.conflict_with
                      ? `Conflict with ${conflictModalData.conflict_with} (${conflictModalData.conflict_operation || 'Operation'}) from ${formatToLocalDisplay(conflictModalData.start)} to ${formatToLocalDisplay(conflictModalData.end)}`
                      : conflictModalData.message
                    }
                  </p>
                </div>


              </div>
             </div>

            </div>
            {conflictModalData.conflict_with && (
              <div className=" flex gap-2">
                <div className="bg-white/90 p-2 rounded border border-indigo-100 flex items-center gap-3  group hover:border-indigo-200 transition-colors">
                  <div className="p-1.5 bg-indigo-50 rounded text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Clock size={15} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs    text-indigo-400">Next available in:</span>
                    <span className="text-xs  text-indigo-600">{getWaitTimeText(conflictModalData.end)}</span>
                  </div>
                </div>

                <div className="bg-indigo-600 p-2 .5 rounded flex items-center gap-3 shadow-md shadow-indigo-100 group hover:bg-indigo-700 transition-colors active:scale-95 cursor-pointer">
                  <div className="p-1.5 bg-white/20 rounded text-white">
                    <ClipboardList size={15} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs    text-indigo-200">Engaged with:</span>
                    <span className="text-xs  text-white">{conflictModalData.conflict_with}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Job Details Section - Only show if there's a specific conflicting job */}
          {conflictModalData.conflict_with && (
            <div className="bg-white border border-slate-100 rounded  overflow-hidden">
              <div className="bg-slate-50/50 p-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-white rounded border border-slate-100  text-slate-400">
                    <ClipboardList size={15} />
                  </div>
                  <h4 className="text-xs  text-slate-500  ">Currently Engaged Job Details</h4>
                </div>
              </div>

              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400    block">Work Order</span>
                  <p className="text-xs  text-slate-700 break-all leading-tight">
                    {conflictModalData.conflict_work_order || 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400    block">Operation</span>
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-indigo-500" />
                    <span className="text-sm  text-indigo-600">
                      {conflictModalData.conflict_operation || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400    block">Item</span>
                  <p className="text-sm  text-slate-800 line-clamp-2" title={conflictModalData.conflict_item}>
                    {conflictModalData.conflict_item || 'N/A'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400    block">Planned Qty</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm  text-slate-900  ">
                      {conflictModalData.conflict_planned_qty ? parseFloat(conflictModalData.conflict_planned_qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
                    </span>
                    <span className="text-xs text-slate-400  ">Units</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400    block">Current Status</span>
                  <div className="inline-flex mt-0.5">
                    <StatusBadge status={conflictModalData.conflict_status} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {conflictModalData.conflict_with && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Suggested Solution Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Zap size={15} className="text-amber-500" />
                  <h4 className="text-sm  text-slate-800  ">Easiest Fix</h4>
                </div>

                <div className="bg-white border border-grey-200 rounded overflow-hidden  hover: transition-all group">
                  <div className="bg-indigo-600 p-2 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={15} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs  text-white  er">Automatic Reschedule</span>
                    </div>
                    <span className="text-xs bg-white text-indigo-600 px-2 py-0.5 rounded-md   ">Recommended</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {conflictModalData.next_available_slot ? (
                      <>
                        <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded border border-indigo-100 group-hover:border-indigo-300 transition-colors relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                          <div className="text-center flex-1">
                            <p className="text-xs text-indigo-400   ">Start Time</p>
                            <p className="text-xs  text-indigo-900 ">{formatToLocalDisplay(conflictModalData.next_available_slot.start)}</p>
                          </div>
                          <div className="px-5 text-indigo-200">
                            <ArrowRight size={15} strokeWidth={3} />
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-xs text-indigo-400   ">End Time</p>
                            <p className="text-xs  text-indigo-900 ">{formatToLocalDisplay(conflictModalData.next_available_slot.end)}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleApplyNextAvailable}
                          className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs  shadow-lg shadow-indigo-100 active:scale-[0.98] flex items-center justify-center gap-3 group/btn"
                        >
                          <CheckCircle size={15} className="group-hover/btn:scale-110 transition-transform" />
                          Update to This Slot
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-10 text-slate-400 text-xs   bg-slate-50 rounded border border-dashed border-slate-200">
                        No free slots found for today.
                      </div>
                    )}
                  </div>
                </div>

                {/* Notification Section */}
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 border border-indigo-700 rounded p-2 flex items-center justify-between  shadow-indigo-100">
                  <div className="flex items-center gap-1">
                    <div className="p-2 bg-white/10 rounded text-indigo-100 backdrop-blur-sm">
                      <Bell size={15} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h5 className="text-xs  text-white leading-tight ">Don't want to wait?</h5>
                      <p className="text-xs text-indigo-200 ">We'll alert you when it's free.</p>
                    </div>
                  </div>
                  <button
                    disabled={notifyingResourceId === conflictModalData.resource_id}
                    onClick={handleNotifyWhenAvailable}
                    className={`p-2 rounded text-xs  transition-all ${notifyingResourceId === conflictModalData.resource_id
                        ? 'bg-indigo-700/50 text-indigo-300 cursor-not-allowed flex items-center gap-2'
                        : 'bg-white text-indigo-900 hover:bg-indigo-50 active:scale-95'
                      }`}
                  >
                    {notifyingResourceId === conflictModalData.resource_id ? (
                      <><CheckCircle size={14} /> Alert Set</>
                    ) : 'Set Alert'}
                  </button>
                </div>
              </div>

              {/* Alternatives Section */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 px-1">
                  <Layers size={15} className="text-slate-500" />
                  <h4 className="text-sm  text-slate-800  ">Try Another {conflictModalData.resource_type === 'machine' ? 'Machine' : 'Operator'}</h4>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-2 flex flex-col">
                  {conflictModalData.alternatives && conflictModalData.alternatives.length > 0 ? (
                    <div className="space-y-4 flex-1">
                      <p className="text-xs  text-slate-400   mb-3 px-1">
                        Free {conflictModalData.resource_type === 'machine' ? 'machines of same type' : 'operators in same dept'}
                      </p>
                      {conflictModalData.alternatives.map(alt => (
                        <div key={alt.name} className="flex items-center justify-between bg-white p-5 rounded border border-slate-100 hover:border-indigo-300 hover: transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              {conflictModalData.resource_type === 'machine' ? <Cpu size={22} /> : <Users size={22} />}
                            </div>
                            <div>
                              <p className="text-sm  text-slate-800 group-hover:text-indigo-900 ">{alt.workstation_name || alt.name}</p>
                              <p className="text-xs text-slate-400    mt-0.5">{alt.name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApplyAlternative(alt.name)}
                            className="px-5 py-2.5 text-xs  text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded transition-all border border-indigo-100 active:scale-95"
                          >
                            Switch
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center space-y-2 opacity-70 p-2">
                      <div className="p-2 bg-white rounded shadow-inner border border-slate-100">
                        <Layers size={15} className="text-slate-200" />
                      </div>
                      <p className="text-xs  text-slate-500 leading-relaxed">
                        No other similar {conflictModalData.resource_type === 'machine' ? 'machines' : 'operators'} are available right now.
                      </p>
                    </div>
                  )}

                  <div className="mt-2 space-y-2">
                    <button
                      onClick={() => setActiveTab('scheduling')}
                      className="flex items-center justify-center gap-3 w-full p-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition-all text-xs   shadow-slate-200 active:scale-[0.98]"
                    >
                      <CalendarIcon size={15} />
                      View All Schedules
                    </button>
                    <button
                      onClick={() => { setShowConflictModal(false); setConflictModalData(null) }}
                      className="w-full p-2 text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-all text-xs "
                    >
                      Close & Choose Time Manually
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!conflictModalData.conflict_with && (
            <div className="flex justify-end">
              <button
                onClick={() => { setShowConflictModal(false); setConflictModalData(null) }}
                className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-all text-sm "
              >
                Understood
              </button>
            </div>
          )}
        </div>
      </Modal>
    )
  }

  // 7. Table Configuration
  const renderActions = useCallback((card) => {
    return (
      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => handleViewJobCard(card.job_card_id)}
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
          title="View Intelligence"
        >
          <Eye size={14} />
        </button>

        {(card.execution_mode || '').toUpperCase() === 'OUTSOURCE' && (
          <button
            onClick={() => handleDispatch(card)}
            disabled={
              card.status === 'completed' || 
              (parseFloat(card.planned_quantity || 0) > 0 && parseFloat(card.total_dispatched || 0) >= parseFloat(card.planned_quantity || 0)) ||
              parseFloat(card.max_allowed_quantity || 0) <= 0
            }
            className={`p-1 rounded transition-all ${
              card.status === 'completed' || 
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

        {['ready', 'draft', 'pending', 'open'].includes((card.status || '').toLowerCase()) && card.execution_mode !== 'OUTSOURCE' && (
          <button
            onClick={() => handleStartJobCard(card.job_card_id)}
            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-all"
            title="Start Operation"
          >
            <Zap size={14} className="fill-current" />
          </button>
        )}
        {['in-progress', 'in_progress'].includes((card.status || '').toLowerCase()) && card.execution_mode !== 'OUTSOURCE' && (
          <button
            onClick={() => navigate(`/manufacturing/job-cards/${card.job_card_id}/production-entry`)}
            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-all"
            title="Production Entry"
          >
            <Zap size={14} className="fill-current" />
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
              <span className="text-xs  text-gray-900 group-hover/op:text-indigo-600 transition-colors tracking-tight">{val}</span>
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
      label: 'accepted/planned',
      render: (_, row) => {
        const planned = parseFloat(row.planned_quantity || 0)
        const produced = parseFloat(row.produced_quantity || 0)
        const accepted = parseFloat(row.accepted_quantity || 0)
        
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4 border-y border-gray-50 py-0.5">
              <span className="text-xs font-medium">
                <span className="text-emerald-600">{accepted.toLocaleString()}</span> / <span className="text-gray-900">{planned.toLocaleString()}</span>
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'dependency_status',
      label: 'Dependency',
      render: (_, row) => {
        const total = parseInt(row.total_dependencies || 0)
        const completed = parseInt(row.completed_dependencies || 0)
        
        if (total === 0) return <span className="text-xs text-gray-400 ">No Dependencies</span>

        const progress = (completed / total) * 100
        const isReady = completed >= total

        return (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className={`text-[10px]    ${isReady ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isReady ? 'Ready to Start' : 'Pending Dependencies'}
              </span>
              <span className="text-xs  text-gray-500">{completed}/{total}</span>
            </div>
            <div className="w-full bg-gray-100 h-1  overflow-hidden border border-gray-200/50">
              <div 
                className={`h-full transition-all duration-500 ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {!isReady && (
              <span className="text-[9px] text-gray-400 ">
                Waiting for {total - completed} task{total - completed > 1 ? 's' : ''}
              </span>
            )}
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
        

        {activeTab === 'list' ? (
          <>
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
              <div className="flex items-center gap-1 bg-white p-1 rounded border border-gray-100  w-fit ml-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-1.5 text-xs    rounded transition-all ${activeTab === 'list' ? 'bg-gray-900 text-white ' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`px-4 py-1.5 text-xs    rounded transition-all ${activeTab === 'scheduling' ? 'bg-gray-900 text-white ' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
          >
            Scheduling View
          </button>
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

      {renderConflictModal()}
    </div>
  )
}
