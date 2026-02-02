import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Clock, AlertCircle, ArrowLeft, CheckCircle,
  Activity, CheckCircle2, Calendar, Layout, ChevronRight, Settings, Info, FileText,
  Package, Boxes, ArrowRight, Save, ShieldCheck, AlertTriangle, XCircle
} from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'

const normalizeStatus = (status) => String(status || '').toLowerCase().trim()

// Helper Components for the Redesign
const SectionTitle = ({ title, icon: Icon, badge, subtitle }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Icon size={18} />
        </div>
        <h3 className="text-sm  text-slate-900 tracking-tight">{title}</h3>
      </div>
      {badge && (
        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px]  uppercase rounded-full border border-slate-200">
          {badge}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-slate-500 ml-11">{subtitle}</p>}
  </div>
)

const FieldWrapper = ({ label, children, error, required }) => (
  <div className="">
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-900  flex items-center gap-1 font-thin">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {error && <span className="text-xs text-rose-500 animate-pulse">{error}</span>}
    </div>
    {children}
  </div>
)

export default function ProductionEntry() {
  const { jobCardId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [jobCardData, setJobCardData] = useState(null)
  const [allJobCards, setAllJobCards] = useState([])
  const [previousOperationData, setPreviousOperationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [itemName, setItemName] = useState('')
  const [operationCycleTime, setOperationCycleTime] = useState(0)
  const [salesOrderQuantity, setSalesOrderQuantity] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  const [timeLogs, setTimeLogs] = useState([])
  const [rejections, setRejections] = useState([])
  const [downtimes, setDowntimes] = useState([])

  const [shifts] = useState(['A', 'B', 'C'])
  const [warehouses, setWarehouses] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])

  const [nextOperationForm, setNextOperationForm] = useState({
    next_operator_id: '',
    next_warehouse_id: '',
    next_operation_id: '',
    inhouse: false,
    outsource: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const totalProducedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)
  const totalAcceptedQty = rejections.reduce((sum, r) => sum + (parseFloat(r.accepted_qty) || 0), 0)
  const totalRejectedQty = rejections.reduce((sum, r) => sum + (parseFloat(r.rejected_qty) || 0), 0)
  const totalScrapQty = rejections.reduce((sum, r) => sum + (parseFloat(r.scrap_qty) || 0), 0)
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (parseFloat(d.duration_minutes) || 0), 0)

  const maxAllowedQty = previousOperationData 
    ? (parseFloat(previousOperationData.accepted_quantity) || (parseFloat(previousOperationData.produced_quantity) || 0) - (parseFloat(previousOperationData.rejected_quantity) || 0))
    : parseFloat(jobCardData?.planned_quantity || 0);

  const rejectionReasons = [
    'Size/Dimension Error',
    'Surface Finish Poor',
    'Material Defect',
    'Machining Error',
    'Assembly Issue',
    'Quality Check Failed',
    'Damage in Handling',
    'Other'
  ]

  const downtimeTypes = [
    'Planned Downtime',
    'Unplanned Downtime'
  ]

  const [timeLogForm, setTimeLogForm] = useState({
    employee_id: '',
    operator_name: '',
    machine_id: '',
    shift: 'A',
    day_number: '',
    log_date: new Date().toISOString().split('T')[0],
    from_time: '',
    from_period: 'AM',
    to_time: '',
    to_period: 'AM',
    completed_qty: 0,
    inhouse: false,
    outsource: false
  })

  const [rejectionForm, setRejectionForm] = useState({
    reason: '',
    day_number: '',
    log_date: new Date().toISOString().split('T')[0],
    shift: 'A',
    accepted_qty: 0,
    rejected_qty: 0,
    scrap_qty: 0,
    notes: ''
  })

  const [downtimeForm, setDowntimeForm] = useState({
    type: '',
    reason: '',
    day_number: '',
    log_date: new Date().toISOString().split('T')[0],
    shift: 'A',
    from_time: '',
    from_period: 'AM',
    to_time: '',
    to_period: 'AM'
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [jobCardId])

  const StatCard = ({ label, value, icon: Icon, color, subtitle }) => {
    const colorMap = {
      blue: 'text-blue-600 bg-blue-50 border-blue-100/50',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100/50',
      amber: 'text-amber-600 bg-amber-50 border-amber-100/50',
      rose: 'text-rose-600 bg-rose-50 border-rose-100/50',
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100/50',
      violet: 'text-violet-600 bg-violet-50 border-violet-100/50'
    }

    return (
      <Card className="p-2 border-none flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-slate-200/50 bg-white rounded group">
        <div className={`p-3 rounded  ${colorMap[color] || colorMap.blue} border border-transparent transition-transform group-hover:scale-110 duration-300`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs  text-slate-400 ">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg text-slate-900 tracking-tight">{value}</h3>
            {subtitle && (
              <p className="text-[9px]  text-slate-400  truncate">{subtitle}</p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const StatusBadge = ({ status }) => {
    const config = {
      draft: { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
      pending: { color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Calendar },
      'in-progress': { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Activity },
      completed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
      cancelled: { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: AlertCircle }
    }
    const s = normalizeStatus(status)
    const { color, icon: Icon } = config[s] || config.draft

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px]  text-xs  border ${color}`}>
        <Icon size={10} />
        {s.toUpperCase()}
      </span>
    )
  }

  const [activeSection, setActiveSection] = useState('time-logs')

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 20
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  const NavItem = ({ label, icon: Icon, section, isActive, onClick, color = 'indigo' }) => {
    const colors = {
      indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      amber: 'text-amber-600 bg-amber-50 border-amber-100',
      rose: 'text-rose-600 bg-rose-50 border-rose-100'
    }

    return (
      <button
        onClick={() => onClick(section)}
        className={`flex items-center gap-3 w-full p-2 rounded transition-all duration-200 border ${
          isActive 
            ? `${colors[color]} shadow-sm translate-x-1` 
            : 'text-slate-500 hover:bg-slate-50 border-transparent'
        }`}
      >
        <div className={`p-1.5 rounded ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </button>
    )
  }

  useEffect(() => {
    if (jobCardData && operators.length > 0 && workstations.length > 0) {
      const newTimeLogForm = { ...timeLogForm }
      let hasChanges = false

      if (jobCardData.operator_id) {
        const matchingOperator = operators.find(op =>
          op.employee_id === jobCardData.operator_id ||
          op.name === jobCardData.operator_id ||
          `${op.first_name} ${op.last_name}` === jobCardData.operator_id
        )
        if (matchingOperator) {
          newTimeLogForm.employee_id = matchingOperator.employee_id
          newTimeLogForm.operator_name = `${matchingOperator.first_name} ${matchingOperator.last_name}`
          hasChanges = true
        }
      }

      if (jobCardData.machine_id) {
        const matchingWorkstation = workstations.find(ws =>
          ws.name === jobCardData.machine_id ||
          ws.workstation_name === jobCardData.machine_id ||
          ws.id === jobCardData.machine_id
        )
        if (matchingWorkstation) {
          newTimeLogForm.machine_id = matchingWorkstation.name || matchingWorkstation.workstation_name || matchingWorkstation.id
          hasChanges = true
        }
      }

      if (hasChanges) {
        setTimeLogForm(newTimeLogForm)
      }
    }
  }, [jobCardData, operators, workstations])

  useEffect(() => {
    if (jobCardData && operations.length > 0 && warehouses.length > 0) {
      const currentOperation = jobCardData.operation

      if (currentOperation) {
        const currentOpIndex = operations.findIndex(op =>
          op.operation_name === currentOperation ||
          op.name === currentOperation ||
          op.operation_id === currentOperation ||
          op.id === currentOperation
        )

        if (currentOpIndex !== -1 && currentOpIndex < operations.length - 1) {
          const nextOp = operations[currentOpIndex + 1]

          const newNextOperationForm = {
            next_operator_id: '',
            next_warehouse_id: nextOp.target_warehouse || '',
            next_operation_id: nextOp.operation_id || nextOp.id || nextOp.operation_name || nextOp.name,
            inhouse: false,
            outsource: false
          }

          setNextOperationForm(newNextOperationForm)
        }
      }
    }
  }, [jobCardData, operations, warehouses])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [jobCardRes, wsRes, empRes, opsRes] = await Promise.all([
        productionService.getJobCardDetails(jobCardId),
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList()
      ])

      let jobCard = jobCardRes.data || jobCardRes

      if (!jobCard?.job_card_id) {
        toast.addToast('Job card not found', 'error')
        setTimeout(() => navigate('/manufacturing/job-cards'), 1500)
        return
      }

      const jobCardStatus = normalizeStatus(jobCard?.status)

      if (jobCardStatus === 'draft') {
        await productionService.updateJobCard(jobCard.job_card_id, { status: 'pending' })
        await productionService.updateJobCard(jobCard.job_card_id, { status: 'in-progress' })
        jobCard.status = 'in-progress'
      } else if (jobCardStatus === 'pending') {
        await productionService.updateJobCard(jobCard.job_card_id, { status: 'in-progress' })
        jobCard.status = 'in-progress'
      }

      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
      setJobCardData(jobCard)

      let allOperations = []
      let woData = null

      if (jobCard?.work_order_id) {
        try {
          const woRes = await productionService.getWorkOrder(jobCard.work_order_id)
          woData = woRes?.data || woRes

          const soQty = woData?.qty_to_manufacture || woData?.quantity || woData?.planned_quantity || 0
          setSalesOrderQuantity(parseFloat(soQty) || 0)

          allOperations = woData?.operations || []

          if (allOperations.length === 0 && woData?.item_code) {
            const bomResponse = await productionService.getBOMs({ item_code: woData.item_code })
            const boms = bomResponse.data || []

            if (boms.length > 0) {
              const bomDetails = await productionService.getBOMDetails(boms[0].bom_id)
              const bomData = bomDetails.data || bomDetails

              allOperations = bomData?.operations || []
            }
          }
        } catch (err) {
          console.error('Failed to fetch work order/BOM operations:', err)
        }
      }

      if (allOperations.length === 0) {
        allOperations = opsRes.data || []
      }

      const globalOps = opsRes.data || []

      const enrichedOperations = allOperations.map(op => {
        if (!op.name && !op.operation_name && op.operation_id) {
          const globalOp = globalOps.find(g => g.operation_id === op.operation_id || g.id === op.operation_id)
          return {
            ...op,
            name: globalOp?.name || globalOp?.operation_name || `Operation ${op.operation_id}`,
            operation_name: globalOp?.operation_name || globalOp?.name || `Operation ${op.operation_id}`
          }
        }
        return op
      })

      const sortedOperations = enrichedOperations.sort((a, b) => {
        const seqA = parseInt(a.sequence || a.seq || a.operation_seq || 0)
        const seqB = parseInt(b.sequence || b.seq || b.operation_seq || 0)
        return seqA - seqB
      })

      setOperations(sortedOperations)

      if (jobCard?.work_order_id) {
        fetchItemName(jobCard.work_order_id)
        fetchOperationCycleTime(jobCard, woData)
        fetchPreviousOperationData(jobCard)
      }

      await Promise.all([
        fetchWarehouses(),
        fetchTimeLogs(),
        fetchRejections(),
        fetchDowntimes()
      ])
    } catch (err) {
      console.error('Failed to fetch data:', err)
      toast.addToast('Failed to load production entry data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchItemName = async (workOrderId) => {
    try {
      const response = await productionService.getWorkOrder(workOrderId)
      if (response?.data?.item_code) {
        const itemCode = response.data.item_code
        try {
          const itemResponse = await api.get(`/items/${itemCode}`)
          if (itemResponse.data?.data?.item_name) {
            setItemName(itemResponse.data.data.item_name)
          } else {
            setItemName(itemCode)
          }
        } catch (err) {
          setItemName(itemCode)
        }
      }
    } catch (err) {
      console.error('Failed to fetch item name:', err)
      setItemName(jobCardData?.item_name || 'N/A')
    }
  }

  const fetchOperationCycleTime = async (jobCard, woData) => {
    try {
      if (!jobCard?.work_order_id) return

      let bomId = woData?.bom_id
      let bomData = null

      if (bomId) {
        const bomResponse = await productionService.getBOMDetails(bomId)
        bomData = bomResponse?.data || bomResponse
      }

      if (!bomData && woData?.item_code) {
        const bomResponse = await productionService.getBOMs({ item_code: woData.item_code })
        const boms = bomResponse.data || []

        if (boms.length > 0) {
          const bomDetails = await productionService.getBOMDetails(boms[0].bom_id || boms[0].id)
          bomData = bomDetails.data || bomDetails
        }
      }

      if (bomData) {
        const operations = bomData?.bom_operations || bomData?.operations || []
        const jobCardOp = (jobCard.operation || '').toLowerCase().trim()

        const operation = operations.find(op => {
          const opName = (op.name || op.operation_name || '').toLowerCase().trim()
          return opName === jobCardOp
        })

        if (operation) {
          console.log('Found operation:', operation)
          const cycleTime =
            parseFloat(operation.operation_time) ||
            parseFloat(operation.cycle_time) ||
            parseFloat(operation.cycle) ||
            parseFloat(operation.operation_time_per_unit) ||
            parseFloat(operation.time_per_unit) ||
            parseFloat(operation.time) ||
            0

          console.log('Cycle time extracted:', cycleTime, 'from field operation_time')
          if (cycleTime > 0) {
            setOperationCycleTime(cycleTime)
          } else {
            console.warn('Operation found but no valid cycle time. Operation data:', operation)
            setOperationCycleTime(0)
          }
        } else {
          console.warn('Operation not found in BOM. JobCard op:', jobCardOp, 'Available ops:', operations.map(op => op.operation_name))
          setOperationCycleTime(0)
        }
      } else {
        console.warn('BOM data not found')
        setOperationCycleTime(0)
      }
    } catch (err) {
      console.error('Failed to fetch operation cycle time:', err)
      setOperationCycleTime(0)
    }
  }

  const fetchPreviousOperationData = async (currentJobCard) => {
    try {
      if (!currentJobCard?.work_order_id) return

      const response = await productionService.getJobCards({
        work_order_id: currentJobCard.work_order_id
      })
      const cards = response.data || []
      setAllJobCards(cards)

      // Sort job cards by sequence (handling nulls/strings)
      const sortedJobCards = [...cards].sort((a, b) => {
        const seqA = parseInt(a.operation_sequence) || 0
        const seqB = parseInt(b.operation_sequence) || 0
        if (seqA !== seqB) return seqA - seqB
        // Fallback to ID if sequence is same/null
        return (a.job_card_id || '').localeCompare(b.job_card_id || '')
      })

      // Find current job card index in sorted list
      const currentIndex = sortedJobCards.findIndex(jc => jc.job_card_id === currentJobCard.job_card_id)

      if (currentIndex > 0) {
        setPreviousOperationData(sortedJobCards[currentIndex - 1])
      }
    } catch (err) {
      console.error('Failed to fetch previous operation data:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await productionService.getWarehouses()
      setWarehouses(response.data || response || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchTimeLogs = async () => {
    try {
      const response = await productionService.getTimeLogs({ job_card_id: jobCardId })
      setTimeLogs(response.data || [])
    } catch (err) {
      console.error('Failed to fetch time logs:', err)
    }
  }

  const fetchRejections = async () => {
    try {
      const response = await productionService.getRejections({ job_card_id: jobCardId })
      setRejections(response.data || [])
    } catch (err) {
      console.error('Failed to fetch rejections:', err)
    }
  }

  const fetchDowntimes = async () => {
    try {
      const response = await productionService.getDowntimes({ job_card_id: jobCardId })
      setDowntimes(response.data || [])
    } catch (err) {
      console.error('Failed to fetch downtimes:', err)
    }
  }

  const formatTo24h = (time, period) => {
    if (!time) return '';
    let [hours, minutes] = time.split(':').map(Number);
    hours = hours % 12;
    if (period === 'PM') hours += 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateTimeDuration = () => {
    if (timeLogForm.from_time && timeLogForm.to_time) {
      let [fromHour, fromMin] = timeLogForm.from_time.split(':').map(Number)
      let [toHour, toMin] = timeLogForm.to_time.split(':').map(Number)

      // Convert to 24h
      fromHour = fromHour % 12;
      if (timeLogForm.from_period === 'PM') fromHour += 12;

      toHour = toHour % 12;
      if (timeLogForm.to_period === 'PM') toHour += 12;

      const fromTotal = fromHour * 60 + fromMin
      const toTotal = toHour * 60 + toMin
      let diff = toTotal - fromTotal
      if (diff < 0) diff += 1440 // Handle midnight crossing
      return diff
    }
    return 0
  }

  const calculateDowntimeDuration = (fromTime, toTime, fromPeriod, toPeriod) => {
    if (!fromTime || !toTime) return 0
    let [fromHour, fromMin] = fromTime.split(':').map(Number)
    let [toHour, toMin] = toTime.split(':').map(Number)

    // Convert to 24h
    fromHour = fromHour % 12;
    if (fromPeriod === 'PM') fromHour += 12;

    toHour = toHour % 12;
    if (toPeriod === 'PM') toHour += 12;

    const fromTotal = fromHour * 60 + fromMin
    const toTotal = toHour * 60 + toMin
    let diff = toTotal - fromTotal
    if (diff < 0) diff += 1440 // Handle midnight crossing
    return diff
  }

  const format12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const handleOperatorChange = (value) => {
    const operator = operators.find(op => op.employee_id === value)
    setTimeLogForm(prev => ({
      ...prev,
      employee_id: value,
      operator_name: operator ? `${operator.first_name} ${operator.last_name}` : ''
    }))
  }

  const handleAddTimeLog = async (e) => {
    e.preventDefault()
    try {
      if (!timeLogForm.employee_id) {
        toast.addToast('Please select an operator', 'error')
        return
      }
      if (!timeLogForm.machine_id) {
        toast.addToast('Please select a workstation', 'error')
        return
      }

      const newQty = parseFloat(timeLogForm.completed_qty) || 0;
      if (totalProducedQty + newQty > maxAllowedQty + 0.0001) {
        toast.addToast(`Total completed quantity (${(totalProducedQty + newQty).toFixed(2)}) cannot exceed allowed quantity (${maxAllowedQty.toFixed(2)}). Previous operation output/planned quantity is the limit.`, 'error');
        return;
      }

      setFormLoading(true)
      const payload = {
        job_card_id: jobCardId,
        day_number: parseInt(timeLogForm.day_number) || 1,
        log_date: timeLogForm.log_date,
        employee_id: timeLogForm.employee_id,
        operator_name: timeLogForm.operator_name,
        workstation_name: timeLogForm.machine_id,
        shift: timeLogForm.shift,
        from_time: formatTo24h(timeLogForm.from_time, timeLogForm.from_period),
        to_time: formatTo24h(timeLogForm.to_time, timeLogForm.to_period),
        completed_qty: parseFloat(timeLogForm.completed_qty) || 0,
        inhouse: timeLogForm.inhouse ? 1 : 0,
        outsource: timeLogForm.outsource ? 1 : 0,
        time_in_minutes: calculateTimeDuration()
      }

      await productionService.createTimeLog(payload)
      toast.addToast('Time log added successfully', 'success')

      const currentDayNumber = timeLogForm.day_number;
      const currentLogDate = timeLogForm.log_date;

      const defaultWorkstation = jobCardData?.assigned_workstation_id || workstations[0]?.name || ''
      setTimeLogForm({
        employee_id: '',
        operator_name: '',
        machine_id: defaultWorkstation,
        shift: 'A',
        day_number: currentDayNumber,
        log_date: currentLogDate,
        from_time: '',
        from_period: 'AM',
        to_time: '',
        to_period: 'AM',
        completed_qty: 0,
        inhouse: jobCardData?.inhouse || false,
        outsource: jobCardData?.outsource || false
      })

      setTimeout(() => {
        fetchTimeLogs()
      }, 300)
    } catch (err) {
      toast.addToast(err.message || 'Failed to add time log', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const calculateDayNumber = (logDate) => {
    if (!logDate || !jobCardData?.created_at) return 1;
    const start = new Date(jobCardData.created_at);
    start.setHours(0, 0, 0, 0);
    const current = new Date(logDate);
    current.setHours(0, 0, 0, 0);
    const diffTime = current - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }

  const calculateDateFromDay = (dayNum) => {
    if (!dayNum || isNaN(dayNum)) return new Date().toISOString().split('T')[0];
    if (!jobCardData?.created_at) return new Date().toISOString().split('T')[0];
    const start = new Date(jobCardData.created_at);
    start.setHours(0, 0, 0, 0);
    const target = new Date(start);
    target.setDate(start.getDate() + (parseInt(dayNum) - 1));
    return target.toISOString().split('T')[0];
  }

  useEffect(() => {
    if (jobCardData?.created_at) {
      const today = new Date().toISOString().split('T')[0];
      setTimeLogForm(prev => ({ ...prev, log_date: today }));
      setRejectionForm(prev => ({ ...prev, log_date: today }));
      setDowntimeForm(prev => ({ ...prev, log_date: today }));
    }
  }, [jobCardData])

  const handleDayChange = (dayNum, formType) => {
    const newDate = dayNum ? calculateDateFromDay(dayNum) : (jobCardData?.created_at ? new Date().toISOString().split('T')[0] : '');
    // Sync across all forms
    setTimeLogForm(prev => ({ ...prev, day_number: dayNum, ...(dayNum && { log_date: newDate }) }));
    setRejectionForm(prev => ({ ...prev, day_number: dayNum, ...(dayNum && { log_date: newDate }) }));
    setDowntimeForm(prev => ({ ...prev, day_number: dayNum, ...(dayNum && { log_date: newDate }) }));
  }

  const handleDateChange = (date, formType) => {
    const dayNum = calculateDayNumber(date);
    // Sync across all forms
    setTimeLogForm(prev => ({ ...prev, log_date: date, day_number: dayNum }));
    setRejectionForm(prev => ({ ...prev, log_date: date, day_number: dayNum }));
    setDowntimeForm(prev => ({ ...prev, log_date: date, day_number: dayNum }));
  }

  const handleDeleteTimeLog = async (logId) => {
    if (!window.confirm('Delete this time log?')) return
    try {
      await productionService.deleteTimeLog(logId)
      toast.addToast('Time log deleted', 'success')
      fetchTimeLogs()
    } catch (err) {
      toast.addToast('Failed to delete time log', 'error')
    }
  }

  const handleAddRejection = async (e) => {
    e.preventDefault()

    if (rejectionForm.accepted_qty <= 0 && rejectionForm.rejected_qty <= 0 && rejectionForm.scrap_qty <= 0) {
      toast.addToast('Please enter at least one quantity', 'error')
      return
    }

    if (rejectionForm.rejected_qty > 0 && !rejectionForm.reason) {
      toast.addToast('Please select a reason for rejection', 'error')
      return
    }

    const newAcceptedQty = parseFloat(rejectionForm.accepted_qty) || 0;
    if (totalAcceptedQty + newAcceptedQty > maxAllowedQty + 0.0001) {
      toast.addToast(`Total accepted quantity (${(totalAcceptedQty + newAcceptedQty).toFixed(2)}) cannot exceed allowed quantity (${maxAllowedQty.toFixed(2)}). Previous operation output/planned quantity is the limit.`, 'error');
      return;
    }

    try {
      setFormLoading(true)
      const payload = {
        job_card_id: jobCardId,
        day_number: parseInt(rejectionForm.day_number) || 1,
        log_date: rejectionForm.log_date,
        shift: rejectionForm.shift || 'A',
        accepted_qty: parseFloat(rejectionForm.accepted_qty) || 0,
        rejection_reason: rejectionForm.reason,
        rejected_qty: parseFloat(rejectionForm.rejected_qty) || 0,
        scrap_qty: parseFloat(rejectionForm.scrap_qty) || 0,
        notes: rejectionForm.notes
      }

      await productionService.createRejection(payload)
      toast.addToast('Quality record added successfully', 'success')

      const currentDayNumber = rejectionForm.day_number;
      const currentLogDate = rejectionForm.log_date;

      setRejectionForm({
        reason: '',
        day_number: currentDayNumber,
        log_date: currentLogDate,
        accepted_qty: 0,
        rejected_qty: 0,
        scrap_qty: 0,
        notes: ''
      })

      setTimeout(() => {
        fetchRejections()
      }, 300)
    } catch (err) {
      toast.addToast(err.message || 'Failed to add rejection', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteRejection = async (rejectionId) => {
    if (!window.confirm('Delete this rejection entry?')) return
    try {
      await productionService.deleteRejection(rejectionId)
      toast.addToast('Rejection entry deleted', 'success')
      fetchRejections()
    } catch (err) {
      toast.addToast('Failed to delete rejection', 'error')
    }
  }

  const handleAddDowntime = async (e) => {
    e.preventDefault()

    if (!downtimeForm.type || !downtimeForm.from_time || !downtimeForm.to_time) {
      toast.addToast('Please fill all required fields', 'error')
      return
    }

    try {
      setFormLoading(true)
      const durationMinutes = calculateDowntimeDuration(
        downtimeForm.from_time,
        downtimeForm.to_time,
        downtimeForm.from_period,
        downtimeForm.to_period
      )

      const payload = {
        job_card_id: jobCardId,
        day_number: parseInt(downtimeForm.day_number) || 1,
        log_date: downtimeForm.log_date,
        shift: downtimeForm.shift || 'A',
        downtime_type: downtimeForm.type,
        downtime_reason: downtimeForm.reason,
        from_time: formatTo24h(downtimeForm.from_time, downtimeForm.from_period),
        to_time: formatTo24h(downtimeForm.to_time, downtimeForm.to_period),
        duration_minutes: durationMinutes
      }

      await productionService.createDowntime(payload)
      toast.addToast('Downtime entry recorded', 'success')

      const currentDayNumber = downtimeForm.day_number;
      const currentLogDate = downtimeForm.log_date;

      setDowntimeForm({
        type: '',
        reason: '',
        day_number: currentDayNumber,
        log_date: currentLogDate,
        from_time: '',
        from_period: 'AM',
        to_time: '',
        to_period: 'AM'
      })

      setTimeout(() => {
        fetchDowntimes()
      }, 300)
    } catch (err) {
      toast.addToast(err.message || 'Failed to add downtime', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteDowntime = async (downtimeId) => {
    if (!window.confirm('Delete this downtime entry?')) return
    try {
      await productionService.deleteDowntime(downtimeId)
      toast.addToast('Downtime entry deleted', 'success')
      fetchDowntimes()
    } catch (err) {
      toast.addToast('Failed to delete downtime', 'error')
    }
  }

  const handleSubmitProduction = async () => {
    try {
      setIsSubmitting(true)

      const plannedQty = parseFloat(jobCardData?.planned_quantity || 0)

      if (totalProducedQty > maxAllowedQty + 0.0001) {
        toast.addToast(`Validation Error: Total produced quantity (${totalProducedQty.toFixed(2)}) exceeds allowed quantity (${maxAllowedQty.toFixed(2)}).`, 'error');
        setIsSubmitting(false);
        return;
      }

      if (totalAcceptedQty > maxAllowedQty + 0.0001) {
        toast.addToast(`Validation Error: Total accepted quantity (${totalAcceptedQty.toFixed(2)}) exceeds allowed quantity (${maxAllowedQty.toFixed(2)}).`, 'error');
        setIsSubmitting(false);
        return;
      }

      if (totalProducedQty < plannedQty) {
        const shortfall = (plannedQty - totalProducedQty).toFixed(2)
        if (!window.confirm(`Warning: Produced quantity (${totalProducedQty.toFixed(2)}) is less than planned (${plannedQty.toFixed(2)}). Shortfall: ${shortfall} units. Continue anyway?`)) {
          return
        }
      }

      const updatePayload = {
        status: 'completed',
        produced_quantity: totalProducedQty,
        accepted_quantity: totalAcceptedQty,
        rejected_quantity: totalRejectedQty,
        scrap_quantity: totalScrapQty
      }

      await productionService.updateJobCard(jobCardData.job_card_id, updatePayload)

      let successMessage = 'Production completed successfully'

      if (nextOperationForm.next_operation_id && nextOperationForm.next_warehouse_id) {
        const selectedOp = operations.find(op =>
          (op.operation_id || op.id) === nextOperationForm.next_operation_id ||
          (op.operation_name || op.name) === nextOperationForm.next_operation_id
        )

        const nextSequence = (parseInt(jobCardData.operation_sequence) || 0) + 1
        const existingNextJobCard = allJobCards.find(jc => 
          parseInt(jc.operation_sequence) === nextSequence
        )

        if (existingNextJobCard) {
          const updatePayload = {
            planned_quantity: totalAcceptedQty,
            ...(nextOperationForm.next_operator_id && { operator_id: nextOperationForm.next_operator_id }),
            machine_id: selectedOp?.workstation_type || selectedOp?.workstation_name || jobCardData.machine_id || jobCardData.assigned_workstation_id
          }
          await productionService.updateJobCard(existingNextJobCard.job_card_id, updatePayload)
        } else {
          const nextJobCard = {
            work_order_id: jobCardData.work_order_id,
            operation: selectedOp?.operation_name || selectedOp?.name,
            machine_id: selectedOp?.workstation_type || selectedOp?.workstation_name || jobCardData.machine_id || jobCardData.assigned_workstation_id,
            ...(nextOperationForm.next_operator_id && { operator_id: nextOperationForm.next_operator_id }),
            planned_quantity: totalAcceptedQty,
            operation_sequence: nextSequence,
            status: 'draft'
          }
          await productionService.createJobCard(nextJobCard)
        }

        successMessage = 'Production completed and next operation updated successfully'
      }

      toast.addToast(successMessage, 'success')

      setTimeout(() => {
        navigate('/manufacturing/job-cards')
      }, 1500)
    } catch (err) {
      toast.addToast(err.message || 'Failed to assign next operation', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading production entry data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 pb-20">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Unified Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-2 rounded border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl  text-slate-900 tracking-tight">
                  Production Entry
                </h1>
                <StatusBadge status={jobCardData?.status} />
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <span className="font-medium text-slate-700">{jobCardData?.job_card_id || 'LOADING...'}</span>
                <span className="text-slate-300">•</span>
                <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={() => navigate('/manufacturing/job-cards')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleSubmitProduction}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 shadow-lg shadow-slate-200 transition-all text-sm font-medium"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle size={18} />
              )}
              COMPLETE PRODUCTION
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Context & Navigation */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            {/* Quick Navigation Card */}
            <Card className="p-4 border-slate-200 shadow-sm bg-white rounded-xl">
              <h3 className="text-xs  text-slate-400  mb-4 px-2">
                Navigation
              </h3>
              <div className="space-y-1">
                <NavItem 
                  label="Time Logs" 
                  icon={Clock} 
                  section="time-logs" 
                  isActive={activeSection === 'time-logs'} 
                  onClick={scrollToSection}
                />
                <NavItem 
                  label="Quality Check" 
                  icon={ShieldCheck} 
                  section="quality-entry" 
                  isActive={activeSection === 'quality-entry'} 
                  onClick={scrollToSection}
                  color="emerald"
                />
                <NavItem 
                  label="Downtime Logs" 
                  icon={AlertTriangle} 
                  section="downtime" 
                  isActive={activeSection === 'downtime'} 
                  onClick={scrollToSection}
                  color="amber"
                />
                <NavItem 
                  label="Next Operation" 
                  icon={ArrowRight} 
                  section="next-operation" 
                  isActive={activeSection === 'next-operation'} 
                  onClick={scrollToSection}
                  color="indigo"
                />
              </div>
            </Card>

            <Card className=" border-none bg-white rounded ">
              <div className="p-2 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Layout size={18} className="text-white" />
                  </div>
                  <h3 className="text-xs ">Context</h3>
                </div>
                <div className="p-2 bg-white/10 rounded text-xs border border-white/10">
                  {jobCardData?.status || 'Draft'}
                </div>
              </div>

              <div className="p-2 ">
                <div>
                  <p className="text-xs  text-slate-400  mb-3">Target Item</p>
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded">
                    <p className="text-sm  text-slate-900 leading-tight">
                      {itemName || jobCardData?.item_name || 'N/A'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Package size={12} className="text-slate-400" />
                      <p className="text-xs  text-slate-500 tracking-tight">
                        {jobCardData?.item_code || '---'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs  text-slate-400  mb-1">Planned</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-lg text-slate-900">
                        {parseFloat(jobCardData?.planned_quantity || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <span className="text-xs  text-slate-400 ">Units</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs  text-slate-400  mb-1">Current Op</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <p className="text-[11px]  text-indigo-600  truncate" title={jobCardData?.operation}>
                        {jobCardData?.operation || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {previousOperationData && (
              <Card className="p-0 border-none bg-emerald-50/20 rounded-2xl overflow-hidden border border-emerald-100/50">
                <div className="p-3 bg-emerald-600 text-white flex items-center gap-2">
                  <CheckCircle size={14} />
                  <h3 className="text-xs  tracking-[0.2em] text-white/90">Previous Phase</h3>
                </div>
                <div className="p-2 space-y-2">
                  <div>
                    <p className="text-[9px]  text-emerald-600/70  mb-1">Operation</p>
                    <p className="text-[11px]  text-slate-900 ">{previousOperationData.operation}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px]  text-slate-400  mb-1">Accepted</p>
                      <p className="text-sm  text-emerald-600">
                        {parseFloat(parseFloat(previousOperationData.accepted_quantity) || ((parseFloat(previousOperationData.produced_quantity) || 0) - (parseFloat(previousOperationData.rejected_quantity) || 0))).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px]  text-slate-400  mb-1">Rejected</p>
                      <p className="text-sm  text-rose-500">
                        {parseFloat(previousOperationData.rejected_quantity || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {(() => {
              const expectedMinutes = (operationCycleTime || 0) * (salesOrderQuantity || 1)
              const actualMinutes = timeLogs.reduce((sum, log) => {
                if (log.from_time && log.to_time) {
                  const [fh, fm] = log.from_time.split(':').map(Number)
                  const [th, tm] = log.to_time.split(':').map(Number)
                  return sum + Math.max(0, (th * 60 + tm) - (fh * 60 + fm))
                }
                return sum
              }, 0)

              const efficiency = actualMinutes > 0 ? ((expectedMinutes / actualMinutes) * 100).toFixed(0) : 0
              const qualityScore = totalProducedQty > 0 ? ((totalAcceptedQty / totalProducedQty) * 100).toFixed(1) : 0

              return (
                <div className="space-y-2">
                  <StatCard
                    label="Efficiency"
                    value={`${efficiency}%`}
                    icon={Activity}
                    color={efficiency >= 90 ? 'emerald' : efficiency >= 75 ? 'amber' : 'rose'}
                    subtitle={`${actualMinutes.toFixed(0)} / ${expectedMinutes.toFixed(0)} MIN`}
                  />
                  <StatCard
                    label="Quality"
                    value={`${qualityScore}%`}
                    icon={CheckCircle2}
                    color={qualityScore >= 98 ? 'emerald' : 'amber'}
                    subtitle="ACCEPTANCE RATE"
                  />
                  <StatCard
                    label="Productivity"
                    value={actualMinutes > 0 ? ((totalAcceptedQty / (actualMinutes / 60)).toFixed(1)) : '0'}
                    icon={Boxes}
                    color="indigo"
                    subtitle="UNITS PER HOUR"
                  />
                </div>
              )
            })()}
          </div>

          <div className="col-span-12 lg:col-span-9 space-y-8">
            {/* Time Logs Section */}
            <div id="time-logs" className="animate-in fade-in slide-in-from-bottom-2 bg-white duration-300">
              <Card className="p-3 border-none  overflow-visible">
                <SectionTitle title="Add Time Log" icon={Plus} />
                <form onSubmit={handleAddTimeLog} className="flex flex-wrap gap-2 ">
                  <FieldWrapper label="Day & Date" required>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={timeLogForm.day_number}
                        onChange={(e) => handleDayChange(e.target.value, 'timeLog')}
                        className="w-14 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <input
                        type="date"
                        value={timeLogForm.log_date}
                        onChange={(e) => handleDateChange(e.target.value, 'timeLog')}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                    </div>
                  </FieldWrapper>

                  <FieldWrapper label="Operator" required>
                    <SearchableSelect
                      value={timeLogForm.employee_id}
                      onChange={handleOperatorChange}
                      options={operators.map(op => ({
                        value: op.employee_id,
                        label: `${op.first_name} ${op.last_name}`
                      }))}
                      placeholder="Select Operator"
                      containerClassName=" rounded bg-slate-50 border-slate-200 transition-all"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Workstation" required>
                    <SearchableSelect
                      value={timeLogForm.machine_id}
                      onChange={(value) => setTimeLogForm({ ...timeLogForm, machine_id: value })}
                      options={workstations.map(ws => ({
                        value: ws.name || ws.workstation_name || ws.id,
                        label: ws.workstation_name || ws.name || ws.id
                      }))}
                      placeholder="Select Machine"
                      containerClassName=" rounded bg-slate-50 border-slate-200 transition-all"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Shift" required>
                    <select
                      value={timeLogForm.shift}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, shift: e.target.value })}
                      className="w-full p-2  bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                    >
                      {shifts.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <div className="md:col-span-2">
                    <FieldWrapper label="Production Period" required>
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-1 gap-1">
                          <input
                            type="time"
                            value={timeLogForm.from_time}
                            onChange={(e) => setTimeLogForm({ ...timeLogForm, from_time: e.target.value })}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                          />
                          <select
                            value={timeLogForm.from_period}
                            onChange={(e) => setTimeLogForm({ ...timeLogForm, from_period: e.target.value })}
                            className="p-2 bg-slate-100 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 shrink-0" />
                        <div className="flex flex-1 gap-1">
                          <input
                            type="time"
                            value={timeLogForm.to_time}
                            onChange={(e) => setTimeLogForm({ ...timeLogForm, to_time: e.target.value })}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                          />
                          <select
                            value={timeLogForm.to_period}
                            onChange={(e) => setTimeLogForm({ ...timeLogForm, to_period: e.target.value })}
                            className="p-2 bg-slate-100 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </FieldWrapper>
                  </div>

                  <FieldWrapper label="Completed Qty" required>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={timeLogForm.completed_qty}
                        onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px]  text-slate-400 ">UNITS</span>
                    </div>
                  </FieldWrapper>

                  <div className="flex items-end ">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-100 hover:shadow-lg transition-all text-xs p-2"
                    >
                      {formLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Log Production
                    </button>
                  </div>
                </form>
              </Card>
              <Card className="border-none  overflow-hidden">
                <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white text-indigo-600 rounded  border border-slate-100">
                      <Clock size={16} />
                    </div>
                    <h3 className="text-[11px]  text-slate-900 text-xs ">Time Log History</h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left bg-white">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-2 text-xs text-slate-400 ">Operator</th>
                        <th className="p-2 text-xs text-slate-400 ">Workstation</th>
                        <th className="p-2 text-xs text-slate-400  text-center">Timing</th>
                        <th className="p-2 text-xs text-slate-400  text-right">Qty</th>
                        <th className="p-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {timeLogs.map((log) => (
                        <tr key={log.id || log.time_log_id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs  text-slate-600 border border-slate-200">
                                {log.operator_name?.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{log.operator_name}</p>
                                <p className="text-xs text-slate-400 ">Day {log.day_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-medium text-slate-600">{log.workstation_name}</span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center gap-3 p-2  py-1.5 bg-slate-50 rounded border border-slate-100">
                              <span className="text-xs  text-slate-700">{format12h(log.from_time)}</span>
                              <ArrowRight size={12} className="text-slate-300" />
                              <span className="text-xs  text-slate-700">{format12h(log.to_time)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm  text-slate-900">{log.completed_qty}</span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteTimeLog(log.id || log.time_log_id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all "
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
            <div id="quality-entry" className=" animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white">
              <Card className="p-3 border-none ">
                <SectionTitle title="Record Quality Entry" icon={ShieldCheck} />
                <form onSubmit={handleAddRejection} className="flex flex-wrap gap-2">
                  <FieldWrapper label="Day & Date" required>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={rejectionForm.day_number}
                        onChange={(e) => handleDayChange(e.target.value, 'rejection')}
                        className="w-14 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <input
                        type="date"
                        value={rejectionForm.log_date}
                        onChange={(e) => handleDateChange(e.target.value, 'rejection')}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                    </div>
                  </FieldWrapper>

                  <FieldWrapper label="Shift" required>
                    <select
                      value={rejectionForm.shift}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, shift: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                    >
                      {shifts.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </FieldWrapper>

                  <FieldWrapper label="Accepted Qty">
                    <input
                      type="number"
                      step="0.01"
                      value={rejectionForm.accepted_qty}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, accepted_qty: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Rejected Qty">
                    <input
                      type="number"
                      step="0.01"
                      value={rejectionForm.rejected_qty}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Scrap Qty">
                    <input
                      type="number"
                      step="0.01"
                      value={rejectionForm.scrap_qty}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, scrap_qty: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Reason">
                    <SearchableSelect
                      value={rejectionForm.reason}
                      onChange={(value) => setRejectionForm({ ...rejectionForm, reason: value })}
                      options={rejectionReasons.map(r => ({ value: r, label: r }))}
                      placeholder="Select Reason"
                      containerClassName=" rounded bg-slate-50 border-slate-200 transition-all"
                    />
                  </FieldWrapper>

                  <FieldWrapper label="Notes">
                    <input
                      type="text"
                      value={rejectionForm.notes}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, notes: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="Optional notes"
                    />
                  </FieldWrapper>

                  <div className="flex items-end pb-0.5">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 flex items-center justify-center gap-2 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50 shadow-md shadow-rose-100 hover:shadow-lg transition-all text-xs "
                    >
                      {formLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      Log Quality
                    </button>
                  </div>
                </form>
              </Card>

              <Card className="border-none  overflow-hidden">
                <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white text-rose-600 rounded  border border-slate-100">
                      <ShieldCheck size={16} />
                    </div>
                    <h3 className="text-[11px]  text-slate-900 text-xs ">Quality History</h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left bg-white">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-2 text-xs text-slate-400 ">Date/Day</th>
                        <th className="p-2 text-xs text-slate-400 ">Reason</th>
                        <th className="p-2 text-xs text-slate-400  text-right">Accepted</th>
                        <th className="p-2 text-xs text-slate-400  text-right">Rejected</th>
                        <th className="p-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rejections.map((rej) => (
                        <tr key={rej.rejection_id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <p className="text-sm font-medium text-slate-900">{new Date(rej.log_date).toLocaleDateString()}</p>
                            <p className="text-xs text-slate-400 ">Day {rej.day_number}</p>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-medium text-slate-600">{rej.reason || rej.rejection_reason || 'N/A'}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm  text-emerald-600">{rej.accepted_qty}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="text-sm  text-rose-600">{rej.rejected_qty}</span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteRejection(rej.rejection_id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all "
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

<div id="downtime" className=" animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white">
          <Card className="p-3 border-none  overflow-visible">
            <SectionTitle title="Record Downtime" icon={AlertTriangle} />
            <form onSubmit={handleAddDowntime} className="flex flex-wrap gap-2">
              <FieldWrapper label="Day & Date" required>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={downtimeForm.day_number}
                    onChange={(e) => handleDayChange(e.target.value, 'downtime')}
                    className="w-14 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                  <input
                    type="date"
                    value={downtimeForm.log_date}
                    onChange={(e) => handleDateChange(e.target.value, 'downtime')}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
              </FieldWrapper>

              <FieldWrapper label="Shift" required>
                <select
                  value={downtimeForm.shift}
                  onChange={(e) => setDowntimeForm({ ...downtimeForm, shift: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                >
                  {shifts.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FieldWrapper>

              <FieldWrapper label="Type" required>
                <select
                  value={downtimeForm.type}
                  onChange={(e) => setDowntimeForm({ ...downtimeForm, type: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                  required
                >
                  <option value="">Select Type</option>
                  {downtimeTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FieldWrapper>

              <div className="md:col-span-2">
                <FieldWrapper label="Timing" required>
                  <div className="flex gap-2 items-center">
                    <div className="flex flex-1 gap-1">
                      <input
                        type="time"
                        value={downtimeForm.from_time}
                        onChange={(e) => setDowntimeForm({ ...downtimeForm, from_time: e.target.value })}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <select
                        value={downtimeForm.from_period}
                        onChange={(e) => setDowntimeForm({ ...downtimeForm, from_period: e.target.value })}
                        className="p-2 bg-slate-100 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 shrink-0" />
                    <div className="flex flex-1 gap-1">
                      <input
                        type="time"
                        value={downtimeForm.to_time}
                        onChange={(e) => setDowntimeForm({ ...downtimeForm, to_time: e.target.value })}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <select
                        value={downtimeForm.to_period}
                        onChange={(e) => setDowntimeForm({ ...downtimeForm, to_period: e.target.value })}
                        className="p-2 bg-slate-100 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </FieldWrapper>
              </div>

              <FieldWrapper label="Reason">
                <input
                  type="text"
                  value={downtimeForm.reason}
                  onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Optional reason"
                />
              </FieldWrapper>

              <div className="flex items-end pb-0.5">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full p-2 flex items-center justify-center gap-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 shadow-md shadow-amber-100 hover:shadow-lg transition-all text-xs  "
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                  Log Downtime
                </button>
              </div>
            </form>
          </Card>

          <Card className="border-none  overflow-hidden">
            <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white text-amber-600 rounded  border border-slate-100">
                  <AlertTriangle size={16} />
                </div>
                <h3 className="text-[11px]  text-slate-900 text-xs ">Downtime History</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left bg-white">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-xs text-slate-400 ">Type/Reason</th>
                    <th className="p-2 text-xs text-slate-400  text-center">Timing</th>
                    <th className="p-2 text-xs text-slate-400  text-right">Duration</th>
                    <th className="p-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {downtimes.map((dt) => (
                    <tr key={dt.downtime_id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-medium text-slate-900">{dt.type || dt.downtime_type}</p>
                        <p className="text-xs text-slate-400 ">{dt.reason || dt.downtime_reason || 'No reason'}</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-3 p-2  py-1.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-xs  text-slate-700">{format12h(dt.from_time)}</span>
                          <ArrowRight size={12} className="text-slate-300" />
                          <span className="text-xs  text-slate-700">{format12h(dt.to_time)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm  text-slate-900">{dt.duration_minutes || calculateDowntimeDuration(dt.from_time, dt.to_time, dt.from_period, dt.to_period)} min</span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteDowntime(dt.downtime_id)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all "
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
          </div>

          {/* Quality Control Section */}

        </div>

        {/* Downtime Log Section */}
        
      </div>

      {/* Next Operation/Finalize Section */}
      <div id="next-operation" className="mt-12 pt-8 border-t border-slate-200">
        <Card className="p-0 border-none  overflow-visible relative bg-white">
          <div className="flex flex-col md:flex-row">
            {/* Left branding/info strip */}
            <div className=" w-10 bg-emerald-600 rounded flex items-center justify-center p-4">
              <div className="rotate-0 md:-rotate-90 whitespace-nowrap text-white  text-xs tracking-[0.3em] flex items-center gap-3">
                <CheckCircle2 size={16} />
                PHASE ASSIGNMENT
              </div>
            </div>

            <div className="flex-1 p-2">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-md  text-slate-900 flex items-center gap-2">
                    Next Stage Configuration
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs rounded border border-emerald-100 ">Active</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Specify destination and operational parameters for the next manufacturing phase</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2  py-1.5 rounded border border-emerald-100">
                  <Activity size={14} className="animate-pulse" />
                  <span className="text-xs ">READY TO DISPATCH</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FieldWrapper label="NEXT OPERATION" required>
                  <div className="group relative">
                    <SearchableSelect
                      value={nextOperationForm.next_operation_id}
                      onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operation_id: val })}
                      options={operations.map(op => ({
                        value: op.operation_id || op.id || op.operation_name || op.name,
                        label: op.operation_name || op.name
                      }))}
                      placeholder="Select Next Op"
                      containerClassName="p-2  rounded bg-slate-50 border-slate-200 transition-all"
                    />
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-emerald-500 rounded-full transition-all duration-300"></div>
                  </div>
                </FieldWrapper>

                <FieldWrapper label="ASSIGN OPERATOR">
                  <div className="group relative">
                    <SearchableSelect
                      value={nextOperationForm.next_operator_id}
                      onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operator_id: val })}
                      options={operators.map(op => ({
                        value: op.employee_id,
                        label: `${op.first_name} ${op.last_name}`
                      }))}
                      placeholder="Search Operator..."
                      containerClassName="p-2  rounded bg-slate-50 border-slate-200 transition-all"
                    />
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-indigo-500 rounded-full transition-all duration-300"></div>
                  </div>
                </FieldWrapper>

                <FieldWrapper label="TARGET WAREHOUSE" required>
                  <div className="group relative">
                    <SearchableSelect
                      value={nextOperationForm.next_warehouse_id}
                      onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: val })}
                      options={warehouses.map(w => ({
                        value: w.warehouse_id || w.id || w.name,
                        label: w.warehouse_name || w.name
                      }))}
                      placeholder="Select Destination"
                      containerClassName="p-2  rounded bg-slate-50 border-slate-200 transition-all"
                    />
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-amber-500 rounded-full transition-all duration-300"></div>
                  </div>
                </FieldWrapper>
              </div>

              <div className="mt-2 border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className=" items-center gap-6">
                  <p className="text-xs text-slate-400 ">Execution Mode:</p>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setNextOperationForm({ ...nextOperationForm, inhouse: !nextOperationForm.inhouse, outsource: false })}
                      className={`flex items-center gap-3 p-2 rounded border-2 transition-all duration-300 ${nextOperationForm.inhouse ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${nextOperationForm.inhouse ? 'border-emerald-500 bg-white' : 'border-slate-300'}`}>
                        {nextOperationForm.inhouse && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </div>
                      <span className="text-xs ">IN-HOUSE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNextOperationForm({ ...nextOperationForm, outsource: !nextOperationForm.outsource, inhouse: false })}
                      className={`flex items-center gap-3 p-2 rounded border-2 transition-all duration-300 ${nextOperationForm.outsource ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${nextOperationForm.outsource ? 'border-indigo-500 bg-white' : 'border-slate-300'}`}>
                        {nextOperationForm.outsource && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      </div>
                      <span className="text-xs ">OUTSOURCE</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSubmitProduction}
                  disabled={isSubmitting}
                  className="relative group overflow-hidden p-2 bg-slate-900 text-white rounded hover:shadow-2xl hover:shadow-emerald-200 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500"></div>
                  <div className="relative flex items-center gap-4">
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <div className="p-1.5 bg-white/10 rounded group-hover:bg-white/20 transition-colors">
                        <FileText size={10} />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs text-white/50  leading-none">Finalize & Dispatch</p>
                      <p className="text-xs ">Move to Next Stage</p>
                    </div>
                    <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>


  )
}
