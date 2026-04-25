import React, { useState, useEffect } from 'react'
import api, {
  jobCardsAPI,
  workstationsAPI,
  employeesAPI,
  schedulingAPI,
  suppliersAPI
} from '../../services/api'

import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import {
  Edit, User, Calendar, FileText,
  Hash, ClipboardList, CheckCircle2,
  Info, AlertCircle, Settings,
  UserCheck, Activity, Clock, ArrowRight,
  TrendingUp, Layers, CheckSquare, Cpu
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

const formatForDateTimeLocal = (date) => {
  if (!date) return ''
  let d = new Date(date)

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

const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return '0 Min';
  
  if (totalMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    
    if (hours === 0) return `${mins} Min`;
    if (mins === 0) return `${hours} Hrs`;
    return `${hours} Hrs ${mins} Min`;
  } else { // 24 hours or more
    const days = Math.floor(totalMinutes / 1440);
    const remainingMinutesAfterDays = totalMinutes % 1440;
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const mins = Math.round(remainingMinutesAfterDays % 60);
    
    let result = `${days} Day${days > 1 ? 's' : ''}`;
    if (hours > 0) result += ` ${hours} Hrs`;
    if (mins > 0) result += ` ${mins} Min`;
    return result;
  }
};

export default function EditJobCardModal({
  isOpen,
  onClose,
  onSuccess,
  onConflict,
  jobCardId,
  allJobCards = [],
  allWorkstations = []
}) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [jobCard, setJobCard] = useState(null)

  const [formData, setFormData] = useState({
    machine_id: '',
    operator_id: '',
    planned_quantity: 0,
    produced_quantity: 0,
    accepted_quantity: 0,
    scheduled_start_date: '',
    scheduled_end_date: '',
    status: '',
    notes: '',
    execution_mode: 'IN_HOUSE',
    vendor_id: '',
    vendor_name: '',
    vendor_rate_per_unit: 0
  })

  useEffect(() => {
    if (isOpen && jobCardId) {
      loadData()
    }
  }, [isOpen, jobCardId])

  const [suggestedSlots, setSuggestedSlots] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const loadData = async () => {
    setFetchingData(true)
    setError(null)
    try {
      const [wsRes, empRes, jcRes, supRes] = await Promise.all([
        workstationsAPI.list(),
        employeesAPI.list(),
        jobCardsAPI.get(jobCardId),
        suppliersAPI.list()
      ])

      setWorkstations(wsRes.data.data || wsRes.data || [])
      setOperators(empRes.data.data || empRes.data || [])
      setSuppliers(supRes.data.data || supRes.data || [])

      const jc = jcRes.data.data || jcRes.data
      setJobCard(jc)

      setFormData({
        machine_id: jc.machine_id || '',
        operator_id: jc.operator_id || '',
        planned_quantity: jc.planned_quantity || jc.quantity || 0,
        produced_quantity: jc.produced_quantity || 0,
        accepted_quantity: jc.accepted_quantity || 0,
        scheduled_start_date: jc.scheduled_start_date ? formatForDateTimeLocal(jc.scheduled_start_date) : '',
        scheduled_end_date: jc.scheduled_end_date ? formatForDateTimeLocal(jc.scheduled_end_date) : '',
        status: jc.status || '',
        notes: jc.notes || '',
        execution_mode: jc.execution_mode || 'IN_HOUSE',
        vendor_id: jc.vendor_id || '',
        vendor_name: jc.vendor_name || '',
        vendor_rate_per_unit: jc.vendor_rate_per_unit || 0
      })
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load job card details')
    } finally {
      setFetchingData(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      
      // Auto-calculate end date based on operation time and quantity
      if (name === 'scheduled_start_date' || name === 'planned_quantity') {
        const startTime = name === 'scheduled_start_date' ? value : prev.scheduled_start_date
        const qty = parseFloat(name === 'planned_quantity' ? value : prev.planned_quantity) || 0
        const opTime = parseFloat(jobCard?.operation_time) || 0

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

    const qty = parseFloat(formData.planned_quantity) || 0
    const opTime = parseFloat(jobCard?.operation_time) || 0
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
          
          // Auto-select the first one
          const { start, end } = slots[0]
          setFormData(prev => ({
            ...prev,
            scheduled_start_date: formatForDateTimeLocal(start),
            scheduled_end_date: formatForDateTimeLocal(end)
          }))
        } else if (slots && slots.start) {
          // Fallback for single slot response
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

  const getResourceConflict = () => {
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
      if (jc.job_card_id === jobCardId) return false;
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
          message: `Workstation busy with ${conflicts[0].job_card_id}` 
        };
      }
    }

    // 2. Operator Conflict
    if (operator_id && formData.execution_mode === 'IN_HOUSE') {
      const conflicts = (allJobCards || []).filter(jc => {
        if (!jc) return false;
        if (jc.job_card_id === jobCardId) return false;
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
          message: `Operator busy with ${conflicts[0].job_card_id}` 
        };
      }
    }
    
    return null;
  };

  const getSequencingError = () => {
    if (!jobCard || !formData.scheduled_start_date || !formData.scheduled_end_date) return null;

    const woJobCards = allJobCards.filter(jc => 
      jc.work_order_id === jobCard.work_order_id && 
      (jc.status || '').toLowerCase() !== 'cancelled'
    );
    
    const sortedOps = woJobCards.sort((a, b) => parseFloat(a.operation_sequence) - parseFloat(b.operation_sequence));
    
    const currentIndex = sortedOps.findIndex(jc => jc.job_card_id === jobCardId);
    if (currentIndex === -1) return null;

    const prevOp = sortedOps[currentIndex - 1];
    const nextOp = sortedOps[currentIndex + 1];

    if (prevOp && prevOp.scheduled_end_date) {
      const prevOpEndDate = parseUTCDate(prevOp.scheduled_end_date);
      const prevEnd = prevOpEndDate instanceof Date && !isNaN(prevOpEndDate.getTime()) ? prevOpEndDate.getTime() : null;
      
      const formDataStartDate = parseUTCDate(formData.scheduled_start_date);
      const currentStart = formDataStartDate instanceof Date && !isNaN(formDataStartDate.getTime()) ? formDataStartDate.getTime() : null;
      
      if (currentStart && prevEnd && currentStart < prevEnd) {
        return `Must start after ${prevOp.operation}`;
      }
    }

    if (nextOp && nextOp.scheduled_start_date) {
      const nextOpStartDate = parseUTCDate(nextOp.scheduled_start_date);
      const nextStart = nextOpStartDate instanceof Date && !isNaN(nextOpStartDate.getTime()) ? nextOpStartDate.getTime() : null;
      
      const formDataEndDate = parseUTCDate(formData.scheduled_end_date);
      const currentEnd = formDataEndDate instanceof Date && !isNaN(formDataEndDate.getTime()) ? formDataEndDate.getTime() : null;
      
      if (currentEnd && nextStart && currentEnd > nextStart) {
        return `Must end before ${nextOp.operation}`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        ...formData,
        scheduled_start_date: formatToUTC(formData.scheduled_start_date),
        scheduled_end_date: formatToUTC(formData.scheduled_end_date),
        // Ensure proper null values for foreign keys based on execution mode
        vendor_id: formData.execution_mode === 'IN_HOUSE' ? null : (formData.vendor_id || null),
        operator_id: formData.execution_mode === 'OUTSOURCE' ? null : (formData.operator_id || null)
      }

      await jobCardsAPI.update(jobCardId, payload)
      setSuccess('Job card updated successfully')
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(null)
      }, 1500)
    } catch (err) {
      console.error('Update failed:', err)
      const errorResponse = err.response?.data
      
      if (err.response?.status === 409 && errorResponse?.conflict && onConflict) {
        onConflict(errorResponse.message || 'Scheduling conflict detected', jobCardId, errorResponse.details)
        return
      }

      setError(errorResponse?.error || err.message || 'Failed to update job card')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Job Card: ${jobCardId}`}
      size="xl"
    >
      {fetchingData ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded  h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 text-sm">Loading job card details...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-2 ">
          {error && <Alert variant="error" icon={AlertCircle}>{error}</Alert>}
          {success && <Alert variant="success" icon={CheckCircle2}>{success}</Alert>}

          <div className=" flex items-center justify-between border-b pb-2 ">
            <div className="flex items-center   gap-2">
              
              <div className=''>
                <h3 className=" text-slate-800 text-lg ">{jobCard?.operation || 'Loading...'}</h3>
                <p className="text-slate-500 text-xs mt-0.5">{jobCard?.item_name || 'Generic Item'}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={formData.status === 'completed' ? 'success' : 'primary'} size="lg">
                {formData.status.toUpperCase() || 'DRAFT'}
              </Badge>
              <span className="text-[10px] text-slate-400  ">Job Card Status</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-amber-700 text-sm border-b border-amber-50 pb-2 pt-2">
            <UserCheck size={20} />
            Resource Assignment
          </div>

          <div className="my-2">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
              <label className="text-xs font-medium text-slate-600">Execution Mode:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, execution_mode: 'IN_HOUSE' }))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    formData.execution_mode === 'IN_HOUSE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  In-house
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, execution_mode: 'OUTSOURCE' }))}
                  className={`p-2 rounded text-xs font-medium transition-all ${
                    formData.execution_mode === 'OUTSOURCE'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300'
                  }`}
                >
                  Outsource
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded border border-slate-100 p-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Machine / Workstation
                </label>
                <div className={getResourceConflict()?.type === 'machine' ? 'border-amber-300 bg-amber-50 rounded' : ''}>
                  <SearchableSelect
                    value={formData.machine_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, machine_id: value }))}
                    options={workstations.map(ws => ({
                      value: ws.name,
                      label: ws.workstation_name || ws.name
                    }))}
                    placeholder="Select Workstation"
                  />
                  {getResourceConflict()?.type === 'machine' && (
                    <p className="text-[10px] text-amber-600 px-1 py-0.5">
                      ⚠️ {getResourceConflict().message}
                    </p>
                  )}
                </div>
              </div>

              {formData.execution_mode === 'IN_HOUSE' ? (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Primary Operator
                  </label>
                  <div className={getResourceConflict()?.type === 'operator' ? 'border-amber-300 bg-amber-50 rounded' : ''}>
                    <select
                      name="operator_id"
                      value={formData.operator_id}
                      onChange={handleInputChange}
                      className={`w-full p-2 bg-slate-50 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs ${
                        getResourceConflict()?.type === 'operator' ? 'border-amber-300' : 'border-slate-200'
                      }`}
                    >
                      <option value="">Select Operator</option>
                      {operators.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                    {getResourceConflict()?.type === 'operator' && (
                      <p className="text-[10px] text-amber-600 px-1 py-0.5">
                        ⚠️ {getResourceConflict().message}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-amber-600 mb-1">
                    Subcontractor (Vendor)
                  </label>
                  <select
                    name="vendor_id"
                    value={formData.vendor_id}
                    onChange={(e) => {
                      const selectedVendor = suppliers.find(s => s.supplier_id === e.target.value)
                      setFormData(prev => ({
                        ...prev,
                        vendor_id: e.target.value,
                        vendor_name: selectedVendor ? selectedVendor.name : ''
                      }))
                    }}
                    className="w-full p-2 bg-amber-50 border border-amber-200 rounded focus:ring-2 focus:ring-amber-500 outline-none transition-all text-xs text-amber-800"
                  >
                    <option value="">Select Vendor</option>
                    {suppliers.map(sup => (
                      <option key={sup.supplier_id} value={sup.supplier_id}>
                        {sup.name} ({sup.supplier_id})
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <label className="block text-[10px] text-amber-600 mb-0.5">
                      Vendor Rate per Unit
                    </label>
                    <input
                      type="number"
                      name="vendor_rate_per_unit"
                      value={formData.vendor_rate_per_unit}
                      onChange={handleInputChange}
                      className="w-full p-1.5 bg-white border border-amber-100 rounded text-xs text-amber-800"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Status & Progress Section */}
            <div className="">
              <div className="flex items-center gap-2 text-indigo-700 text-sm  pb-2">
                <TrendingUp size={15} />
                Execution & Metrics
              </div>

              <div className="grid grid-cols-1 gap-5 bg-white p-2 rounded border border-slate-100 ">
                <div>
                  <label className="block text-xs  text-slate-500   ">
                    Job Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded  focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs "
                  >
                    <option value="draft">DRAFT</option>
                    <option value="pending">PENDING</option>
                    <option value="in-progress">IN PROGRESS</option>
                    <option value="completed">COMPLETED</option>
                    <option value="cancelled">CANCELLED</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs  text-slate-500    flex items-center gap-1.5">
                      <Layers size={12} className="text-indigo-400" />
                      Planned Qty
                    </label>
                    <input
                      type="number"
                      name="planned_quantity"
                      value={formData.planned_quantity}
                      onChange={handleInputChange}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs  text-emerald-600    flex items-center gap-1.5">
                      <CheckCircle2 size={12} />
                      Produced Qty
                    </label>
                    <input
                      type="number"
                      name="produced_quantity"
                      value={formData.produced_quantity}
                      readOnly
                      className="w-full p-2 bg-emerald-50/50 border border-emerald-100 rounded outline-none transition-all text-xs text-emerald-700 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs  text-blue-600    flex items-center gap-1.5">
                      <CheckSquare size={12} />
                      Accepted Qty
                    </label>
                    <input
                      type="number"
                      name="accepted_quantity"
                      value={formData.accepted_quantity}
                      readOnly
                      className="w-full p-2 bg-blue-50/50 border border-blue-100 rounded outline-none transition-all text-xs text-blue-700 cursor-not-allowed"
                    />
                  </div>

                </div>
                <p className="text-[10px] text-slate-400 italic px-1 leading-relaxed">
                  Note: Accepted quantity represents final yield after QC.
                </p>


              </div>


            </div>

            {/* Scheduling & Notes Section */}
            {formData.execution_mode !== 'OUTSOURCE' && (
              <div className="">
                <div className="flex items-center gap-2 text-indigo-700 text-sm pb-2">
                  <Clock size={15} />
                  Time Planning
                </div>

                <div className="bg-white p-2 rounded grid grid-cols-2 gap-2 border border-slate-100">
                  <div className="relative ">
                    <label className="block text-xs  text-slate-500   ">
                      Start DateTime
                    </label>
                    <div className="relative group">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={15} />
                      <input
                        type="datetime-local"
                        name="scheduled_start_date"
                        value={formData.scheduled_start_date}
                        onChange={handleInputChange}
                        className={`w-full pl-11 pr-4 p-2 bg-slate-50 border rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs ${
                          getSequencingError() ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {getSequencingError() && (
                      <p className="text-[10px] text-amber-600 mt-1 font-medium italic">
                        ⚠️ {getSequencingError()}
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-xs  text-slate-500    flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        End DateTime
                      </div>
                      <button
                        type="button"
                        onClick={handleSuggestSlot}
                        className="text-[10px] text-indigo-600 rounded  hover:bg-indigo-100 transition-colors"
                      >
                        Auto Suggest
                      </button>
                    </label>
                    <div className="relative group ">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={15} />
                      <input
                        type="datetime-local"
                        name="scheduled_end_date"
                        value={formData.scheduled_end_date}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Cpu size={14} className="text-indigo-500" />
                      <span className="text-xs font-medium text-slate-600">Machine Engagement:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-xs text-slate-400">
                        {jobCard?.operation_time || 0} min/unit × {formData.planned_quantity || 0} units
                      </div>
                      <span className="text-xs bg-indigo-100 text-indigo-700 p-1">
                        {formatDuration((parseFloat(formData.planned_quantity) || 0) * (parseFloat(jobCard?.operation_time) || 0))}
                      </span>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 mt-1 p-2 col-span-2 rounded border border-indigo-100/50 flex items-start gap-3">
                    <Info size={15} className="text-indigo-400 mt-0.5" />
                    <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                      Scheduled end time is calculated based on standard cycle time. Adjust manually if resource availability differs.
                    </p>
                  </div>

                  {showSuggestions && suggestedSlots.length > 0 && (
                    <div className="col-span-2 mt-2 bg-amber-50 p-2 rounded border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between mb-2 px-1">
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
                      <div className="grid grid-cols-1 gap-1.5">
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
                            className={`flex items-center justify-between p-2 rounded border text-xs transition-all ${
                              formData.scheduled_start_date === formatForDateTimeLocal(slot.start)
                                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                                : 'bg-white text-slate-700 border-amber-100 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {new Date(slot.start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <ArrowRight size={10} className={formData.scheduled_start_date === formatForDateTimeLocal(slot.start) ? 'text-white/70' : 'text-slate-300'} />
                              <span className="font-medium">
                                {new Date(slot.end).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {formData.scheduled_start_date === formatForDateTimeLocal(slot.start) && (
                              <CheckCircle2 size={12} className="text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-end gap-4 p-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-8 p-2 text-sm   "
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={CheckCircle2}
              className="px-10 p-2 text-sm    shadow-lg shadow-indigo-100"
            >
              Update Job Card
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
