import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../ToastContainer'

export default function ProductionEntryModal({ isOpen, onClose, jobCardId, jobCardData, executionData, workstations = [], operations = [], operators = [], onUpdate }) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('timeLogs')
  const [loading, setLoading] = useState(false)
  const [itemName, setItemName] = useState('')
  const [operationCycleTime, setOperationCycleTime] = useState(0)

  const [timeLogs, setTimeLogs] = useState([])
  const [rejections, setRejections] = useState([])
  const [downtimes, setDowntimes] = useState([])

  const [shifts] = useState(['A', 'B', 'C'])
  const [warehouses, setWarehouses] = useState([])
  const [nextOperationForm, setNextOperationForm] = useState({
    next_operator_id: '',
    next_warehouse_id: '',
    next_operation_id: '',
    inhouse: false,
    outsource: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    'Machine Breakdown',
    'Tool Change',
    'Maintenance',
    'Material Shortage',
    'Setup/Adjustment',
    'Quality Issue',
    'Operator Break',
    'Power Outage',
    'Other'
  ]

  const [timeLogForm, setTimeLogForm] = useState({
    employee_id: '',
    operator_name: '',
    machine_id: '',
    shift: 'A',
    from_time: '',
    to_time: '',
    completed_qty: 0,
    accepted_qty: 0,
    rejected_qty: 0,
    scrap_qty: 0,
    inhouse: false,
    outsource: false
  })

  const [rejectionForm, setRejectionForm] = useState({
    reason: '',
    rejected_qty: 0,
    notes: ''
  })

  const [downtimeForm, setDowntimeForm] = useState({
    type: '',
    reason: '',
    from_time: '',
    to_time: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses()
      fetchTimeLogs()
      fetchRejections()
      fetchDowntimes()
      if (jobCardData && jobCardData.work_order_id) {
        fetchItemName()
        fetchOperationCycleTime()
      }
    }
  }, [isOpen, jobCardId, jobCardData])

  useEffect(() => {
    if (workstations.length > 0 && jobCardData) {
      const defaultWorkstation = jobCardData.assigned_workstation_id || workstations[0]?.name || ''
      setTimeLogForm(prev => ({
        ...prev,
        machine_id: defaultWorkstation,
        inhouse: jobCardData.inhouse || false,
        outsource: jobCardData.outsource || false
      }))
    }
  }, [workstations, jobCardData])

  useEffect(() => {
    if (executionData && operators.length > 0) {
      const operator = operators.find(op => op.first_name && op.last_name && 
        `${op.first_name} ${op.last_name}` === executionData.operator_name)
      
      setTimeLogForm(prev => ({
        ...prev,
        employee_id: operator?.employee_id || '',
        operator_name: executionData.operator_name || '',
        machine_id: executionData.workstation_name || prev.machine_id,
        completed_qty: parseFloat(executionData.completed_qty) || prev.completed_qty,
        from_time: executionData.start_date ? new Date(executionData.start_date).toTimeString().slice(0, 5) : prev.from_time,
        to_time: executionData.end_date ? new Date(executionData.end_date).toTimeString().slice(0, 5) : prev.to_time,
        inhouse: executionData.inhouse || false,
        outsource: executionData.outsource || false
      }))
    }
  }, [executionData, operators])

  const fetchItemName = async () => {
    try {
      const response = await productionService.getWorkOrder(jobCardData.work_order_id)
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

  const fetchOperationCycleTime = async () => {
    try {
      if (!jobCardData?.work_order_id) return
      
      const workOrderResponse = await productionService.getWorkOrder(jobCardData.work_order_id)
      const bomId = workOrderResponse?.data?.bom_id
      
      if (bomId) {
        const bomResponse = await productionService.getBOMDetails(bomId)
        const bom = bomResponse?.data || bomResponse
        
        if (bom?.bom_operations) {
          const operation = bom.bom_operations.find(
            op => op.name === jobCardData.operation || op.operation_name === jobCardData.operation
          )
          if (operation && operation.operation_time_per_unit) {
            setOperationCycleTime(parseFloat(operation.operation_time_per_unit) || 0)
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch operation cycle time:', err)
      setOperationCycleTime(0)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data?.data || [])
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

  const calculateTimeDuration = () => {
    if (timeLogForm.from_time && timeLogForm.to_time) {
      const [fromHour, fromMin] = timeLogForm.from_time.split(':').map(Number)
      const [toHour, toMin] = timeLogForm.to_time.split(':').map(Number)
      const fromTotal = fromHour * 60 + fromMin
      const toTotal = toHour * 60 + toMin
      return Math.max(0, toTotal - fromTotal)
    }
    return 0
  }

  const calculateDowntimeDuration = (fromTime, toTime) => {
    if (!fromTime || !toTime) return 0
    const [fromHour, fromMin] = fromTime.split(':').map(Number)
    const [toHour, toMin] = toTime.split(':').map(Number)
    const fromTotal = fromHour * 60 + fromMin
    const toTotal = toHour * 60 + toMin
    return Math.max(0, toTotal - fromTotal)
  }

  const handleTimeLogChange = (e) => {
    const { name, value } = e.target
    setTimeLogForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

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

      setLoading(true)
      const completedQty = parseFloat(timeLogForm.completed_qty) || 0
      const acceptedQty = parseFloat(timeLogForm.accepted_qty) || 0
      const rejectedQty = parseFloat(timeLogForm.rejected_qty) || 0
      const scrapQty = parseFloat(timeLogForm.scrap_qty) || 0

      if (completedQty <= 0) {
        toast.addToast('Completed quantity must be greater than 0', 'error')
        return
      }

      if (acceptedQty + rejectedQty + scrapQty > completedQty) {
        toast.addToast(`Accepted (${acceptedQty}) + Rejected (${rejectedQty}) + Scrap (${scrapQty}) cannot exceed Completed (${completedQty})`, 'error')
        return
      }

      const payload = {
        job_card_id: jobCardId,
        employee_id: timeLogForm.employee_id,
        operator_name: timeLogForm.operator_name,
        machine_id: timeLogForm.machine_id,
        shift: timeLogForm.shift,
        from_time: timeLogForm.from_time,
        to_time: timeLogForm.to_time,
        completed_qty: completedQty,
        accepted_qty: acceptedQty,
        rejected_qty: rejectedQty,
        scrap_qty: scrapQty,
        inhouse: timeLogForm.inhouse ? 1 : 0,
        outsource: timeLogForm.outsource ? 1 : 0,
        time_in_minutes: calculateTimeDuration()
      }

      await productionService.createTimeLog(payload)
      toast.addToast('Time log added successfully', 'success')
      
      const defaultWorkstation = jobCardData?.assigned_workstation_id || workstations[0]?.name || ''
      setTimeLogForm({
        employee_id: '',
        operator_name: '',
        machine_id: defaultWorkstation,
        shift: 'A',
        from_time: '',
        to_time: '',
        completed_qty: 0,
        accepted_qty: 0,
        rejected_qty: 0,
        scrap_qty: 0,
        inhouse: jobCardData?.inhouse || false,
        outsource: jobCardData?.outsource || false
      })
      
      fetchTimeLogs()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add time log', 'error')
    } finally {
      setLoading(false)
    }
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

  const handleRejectionChange = (e) => {
    const { name, value } = e.target
    setRejectionForm(prev => ({
      ...prev,
      [name]: name === 'rejected_qty' ? parseFloat(value) || 0 : value
    }))
  }

  const handleAddRejection = async (e) => {
    e.preventDefault()
    
    if (!rejectionForm.reason || rejectionForm.rejected_qty <= 0) {
      toast.addToast('Please select a reason and enter quantity', 'error')
      return
    }

    try {
      setLoading(true)
      const payload = {
  job_card_id: jobCardId,
  rejection_reason: rejectionForm.reason,
  quantity: rejectionForm.rejected_qty,
  notes: rejectionForm.notes
}


      await productionService.createRejection(payload)
      toast.addToast('Rejection entry recorded', 'success')
      
      setRejectionForm({
        reason: '',
        rejected_qty: 0,
        notes: ''
      })
      
      fetchRejections()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add rejection', 'error')
    } finally {
      setLoading(false)
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

  const handleDowntimeChange = (e) => {
    const { name, value } = e.target
    setDowntimeForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddDowntime = async (e) => {
    e.preventDefault()
    
    if (!downtimeForm.type || !downtimeForm.from_time || !downtimeForm.to_time) {
      toast.addToast('Please fill all required fields', 'error')
      return
    }

    try {
      setLoading(true)
      const durationMinutes = calculateDowntimeDuration(downtimeForm.from_time, downtimeForm.to_time)
      
      const payload = {
        job_card_id: jobCardId,
        downtime_type: downtimeForm.type,
        downtime_reason: downtimeForm.reason,
        from_time: downtimeForm.from_time,
        to_time: downtimeForm.to_time,
        duration_minutes: durationMinutes
      }

      await productionService.createDowntime(payload)
      toast.addToast('Downtime entry recorded', 'success')
      
      setDowntimeForm({
        type: '',
        reason: '',
        from_time: '',
        to_time: ''
      })
      
      fetchDowntimes()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add downtime', 'error')
    } finally {
      setLoading(false)
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
      
      if (!nextOperationForm.next_operator_id) {
        toast.addToast('Please select next operator', 'error')
        return
      }
      if (!nextOperationForm.next_warehouse_id) {
        toast.addToast('Please select warehouse', 'error')
        return
      }
      if (!nextOperationForm.next_operation_id) {
        toast.addToast('Please select next operation', 'error')
        return
      }

      const nextJobCard = {
        work_order_id: jobCardData.work_order_id,
        operation: operations.find(op => op.operation_id === nextOperationForm.next_operation_id)?.name,
        machine_id: jobCardData.machine_id || jobCardData.assigned_workstation_id,
        operator_id: nextOperationForm.next_operator_id,
        planned_quantity: totalAcceptedQty,
        status: 'Open'
      }

      await productionService.createJobCard(nextJobCard)
      toast.addToast('Next operation assigned successfully', 'success')
      
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to assign next operation', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

const totalProducedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)
const totalAcceptedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.accepted_qty) || 0), 0)
const totalRejectedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.rejected_qty) || 0), 0)
const totalScrapQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.scrap_qty) || 0), 0)
const totalDowntimeMinutes = downtimes.reduce((sum, dt) => sum + (dt.duration_minutes || 0), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Production Entry" size="xl">
      <div className="p-4">
        {jobCardData && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-xs">
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-gray-600 text-xs font-semibold">Job Card</p>
                <p className="text-gray-900 font-medium">{jobCardData.job_card_id}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-semibold">Item</p>
                <p className="text-gray-900 font-medium">{itemName || jobCardData.item_name || 'Loading...'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-semibold">Planned Qty</p>
                <p className="text-gray-900 font-medium">{jobCardData.planned_quantity}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs font-semibold">Operation</p>
                <p className="text-gray-900 font-medium">{jobCardData.operation || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xs">
          <h4 className="font-semibold text-gray-900 mb-3 text-xs">Production Summary</h4>
          <div className="grid grid-cols-5 gap-3 text-xs">
            <div>
              <p className="text-gray-600 font-semibold">Produced</p>
              <p className="text-xs  text-gray-900">{totalProducedQty.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Accepted</p>
              <p className="text-lg  text-green-600">{totalAcceptedQty.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Rejected</p>
              <p className="text-lg  text-red-600">{totalRejectedQty.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Downtime</p>
              <p className="text-lg  text-orange-600">{Math.round(totalDowntimeMinutes)} min</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Remaining</p>
              <p className="text-lg  text-blue-600">
                {(parseFloat(jobCardData?.planned_quantity || 0) - totalProducedQty).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {(() => {
          const expectedMinutes = (operationCycleTime || 0) * (jobCardData?.planned_quantity || 1)
          const actualMinutes = timeLogs.reduce((sum, log) => {
            if (log.from_time && log.to_time) {
              const [fh, fm] = log.from_time.split(':').map(Number)
              const [th, tm] = log.to_time.split(':').map(Number)
              return sum + Math.max(0, (th * 60 + tm) - (fh * 60 + fm))
            }
            return sum
          }, 0)
          const efficiency = expectedMinutes > 0 ? ((expectedMinutes / actualMinutes) * 100).toFixed(0) : 0
          const qualityScore = totalProducedQty > 0 ? ((totalAcceptedQty / totalProducedQty) * 100).toFixed(1) : 0
          const isBottleneck = actualMinutes > expectedMinutes * 1.3
          
          return (
            <div className="mb-4 p-2 rounded-xs border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="p-2 bg-white border border-orange-200 rounded">
                  <p className="text-gray-600 font-semibold mb-1">Expected Duration</p>
                  <p className=" text-orange-700">{expectedMinutes.toFixed(0)} min</p>
                </div>
                <div className="p-2 bg-white border border-blue-200 rounded">
                  <p className="text-gray-600 font-semibold mb-1">Actual Duration</p>
                  <p className=" text-blue-700">{actualMinutes.toFixed(0)} min</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className={`p-2 rounded border ${efficiency >= 100 ? 'bg-green-50 border-green-200' : efficiency >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-gray-600 font-semibold mb-1">⚡ Efficiency</p>
                  <p className={` text-lg ${efficiency >= 100 ? 'text-green-600' : efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {efficiency}%
                  </p>
                  {isBottleneck && <p className="text-red-600 text-xs mt-1">🚨 Bottleneck Detected</p>}
                </div>
                <div className="p-2 rounded bg-blue-50 border border-blue-200">
                  <p className="text-gray-600 font-semibold mb-1">✓ Quality</p>
                  <p className=" text-lg text-blue-600">{qualityScore}%</p>
                  <p className="text-gray-500 text-xs mt-1">Acceptance rate</p>
                </div>
                <div className="p-2 rounded bg-green-50 border border-green-200">
                  <p className="text-gray-600 font-semibold mb-1">📦 Productivity</p>
                  <p className=" text-lg text-green-600">
                    {actualMinutes > 0 ? ((totalAcceptedQty / (actualMinutes / 60)).toFixed(1)) : '0'} units/hr
                  </p>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="max-h-[70vh] overflow-y-auto space-y-6">
          {/* Operation Execution Section */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xs">
            <h3 className="text-xs  text-gray-900 mb-4">Operation Execution</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-600 font-semibold block mb-1">Start Date</label>
                <input type="date" className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-semibold block mb-1">End Date</label>
                <input type="date" className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>

          {/* Time Logs Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xs">
            <h3 className="text-xs  text-gray-900 mb-4 flex items-center gap-2">
              Time Logs ({timeLogs.length})
            </h3>
            <div>
              <form onSubmit={handleAddTimeLog} className="mb-6 p-3 bg-white border border-gray-200 rounded-xs">
                <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2 text-xs">
                  <Plus size={16} /> Add Time Log Entry
                </h3>
                
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Operator *</label>
                    <select
                      value={timeLogForm.employee_id}
                      onChange={(e) => handleOperatorChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select operator</option>
                      {operators.map(op => (
                        <option key={op.employee_id} value={op.employee_id}>
                          {op.first_name} {op.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Workstation *</label>
                    <select
                      value={timeLogForm.machine_id}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, machine_id: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select workstation</option>
                      {workstations.map(ws => (
                        <option key={ws.id || ws.name} value={ws.name}>
                          {ws.machine_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Shift *</label>
                    <select
                      value={timeLogForm.shift}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, shift: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {shifts.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Operation Time per Unit (from BOM)</label>
                    <div className="p-2 border border-purple-300 rounded  text-xs bg-purple-50">
                      <p className="font-semibold text-purple-700">{operationCycleTime.toFixed(2)} min</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Expected Duration (for all {jobCardData?.planned_quantity || 0} units)</label>
                    <div className="p-2 border border-orange-300 rounded  text-xs bg-orange-50">
                      <p className="font-semibold text-orange-700">{((operationCycleTime || 0) * (jobCardData?.planned_quantity || 1)).toFixed(0)} min</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">From Time *</label>
                    <input
                      type="time"
                      value={timeLogForm.from_time}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, from_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">To Time *</label>
                    <input
                      type="time"
                      value={timeLogForm.to_time}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, to_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Completed Qty *</label>
                    <input
                      type="number"
                      value={timeLogForm.completed_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Expected Duration</label>
                    <div className="p-2 border border-orange-300 rounded  text-xs bg-orange-50">
                      <p className="font-semibold text-orange-700">{((operationCycleTime || 0) * (jobCardData?.planned_quantity || 1)).toFixed(0)} min</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Duration</label>
                    <div className="p-2 border border-blue-300 rounded  text-xs bg-blue-50">
                      <p className="font-semibold text-blue-700">{calculateTimeDuration()} min</p>
                    </div>
                  </div>

                  <div></div>
                  <div></div>
                  <div></div>
                </div>



                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Accepted Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.accepted_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, accepted_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Rejected Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.rejected_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, rejected_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Scrap Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.scrap_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, scrap_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="w-full text-xs font-medium text-gray-600">
                      Completed: {parseFloat(timeLogForm.completed_qty || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {(() => {
                  const completed = parseFloat(timeLogForm.completed_qty || 0)
                  const accepted = parseFloat(timeLogForm.accepted_qty || 0)
                  const rejected = parseFloat(timeLogForm.rejected_qty || 0)
                  const scrap = parseFloat(timeLogForm.scrap_qty || 0)
                  const total = accepted + rejected + scrap
                  const isValid = total <= completed && total > 0

                  return (
                    <div className={`mb-3 p-2 rounded-xs border text-xs ${
                      isValid 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'bg-red-50 border-red-300 text-red-700'
                    }`}>
                      <p className="font-semibold">Quality Summary</p>
                      <p>Accepted ({accepted.toFixed(2)}) + Rejected ({rejected.toFixed(2)}) + Scrap ({scrap.toFixed(2)}) = {total.toFixed(2)}</p>
                      {total > completed && (
                        <p className="mt-1 font-semibold">⚠️ Total exceeds completed quantity!</p>
                      )}
                      {total === 0 && completed > 0 && (
                        <p className="mt-1 font-semibold">⚠️ Please specify accepted, rejected, or scrap quantities</p>
                      )}
                      {isValid && (
                        <p className="mt-1">✓ Next operation will receive {accepted.toFixed(2)} units (accepted qty)</p>
                      )}
                    </div>
                  )
                })()}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xs border border-gray-300">
                    <input
                      type="checkbox"
                      id="inhouse"
                      checked={timeLogForm.inhouse}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, inhouse: e.target.checked, outsource: e.target.checked ? false : timeLogForm.outsource })}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="inhouse" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Inhouse
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-white rounded-xs border border-gray-300">
                    <input
                      type="checkbox"
                      id="outsource"
                      checked={timeLogForm.outsource}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, outsource: e.target.checked, inhouse: e.target.checked ? false : timeLogForm.inhouse })}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="outsource" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Outsource
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full  bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs rounded-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Time Log'}
                </button>
              </form>

              {timeLogs.length > 0 ? (
                <div className=" border border-gray-200 rounded-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="p-2  py-2 text-left font-semibold text-gray-700">Operator</th>
                        <th className="p-2  py-2 text-left font-semibold text-gray-700">Workstation</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Shift</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Time</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Completed</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Accepted</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Type</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {timeLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 transition">
                          <td className="p-2  py-2 text-gray-900">{log.operator_name}</td>
                          <td className="p-2  py-2 text-gray-900">{log.machine_id || 'N/A'}</td>
                          <td className="p-2  py-2 text-center text-gray-900">{log.shift}</td>
                          <td className="p-2  py-2 text-center text-gray-600">
                            {log.from_time} - {log.to_time}
                          </td>
                          <td className="p-2  py-2 text-center text-gray-900 font-medium">{log.completed_qty}</td>
                          <td className="p-2  py-2 text-center text-green-600 font-medium">{log.accepted_qty}</td>
                          <td className="p-2  py-2 text-center">
                            <div className="flex justify-center gap-1">
                              {log.inhouse && <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">In</span>}
                              {log.outsource && <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">Out</span>}
                            </div>
                          </td>
                          <td className="p-2  py-2 text-center">
                            <button
                              onClick={() => handleDeleteTimeLog(log.id)}
                              className="text-red-600 hover:text-red-900 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center bg-gray-50 border border-gray-200 rounded-xs text-gray-500">
                  <Clock size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No time logs recorded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Rejections Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xs">
            <h3 className="text-xs  text-gray-900 mb-4">Rejections ({rejections.length})</h3>
            {true && (
            <div>
              <form onSubmit={handleAddRejection} className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xs">
                <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2 text-xs">
                  <Plus size={16} /> Add Rejection Entry
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Rejection Reason *</label>
                    <select
                      value={rejectionForm.reason}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select reason</option>
                      {rejectionReasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Rejected Qty *</label>
                    <input
                      type="number"
                      value={rejectionForm.rejected_qty}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={rejectionForm.notes}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, notes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows="2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full  bg-red-500 hover:bg-red-600 text-white font-medium text-xs rounded-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Rejection'}
                </button>
              </form>

              {rejections.length > 0 ? (
                <div className=" border border-gray-200 rounded-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="p-2  py-2 text-left font-semibold text-gray-700">Reason</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Qty</th>
                        <th className="p-2  py-2 text-left font-semibold text-gray-700">Notes</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Date</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rejections.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition">
                          <td className="p-2  py-2 text-gray-900">{r.rejection_reason}</td>
                          <td className="p-2  py-2 text-center font-medium text-red-600">{r.rejected_qty}</td>
                          <td className="p-2  py-2 text-gray-600 text-xs">{r.notes || '-'}</td>
                          <td className="p-2  py-2 text-center text-gray-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                          <td className="p-2  py-2 text-center">
                            <button
                              onClick={() => handleDeleteRejection(r.id)}
                              className="text-red-600 hover:text-red-900 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center bg-gray-50 border border-gray-200 rounded-xs text-gray-500">
                  <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No rejection entries recorded</p>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Downtimes Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xs">
            <h3 className="text-xs  text-gray-900 mb-4">Downtimes ({downtimes.length})</h3>
            {true && (
            <div>
              <form onSubmit={handleAddDowntime} className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xs">
                <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2 text-xs">
                  <Plus size={16} /> Add Downtime Entry
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Downtime Type *</label>
                    <select
                      value={downtimeForm.type}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, type: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select type</option>
                      {downtimeTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Reason</label>
                    <input
                      type="text"
                      value={downtimeForm.reason}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Optional details"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">From Time *</label>
                    <input
                      type="time"
                      value={downtimeForm.from_time}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, from_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">To Time *</label>
                    <input
                      type="time"
                      value={downtimeForm.to_time}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, to_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded  text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={calculateDowntimeDuration(downtimeForm.from_time, downtimeForm.to_time)}
                      disabled
                      className="w-full p-2 border border-gray-300 rounded  text-xs bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full  bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs rounded-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Downtime'}
                </button>
              </form>

              {downtimes.length > 0 ? (
                <div className=" border border-gray-200 rounded-xs">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="p-2  py-2 text-left font-semibold text-gray-700">Type</th>
                        <th className="p-2  py-2 text-left font-semibold text-gray-700">Reason</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Time</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Duration</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Date</th>
                        <th className="p-2  py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {downtimes.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50 transition">
                          <td className="p-2  py-2 text-gray-900">{d.downtime_type}</td>
                          <td className="p-2  py-2 text-gray-600 text-xs">{d.downtime_reason || '-'}</td>
                          <td className="p-2  py-2 text-center text-gray-600 text-xs">
                            {d.from_time} - {d.to_time}
                          </td>
                          <td className="p-2  py-2 text-center font-medium text-orange-600">{d.duration_minutes || 0} min</td>
                          <td className="p-2  py-2 text-center text-gray-500 text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}</td>
                          <td className="p-2  py-2 text-center">
                            <button
                              onClick={() => handleDeleteDowntime(d.id)}
                              className="text-red-600 hover:text-red-900 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center bg-gray-50 border border-gray-200 rounded-xs text-gray-500">
                  <Clock size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No downtime entries recorded</p>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Next Operation Section */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xs">
            {true && (
            <div>
              <h3 className="text-lg  text-gray-900 mb-4">Assign Next Operation</h3>

              {totalAcceptedQty > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-xs">
                  <p className="text-xs font-semibold text-blue-900">
                    📦 Next operation will start with {totalAcceptedQty.toFixed(2)} units
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This is the accepted quantity from current operation (Completed: {totalProducedQty.toFixed(2)} - Rejected: {totalRejectedQty.toFixed(2)})
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Next Operator *</label>
                  <select
                    value={nextOperationForm.next_operator_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operator_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-xs text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select operator</option>
                    {operators.map(op => (
                      <option key={op.employee_id} value={op.employee_id}>
                        {op.first_name} {op.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Warehouse *</label>
                  <select
                    value={nextOperationForm.next_warehouse_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-xs text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh.warehouse_id || wh.id} value={wh.warehouse_id || wh.id}>
                        {wh.warehouse_name || wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Next Operation *</label>
                  <select
                    value={nextOperationForm.next_operation_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operation_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-xs text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Select operation</option>
                    {operations.map(op => (
                      <option key={op.operation_id || op.id} value={op.operation_id || op.id}>
                        {op.operation_name || op.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 p-3 bg-white border border-purple-200 rounded-xs">
                <label className="block text-xs font-semibold text-gray-700 mb-3">Production Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nextOperationForm.inhouse}
                      onChange={(e) => setNextOperationForm({ 
                        ...nextOperationForm, 
                        inhouse: e.target.checked,
                        outsource: e.target.checked ? false : nextOperationForm.outsource
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-xs font-medium text-gray-700">Inhouse</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nextOperationForm.outsource}
                      onChange={(e) => setNextOperationForm({ 
                        ...nextOperationForm, 
                        outsource: e.target.checked,
                        inhouse: e.target.checked ? false : nextOperationForm.inhouse
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-xs font-medium text-gray-700">Outsource</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmitProduction}
                disabled={isSubmitting || !nextOperationForm.next_operator_id || !nextOperationForm.next_warehouse_id || !nextOperationForm.next_operation_id}
                className="w-full  bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Assigning...' : 'Submit & Complete Production'}
              </button>
            </div>
            )}
          </div>
      </div>
      </div>
    </Modal>
  )
}
