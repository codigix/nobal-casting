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
const normalizeShift = (s) => String(s || '').trim().toUpperCase().replace(/^SHIFT\s+/, '');

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getShiftTimings = (shift) => {
  const shiftTimings = {
    'A': { from_time: '10:00', from_period: 'AM', to_time: '06:00', to_period: 'PM' },
    'B': { from_time: '06:00', from_period: 'PM', to_time: '03:00', to_period: 'AM' }
  }
  return shiftTimings[shift] || shiftTimings['A']
}

const calculateDurationMinutes = (fromTime, fromPeriod, toTime, toPeriod) => {
  const parseTime = (time, period) => {
    if (!time) return 0;
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  let start = parseTime(fromTime, fromPeriod);
  let end = parseTime(toTime, toPeriod);

  if (end < start) {
    // Spans across midnight
    end += 24 * 60;
  }

  return end - start;
};

// Helper Components for the Redesign
const SectionTitle = ({ title, icon: Icon, badge, subtitle }) => (
  <div className="mb-2">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
          <Icon size={15} />
        </div>
        <h3 className="text-xs  text-slate-900 tracking-tight">{title}</h3>
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

  const [shifts] = useState(['A', 'B'])
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

  const totalProducedQty = parseFloat(jobCardData?.produced_quantity || 0)
  const totalAcceptedQty = parseFloat(jobCardData?.accepted_quantity || 0)
  const totalRejectedQty = parseFloat(jobCardData?.rejected_quantity || 0)
  const totalScrapQty = parseFloat(jobCardData?.scrap_quantity || 0)
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (parseFloat(d.duration_minutes) || 0), 0)

  const maxAllowedQty = previousOperationData
    ? (parseFloat(previousOperationData.accepted_quantity) || (parseFloat(previousOperationData.produced_quantity) || 0) - (parseFloat(previousOperationData.rejected_quantity) || 0))
    : parseFloat(jobCardData?.planned_quantity || 0);

  const isOperationFinished = totalProducedQty >= (maxAllowedQty - 0.1);

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
    log_date: getLocalDate(),
    from_time: '10:00',
    from_period: 'AM',
    to_time: '06:00',
    to_period: 'PM',
    completed_qty: 0,
    inhouse: false,
    outsource: false
  })

  const [rejectionForm, setRejectionForm] = useState({
    reason: '',
    day_number: '',
    log_date: getLocalDate(),
    shift: 'A',
    produce_qty: 0,
    accepted_qty: 0,
    rejected_qty: 0,
    scrap_qty: 0,
    notes: ''
  })

  const [downtimeForm, setDowntimeForm] = useState({
    downtime_type: '',
    downtime_reason: '',
    day_number: '',
    log_date: getLocalDate(),
    shift: 'A',
    from_time: '10:00',
    from_period: 'AM',
    to_time: '06:00',
    to_period: 'PM'
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [jobCardId])
  
  useEffect(() => {
    const stats = getShiftStats(rejectionForm.log_date, rejectionForm.shift);
    const produceQty = stats.produced; 
    const rejected = parseFloat(rejectionForm.rejected_qty) || 0;
    
    // Automatically sync scrap_qty with rejected_qty as requested
    const scrap = rejected;
    
    setRejectionForm(prev => {
      const hasProduceQtyChanged = prev.produce_qty !== produceQty;
      const hasRejectedQtyChanged = prev.rejected_qty !== rejected;
      const hasScrapQtyChanged = prev.scrap_qty !== scrap;
      
      if (hasProduceQtyChanged || hasRejectedQtyChanged || hasScrapQtyChanged) {
        // If produce_qty changed (shift/date changed), auto-calculate accepted
        // If rejected_qty changed, auto-calculate accepted if it was previously 
        // linked to produce_qty (i.e., produceQty > 0)
        let newAccepted = prev.accepted_qty;
        
        if (hasProduceQtyChanged && produceQty > 0) {
          newAccepted = Math.max(0, produceQty - rejected);
        } else if (hasRejectedQtyChanged && produceQty > 0) {
          newAccepted = Math.max(0, produceQty - rejected);
        }

        return {
          ...prev,
          produce_qty: produceQty,
          scrap_qty: scrap,
          accepted_qty: newAccepted
        };
      }

      return prev;
    });
  }, [rejectionForm.log_date, rejectionForm.shift, rejectionForm.rejected_qty, timeLogs]);

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
        className={`flex items-center gap-3 w-full p-2 rounded transition-all duration-200 border ${isActive
          ? `${colors[color]}  translate-x-1`
          : 'text-slate-500 hover:bg-slate-50 border-transparent'
          }`}
      >
        <div className={`p-1.5 rounded ${isActive ? 'bg-white ' : 'bg-slate-100'}`}>
          <Icon size={15} />
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
      const [jobCardRes, wsRes, empRes, opsRes, whRes] = await Promise.all([
        productionService.getJobCardDetails(jobCardId),
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList(),
        productionService.getWarehouses()
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
      setWarehouses(whRes.data || [])
      setJobCardData(jobCard)

      const woId = jobCard.work_order_id
      const currentSequence = parseInt(jobCard.operation_sequence || 0)
      let jobCards = []

      if (woId) {
        const jcResponse = await productionService.getJobCards({ work_order_id: woId })
        jobCards = jcResponse.data || []
        setAllJobCards(jobCards)

        if (currentSequence > 0) {
          const prevCard = jobCards.find(c => parseInt(c.operation_sequence || 0) === currentSequence - 1)
          if (prevCard) {
            setPreviousOperationData(prevCard)
          }
        }
      }

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
        // Try to find the name from job cards first
        const matchingJobCard = jobCards.find(jc => 
          String(jc.operation_id) === String(op.operation_id || op.id) || 
          parseInt(jc.operation_sequence) === parseInt(op.sequence || op.seq || op.operation_seq)
        )

        let opName = op.operation_name || op.name || matchingJobCard?.operation

        if (!opName && (op.operation_id || op.id)) {
          const globalOp = globalOps.find(g => 
            String(g.operation_id) === String(op.operation_id || op.id) || 
            String(g.id) === String(op.operation_id || op.id)
          )
          opName = globalOp?.name || globalOp?.operation_name
        }

        return {
          ...op,
          name: opName || `Operation ${op.operation_id || op.id}`,
          operation_name: opName || `Operation ${op.operation_id || op.id}`
        }
      })

      const sortedOperations = enrichedOperations.sort((a, b) => {
        const seqA = parseInt(a.sequence || a.seq || a.operation_seq || 0)
        const seqB = parseInt(b.sequence || b.seq || b.operation_seq || 0)
        return seqA - seqB
      })

      setOperations(sortedOperations)

      if (jobCard?.work_order_id) {
        fetchItemName(jobCard.work_order_id)
      }

      const [logsRes, rejsRes, downRes] = await Promise.all([
        productionService.getTimeLogs({ job_card_id: jobCardId }),
        productionService.getRejections({ job_card_id: jobCardId }),
        productionService.getDowntimes({ job_card_id: jobCardId })
      ])

      const logs = logsRes.data || logsRes || []
      const rejs = rejsRes.data || rejsRes || []
      const down = downRes.data || downRes || []

      setTimeLogs(Array.isArray(logs) ? logs : [])
      setRejections(Array.isArray(rejs) ? rejs : [])
      setDowntimes(Array.isArray(down) ? down : [])
    } catch (err) {
      toast.addToast(err.message || 'Failed to load operational data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchItemName = async (woId) => {
    try {
      const response = await productionService.getWorkOrder(woId)
      const data = response.data || response
      setItemName(data.item_name || '')

      if (data.item_code) {
        const bomRes = await productionService.getBOMs({ item_code: data.item_code })
        const boms = bomRes.data || []
        if (boms.length > 0) {
          const details = await productionService.getBOMDetails(boms[0].bom_id)
          const bom = details.data || details

          const currentOp = bom.operations?.find(op =>
            op.operation_name === jobCardData?.operation ||
            op.name === jobCardData?.operation
          )

          if (currentOp) {
            setOperationCycleTime(parseFloat(currentOp.operation_time || 0))
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch item name:', err)
    }
  }

  const handleDayChange = (val, formType) => {
    if (formType === 'timeLog') setTimeLogForm({ ...timeLogForm, day_number: val })
    else if (formType === 'rejection') setRejectionForm({ ...rejectionForm, day_number: val })
    else if (formType === 'downtime') setDowntimeForm({ ...downtimeForm, day_number: val })
  }

  const handleDateChange = (val, formType) => {
    if (formType === 'timeLog') setTimeLogForm({ ...timeLogForm, log_date: val })
    else if (formType === 'rejection') setRejectionForm({ ...rejectionForm, log_date: val })
    else if (formType === 'downtime') setDowntimeForm({ ...downtimeForm, log_date: val })
  }

  const handleShiftChange = (val, formType) => {
    const timings = getShiftTimings(val)

    if (formType === 'timeLog') {
      setTimeLogForm({
        ...timeLogForm,
        shift: val,
        ...timings
      })
    }
    else if (formType === 'rejection') setRejectionForm({ ...rejectionForm, shift: val })
    else if (formType === 'downtime') {
      setDowntimeForm({
        ...downtimeForm,
        shift: val,
        ...timings
      })
    }
  }

  const handleOperatorChange = (val) => {
    const op = operators.find(o => o.employee_id === val)
    setTimeLogForm({
      ...timeLogForm,
      employee_id: val,
      operator_name: op ? `${op.first_name} ${op.last_name}` : ''
    })
  }

  const formatDateForMatch = (dateInput) => {
    if (!dateInput) return null;
    
    let d;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string') {
      // 1. Handle DD-MM-YYYY or D-M-YYYY (manually to avoid timezone issues)
      const dmyMatch = dateInput.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      }

      // 2. Handle pure YYYY-MM-DD (manually to avoid UTC interpretation)
      const ymdMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
      }

      // 3. Fallback to Date object for ISO strings etc.
      d = new Date(dateInput);
    } else {
      d = new Date(dateInput);
    }

    if (isNaN(d.getTime())) return null;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculatePotentialIncrease = (formType, formData) => {
    const { log_date, shift } = formData;
    const dateStr = log_date;
    const formDate = formatDateForMatch(log_date);
    const formShift = normalizeShift(shift);

    // Find existing logs for this date/shift
    const shiftTimeLogs = timeLogs.filter(log => {
      const logDate = formatDateForMatch(log.log_date);
      const logShift = normalizeShift(log.shift);
      return logDate === formDate && logShift === formShift;
    });
    const shiftRejections = rejections.filter(rej => {
      const rejDate = formatDateForMatch(rej.log_date);
      const rejShift = normalizeShift(rej.shift);
      return rejDate === formDate && rejShift === formShift;
    });

    const timeLogProduced = shiftTimeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0);
    const prevRejectionProduced = shiftRejections.reduce((sum, rej) => sum + (parseFloat(rej.accepted_qty) || 0) + Math.max(parseFloat(rej.rejected_qty) || 0, parseFloat(rej.scrap_qty) || 0), 0);

    const prevTotalForShift = Math.max(timeLogProduced, prevRejectionProduced);

    let newTotalForShift = prevTotalForShift;
    if (formType === 'timeLog') {
      const newQty = parseFloat(formData.completed_qty) || 0;
      newTotalForShift = Math.max(timeLogProduced + newQty, prevRejectionProduced);
    } else if (formType === 'rejection') {
      const enteringProduced = (parseFloat(formData.accepted_qty) || 0) + Math.max(parseFloat(formData.rejected_qty) || 0, parseFloat(formData.scrap_qty) || 0);
      newTotalForShift = Math.max(timeLogProduced, prevRejectionProduced + enteringProduced);
    }

    const remainingTotalFromOtherShifts = Math.max(0, totalProducedQty - prevTotalForShift);
    return (remainingTotalFromOtherShifts + newTotalForShift) - totalProducedQty;
  };

  const getShiftStats = (date, shift) => {
    const targetDate = formatDateForMatch(date);
    const targetShift = normalizeShift(shift);

    const shiftTimeLogs = timeLogs.filter(log => {
      const logDate = formatDateForMatch(log.log_date);
      const logShift = normalizeShift(log.shift);
      return logDate === targetDate && logShift === targetShift;
    });

    const shiftRejections = rejections.filter(rej => {
      const rejDate = formatDateForMatch(rej.log_date);
      const rejShift = normalizeShift(rej.shift);
      return rejDate === targetDate && rejShift === targetShift;
    });

    const produced = shiftTimeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0);
    const rejectionProduced = shiftRejections.reduce((sum, rej) => sum + (parseFloat(rej.accepted_qty) || 0) + Math.max(parseFloat(rej.rejected_qty) || 0, parseFloat(rej.scrap_qty) || 0), 0);

    return {
      produced,
      rejectionProduced,
      maxProduced: Math.max(produced, rejectionProduced)
    };
  };

  const handleAddTimeLog = async (e) => {
    e.preventDefault()
    
    // Frontend validation
    const increase = calculatePotentialIncrease('timeLog', timeLogForm);
    if (totalProducedQty + increase > maxAllowedQty + 0.0001) {
      toast.addToast(`Quantity exceeds limit. Current: ${totalProducedQty.toFixed(2)}, Increase: ${increase.toFixed(2)}, Allowed: ${maxAllowedQty.toFixed(2)}`, 'error');
      return;
    }

    try {
      setFormLoading(true)
      
      const time_in_minutes = calculateDurationMinutes(
        timeLogForm.from_time,
        timeLogForm.from_period,
        timeLogForm.to_time,
        timeLogForm.to_period
      );

      const response = await productionService.createTimeLog({
        ...timeLogForm,
        time_in_minutes,
        job_card_id: jobCardId
      })
      toast.addToast('Time log added successfully', 'success')
      setTimeLogForm({
        ...timeLogForm,
        completed_qty: 0,
        ...getShiftTimings(timeLogForm.shift)
      })
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add time log', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddRejection = async (e) => {
    e.preventDefault()

    // Frontend validation
    const increase = calculatePotentialIncrease('rejection', rejectionForm);
    if (totalProducedQty + increase > maxAllowedQty + 0.0001) {
      toast.addToast(`Quantity exceeds limit. Current: ${totalProducedQty.toFixed(2)}, Increase: ${increase.toFixed(2)}, Allowed: ${maxAllowedQty.toFixed(2)}`, 'error');
      return;
    }

    try {
      setFormLoading(true)
      await productionService.createRejection({
        ...rejectionForm,
        job_card_id: jobCardId,
        rejection_reason: rejectionForm.reason
      })
      toast.addToast('Quality entry added successfully', 'success')
      setRejectionForm({ ...rejectionForm, accepted_qty: 0, rejected_qty: 0, scrap_qty: 0, reason: '' })
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add quality entry', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddDowntime = async (e) => {
    e.preventDefault()
    try {
      setFormLoading(true)
      
      const duration_minutes = calculateDurationMinutes(
        downtimeForm.from_time,
        downtimeForm.from_period,
        downtimeForm.to_time,
        downtimeForm.to_period
      );

      await productionService.createDowntime({
        ...downtimeForm,
        duration_minutes,
        job_card_id: jobCardId
      })
      toast.addToast('Downtime entry added successfully', 'success')
      setDowntimeForm({ 
        ...downtimeForm, 
        downtime_reason: '',
        ...getShiftTimings(downtimeForm.shift)
      })
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add downtime entry', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteTimeLog = async (id) => {
    if (window.confirm('Remove this time log?')) {
      try {
        await productionService.deleteTimeLog(id)
        toast.addToast('Entry removed', 'success')
        fetchAllData()
      } catch (err) {
        toast.addToast(err.message || 'Failed to remove entry', 'error')
      }
    }
  }

  const handleDeleteRejection = async (id) => {
    if (window.confirm('Remove this quality entry?')) {
      try {
        await productionService.deleteRejection(id)
        toast.addToast('Entry removed', 'success')
        fetchAllData()
      } catch (err) {
        toast.addToast(err.message || 'Failed to remove entry', 'error')
      }
    }
  }

  const handleDeleteDowntime = async (id) => {
    if (window.confirm('Remove this downtime entry?')) {
      try {
        await productionService.deleteDowntime(id)
        toast.addToast('Entry removed', 'success')
        fetchAllData()
      } catch (err) {
        toast.addToast(err.message || 'Failed to remove entry', 'error')
      }
    }
  }

  const handleSubmitProduction = async () => {
    try {
      setIsSubmitting(true)

      const totalAccepted = totalAcceptedQty

      await productionService.updateJobCard(jobCardId, {
        status: 'completed',
        actual_end_date: new Date().toISOString()
      })

      if (nextOperationForm.next_operation_id) {
        // Find the selected operation's details to get its sequence
        const selectedOp = operations.find(op => 
          (op.operation_id || op.id || op.operation_name || op.name) === nextOperationForm.next_operation_id
        );
        
        const selectedSeq = selectedOp ? parseInt(selectedOp.sequence || selectedOp.seq || selectedOp.operation_seq || 0) : 0;

        const nextJobCard = allJobCards.find(c =>
          (c.operation_id === nextOperationForm.next_operation_id ||
            c.operation === nextOperationForm.next_operation_id) &&
          parseInt(c.operation_sequence) === selectedSeq
        )

        if (nextJobCard) {
          await productionService.updateJobCard(nextJobCard.job_card_id, {
            planned_quantity: totalAccepted,
            operator_id: nextOperationForm.next_operator_id,
            machine_id: nextOperationForm.next_machine_id,
            status: 'draft'
          })
        }
      }

      toast.addToast('Production stage completed successfully', 'success')
      navigate('/manufacturing/job-cards')
    } catch (err) {
      toast.addToast(err.message || 'Failed to complete production', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateDailyReport = () => {
    const reportData = {};

    // Process time logs for produced quantity
    timeLogs.forEach(log => {
      const dateKey = new Date(log.log_date).toISOString().split('T')[0];
      const shiftKey = normalizeShift(log.shift);
      const key = `${dateKey}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          operator: log.operator_name,
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0
        };
      }
      reportData[key].produced += parseFloat(log.completed_qty || 0);
    });

    // Process rejections for quality data
    rejections.forEach(rej => {
      const dateKey = new Date(rej.log_date).toISOString().split('T')[0];
      const shiftKey = normalizeShift(rej.shift);
      const key = `${dateKey}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          operator: 'N/A',
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0
        };
      }
      reportData[key].accepted += parseFloat(rej.accepted_qty || 0);
      reportData[key].rejected += parseFloat(rej.rejected_qty || 0);
      reportData[key].scrap += parseFloat(rej.scrap_qty || 0);
    });

    // Process downtimes
    downtimes.forEach(down => {
      const dateKey = new Date(down.log_date).toISOString().split('T')[0];
      const shiftKey = normalizeShift(down.shift);
      const key = `${dateKey}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          operator: 'N/A',
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0
        };
      }
      reportData[key].downtime += parseFloat(down.duration_minutes || 0);
    });

    return Object.values(reportData).sort((a, b) => new Date(b.date) - new Date(a.date) || b.shift.localeCompare(a.shift));
  };

  const downloadReport = () => {
    const data = generateDailyReport();
    const headers = ['Date', 'Shift', 'Operator', 'Produced', 'Accepted', 'Rejected', 'Scrap', 'Downtime (min)'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date,
        row.shift,
        `"${row.operator || 'N/A'}"`,
        row.produced.toFixed(2),
        row.accepted.toFixed(2),
        row.rejected.toFixed(2),
        row.scrap.toFixed(2),
        row.downtime.toFixed(0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Production_Report_${jobCardId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Syncing Production Environment...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-2 font-sans antialiased text-slate-900">

      <div className="w-full mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center shadow-lg shadow-slate-200">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl  text-slate-900 ">
                  Production Entry
                </h1>
                <StatusBadge status={jobCardData?.status} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span className="font-medium text-slate-700">{jobCardData?.job_card_id || 'LOADING...'}</span>
                <span className="text-slate-300">•</span>
                <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manufacturing/job-cards')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded transition-all"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            {isOperationFinished && normalizeStatus(jobCardData?.status) !== 'completed' && (
              <button
                onClick={handleSubmitProduction}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200 transition-all text-sm font-medium animate-bounce"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                {normalizeStatus(jobCardData?.status) === 'completed' ? 'Update & Sync Stage' : 'Complete Production'}
              </button>
            )}
          </div>
        </div>

        {/* New Horizontal Context & Stats Bar */}
        <div className="grid grid-cols-12 gap-4 mb28">
          {/* Target Item Card - Horizontal Layout */}
          <Card className="col-span-12  border-slate-100 bg-white p-2 flex flex-col md:flex-row items-start md:items-center gap-6 ">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-slate-50 rounded flex items-center justify-center border border-slate-100 shrink-0">
                <Package className="text-slate-400" size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Target Item</p>
                <h2 className="text-base text-slate-900 truncate font-medium" title={itemName || jobCardData?.item_name}>
                  {itemName || jobCardData?.item_name || 'N/A'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{jobCardData?.item_code || '---'}</p>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 hidden md:block" />

            <div className="flex items-center gap-8 px-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Planned</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-md text-slate-900 ">
                    {parseFloat(maxAllowedQty || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Produced</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-slate-900 ">
                    {totalProducedQty.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Accepted</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-emerald-600 ">
                    {totalAcceptedQty.toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Current Op</p>
                <div className="flex items-center gap-2 text-indigo-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-sm  truncate max-w-[120px]" title={jobCardData?.operation}>
                    {jobCardData?.operation || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Section - Horizontal Layout */}
          <div className="col-span-12 xl:col-span-6">
            {(() => {
              const expectedMinutes = (operationCycleTime || 0) * (totalProducedQty || 0)
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
                <div className="grid grid-cols-3 gap-4 h-full">
                  <StatCard
                    label="Efficiency"
                    value={`${efficiency}%`}
                    icon={Activity}
                    color={efficiency >= 90 ? 'emerald' : efficiency >= 75 ? 'amber' : 'rose'}
                    subtitle={`${actualMinutes.toFixed(0)} / ${expectedMinutes.toFixed(0)} MIN`}
                  />
                  <StatCard
                    label="Quality Yield"
                    value={`${qualityScore}%`}
                    icon={ShieldCheck}
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
          
        </div>
        <Card className="p-2  border-slate-200 bg-white rounded">

          <div className="space-y-1 flex">
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
            <NavItem
              label="Daily Report"
              icon={FileText}
              section="daily-report"
              isActive={activeSection === 'daily-report'}
              onClick={scrollToSection}
              color="rose"
            />
          </div>
        </Card>
        <div className="grid grid-cols-12 gap-2">
          {/* Left Column: Navigation Only */}
          <div className="col-span-12 lg:col-span-2">
            <div className="sticky top-8 space-y-6">
              {/* Quick Navigation Card */}


              {previousOperationData && (
                <Card className="p-0 border-none bg-emerald-50/20 rounded-xl overflow-hidden border border-emerald-100/50 ">
                  <div className="p-3 bg-emerald-600 text-white flex items-center gap-2">
                    <CheckCircle size={14} />
                    <h3 className="text-[10px] uppercase tracking-wider  text-white/90">Previous Phase</h3>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-emerald-600/70 mb-1 font-semibold">Operation</p>
                      <p className="text-xs text-slate-900 font-medium">{previousOperationData.operation}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Accepted</p>
                        <p className="text-sm text-emerald-600 ">
                          {parseFloat(parseFloat(previousOperationData.accepted_quantity) || ((parseFloat(previousOperationData.produced_quantity) || 0) - (parseFloat(previousOperationData.rejected_quantity) || 0))).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Rejected</p>
                        <p className="text-sm text-rose-500 ">
                          {parseFloat(previousOperationData.rejected_quantity || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-12 ">
            {/* Time Logs Section */}
            <div id="time-logs" className="animate-in fade-in slide-in-from-bottom-2 bg-blue-50/50 duration-300 rounded-xl p-4">
              <Card className="p-2 border-none bg-white/80 overflow-visible">
                <SectionTitle title="Add Time Log" icon={Plus} />
                <form onSubmit={handleAddTimeLog} className="grid grid-cols-12 gap-2  items-end items-end">
                  <div className='col-span-3'>
                    <FieldWrapper label="Day & Date" required >
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder='1'
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
                      {(() => {
                        const stats = getShiftStats(timeLogForm.log_date, timeLogForm.shift);
                        return stats.maxProduced > 0 ? (
                          <p className="text-[9px] text-indigo-600 mt-1 font-medium italic">
                            Already logged in this shift: {stats.maxProduced.toFixed(0)} units
                          </p>
                        ) : null;
                      })()}
                    </FieldWrapper>
                  </div>

                  <div className='col-span-3'>
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
                  </div>
                  <div className='col-span-3'>
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
                  </div>
                  <div className='col-span-1'>
                    <FieldWrapper label="Shift" required>
                      <select
                        value={timeLogForm.shift}
                        onChange={(e) => handleShiftChange(e.target.value, 'timeLog')}
                        className="w-full p-2  bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        {shifts.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-2'>
                    <FieldWrapper label="Produce Qty" required>
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
                  </div>

                  <div className="col-span-4">
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



                  <div className="flex items-end flex-1 col-span-3">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      {formLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      Record Time
                    </button>
                  </div>
                </form>

                {/* Logs Table */}
                <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-2  text-slate-400 w-12 text-center">Day</th>
                        <th className="p-2  text-slate-400 ">Date / Shift</th>
                        <th className="p-2  text-slate-400 ">Operator</th>
                        <th className="p-2  text-slate-400 ">Time Interval</th>
                        <th className="p-2  text-slate-400  text-right">Produced Qty</th>
                        <th className="p-2  text-slate-400  text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {timeLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 italic">No production time recorded for this job card yet</td>
                        </tr>
                      ) : (
                        timeLogs.map((log) => (
                          <tr key={log.time_log_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md ">
                                {log.day_number || '-'}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-slate-900">{new Date(log.log_date).toLocaleDateString()}</p>
                              <p className="text-[10px] text-slate-400">Shift {normalizeShift(log.shift)}</p>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px]  text-slate-500 uppercase">
                                  {log.operator_name?.charAt(0) || 'U'}
                                </div>
                                <span>{log.operator_name || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock size={12} className="text-slate-300" />
                                <span>{log.from_time} {log.from_period} - {log.to_time} {log.to_period}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className=" text-indigo-600">{parseFloat(log.completed_qty).toLocaleString()}</span>
                              <span className="ml-1 text-[10px] text-slate-400 uppercase tracking-wider">Units</span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteTimeLog(log.time_log_id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Quality Check Section */}
            <div id="quality-entry" className="animate-in fade-in slide-in-from-bottom-2 bg-emerald-50/50 duration-300 rounded-xl p-4">
              <Card className="p-3 border-none bg-white/80">
                <SectionTitle title="Quality & Rejection Entry" icon={ShieldCheck} />
                <form onSubmit={handleAddRejection} className="grid grid-cols-12 gap-2  items-end">
                  <div className='col-span-3'>
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
                      {(() => {
                        const stats = getShiftStats(rejectionForm.log_date, rejectionForm.shift);
                        return stats.produced > 0 ? (
                          <p className="text-[9px] text-indigo-600 mt-1 font-medium italic">
                            Produced units in this shift: {stats.produced.toFixed(0)} units
                          </p>
                        ) : null;
                      })()}
                    </FieldWrapper>
                  </div>

                  <div className='col-span-1'>
                    <FieldWrapper label="Shift" required>
                      <select
                        value={rejectionForm.shift}
                        onChange={(e) => handleShiftChange(e.target.value, 'rejection')}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        {shifts.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-1'>
                    <FieldWrapper label="Produce Qty">
                      <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700  h-[34px] flex items-center justify-center">
                        {rejectionForm.produce_qty || 0}
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-2'>
                    <FieldWrapper label="Rejection Reason">
                      <select
                        value={rejectionForm.reason}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        <option value="">Select Reason</option>
                        {rejectionReasons.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>


                  <div className='col-span-1'>
                    <FieldWrapper label="Accepted" required>
                      <input
                        type="number"
                        step="0.01"
                        value={rejectionForm.accepted_qty}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, accepted_qty: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-emerald-50/50 border border-emerald-100 rounded text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-700 "
                        required
                      />
                    </FieldWrapper>
                  </div>
                  <div className='col-span-1'>
                    <FieldWrapper label="Rejected" required>
                      <input
                        type="number"
                        step="0.01"
                        value={rejectionForm.rejected_qty}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-rose-50/50 border border-rose-100 rounded text-xs outline-none focus:ring-2 focus:ring-rose-500/20 transition-all text-rose-700 "
                        required
                      />
                    </FieldWrapper>
                  </div>
                  <div className='col-span-1'>
                    <FieldWrapper label="Scrap" required>
                      <input
                        type="number"
                        step="0.01"
                        value={rejectionForm.scrap_qty}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, scrap_qty: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-slate-500/20 transition-all "
                        required
                      />
                    </FieldWrapper>
                  </div>


                  <div className="col-span-2 ">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      {formLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      Save Entry
                    </button>
                  </div>
                </form>

                <div className="mt-2  border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-2 text-slate-400 w-12 text-center">Day</th>
                        <th className="p-2 text-slate-400">Date / Shift</th>
                        <th className="p-2 text-slate-400">Status / Reason</th>
                        <th className="p-2 text-slate-400 text-center">Accepted</th>
                        <th className="p-2 text-slate-400 text-center">Rejected</th>
                        <th className="p-2 text-slate-400 text-center">Scrap</th>
                        <th className="p-2 text-slate-400 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rejections.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-slate-400 italic">No quality inspection records found</td>
                        </tr>
                      ) : (
                        rejections.map((rej) => (
                          <tr key={rej.rejection_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md ">
                                {rej.day_number || '-'}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-slate-900">{new Date(rej.log_date).toLocaleDateString()}</p>
                              <p className="text-[10px] text-slate-400 uppercase">Shift {normalizeShift(rej.shift)}</p>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                {parseFloat(rej.rejected_qty) > 0 ? (
                                  <span className="p-1 bg-rose-50 text-rose-600 rounded text-[10px]  w-fit uppercase">Defect Found</span>
                                ) : (
                                  <span className="p-1 bg-emerald-50 text-emerald-600 rounded text-[10px]  w-fit uppercase">Passed</span>
                                )}
                                <span className="text-slate-500">{rej.rejection_reason || 'Standard Inspection'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-emerald-600 ">{parseFloat(rej.accepted_qty).toLocaleString()}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-rose-500 ">{parseFloat(rej.rejected_qty).toLocaleString()}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-slate-600 ">{parseFloat(rej.scrap_qty).toLocaleString()}</span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteRejection(rej.rejection_id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Downtime Section */}
            <div id="downtime" className="animate-in fade-in slide-in-from-bottom-2 bg-rose-50/50 duration-300 rounded-xl p-4">
              <Card className="p-3 border-none bg-white/80">
                <SectionTitle title="Operational Downtime" icon={AlertTriangle} />
                <form onSubmit={handleAddDowntime} className="grid grid-cols-12 gap-2">
                  <div className='col-span-3'>
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
                  </div>

                  <div className='col-span-1'>
                    <FieldWrapper label="Shift" required>
                      <select
                        value={downtimeForm.shift}
                        onChange={(e) => handleShiftChange(e.target.value, 'downtime')}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        {shifts.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-2'>
                    <FieldWrapper label="Downtime Type" required>
                      <select
                        value={downtimeForm.downtime_type}
                        onChange={(e) => setDowntimeForm({ ...downtimeForm, downtime_type: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        required
                      >
                        <option value="">Select Type</option>
                        {downtimeTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>

                  <div className="col-span-4 flex flex-1 gap-2 ">
                    <FieldWrapper label="Start Time" required>
                      <div className="flex gap-1">
                        <input
                          type="time"
                          value={downtimeForm.from_time}
                          onChange={(e) => setDowntimeForm({ ...downtimeForm, from_time: e.target.value })}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                          required
                        />
                        <select
                          value={downtimeForm.from_period}
                          onChange={(e) => setDowntimeForm({ ...downtimeForm, from_period: e.target.value })}
                          className="p-2 bg-slate-100 border border-slate-200 rounded text-xs"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </FieldWrapper>
                    <FieldWrapper label="End Time" required>
                      <div className="flex gap-1">
                        <input
                          type="time"
                          value={downtimeForm.to_time}
                          onChange={(e) => setDowntimeForm({ ...downtimeForm, to_time: e.target.value })}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                          required
                        />
                        <select
                          value={downtimeForm.to_period}
                          onChange={(e) => setDowntimeForm({ ...downtimeForm, to_period: e.target.value })}
                          className="p-2 bg-slate-100 border border-slate-200 rounded text-xs"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </FieldWrapper>
                  </div>



                  <div className="flex items-end col-span-2 ">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 disabled:opacity-50 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                    >
                      {formLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      Record Downtime
                    </button>
                  </div>
                </form>

                <div className="mt-8 overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-2 text-slate-400 w-12 text-center">Day</th>
                        <th className="p-2 text-slate-400">Date / Shift</th>
                        <th className="p-2 text-slate-400">Category / Reason</th>
                        <th className="p-2 text-slate-400">Interval</th>
                        <th className="p-2 text-slate-400 text-right">Duration</th>
                        <th className="p-2 text-slate-400 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {downtimes.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 italic">No operational downtime logs found</td>
                        </tr>
                      ) : (
                        downtimes.map((down) => (
                          <tr key={down.downtime_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md ">
                                {down.day_number || '-'}
                              </span>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-slate-900">{new Date(down.log_date).toLocaleDateString()}</p>
                              <p className="text-[10px] text-slate-400 uppercase">Shift {normalizeShift(down.shift)}</p>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-slate-900">{down.downtime_type}</p>
                              <p className="text-slate-500">{down.downtime_reason}</p>
                            </td>
                            <td className="p-3 text-slate-600">
                              {down.from_time} - {down.to_time}
                            </td>
                            <td className="p-3 text-right">
                              <span className=" text-amber-600">{down.duration_minutes}</span>
                              <span className="ml-1 text-[10px] text-slate-400 uppercase tracking-wider">Mins</span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteDowntime(down.downtime_id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Next Operation Section */}
            <div id="next-operation" className="animate-in fade-in slide-in-from-bottom-2 bg-amber-50/50 duration-300 rounded-xl p-4">
              <Card className="p-0 border-none overflow-hidden bg-white/80 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                <div className="p-2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-md  text-slate-900 flex items-center gap-2">
                        Next Stage Configuration
                        <span className="p-1 bg-emerald-50 text-emerald-600 text-xs rounded border border-emerald-100 ">Active</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Specify destination and operational parameters for the next manufacturing phase</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2  py-1.5 rounded border border-emerald-100">
                      <Activity size={14} className="animate-pulse" />
                      <span className="text-xs ">Ready for Dispatch</span>
                    </div>
                  </div>

                  {(() => {
                    const currentSequence = parseInt(jobCardData?.operation_sequence || 0);
                    const nextOps = operations.filter(op => {
                      const opSeq = parseInt(op.sequence || op.seq || op.operation_seq || 0);
                      // Only show subsequent operations
                      if (opSeq <= currentSequence) return false;
                      
                      // Filter out already completed operations from allJobCards
                      const isCompleted = allJobCards.some(jc => 
                        (jc.operation_id === op.operation_id || jc.operation === op.operation_name || jc.operation === op.name) && 
                        normalizeStatus(jc.status) === 'completed'
                      );
                      
                      return !isCompleted;
                    });

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className='col-span-3'>
                          <FieldWrapper label="Next Operation" required>
                            <div className="group relative">
                              <SearchableSelect
                                value={nextOperationForm.next_operation_id}
                                onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operation_id: val })}
                                options={nextOps.map(op => ({
                                  value: op.operation_id || op.id || op.operation_name || op.name,
                                  label: op.operation_name || op.name
                                }))}
                                placeholder="Select Next Op"
                                containerClassName="  rounded bg-slate-50 border-slate-200 transition-all"
                              />
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-emerald-500 rounded-full transition-all duration-300"></div>
                            </div>
                          </FieldWrapper>
                        </div>

                        <div className='col-span-3'>
                          <FieldWrapper label="Assign Operator">
                            <div className="group relative">
                              <SearchableSelect
                                value={nextOperationForm.next_operator_id}
                                onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operator_id: val })}
                                options={operators.map(op => ({
                                  value: op.employee_id,
                                  label: `${op.first_name} ${op.last_name}`
                                }))}
                                placeholder="Search Operator..."
                                containerClassName="  rounded bg-slate-50 border-slate-200 transition-all"
                              />
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-indigo-500 rounded-full transition-all duration-300"></div>
                            </div>
                          </FieldWrapper>
                        </div>

                        <div className='col-span-3'>
                          <FieldWrapper label="Target Warehouse" required>
                            <div className="group relative">
                              <SearchableSelect
                                value={nextOperationForm.next_warehouse_id}
                                onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: val })}
                                options={warehouses.map(w => ({
                                  value: w.warehouse_id || w.id || w.name,
                                  label: w.warehouse_name || w.name
                                }))}
                                placeholder="Select Destination"
                                containerClassName="  rounded bg-slate-50 border-slate-200 transition-all"
                              />
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-amber-500 rounded-full transition-all duration-300"></div>
                            </div>
                          </FieldWrapper>
                        </div>
                        <div className=" items-center gap-6 col-span-3">
                          <p className="text-xs text-slate-400 ">Execution Mode:</p>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => setNextOperationForm({ ...nextOperationForm, inhouse: !nextOperationForm.inhouse, outsource: false })}
                              className={`flex items-center gap-2 p-2 rounded border-2 transition-all duration-300 ${nextOperationForm.inhouse ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${nextOperationForm.inhouse ? 'border-emerald-500 bg-white' : 'border-slate-300'}`}>
                                {nextOperationForm.inhouse && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                              </div>
                              <span className="text-xs ">In-house</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNextOperationForm({ ...nextOperationForm, outsource: !nextOperationForm.outsource, inhouse: false })}
                              className={`flex items-center gap-2 p-2 rounded border-2 transition-all duration-300 ${nextOperationForm.outsource ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${nextOperationForm.outsource ? 'border-indigo-500 bg-white' : 'border-slate-300'}`}>
                                {nextOperationForm.outsource && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </div>
                              <span className="text-xs ">Outsource</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-2 border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">


                    {isOperationFinished && (
                      <button
                        onClick={handleSubmitProduction}
                        disabled={isSubmitting}
                        className="relative group overflow-hidden p-2 bg-emerald-600 text-white rounded hover:shadow-emerald-200 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95 animate-pulse"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="relative flex items-center gap-4">
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded animate-spin" />
                          ) : (
                            <div className="p-1.5 bg-white/10 rounded group-hover:bg-white/20 transition-colors">
                              <CheckCircle size={10} />
                            </div>
                          )}
                          <div className="text-left">
                            <p className="text-xs text-white/50 leading-none">
                              {normalizeStatus(jobCardData?.status) === 'completed' ? 'Synchronize Next Stage' : 'Finalize & Dispatch'}
                            </p>
                            <p className="text-xs">
                              {normalizeStatus(jobCardData?.status) === 'completed' ? 'Update Stage' : 'Complete Production'}
                            </p>
                          </div>
                          <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Daily Production Report Section */}
            <div id="daily-report" className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="p-4 border-slate-200 bg-white rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <SectionTitle 
                    title="Daily Production Report" 
                    icon={FileText} 
                    subtitle="Consolidated daily and shift-wise production metrics"
                  />
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium border border-indigo-100"
                  >
                    <FileText size={16} />
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto rounded border border-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-2  text-slate-600">Date</th>
                        <th className="p-2  text-slate-600">Shift</th>
                        <th className="p-2  text-slate-600">Operator</th>
                        <th className="p-2  text-slate-600 text-right">Produced</th>
                        <th className="p-2  text-slate-600 text-right">Accepted</th>
                        <th className="p-2  text-slate-600 text-right text-rose-500">Rejected</th>
                        <th className="p-2  text-slate-600 text-right">Scrap</th>
                        <th className="p-2  text-slate-600 text-right">Downtime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {generateDailyReport().length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-10 text-center text-slate-400 italic bg-slate-50/30">
                            No production data available to generate report
                          </td>
                        </tr>
                      ) : (
                        generateDailyReport().map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-2 font-medium text-slate-900">{new Date(row.date).toLocaleDateString()}</td>
                            <td className="p-2">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px]  rounded uppercase">
                                Shift {row.shift}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600">{row.operator || 'N/A'}</td>
                            <td className="p-2 text-right font-semibold text-slate-900">{row.produced.toLocaleString()}</td>
                            <td className="p-2 text-right  text-emerald-600">{row.accepted.toLocaleString()}</td>
                            <td className="p-2 text-right  text-rose-500">{row.rejected.toLocaleString()}</td>
                            <td className="p-2 text-right font-medium text-slate-500">{row.scrap.toLocaleString()}</td>
                            <td className="p-2 text-right">
                              <span className="text-amber-600 font-medium">{row.downtime}</span>
                              <span className="ml-1 text-[10px] text-slate-400 uppercase">min</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

    </div>


  )
}
