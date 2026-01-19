import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Clock, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react'
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

      const jobCardStatus = (jobCard?.status || '').toLowerCase()
      
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
      
      if (jobCard?.work_order_id) {
        try {
          const woRes = await productionService.getWorkOrder(jobCard.work_order_id)
          const woData = woRes?.data || woRes
          
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

      const totalProduced = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)
      const plannedQty = parseFloat(jobCardData?.planned_quantity || 0)

      if (totalProduced < plannedQty) {
        const shortfall = (plannedQty - totalProduced).toFixed(2)
        if (!window.confirm(`Warning: Produced quantity (${totalProduced.toFixed(2)}) is less than planned (${plannedQty.toFixed(2)}). Shortfall: ${shortfall} units. Continue anyway?`)) {
          return
        }
      }

      const updatePayload = {
        status: 'completed',
        produced_quantity: totalProduced
      }
      
      await productionService.updateJobCard(jobCardData.job_card_id, updatePayload)

      let successMessage = 'Production completed successfully'

      if (nextOperationForm.next_operation_id && nextOperationForm.next_warehouse_id) {
        const selectedOp = operations.find(op => 
          (op.operation_id || op.id) === nextOperationForm.next_operation_id || 
          (op.operation_name || op.name) === nextOperationForm.next_operation_id
        )

        const nextJobCard = {
          work_order_id: jobCardData.work_order_id,
          operation: selectedOp?.operation_name || selectedOp?.name,
          machine_id: selectedOp?.workstation_type || selectedOp?.workstation_name || jobCardData.machine_id || jobCardData.assigned_workstation_id,
          ...(nextOperationForm.next_operator_id && { operator_id: nextOperationForm.next_operator_id }),
          planned_quantity: totalProduced,
          operation_sequence: (jobCardData.operation_sequence || 0) + 1,
          status: 'draft'
        }

        await productionService.createJobCard(nextJobCard)
        
        successMessage = 'Production completed and next operation assigned successfully'
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

  const totalProducedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)
  const totalAcceptedQty = timeLogs.reduce((sum, log) => sum + (parseFloat(log.accepted_qty) || 0), 0)
  const totalRejectedQty = rejections.reduce((sum, r) => sum + (parseFloat(r.rejected_qty) || 0), 0)
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (parseFloat(d.duration_minutes) || 0), 0)

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-3">
      <div className=" mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate('/manufacturing/job-cards')}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-300 hover:bg-gray-400 rounded-md transition text-xs font-medium"
          >
            <ArrowLeft size={14} />
            Back
          </button>
        </div>

        <div className="bg-white rounded-xs shadow-mdp-2">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Production Entry</h1>

          {jobCardData && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xs">
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Job Card</p>
                  <p className="text-gray-900 font-bold text-xs mt-0.5">{jobCardData.job_card_id}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Item</p>
                  <p className="text-gray-900 font-bold text-xs mt-0.5">{itemName || jobCardData.item_name || 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Planned Qty</p>
                  <p className="text-gray-900 font-bold text-xs mt-0.5">{jobCardData.planned_quantity}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-2xs font-semibold uppercase tracking-wide">Operation</p>
                  <p className="text-gray-900 font-bold text-xs mt-0.5">{jobCardData.operation || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xs">
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
            <div className="p-3 bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-xs">
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                Time Logs ({timeLogs.length})
              </h3>
              <form onSubmit={handleAddTimeLog} className="mb-4 p-2.5 bg-white border border-blue-200 rounded-xs">
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
                      <option key="default-operator" value="">Select operator</option>
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
                      <option key="default-workstation" value="">Select workstation</option>
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
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Completed Qty *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={timeLogForm.completed_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Duration</label>
                    <input
                      type="text"
                      disabled
                      value={`${calculateTimeDuration()} min`}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Accepted Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      value={timeLogForm.accepted_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, accepted_qty: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Rejected Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      value={timeLogForm.rejected_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, rejected_qty: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Scrap Qty</label>
                    <input
                      type="number"
                      step="0.01"
                      value={timeLogForm.scrap_qty}
                      onChange={(e) => setTimeLogForm({ ...timeLogForm, scrap_qty: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-end gap-1">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={timeLogForm.inhouse}
                        onChange={(e) => setTimeLogForm({ ...timeLogForm, inhouse: e.target.checked })}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-600 font-semibold">In-house</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={timeLogForm.outsource}
                        onChange={(e) => setTimeLogForm({ ...timeLogForm, outsource: e.target.checked })}
                        className="w-3 h-3"
                      />
                      <span className="text-gray-600 font-semibold">Outsource</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  {formLoading ? 'Adding...' : 'Add Time Log'}
                </button>
              </form>

              <div className="space-y-1">
                {timeLogs.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500">No time logs yet</div>
                ) : (
                  timeLogs.map(log => (
                    <div key={log.time_log_id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{log.operator_name} - {log.workstation_name}</p>
                        <p className="text-gray-600 text-2xs">
                          {log.from_time} - {log.to_time} ({log.time_in_minutes} min) | Shift {log.shift}
                        </p>
                        <p className="text-gray-600 text-2xs">
                          Completed: {log.completed_qty} | Accepted: {log.accepted_qty} | Rejected: {log.rejected_qty}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteTimeLog(log.time_log_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rejections Section */}
            <div className="p-3 bg-gradient-to-br from-red-50 to-slate-50 border border-red-200 rounded-xs">
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                Quality Rejections ({rejections.length})
              </h3>
              <form onSubmit={handleAddRejection} className="mb-4 p-2.5 bg-white border border-red-200 rounded-xs">
                <h4 className="mb-3 font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                  <Plus size={14} /> Record Rejection
                </h4>
                
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Reason *</label>
                    <select
                      value={rejectionForm.reason}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select reason</option>
                      {rejectionReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Rejected Qty *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rejectionForm.rejected_qty}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Notes</label>
                    <input
                      type="text"
                      value={rejectionForm.notes}
                      onChange={(e) => setRejectionForm({ ...rejectionForm, notes: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  {formLoading ? 'Recording...' : 'Record Rejection'}
                </button>
              </form>

              <div className="space-y-1">
                {rejections.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500">No rejections recorded</div>
                ) : (
                  rejections.map(rej => (
                    <div key={rej.rejection_id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{rej.rejection_reason}</p>
                        <p className="text-gray-600 text-2xs">Qty: {rej.rejected_qty} | {rej.notes}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteRejection(rej.rejection_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Downtimes Section */}
            <div className="p-3 bg-gradient-to-br from-orange-50 to-slate-50 border border-orange-200 rounded-xs">
              <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                Downtimes ({downtimes.length})
              </h3>
              <form onSubmit={handleAddDowntime} className="mb-4 p-2.5 bg-white border border-orange-200 rounded-xs">
                <h4 className="mb-3 font-bold text-gray-900 flex items-center gap-2 text-xs uppercase tracking-wide">
                  <Clock size={14} /> Record Downtime
                </h4>
                
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Type *</label>
                    <select
                      value={downtimeForm.type}
                      onChange={(e) => setDowntimeForm({ ...downtimeForm, type: e.target.value })}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select type</option>
                      {downtimeTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
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
                    <label className="block text-xs text-gray-600 font-semibold mb-0.5">Duration</label>
                    <input
                      type="text"
                      disabled
                      value={`${calculateDowntimeDuration(downtimeForm.from_time, downtimeForm.to_time)} min`}
                      className="w-full p-1.5 border border-gray-300 rounded text-xs bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="block text-xs text-gray-600 font-semibold mb-0.5">Reason</label>
                  <input
                    type="text"
                    value={downtimeForm.reason}
                    onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Optional reason"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Clock size={14} />
                  {formLoading ? 'Recording...' : 'Record Downtime'}
                </button>
              </form>

              <div className="space-y-1">
                {downtimes.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-500">No downtimes recorded</div>
                ) : (
                  downtimes.map(dt => (
                    <div key={dt.downtime_id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{dt.downtime_type}</p>
                        <p className="text-gray-600 text-2xs">
                          {dt.from_time} - {dt.to_time} ({dt.duration_minutes} min) | {dt.downtime_reason}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteDowntime(dt.downtime_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Completion Section */}
          <div className="mt-6 p-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xs">
            <h3 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
              <CheckCircle size={16} /> Complete Job Card
            </h3>
            <form className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-0.5">Next Operator</label>
                  <select
                    value={nextOperationForm.next_operator_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operator_id: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option key="default-next-operator" value="">Select operator (optional)</option>
                    {operators.map(op => (
                      <option key={op.employee_id} value={op.employee_id}>
                        {op.first_name} {op.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-0.5">Warehouse (optional)</label>
                  <select
                    value={nextOperationForm.next_warehouse_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option key="default-warehouse" value="">Select warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh.warehouse_name} value={wh.warehouse_name}>{wh.warehouse_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 font-semibold mb-0.5">Next Operation (optional)</label>
                  <select
                    value={nextOperationForm.next_operation_id}
                    onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operation_id: e.target.value })}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option key="default-operation" value="">Select operation</option>
                    {operations.map((op, idx) => {
                      const opId = op.operation_id || op.id || idx
                      const opName = op.operation_name || op.name || `Operation ${opId}`
                      return (
                        <option key={opId} value={opId}>
                          {opName}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitProduction}
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xs font-semibold transition flex items-center text-xs justify-center gap-2"
              >
                <CheckCircle size={16} />
                {isSubmitting ? 'Completing...' : 'Complete Production & Create Next Job Card'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
