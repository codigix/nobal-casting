import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Clock, AlertCircle, ArrowLeft } from 'lucide-react'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'

export default function ProductionEntry() {
  const { jobCardId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  
  const [jobCardData, setJobCardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [itemName, setItemName] = useState('')
  
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
    fetchAllData()
  }, [jobCardId])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [jobCardRes, wsRes, empRes, opsRes] = await Promise.all([
        productionService.getJobCards({ id: jobCardId }),
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList()
      ])
      
      const jobCard = jobCardRes.data?.[0] || jobCardRes.data
      setJobCardData(jobCard)
      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
      setOperations(opsRes.data || [])
      
      if (jobCard?.work_order_id) {
        fetchItemName(jobCard.work_order_id)
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

      setFormLoading(true)
      const payload = {
        job_card_id: jobCardId,
        employee_id: timeLogForm.employee_id,
        operator_name: timeLogForm.operator_name,
        workstation_name: timeLogForm.machine_id,
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
      
      setTimeout(() => {
        fetchTimeLogs()
      }, 300)
    } catch (err) {
      toast.addToast(err.message || 'Failed to add time log', 'error')
    } finally {
      setFormLoading(false)
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

  const handleAddRejection = async (e) => {
    e.preventDefault()
    
    if (!rejectionForm.reason || rejectionForm.rejected_qty <= 0) {
      toast.addToast('Please select a reason and enter quantity', 'error')
      return
    }

    try {
      setFormLoading(true)
      const payload = {
        job_card_id: jobCardId,
        rejection_reason: rejectionForm.reason,
        rejected_qty: rejectionForm.rejected_qty,
        notes: rejectionForm.notes
      }

      await productionService.createRejection(payload)
      toast.addToast('Rejection entry recorded', 'success')
      
      setRejectionForm({
        reason: '',
        rejected_qty: 0,
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
      
      if (!nextOperationForm.next_warehouse_id) {
        toast.addToast('Please select warehouse', 'error')
        return
      }
      if (!nextOperationForm.next_operation_id) {
        toast.addToast('Please select next operation', 'error')
        return
      }

      const totalProduced = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)

      const nextJobCard = {
        work_order_id: jobCardData.work_order_id,
        operation: operations.find(op => op.operation_id === nextOperationForm.next_operation_id)?.name,
        machine_id: jobCardData.machine_id || jobCardData.assigned_workstation_id,
        ...(nextOperationForm.next_operator_id && { operator_id: nextOperationForm.next_operator_id }),
        planned_quantity: totalProduced,
        status: 'Open'
      }

      await productionService.createJobCard(nextJobCard)

      await productionService.updateJobCard(jobCardData.job_card_id, {
        status: 'completed',
        produced_quantity: totalProduced
      })

      toast.addToast('Production completed and next operation assigned successfully', 'success')
      
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

  const totalProducedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)
  const totalAcceptedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.accepted_qty) || 0), 0)
  const totalRejectedQty = rejections.reduce((sum, r) => sum + (parseFloat(r.rejected_qty) || 0), 0)
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (parseFloat(d.duration_minutes) || 0), 0)

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate('/manufacturing/job-cards')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-300 hover:bg-gray-400 rounded-md transition text-xs font-medium"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Production Entry</h1>

          {jobCardData && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Job Card</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">{jobCardData.job_card_id}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Item</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">{itemName || jobCardData.item_name || 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Planned Qty</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">{jobCardData.planned_quantity}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Operation</p>
                  <p className="text-gray-900 font-bold text-sm mt-0.5">{jobCardData.operation || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wide">Production Summary</h4>
            <div className="grid grid-cols-5 gap-2 text-xs">
              <div>
                <p className="text-gray-600 text-2xs font-semibold">Produced</p>
                <p className="text-base font-bold text-gray-900 mt-1">{totalProducedQty.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-2xs font-semibold">Accepted</p>
                <p className="text-base font-bold text-green-600 mt-1">{totalAcceptedQty.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-2xs font-semibold">Rejected</p>
                <p className="text-base font-bold text-red-600 mt-1">{totalRejectedQty.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-2xs font-semibold">Downtime</p>
                <p className="text-base font-bold text-orange-600 mt-1">{Math.round(totalDowntimeMinutes)} min</p>
              </div>
              <div>
                <p className="text-gray-600 text-2xs font-semibold">Remaining</p>
                <p className="text-base font-bold text-blue-600 mt-1">
                  {(parseFloat(jobCardData?.planned_quantity || 0) - totalProducedQty).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Time Logs Section */}
            <div className="p-3 bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-lg">
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                Time Logs ({timeLogs.length})
              </h3>
              <form onSubmit={handleAddTimeLog} className="mb-4 p-2.5 bg-white border border-blue-200 rounded-lg">
                <h4 className="mb-3 font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                  <Plus size={14} /> Add Time Log
                </h4>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Operator *</label>
                    <select
                      value={timeLogForm.employee_id}
                      onChange={(e) => handleOperatorChange(e.target.value)}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option key="" value="">Select operator</option>
                      {operators.map(op => (
                        <option key={op.employee_id} value={op.employee_id}>
                          {op.first_name} {op.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Workstation *</label>
                    <select
                      value={timeLogForm.machine_id}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, machine_id: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option key="" value="">Select workstation</option>
                      {workstations && workstations.length > 0 ? workstations.map(ws => (
                        <option key={ws.id || ws.name} value={ws.name || ws.workstation_name || ws.id}>
                          {ws.workstation_name || ws.name || ws.id}
                        </option>
                      )) : (
                        <option disabled>No workstations available</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Shift *</label>
                    <select
                      value={timeLogForm.shift}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, shift: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {shifts.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">From Time *</label>
                    <input
                      type="time"
                      value={timeLogForm.from_time}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, from_time: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">To Time *</label>
                    <input
                      type="time"
                      value={timeLogForm.to_time}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, to_time: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Duration (min)</label>
                    <input
                      type="number"
                      value={calculateTimeDuration()}
                      disabled
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Completed Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.completed_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Accepted Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.accepted_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, accepted_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Rejected Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.rejected_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, rejected_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Scrap Qty</label>
                    <input
                      type="number"
                      value={timeLogForm.scrap_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, scrap_qty: e.target.value })}
                      step="0.01"
                      min="0"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="w-full text-xs font-bold text-gray-700">
                      Total: {parseFloat(timeLogForm.completed_qty || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-300">
                    <input
                      type="checkbox"
                      id="inhouse"
                      checked={timeLogForm.inhouse}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, inhouse: e.target.checked, outsource: e.target.checked ? false : timeLogForm.outsource })}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="inhouse" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Inhouse
                    </label>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-300">
                    <input
                      type="checkbox"
                      id="outsource"
                      checked={timeLogForm.outsource}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, outsource: e.target.checked, inhouse: e.target.checked ? false : timeLogForm.inhouse })}
                      className="w-3.5 h-3.5 rounded border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="outsource" className="text-xs font-medium text-gray-700 cursor-pointer">
                      Outsource
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Adding...' : 'Add Time Log'}
                </button>
              </form>

              {timeLogs.length > 0 ? (
                <div className="overflow-x-auto border border-blue-200 rounded">
                  <table className="w-full text-2xs">
                    <thead className="bg-blue-100 border-b border-blue-200">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-700">Operator</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-700">Workstation</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Shift</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Time</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Completed</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Accepted</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Type</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                      {timeLogs.map(log => (
                        <tr key={log.time_log_id || log.id} className="hover:bg-blue-50 transition">
                          <td className="px-2 py-1.5 text-gray-900 text-xs">{log.operator_name}</td>
                          <td className="px-2 py-1.5 text-gray-900 text-xs">{log.workstation_name || log.machine_id || 'N/A'}</td>
                          <td className="px-2 py-1.5 text-center text-gray-900 font-medium text-xs">{log.shift}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600 text-xs">
                            {log.from_time} - {log.to_time}
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-900 font-bold text-xs">{log.completed_qty}</td>
                          <td className="px-2 py-1.5 text-center text-green-600 font-bold text-xs">{log.accepted_qty}</td>
                          <td className="px-2 py-1.5 text-center">
                            <div className="flex justify-center gap-0.5">
                              {log.inhouse && <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-2xs font-bold">In</span>}
                              {log.outsource && <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-2xs font-bold">Out</span>}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => handleDeleteTimeLog(log.time_log_id || log.id)}
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
                <div className="p-6 text-center bg-blue-50 border border-blue-200 rounded text-gray-500">
                  <Clock size={22} className="mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs">No time logs recorded yet</p>
                </div>
              )}
            </div>

            {/* Rejections Section */}
            <div className="p-3 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-lg">
              <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">Rejections ({rejections.length})</h3>
              <form onSubmit={handleAddRejection} className="mb-4 p-2.5 bg-white border border-red-200 rounded-lg">
                <h4 className="mb-3 font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                  <Plus size={14} /> Add Rejection
                </h4>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Rejection Reason *</label>
                    <select
                      value={rejectionForm.reason}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option key="" value="">Select reason</option>
                      {rejectionReasons.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Rejected Qty *</label>
                    <input
                      type="number"
                      value={rejectionForm.rejected_qty}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      min="0"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-600 font-semibold mb-0.5">Notes</label>
                  <textarea
                    value={rejectionForm.notes}
                    onChange={(e) => setRejectionForm({ ...rejectionForm, notes: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows="2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white font-medium text-xs rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Adding...' : 'Add Rejection'}
                </button>
              </form>

              {rejections.length > 0 ? (
                <div className="overflow-x-auto border border-red-200 rounded">
                  <table className="w-full text-2xs">
                    <thead className="bg-red-100 border-b border-red-200">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-700">Reason</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Qty</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-700">Notes</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Date</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {rejections.map(r => (
                        <tr key={r.rejection_id || r.id} className="hover:bg-red-50 transition">
                          <td className="px-2 py-1.5 text-gray-900 text-xs">{r.rejection_reason}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-red-600 text-xs">{r.rejected_qty}</td>
                          <td className="px-2 py-1.5 text-gray-600 text-2xs">{r.notes || '-'}</td>
                          <td className="px-2 py-1.5 text-center text-gray-500 text-2xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => handleDeleteRejection(r.rejection_id || r.id)}
                              className="text-red-600 hover:text-red-900 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center bg-red-50 border border-red-200 rounded text-gray-500">
                  <AlertCircle size={22} className="mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs">No rejection entries recorded</p>
                </div>
              )}
            </div>

            {/* Downtimes Section */}
            <div className="p-3 bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
              <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">Downtimes ({downtimes.length})</h3>
              <form onSubmit={handleAddDowntime} className="mb-4 p-2.5 bg-white border border-orange-200 rounded-lg">
                <h4 className="mb-3 font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                  <Plus size={14} /> Add Downtime
                </h4>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Downtime Type *</label>
                    <select
                      value={downtimeForm.type}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, type: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    >
                      <option key="" value="">Select type</option>
                      {downtimeTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Reason</label>
                    <input
                      type="text"
                      value={downtimeForm.reason}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Optional details"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">From Time *</label>
                    <input
                      type="time"
                      value={downtimeForm.from_time}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, from_time: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">To Time *</label>
                    <input
                      type="time"
                      value={downtimeForm.to_time}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, to_time: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Duration (min)</label>
                    <input
                      type="number"
                      value={calculateDowntimeDuration(downtimeForm.from_time, downtimeForm.to_time)}
                      disabled
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Adding...' : 'Add Downtime'}
                </button>
              </form>

              {downtimes.length > 0 ? (
                <div className="overflow-x-auto border border-orange-200 rounded">
                  <table className="w-full text-2xs">
                    <thead className="bg-orange-100 border-b border-orange-200">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-700">Type</th>
                        <th className="px-2 py-1.5 text-left font-bold text-gray-700">Reason</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Time</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Duration</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Date</th>
                        <th className="px-2 py-1.5 text-center font-bold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                      {downtimes.map(d => (
                        <tr key={d.downtime_id || d.id} className="hover:bg-orange-50 transition">
                          <td className="px-2 py-1.5 text-gray-900 text-xs">{d.downtime_type}</td>
                          <td className="px-2 py-1.5 text-gray-600 text-2xs">{d.downtime_reason || '-'}</td>
                          <td className="px-2 py-1.5 text-center text-gray-600 text-2xs">
                            {d.from_time} - {d.to_time}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-orange-600 text-xs">{d.duration_minutes || 0} min</td>
                          <td className="px-2 py-1.5 text-center text-gray-500 text-2xs">{d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}</td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => handleDeleteDowntime(d.downtime_id || d.id)}
                              className="text-red-600 hover:text-red-900 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center bg-orange-50 border border-orange-200 rounded text-gray-500">
                  <Clock size={22} className="mx-auto mb-1.5 opacity-50" />
                  <p className="text-xs">No downtime entries recorded</p>
                </div>
              )}
            </div>

            {/* Next Operation Section */}
            <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
              <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">Assign Next Operation</h3>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="block text-2xs font-semibold text-gray-700 mb-0.5">Next Operator</label>
                  <select
                    value={nextOperationForm.next_operator_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operator_id: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option key="" value="">Select operator</option>
                    {operators.map(op => (
                      <option key={op.employee_id} value={op.employee_id}>
                        {op.first_name} {op.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-700 mb-0.5">Warehouse *</label>
                  <select
                    value={nextOperationForm.next_warehouse_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option key="" value="">Select warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh.warehouse_id || wh.id} value={wh.warehouse_id || wh.id}>
                        {wh.warehouse_name || wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-gray-700 mb-0.5">Next Operation *</label>
                  <select
                    value={nextOperationForm.next_operation_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operation_id: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option key="" value="">Select operation</option>
                    {operations.map(op => (
                      <option key={op.operation_id || op.id} value={op.operation_id || op.id}>
                        {op.operation_name || op.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3 p-2.5 bg-white border border-purple-200 rounded">
                <label className="block text-2xs font-semibold text-gray-700 mb-2">Production Type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nextOperationForm.inhouse}
                      onChange={(e) => setNextOperationForm({ 
                        ...nextOperationForm, 
                        inhouse: e.target.checked,
                        outsource: e.target.checked ? false : nextOperationForm.outsource
                      })}
                      className="w-3.5 h-3.5 rounded border-gray-300"
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
                      className="w-3.5 h-3.5 rounded border-gray-300"
                    />
                    <span className="text-xs font-medium text-gray-700">Outsource</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSubmitProduction}
                disabled={isSubmitting || !nextOperationForm.next_warehouse_id || !nextOperationForm.next_operation_id}
                className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Assigning...' : 'Submit & Complete Production'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
