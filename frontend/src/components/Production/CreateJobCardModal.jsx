import React, { useState, useEffect } from 'react'
import api, { 
  jobCardsAPI, 
  workOrdersAPI, 
  workstationsAPI, 
  employeesAPI,
  schedulingAPI
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import { 
  Plus, X, Edit, User, Calendar, FileText, 
  Hash, ClipboardList, CheckCircle2, 
  Info, AlertCircle, Settings, 
  UserCheck, Activity, Clock
} from 'lucide-react'

const parseUTCDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr);
};

const formatToUTC = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

export default function CreateJobCardModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onConflict,
  editingId, 
  preSelectedWorkOrderId, 
  preSelectedOperation,
  preSelectedMachine,
  preSelectedStartTime,
  allJobCards = [],
  allWorkstations = []
}) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  
  const [workOrders, setWorkOrders] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [formData, setFormData] = useState({
    work_order_id: '',
    machine_id: '',
    operator_id: '',
    operation: '',
    operation_sequence: null,
    operation_type: 'IN_HOUSE',
    execution_mode: 'IN_HOUSE',
    vendor_id: '',
    vendor_name: '',
    vendor_rate_per_unit: 0,
    planned_quantity: '100',
    produced_quantity: 0,
    accepted_quantity: 0,
    scheduled_start_date: '', // Will be initialized in useEffect
    scheduled_end_date: '',
    status: 'draft',
    notes: '',
    hourly_rate: 0,
    operating_cost: 0,
    operation_time: 0
  })

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && editingId && workOrders.length > 0) {
      fetchJobCardDetails(editingId)
    }
  }, [isOpen, editingId, workOrders])

  useEffect(() => {
    if (isOpen && !editingId && !preSelectedStartTime && !formData.scheduled_start_date) {
      setFormData(prev => ({
        ...prev,
        scheduled_start_date: formatForDateTimeLocal(new Date())
      }))
    }
  }, [isOpen, editingId, preSelectedStartTime])

  useEffect(() => {
    if (isOpen && preSelectedMachine && !editingId) {
      setFormData(prev => ({
        ...prev,
        machine_id: preSelectedMachine
      }))
    }
  }, [isOpen, preSelectedMachine, editingId])

  const formatForDateTimeLocal = (date) => {
    if (!date) return ''
    let d = new Date(date)
    
    // If it's a string from MySQL (e.g., "2026-03-18 22:30:00") and lacks timezone,
    // treat it as UTC since that's how we store it.
    if (typeof date === 'string' && !date.includes('Z') && !date.includes('+')) {
      const utcDate = new Date(date.replace(' ', 'T') + 'Z')
      if (!isNaN(utcDate.getTime())) {
        d = utcDate
      }
    }
    
    if (isNaN(d.getTime())) return ''
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  useEffect(() => {
    if (isOpen && preSelectedStartTime && !editingId) {
      setFormData(prev => ({
        ...prev,
        scheduled_start_date: formatForDateTimeLocal(preSelectedStartTime)
      }))
    }
  }, [isOpen, preSelectedStartTime, editingId])

  useEffect(() => {
    if (isOpen && preSelectedWorkOrderId && workOrders.length > 0 && !editingId) {
      const wo = workOrders.find(w => w.wo_id === preSelectedWorkOrderId)
      if (wo) {
        handleSelectWorkOrder(wo.wo_id)
        setFormData(prev => ({
          ...prev,
          work_order_id: wo.wo_id,
          planned_quantity: wo.quantity || wo.qty_to_manufacture || '100'
        }))

        if (preSelectedOperation) {
          setFormData(prev => ({
            ...prev,
            operation: preSelectedOperation.operation || preSelectedOperation.operation_name || '',
            machine_id: preSelectedOperation.workstation || preSelectedOperation.workstation_type || '',
            operation_sequence: preSelectedOperation.sequence || 0,
            operation_type: preSelectedOperation.operation_type || 'IN_HOUSE',
            execution_mode: preSelectedOperation.execution_mode || 'IN_HOUSE',
            vendor_id: preSelectedOperation.vendor_id || '',
            vendor_name: preSelectedOperation.vendor_name || '',
            vendor_rate_per_unit: preSelectedOperation.vendor_rate_per_unit || 0,
            hourly_rate: preSelectedOperation.hourly_rate || 0,
            operating_cost: preSelectedOperation.operating_cost || 0,
            operation_time: preSelectedOperation.operation_time || preSelectedOperation.time || 0
          }))
        }
      }
    }
  }, [isOpen, preSelectedWorkOrderId, workOrders, editingId, preSelectedOperation])

  const [suggestedSlots, setSuggestedSlots] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await Promise.all([
        fetchWorkOrders(),
        fetchWorkstations(),
        fetchOperators(),
        fetchSuppliers()
      ])
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      const response = await workOrdersAPI.list()
      setWorkOrders(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch work orders:', err)
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await workstationsAPI.list()
      setWorkstations(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchOperators = async () => {
    try {
      const response = await employeesAPI.list()
      setOperators(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch operators:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list()
      setSuppliers(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  const fetchJobCardDetails = async (id) => {
    try {
      const response = await jobCardsAPI.get(id)
      const jc = response.data.data || response.data
      
      if (jc.work_order_id) {
        handleSelectWorkOrder(jc.work_order_id)
      }
      
      setFormData({
        work_order_id: jc.work_order_id || '',
        machine_id: jc.machine_id || '',
        operator_id: jc.operator_id || '',
        operation: jc.operation || '',
        operation_sequence: jc.operation_sequence || null,
        operation_type: jc.operation_type || 'IN_HOUSE',
        execution_mode: jc.execution_mode || 'IN_HOUSE',
        vendor_id: jc.vendor_id || '',
        vendor_name: jc.vendor_name || '',
        vendor_rate_per_unit: jc.vendor_rate_per_unit || 0,
        planned_quantity: String(jc.planned_quantity || jc.quantity || '100'),
        produced_quantity: jc.produced_quantity || 0,
        accepted_quantity: jc.accepted_quantity || 0,
        scheduled_start_date: jc.scheduled_start_date ? formatForDateTimeLocal(jc.scheduled_start_date) : formatForDateTimeLocal(new Date()),
        scheduled_end_date: jc.scheduled_end_date ? formatForDateTimeLocal(jc.scheduled_end_date) : '',
        status: jc.status || 'draft',
        notes: jc.notes || '',
        hourly_rate: jc.hourly_rate || 0,
        operating_cost: jc.operating_cost || 0,
        operation_time: jc.operation_time || 0
      })
    } catch (err) {
      console.error('Error loading job card:', err)
      setError('Failed to load job card details')
    }
  }

  const handleSelectWorkOrder = async (woId) => {
    try {
      const response = await workOrdersAPI.get(woId)
      const woData = response.data.data || response.data
      
      const ops = (woData.operations || []).map(op => ({
        label: op.operation_name || op.operation || '',
        value: op.operation_name || op.operation || '',
        sequence: op.sequence || op.operation_sequence || 0,
        operation_type: op.operation_type || 'IN_HOUSE',
        execution_mode: op.execution_mode || 'IN_HOUSE',
        vendor_id: op.vendor_id || '',
        vendor_name: op.vendor_name || '',
        vendor_rate_per_unit: op.vendor_rate_per_unit || 0,
        hourly_rate: op.hourly_rate || 0,
        operating_cost: op.operating_cost || 0,
        operation_time: op.operation_time || op.time || 0
      }))
      
      setOperations(ops)
    } catch (err) {
      console.error('Failed to fetch work order operations:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Auto-calculate end date based on operation time and quantity
      if ((name === 'scheduled_start_date' || name === 'planned_quantity') && updated.execution_mode !== 'OUTSOURCE') {
        const startTime = name === 'scheduled_start_date' ? value : prev.scheduled_start_date
        const qty = parseFloat(name === 'planned_quantity' ? value : prev.planned_quantity) || 0
        const opTime = parseFloat(updated.operation_time) || 0

        if (startTime && qty > 0 && opTime > 0) {
          const start = new Date(startTime)
          if (!isNaN(start.getTime())) {
            const totalMinutes = qty * opTime
            const end = new Date(start.getTime() + (totalMinutes * 60000))
            updated.scheduled_end_date = formatForDateTimeLocal(end)
          }
        }
      }
      
      return updated
    })
    setError(null)
  }

  const handleSuggestSlot = async () => {
    if (!formData.machine_id) {
      setError('Please select a workstation first')
      return
    }
    
    // Use total operation time for duration
    const qty = parseFloat(formData.planned_quantity) || 0
    const opTime = parseFloat(formData.operation_time) || 0
    const duration = (qty * opTime) || 60
    
    try {
      setLoading(true)
      const date = formData.scheduled_start_date ? formData.scheduled_start_date.split('T')[0] : ''
      const response = await schedulingAPI.suggestSlot(formData.machine_id, duration, date)
      
      if (response.data.success) {
        const slots = response.data.data
        if (Array.isArray(slots) && slots.length > 0) {
          setSuggestedSlots(slots)
          setShowSuggestions(true)
          
          const { start, end } = slots[0]
          setFormData(prev => ({
            ...prev,
            scheduled_start_date: formatForDateTimeLocal(start),
            scheduled_end_date: formatForDateTimeLocal(end)
          }))
        } else if (slots && slots.start) {
          const { start, end } = slots
          setFormData(prev => ({
            ...prev,
            scheduled_start_date: formatForDateTimeLocal(start),
            scheduled_end_date: formatForDateTimeLocal(end)
          }))
          setSuggestedSlots([slots])
        }
      }
    } catch (err) {
      setError('Failed to suggest a slot: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const getMachineConflict = () => {
    const { machine_id, operator_id, scheduled_start_date, scheduled_end_date } = formData;
    if (!scheduled_start_date || !scheduled_end_date) return null;
    
    const start = parseUTCDate(scheduled_start_date);
    const end = parseUTCDate(scheduled_end_date);
    
    const startTime = start instanceof Date && !isNaN(start.getTime()) ? start.getTime() : NaN;
    const endTime = end instanceof Date && !isNaN(end.getTime()) ? end.getTime() : NaN;
    
    if (isNaN(startTime) || isNaN(endTime)) return null;

    // 1. Machine Conflict
    if (machine_id) {
      const workstation = allWorkstations.find(ws => ws.name === machine_id);
      const capacity = workstation ? (workstation.parallel_capacity || 1) : 1;
      
      const conflicts = (allJobCards || []).filter(jc => {
        if (!jc) return false;
        if (editingId && jc.job_card_id === editingId) return false;
        if (jc.machine_id !== machine_id) return false;
        if (['completed', 'cancelled'].includes((jc.status || '').toLowerCase())) return false;
        
        const jcStartDate = parseUTCDate(jc.scheduled_start_date);
        const jcEndDate = parseUTCDate(jc.scheduled_end_date);
        
        const jcStart = jcStartDate instanceof Date && !isNaN(jcStartDate.getTime()) ? jcStartDate.getTime() : NaN;
        const jcEnd = jcEndDate instanceof Date && !isNaN(jcEndDate.getTime()) ? jcEndDate.getTime() : NaN;
        
        if (isNaN(jcStart) || isNaN(jcEnd)) return false;
        
        return jcStart < endTime && jcEnd > startTime;
      });
      
      if (conflicts.length >= capacity) {
        return { 
          type: 'machine',
          job_card_id: conflicts[0].job_card_id,
          start: conflicts[0].scheduled_start_date,
          end: conflicts[0].scheduled_end_date,
          message: `Workstation busy with ${conflicts[0].job_card_id}` 
        };
      }
    }

    // 2. Operator Conflict
    if (operator_id) {
      const conflicts = (allJobCards || []).filter(jc => {
        if (!jc) return false;
        if (editingId && jc.job_card_id === editingId) return false;
        if (jc.operator_id !== operator_id) return false;
        if (['completed', 'cancelled'].includes((jc.status || '').toLowerCase())) return false;
        
        const jcStartDate = parseUTCDate(jc.scheduled_start_date);
        const jcEndDate = parseUTCDate(jc.scheduled_end_date);
        
        const jcStart = jcStartDate instanceof Date && !isNaN(jcStartDate.getTime()) ? jcStartDate.getTime() : NaN;
        const jcEnd = jcEndDate instanceof Date && !isNaN(jcEndDate.getTime()) ? jcEndDate.getTime() : NaN;
        
        if (isNaN(jcStart) || isNaN(jcEnd)) return false;
        
        return jcStart < endTime && jcEnd > startTime;
      });

      if (conflicts.length > 0) {
        return { 
          type: 'operator',
          job_card_id: conflicts[0].job_card_id,
          start: conflicts[0].scheduled_start_date,
          end: conflicts[0].scheduled_end_date,
          message: `Operator busy with ${conflicts[0].job_card_id}` 
        };
      }
    }
    
    return null;
  };

  const getSequencingError = () => {
    const { work_order_id, operation_sequence, scheduled_start_date, scheduled_end_date } = formData;
    if (!work_order_id || !operation_sequence || !scheduled_start_date) return null;

    // Find previous operation
    const woJobCards = allJobCards.filter(jc => jc.work_order_id === work_order_id && (jc.status || '').toLowerCase() !== 'cancelled');
    const sortedOps = woJobCards.sort((a, b) => parseFloat(a.operation_sequence) - parseFloat(b.operation_sequence));
    
    const currentIndex = sortedOps.findIndex(jc => jc.job_card_id === editingId);
    let prevOp = null;
    let nextOp = null;

    if (editingId && currentIndex !== -1) {
      prevOp = sortedOps[currentIndex - 1];
      nextOp = sortedOps[currentIndex + 1];
    } else {
      // For new job card, find where it fits or just the last one
      prevOp = sortedOps.filter(jc => parseFloat(jc.operation_sequence) < parseFloat(operation_sequence)).pop();
      nextOp = sortedOps.find(jc => parseFloat(jc.operation_sequence) > parseFloat(operation_sequence));
    }

    if (prevOp && prevOp.scheduled_end_date) {
      const prevEndObj = parseUTCDate(prevOp.scheduled_end_date);
      const currentStartObj = parseUTCDate(scheduled_start_date);
      
      const prevEnd = prevEndObj instanceof Date && !isNaN(prevEndObj.getTime()) ? prevEndObj.getTime() : null;
      const currentStart = currentStartObj instanceof Date && !isNaN(currentStartObj.getTime()) ? currentStartObj.getTime() : null;
      
      if (currentStart && prevEnd && currentStart < prevEnd) {
        return `Must start after ${prevOp.operation} (${new Date(prevEnd).toLocaleString([], { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`;
      }
    }

    if (nextOp && nextOp.scheduled_start_date) {
      const nextStartObj = parseUTCDate(nextOp.scheduled_start_date);
      const currentEndObj = parseUTCDate(scheduled_end_date);
      
      const nextStart = nextStartObj instanceof Date && !isNaN(nextStartObj.getTime()) ? nextStartObj.getTime() : null;
      const currentEnd = currentEndObj instanceof Date && !isNaN(currentEndObj.getTime()) ? currentEndObj.getTime() : null;
      
      if (currentEnd && nextStart && currentEnd > nextStart) {
        return `Must finish before ${nextOp.operation} (${new Date(nextStart).toLocaleString([], { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      const isOutsourced = formData.execution_mode === 'OUTSOURCE';
      const requiredFields = ['work_order_id', 'planned_quantity'];
      if (!isOutsourced) {
        requiredFields.push('scheduled_start_date');
      }
      
      if (!isOutsourced && !formData.machine_id) {
        throw new Error('Please select a workstation for in-house operation');
      }
      
      if (isOutsourced && !formData.vendor_id) {
        throw new Error('Please select a vendor for outsourced operation');
      }

      for (const field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`Please fill in all required fields (${field.replace(/_/g, ' ')})`);
        }
      }

      // Convert local times to UTC ISO strings before sending to API
      const submissionData = { ...formData };
      if (submissionData.scheduled_start_date) {
        submissionData.scheduled_start_date = formatToUTC(submissionData.scheduled_start_date);
      }
      if (submissionData.scheduled_end_date) {
        submissionData.scheduled_end_date = formatToUTC(submissionData.scheduled_end_date);
      }

      const response = editingId 
        ? await jobCardsAPI.update(editingId, submissionData)
        : await jobCardsAPI.create(submissionData)

      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(response.data.error || 'Failed to save job card')
      }
    } catch (err) {
      const errorData = err.response?.data;
      const errorMsg = errorData?.message || err.message || 'Failed to save job card'
      
      const isConflict = err.response?.status === 409 || 
                         errorData?.conflict === true ||
                         errorMsg.toLowerCase().includes('busy') || 
                         errorMsg.toLowerCase().includes('conflict') || 
                         errorMsg.toLowerCase().includes('already assigned') ||
                         errorMsg.toLowerCase().includes('already allocated') ||
                         errorMsg.toLowerCase().includes('must start after') ||
                         errorMsg.toLowerCase().includes('must finish before') ||
                         errorMsg.toLowerCase().includes('sequencing error') ||
                         errorMsg.toLowerCase().includes('engagement');

      if (onConflict && isConflict) {
        onConflict(errorData?.details?.info || errorMsg, editingId, errorData?.details);
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingId ? 'Edit Job Card' : 'Create New Job Card'} 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assignment Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800    border-b border-slate-100 pb-2">
              <Settings size={18} className="text-blue-500" />
              Resource Assignment
            </div>

            <div className="space-y-3">
              <div className="flex p-1 bg-slate-100 rounded  mb-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, execution_mode: 'IN_HOUSE' }))}
                  className={`flex-1 py-1.5 text-[10px]  rounded-md transition-all ${formData.execution_mode === 'IN_HOUSE' ? 'bg-white text-indigo-600  ' : 'text-slate-500'}`}
                >
                  IN-HOUSE
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, execution_mode: 'OUTSOURCE' }))}
                  className={`flex-1 py-1.5 text-[10px]  rounded-md transition-all ${formData.execution_mode === 'OUTSOURCE' ? 'bg-white text-amber-600  ' : 'text-slate-500'}`}
                >
                  OUTSOURCE
                </button>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Work Order *
                </label>
                <SearchableSelect
                  value={formData.work_order_id}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, work_order_id: value }))
                    if (value) handleSelectWorkOrder(value)
                  }}
                  options={workOrders.map(wo => ({
                    value: wo.wo_id,
                    label: `${wo.wo_id} - ${wo.item_name || wo.item_code}`
                  }))}
                  placeholder="Select Work Order"
                />
              </div>

              {formData.execution_mode === 'IN_HOUSE' ? (
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Workstation *
                  </label>
                  <SearchableSelect
                    value={formData.machine_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, machine_id: value }))}
                    options={workstations.map(ws => ({
                      value: ws.workstation_id || ws.name,
                      label: ws.workstation_name || ws.name
                    }))}
                    placeholder="Select Workstation"
                    className={getMachineConflict() ? 'border-amber-300 bg-amber-50' : ''}
                  />
                  {getMachineConflict() && (
                    <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                      ⚠️ {getMachineConflict().message}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                      Vendor / Subcontractor *
                    </label>
                    <SearchableSelect
                      value={formData.vendor_id}
                      onChange={(value) => {
                        const vendor = suppliers.find(s => s.supplier_id === value)
                        setFormData(prev => ({ 
                          ...prev, 
                          vendor_id: value,
                          vendor_name: vendor?.name || ''
                        }))
                      }}
                      options={suppliers.map(s => ({
                        value: s.supplier_id,
                        label: s.name
                      }))}
                      placeholder="Select Vendor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                      Vendor Rate per Unit
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</div>
                      <input
                        type="number"
                        name="vendor_rate_per_unit"
                        value={formData.vendor_rate_per_unit}
                        onChange={handleInputChange}
                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-xs"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.execution_mode === 'IN_HOUSE' && (
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Operator
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <select
                      name="operator_id"
                      value={formData.operator_id}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                    >
                      <option value="">Select Operator (Optional)</option>
                      {operators.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operation Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800    border-b border-slate-100 pb-2">
              <Activity size={18} className="text-indigo-500" />
              Operation Details
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Operation *
                </label>
                <select
                  name="operation"
                  value={formData.operation}
                  onChange={(e) => {
                    const val = e.target.value
                    const selectedOp = operations.find(op => op.value === val)
                    const opTime = selectedOp?.operation_time || 0
                    
                    setFormData(prev => {
                      const updated = { 
                        ...prev, 
                        operation: val,
                        operation_sequence: selectedOp?.sequence || null,
                        operation_type: selectedOp?.operation_type || 'IN_HOUSE',
                        hourly_rate: selectedOp?.hourly_rate || 0,
                        operating_cost: selectedOp?.operating_cost || 0,
                        operation_time: opTime
                      }

                      // Recalculate end date if start date is set
                      if (updated.scheduled_start_date && updated.execution_mode !== 'OUTSOURCE' && opTime > 0) {
                        const start = new Date(updated.scheduled_start_date)
                        const qty = parseFloat(updated.planned_quantity) || 0
                        if (!isNaN(start.getTime()) && qty > 0) {
                          const totalMinutes = qty * opTime
                          const end = new Date(start.getTime() + (totalMinutes * 60000))
                          updated.scheduled_end_date = formatForDateTimeLocal(end)
                        }
                      }
                      
                      return updated
                    })
                  }}
                  className="w-full p-2  border border-slate-200 rounded  focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
                  disabled={!formData.work_order_id}
                >
                  <option value="">Select Operation</option>
                  {operations.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Planned Qty *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="number"
                      name="planned_quantity"
                      value={formData.planned_quantity}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                {editingId && (
                  <>
                    <div>
                      <label className="block text-xs  text-emerald-600  tracking-wider mb-1">
                        Produced Qty
                      </label>
                      <input
                        type="number"
                        name="produced_quantity"
                        value={formData.produced_quantity}
                        onChange={handleInputChange}
                        className="w-full p-2  border border-emerald-100 rounded focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-blue-600  tracking-wider mb-1">
                        Accepted Qty
                      </label>
                      <input
                        type="number"
                        name="accepted_quantity"
                        value={formData.accepted_quantity}
                        onChange={handleInputChange}
                        className="w-full p-2  border border-blue-100 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2  border border-slate-200 rounded  focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {formData.execution_mode !== 'OUTSOURCE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                      Start DateTime *
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduled_start_date"
                      value={formData.scheduled_start_date}
                      onChange={handleInputChange}
                      required
                      className={`w-full p-2  border rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs ${
                        getSequencingError() ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                      }`}
                    />
                    {getSequencingError() && (
                      <span className="text-[10px] text-rose-500 font-medium mt-1 block">
                        ⚠️ {getSequencingError()}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-xs  text-slate-500  tracking-wider mb-1 flex justify-between">
                      End DateTime
                      <button 
                        type="button" 
                        onClick={handleSuggestSlot}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Suggest Slot
                      </button>
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduled_end_date"
                      value={formData.scheduled_end_date}
                      onChange={handleInputChange}
                      className={`w-full p-2  border rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs ${
                        getMachineConflict() ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                      }`}
                    />
                    {getMachineConflict() && (
                      <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                        ⚠️ {getMachineConflict().message}
                      </span>
                    )}
                  </div>

                  {showSuggestions && suggestedSlots.length > 0 && (
                    <div className="col-span-2 bg-amber-50 p-3 rounded  border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1.5">
                          <Clock size={12} /> Available Time Slots
                        </span>
                        <button 
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-[10px] text-amber-500 hover:text-amber-700"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {suggestedSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                scheduled_start_date: formatForDateTimeLocal(slot.start),
                                scheduled_end_date: formatForDateTimeLocal(slot.end)
                              }));
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-md border text-xs transition-all ${
                              formData.scheduled_start_date === formatForDateTimeLocal(slot.start)
                                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                                : 'bg-white text-slate-700 border-amber-100 hover:border-amber-300 hover:bg-amber-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">
                                {new Date(slot.start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <ArrowRight size={12} className={formData.scheduled_start_date === formatForDateTimeLocal(slot.start) ? 'text-white/70' : 'text-slate-300'} />
                              <span className="font-semibold">
                                {new Date(slot.end).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {formData.scheduled_start_date === formatForDateTimeLocal(slot.start) && (
                              <CheckCircle2 size={14} className="text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs  text-slate-500  tracking-wider mb-1">
              Instructions & Notes
            </label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 text-slate-400" size={15} />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Specific instructions for the operator..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            {editingId ? 'Update Job Card' : 'Create Job Card'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
