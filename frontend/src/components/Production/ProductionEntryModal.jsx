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
      }
    }
  }, [isOpen, jobCardId])

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
      const payload = {
        job_card_id: jobCardId,
        employee_id: timeLogForm.employee_id,
        operator_name: timeLogForm.operator_name,
        machine_id: timeLogForm.machine_id,
        shift: timeLogForm.shift,
        from_time: timeLogForm.from_time,
        to_time: timeLogForm.to_time,
        completed_qty: parseFloat(timeLogForm.completed_qty) || 0,
        accepted_qty: parseFloat(timeLogForm.accepted_qty) || 0,
        rejected_qty: parseFloat(timeLogForm.rejected_qty) || 0,
        scrap_qty: parseFloat(timeLogForm.scrap_qty) || 0,
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
        planned_quantity: timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0),
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
  const totalRejectedQty = rejections.reduce((sum, r) => sum + (r.rejected_qty || 0), 0)
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (d.duration_minutes || 0), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Production Entry" size="xl">
      <div className="p-4">
        {jobCardData && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="grid grid-cols-4 gap-4 text-sm">
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

        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3 text-sm">Production Summary</h4>
          <div className="grid grid-cols-5 gap-3 text-xs">
            <div>
              <p className="text-gray-600 font-semibold">Produced</p>
              <p className="text-sm font-bold text-gray-900">{totalProducedQty.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Accepted</p>
              <p className="text-lg font-bold text-green-600">{totalAcceptedQty.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Rejected</p>
              <p className="text-lg font-bold text-red-600">{totalRejectedQty.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Downtime</p>
              <p className="text-lg font-bold text-orange-600">{Math.round(totalDowntimeMinutes)} min</p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Remaining</p>
              <p className="text-lg font-bold text-blue-600">
                {(parseFloat(jobCardData?.planned_quantity || 0) - totalProducedQty).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto space-y-6">
          {/* Operation Execution Section */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Operation Execution</h3>
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
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              Time Logs ({timeLogs.length})
            </h3>
            <div>
              <form onSubmit={handleAddTimeLog} className="mb-6 p-3 bg-white border border-gray-200 rounded-lg">
                <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Plus size={16} /> Add Time Log Entry
                </h3>
                
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Operator *</label>
                    <select
                      value={timeLogForm.employee_id}
                      onChange={(e) => handleOperatorChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {shifts.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">From Time *</label>
                    <input
                      type="time"
                      value={timeLogForm.from_time}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, from_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">To Time *</label>
                    <input
                      type="time"
                      value={timeLogForm.to_time}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, to_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={calculateTimeDuration()}
                      disabled
                      className="w-full p-2 border border-gray-300 rounded-md text-xs bg-gray-100 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Completed Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.completed_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="w-full text-xs font-medium text-gray-600">
                      Total: {parseFloat(timeLogForm.completed_qty || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-300">
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
                  <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-300">
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
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Time Log'}
                </button>
              </form>

              {timeLogs.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Operator</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Workstation</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Shift</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Time</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Completed</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Accepted</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Type</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {timeLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-2 text-gray-900">{log.operator_name}</td>
                          <td className="px-3 py-2 text-gray-900">{log.machine_id || 'N/A'}</td>
                          <td className="px-3 py-2 text-center text-gray-900">{log.shift}</td>
                          <td className="px-3 py-2 text-center text-gray-600">
                            {log.from_time} - {log.to_time}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-900 font-medium">{log.completed_qty}</td>
                          <td className="px-3 py-2 text-center text-green-600 font-medium">{log.accepted_qty}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              {log.inhouse && <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">In</span>}
                              {log.outsource && <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">Out</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
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
                <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                  <Clock size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No time logs recorded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Rejections Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Rejections ({rejections.length})</h3>
            {true && (
            <div>
              <form onSubmit={handleAddRejection} className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Plus size={16} /> Add Rejection Entry
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Rejection Reason *</label>
                    <select
                      value={rejectionForm.reason}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={rejectionForm.notes}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, notes: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows="2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-medium text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Rejection'}
                </button>
              </form>

              {rejections.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Reason</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Notes</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Date</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rejections.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-2 text-gray-900">{r.rejection_reason}</td>
                          <td className="px-3 py-2 text-center font-medium text-red-600">{r.rejected_qty}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{r.notes || '-'}</td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2 text-center">
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
                <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                  <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No rejection entries recorded</p>
                </div>
              )}
            </div>
          )}
          </div>

          {/* Downtimes Section */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Downtimes ({downtimes.length})</h3>
            {true && (
            <div>
              <form onSubmit={handleAddDowntime} className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2 text-sm">
                  <Plus size={16} /> Add Downtime Entry
                </h3>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Downtime Type *</label>
                    <select
                      value={downtimeForm.type}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, type: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">To Time *</label>
                    <input
                      type="time"
                      value={downtimeForm.to_time}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, to_time: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-700 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={calculateDowntimeDuration(downtimeForm.from_time, downtimeForm.to_time)}
                      disabled
                      className="w-full p-2 border border-gray-300 rounded-md text-xs bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Downtime'}
                </button>
              </form>

              {downtimes.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Reason</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Time</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Duration</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Date</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {downtimes.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 py-2 text-gray-900">{d.downtime_type}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{d.downtime_reason || '-'}</td>
                          <td className="px-3 py-2 text-center text-gray-600 text-xs">
                            {d.from_time} - {d.to_time}
                          </td>
                          <td className="px-3 py-2 text-center font-medium text-orange-600">{d.duration_minutes || 0} min</td>
                          <td className="px-3 py-2 text-center text-gray-500 text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-3 py-2 text-center">
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
                <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                  <Clock size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No downtime entries recorded</p>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Next Operation Section */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            {true && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Next Operation</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Next Operator *</label>
                  <select
                    value={nextOperationForm.next_operator_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operator_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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

              <div className="mb-4 p-3 bg-white border border-purple-200 rounded-lg">
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
                    <span className="text-sm font-medium text-gray-700">Inhouse</span>
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
                    <span className="text-sm font-medium text-gray-700">Outsource</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmitProduction}
                disabled={isSubmitting || !nextOperationForm.next_operator_id || !nextOperationForm.next_warehouse_id || !nextOperationForm.next_operation_id}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
