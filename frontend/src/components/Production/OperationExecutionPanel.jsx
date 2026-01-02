import { useState, useEffect } from 'react'
import { Play, StopCircle, Clock, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import OperationExecutionLog from './OperationExecutionLog'
import SearchableSelect from '../SearchableSelect'

export default function OperationExecutionPanel({ jobCard, workstations, operations, operators, onUpdate, onOperationEnded }) {
  const [executionData, setExecutionData] = useState({
    start_time: '',
    start_date: '',
    end_time: new Date().toTimeString().slice(0, 5),
    end_date: new Date().toISOString().split('T')[0],
    workstation_id: jobCard?.assigned_workstation_id || '',
    next_operation_id: jobCard?.next_operation_id || '',
    employee_id: '',
    quantity: jobCard?.planned_quantity || 0,
    inhouse: jobCard?.inhouse || false,
    outsource: jobCard?.outsource || false,
    notes: ''
  })
  const [challanData, setChallanData] = useState({
    vendor_id: '',
    vendor_name: '',
    expected_return_date: '',
    challan_notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isRunning, setIsRunning] = useState(jobCard?.status === 'in-progress')
  const [outwardChallans, setOutwardChallans] = useState([])
  const [inwardChallans, setInwardChallans] = useState([])
  const [timeLogs, setTimeLogs] = useState([])

  const getWorkstationName = () => {
    if (!executionData.workstation_id) return 'Not assigned'
    const ws = workstations?.find(w => 
      w.id === executionData.workstation_id || 
      w.name === executionData.workstation_id ||
      w.workstation_name === executionData.workstation_id
    )
    return ws ? `${ws.workstation_name || ws.name || ws.id}` : executionData.workstation_id
  }

  const getOperatorName = (empId) => {
    if (!empId) return '-'
    const operator = operators?.find(op => op.employee_id === empId)
    return operator ? `${operator.first_name} ${operator.last_name}` : '-'
  }

  const currentWorkstation = getWorkstationName()
  const currentOperation = operations?.find(op => op.name === jobCard?.operation)?.operation_name || jobCard?.operation || 'Not specified'

  useEffect(() => {
    if (jobCard?.actual_start_date && !jobCard?.actual_end_date) {
      setIsRunning(true)
    } else {
      setIsRunning(false)
    }
  }, [jobCard])

  useEffect(() => {
    if (jobCard && workstations && workstations.length > 0) {
      const workstationId = jobCard?.assigned_workstation_id || jobCard?.machine_id || jobCard?.workstation_id
      if (workstationId) {
        const matchedWs = workstations.find(ws =>
          ws.id === workstationId ||
          ws.name === workstationId ||
          ws.workstation_name === workstationId
        )
        if (matchedWs) {
          setExecutionData(prev => ({
            ...prev,
            workstation_id: matchedWs.id || matchedWs.name || workstationId
          }))
        }
      }
    }
  }, [jobCard, workstations])

  useEffect(() => {
    if (jobCard?.job_card_id) {
      fetchChallans()
      fetchTimeLogs()
    }
  }, [jobCard?.job_card_id])

  const fetchChallans = async () => {
    try {
      const [outRes, inRes] = await Promise.all([
        api.get(`/production/outward-challans?job_card_id=${jobCard.job_card_id}`),
        api.get(`/production/inward-challans?job_card_id=${jobCard.job_card_id}`)
      ])
      setOutwardChallans(outRes.data?.data || [])
      setInwardChallans(inRes.data?.data || [])
    } catch (err) {
      console.error('Failed to fetch challans:', err)
    }
  }

  const fetchTimeLogs = async () => {
    try {
      const response = await api.get(`/production/time-logs?job_card_id=${jobCard.job_card_id}`)
      const logs = response.data?.data || []
      setTimeLogs(logs)
      
      if (logs.length > 0 && !isRunning) {
        const latestLog = logs[logs.length - 1]
        autoFillFromTimeLog(latestLog)
      }
    } catch (err) {
      console.error('Failed to fetch time logs:', err)
    }
  }

  const autoFillFromTimeLog = (timeLog) => {
    if (!timeLog) return
    
    const workstationMatch = workstations?.find(ws =>
      ws.name === timeLog.workstation_name ||
      ws.workstation_name === timeLog.workstation_name
    )
    
    setExecutionData(prev => ({
      ...prev,
      employee_id: timeLog.employee_id || prev.employee_id,
      workstation_id: workstationMatch?.id || workstationMatch?.name || timeLog.workstation_name || prev.workstation_id,
      quantity: parseFloat(timeLog.completed_qty) || prev.quantity,
      start_time: timeLog.from_time || prev.start_time,
      start_date: prev.start_date || new Date().toISOString().split('T')[0],
      inhouse: timeLog.inhouse ? true : prev.inhouse,
      outsource: timeLog.outsource ? true : prev.outsource
    }))
  }

  const handleStartOperation = async () => {
    try {
      if (!executionData.employee_id) {
        setError('Please select an operator')
        return
      }

      setLoading(true)
      setError(null)

      const startTime = new Date().toISOString()
      const response = await api.post(
        `/production/job-cards/${jobCard.job_card_id}/start`,
        {
          actual_start_date: startTime,
          workstation_id: executionData.workstation_id,
          employee_id: executionData.employee_id,
          quantity: executionData.quantity,
          start_date: executionData.start_date,
          start_time: executionData.start_time,
          inhouse: executionData.inhouse,
          outsource: executionData.outsource,
          notes: executionData.notes
        }
      )

      if (response.data.success) {
        setSuccess('Operation started successfully')
        setIsRunning(true)
        setExecutionData(prev => ({ ...prev, start_time: startTime }))
        setTimeout(() => setSuccess(null), 3000)
        if (onUpdate) onUpdate()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start operation')
    } finally {
      setLoading(false)
    }
  }

  const handleEndOperation = async () => {
    try {
      if (!executionData.workstation_id) {
        setError('Please select a workstation')
        return
      }

      if (!executionData.end_date || !executionData.end_time) {
        setError('Please enter end date and time')
        return
      }

      setLoading(true)
      setError(null)

      const endTime = `${executionData.end_date}T${executionData.end_time}:00`
      const response = await api.post(
        `/production/job-cards/${jobCard.job_card_id}/end`,
        {
          actual_end_date: endTime,
          next_operation_id: executionData.next_operation_id || null,
          notes: executionData.notes
        }
      )

      if (response.data.success) {
        setSuccess('Operation ended successfully')
        setIsRunning(false)
        setExecutionData(prev => ({
          ...prev,
          end_time: '',
          end_date: '',
          start_time: '',
          start_date: '',
          employee_id: '',
          quantity: jobCard?.planned_quantity || 0
        }))
        setTimeout(() => setSuccess(null), 3000)
        if (onUpdate) onUpdate()
        await fetchTimeLogs()
        
        if (onOperationEnded) {
          onOperationEnded({
            operator_name: getOperatorName(executionData.employee_id),
            operation: jobCard?.operation,
            workstation_name: getWorkstationName(),
            completed_qty: executionData.quantity,
            start_date: jobCard?.actual_start_date,
            end_date: endTime,
            inhouse: executionData.inhouse,
            outsource: executionData.outsource
          })
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end operation')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOutwardChallan = async () => {
    try {
      if (!challanData.vendor_name) {
        setError('Please select a vendor')
        return
      }
      if (!challanData.expected_return_date) {
        setError('Please enter expected return date')
        return
      }

      setLoading(true)
      const response = await api.post('/production/outward-challans', {
        job_card_id: jobCard.job_card_id,
        vendor_id: challanData.vendor_id || null,
        vendor_name: challanData.vendor_name,
        expected_return_date: challanData.expected_return_date,
        notes: challanData.challan_notes
      })

      if (response.data.success) {
        setSuccess('Outward challan created successfully')
        setChallanData({
          vendor_id: '',
          vendor_name: '',
          expected_return_date: '',
          challan_notes: ''
        })
        await fetchChallans()
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create outward challan')
    } finally {
      setLoading(false)
    }
  }

  const isDelayed = jobCard?.is_delayed && jobCard.planned_end_date && new Date() > new Date(jobCard.planned_end_date)

  if (isRunning) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Operation Execution</h3>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-xs text-gray-600 mb-1">Workstation</label>
              <div className="text-sm font-semibold text-gray-900">{currentWorkstation}</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-xs text-gray-600 mb-1">Operation</label>
              <div className="text-sm font-semibold text-gray-900">{currentOperation}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-xs text-gray-600 mb-1">Operator</label>
              <div className="text-sm font-semibold text-gray-900">
                {getOperatorName(jobCard?.employee_id || jobCard?.operator_id)}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-xs text-gray-600 mb-1">Quantity</label>
              <div className="text-sm font-semibold text-gray-900">{executionData.quantity || '-'}</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-xs text-gray-600 mb-1">Start Time</label>
              <div className="text-sm font-semibold text-gray-900">
                {jobCard?.actual_start_date ? new Date(jobCard.actual_start_date).toLocaleString() : '-'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-700 mb-1">End Date *</label>
              <input
                type="date"
                value={executionData.end_date}
                onChange={(e) => setExecutionData({ ...executionData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                value={executionData.end_time}
                onChange={(e) => setExecutionData({ ...executionData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleEndOperation}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <StopCircle size={16} /> End Operation
            </button>
          </div>
        </div>

        {jobCard?.job_card_id && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Execution History</h3>
            <OperationExecutionLog jobCardId={jobCard.job_card_id} />
          </div>
        )}

        {inwardChallans.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Inward Challans</h3>
            <div className="space-y-2">
              {inwardChallans.map(challan => (
                <div key={challan.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">{challan.challan_number}</div>
                      <div className="text-xs text-gray-600">Vendor: {challan.vendor_name}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      challan.status === 'received' ? 'bg-green-100 text-green-800' :
                      challan.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {challan.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Received:</span> {challan.quantity_received}
                    </div>
                    <div>
                      <span className="text-gray-600">Accepted:</span> {challan.quantity_accepted}
                    </div>
                    <div>
                      <span className="text-gray-600">Rejected:</span> {challan.quantity_rejected}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Operation Execution</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {isDelayed && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <strong>⚠️ Operation is delayed!</strong>
              <p className="mt-1">Planned end date was {new Date(jobCard.planned_end_date).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1">Workstation *</label>
            <SearchableSelect
              value={executionData.workstation_id}
              onChange={(val) => setExecutionData({ ...executionData, workstation_id: val })}
              options={workstations?.map(ws => ({
                value: ws.id || ws.name,
                label: `${ws.workstation_name || ws.name || ws.id}`
              })) || []}
              placeholder="Select workstation"
              disabled={loading}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-xs text-gray-600 mb-1">Operation *</label>
            <div className="text-sm font-semibold text-gray-900">{currentOperation}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1">Operator *</label>
            <SearchableSelect
              value={executionData.employee_id}
              onChange={(val) => setExecutionData({ ...executionData, employee_id: val })}
              options={operators.map(op => ({
                value: op.employee_id,
                label: `${op.first_name} ${op.last_name}`
              }))}
              placeholder="Select operator"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              value={executionData.quantity}
              onChange={(e) => setExecutionData({ ...executionData, quantity: parseFloat(e.target.value) || 0 })}
              placeholder="Enter quantity"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={executionData.start_date}
              onChange={(e) => setExecutionData({ ...executionData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1">Start Time *</label>
            <input
              type="time"
              value={executionData.start_time}
              onChange={(e) => setExecutionData({ ...executionData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={loading}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-xs text-gray-600 mb-1">Production Type</label>
            <div className="flex gap-3 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={executionData.inhouse}
                  onChange={() => setExecutionData({ ...executionData, inhouse: true, outsource: false })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Inhouse</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={executionData.outsource}
                  onChange={() => setExecutionData({ ...executionData, outsource: true, inhouse: false })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Outsource</span>
              </label>
            </div>
          </div>
        </div>

        {executionData.outsource && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-sm font-semibold text-amber-900 mb-3">Outsource Challan Details</h4>
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-xs text-gray-700 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  value={challanData.vendor_name}
                  onChange={(e) => setChallanData({ ...challanData, vendor_name: e.target.value })}
                  placeholder="Enter vendor name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Expected Return Date *</label>
                <input
                  type="date"
                  value={challanData.expected_return_date}
                  onChange={(e) => setChallanData({ ...challanData, expected_return_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-700 mb-1">Challan Notes</label>
                <textarea
                  value={challanData.challan_notes}
                  onChange={(e) => setChallanData({ ...challanData, challan_notes: e.target.value })}
                  placeholder="Add challan notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  rows="2"
                />
              </div>
              <button
                onClick={handleCreateOutwardChallan}
                disabled={loading || !challanData.vendor_name || !challanData.expected_return_date}
                className="w-full px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Outward Challan
              </button>
            </div>
            {outwardChallans.length > 0 && (
              <div>
                <label className="block text-xs text-gray-700 font-semibold mb-2">Recent Outward Challans</label>
                <div className="space-y-2">
                  {outwardChallans.slice(0, 3).map(challan => (
                    <div key={challan.id} className="p-2 bg-white border border-amber-200 rounded text-xs">
                      <div><strong>{challan.challan_number}</strong> - {challan.vendor_name}</div>
                      <div className="text-gray-600">Return: {new Date(challan.expected_return_date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleStartOperation}
            disabled={loading || !executionData.employee_id || !executionData.workstation_id || !executionData.start_date || !executionData.start_time || executionData.quantity <= 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Play size={16} /> Start Operation
          </button>
        </div>
      </div>

      {jobCard?.job_card_id && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Execution History</h3>
          <OperationExecutionLog jobCardId={jobCard.job_card_id} />
        </div>
      )}
    </div>
  )
}
