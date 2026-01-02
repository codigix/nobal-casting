import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, User, AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../ToastContainer'

export default function TimeLogsModal({ isOpen, onClose, jobCardId, jobCardData }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [timeLogs, setTimeLogs] = useState([])
  const [operators, setOperators] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [shifts] = useState(['A', 'B', 'C'])
  const [itemName, setItemName] = useState('')

  const [formData, setFormData] = useState({
    employee_id: '',
    operator_name: '',
    workstation_name: '',
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

  useEffect(() => {
    if (isOpen) {
      fetchOperators()
      fetchWorkstations()
      fetchTimeLogs()
    }
  }, [isOpen, jobCardId])

  useEffect(() => {
    if (workstations.length > 0 && jobCardData) {
      const defaultWorkstation = jobCardData.assigned_workstation_id || workstations[0]?.name || ''
      setFormData(prev => ({
        ...prev,
        workstation_name: defaultWorkstation,
        inhouse: jobCardData.inhouse || false,
        outsource: jobCardData.outsource || false
      }))
    }
  }, [workstations, jobCardData])

  useEffect(() => {
    if (jobCardData && jobCardData.work_order_id) {
      fetchItemName()
    }
  }, [jobCardData])

  const fetchOperators = async () => {
    try {
      const response = await productionService.getEmployees()
      setOperators(response.data || [])
    } catch (err) {
      console.error('Failed to fetch operators:', err)
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await productionService.getWorkstationsList()
      setWorkstations(response.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

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

  const fetchTimeLogs = async () => {
    try {
      const response = await productionService.getTimeLogs({ job_card_id: jobCardId })
      setTimeLogs(response.data || [])
    } catch (err) {
      console.error('Failed to fetch time logs:', err)
    }
  }

  const calculateTimeDuration = () => {
    if (formData.from_time && formData.to_time) {
      const [fromHour, fromMin] = formData.from_time.split(':').map(Number)
      const [toHour, toMin] = formData.to_time.split(':').map(Number)
      const fromTotal = fromHour * 60 + fromMin
      const toTotal = toHour * 60 + toMin
      return Math.max(0, toTotal - fromTotal)
    }
    return 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleOperatorChange = (value) => {
    const operator = operators.find(op => op.employee_id === value)
    setFormData(prev => ({
      ...prev,
      employee_id: value,
      operator_name: operator ? `${operator.first_name} ${operator.last_name}` : ''
    }))
  }

  const handleAddTimeLog = async (e) => {
    e.preventDefault()
    try {
      if (!formData.employee_id) {
        toast.addToast('Please select an operator', 'error')
        return
      }
      if (!formData.workstation_name) {
        toast.addToast('Please select a workstation', 'error')
        return
      }

      setLoading(true)
      const payload = {
        job_card_id: jobCardId,
        employee_id: formData.employee_id,
        operator_name: formData.operator_name,
        workstation_name: formData.workstation_name,
        shift: formData.shift,
        from_time: formData.from_time,
        to_time: formData.to_time,
        completed_qty: parseFloat(formData.completed_qty) || 0,
        accepted_qty: parseFloat(formData.accepted_qty) || 0,
        rejected_qty: parseFloat(formData.rejected_qty) || 0,
        scrap_qty: parseFloat(formData.scrap_qty) || 0,
        inhouse: formData.inhouse ? 1 : 0,
        outsource: formData.outsource ? 1 : 0,
        time_in_minutes: calculateTimeDuration()
      }

      await productionService.createTimeLog(payload)
      toast.addToast('Time log added successfully', 'success')
      
      const defaultWorkstation = jobCardData?.assigned_workstation_id || workstations[0]?.name || ''
      setFormData({
        employee_id: '',
        operator_name: '',
        workstation_name: defaultWorkstation,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Time Logs" size="lg">
      <div className="">
        {jobCardData && (
          <div className="mb-6 p-2 bg-blue-50 border border-blue-200 rounded-lg">
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

        <form onSubmit={handleAddTimeLog} className="mb-8 p-2 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
            <Plus size={18} /> Add Time Log Entry
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Operator *
              </label>
              <select
                value={formData.employee_id}
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
              <label className="block text-xs  text-gray-700 mb-1">
                Workstation *
              </label>
              <select
                value={formData.workstation_name}
                onChange={(e) => setFormData({ ...formData, workstation_name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select workstation</option>
                {workstations.map(ws => (
                  <option key={ws.id || ws.name} value={ws.name}>
                    {ws.workstation_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Shift *
              </label>
              <select
                name="shift"
                value={formData.shift}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {shifts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                From Time *
              </label>
              <input
                type="time"
                name="from_time"
                value={formData.from_time}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                To Time *
              </label>
              <input
                type="time"
                name="to_time"
                value={formData.to_time}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={calculateTimeDuration()}
                disabled
                className="w-full  p-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Completed Qty
              </label>
              <input
                type="number"
                name="completed_qty"
                value={formData.completed_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Accepted Qty
              </label>
              <input
                type="number"
                name="accepted_qty"
                value={formData.accepted_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Rejected Qty
              </label>
              <input
                type="number"
                name="rejected_qty"
                value={formData.rejected_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs  text-gray-700 mb-1">
                Scrap Qty
              </label>
              <input
                type="number"
                name="scrap_qty"
                value={formData.scrap_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full p-2 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full text-sm font-medium text-gray-600">
                Total: {parseFloat(formData.completed_qty || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-300">
              <input
                type="checkbox"
                id="inhouse"
                checked={formData.inhouse}
                onChange={(e) => setFormData({ ...formData, inhouse: e.target.checked, outsource: e.target.checked ? false : formData.outsource })}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
              />
              <label htmlFor="inhouse" className="text-sm font-medium text-gray-700 cursor-pointer">
                Inhouse
              </label>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-300">
              <input
                type="checkbox"
                id="outsource"
                checked={formData.outsource}
                onChange={(e) => setFormData({ ...formData, outsource: e.target.checked, inhouse: e.target.checked ? false : formData.inhouse })}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
              />
              <label htmlFor="outsource" className="text-sm font-medium text-gray-700 cursor-pointer">
                Outsource
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Time Log'}
          </button>
        </form>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-3">Production Summary</h4>
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs font-semibold">Total Produced</p>
              <p className="text-sm font-bold text-gray-900">
                {timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-semibold">Total Accepted</p>
              <p className="text-lg font-bold text-green-600">
                {timeLogs.reduce((sum, log) => sum + (parseFloat(log.accepted_qty) || 0), 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-semibold">Total Rejected</p>
              <p className="text-lg font-bold text-red-600">
                {timeLogs.reduce((sum, log) => sum + (parseFloat(log.rejected_qty) || 0), 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-semibold">Total Scrap</p>
              <p className="text-lg font-bold text-orange-600">
                {timeLogs.reduce((sum, log) => sum + (parseFloat(log.scrap_qty) || 0), 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-semibold">Remaining</p>
              <p className="text-lg font-bold text-blue-600">
                {(parseFloat(jobCardData?.planned_quantity || 0) - timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={18} /> Time Log Entries ({timeLogs.length})
          </h3>
          
          {timeLogs.length > 0 ? (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Operator</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Workstation</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Shift</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Time</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Completed</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Accepted</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Rejected</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Scrap</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {timeLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900">{log.operator_name}</td>
                      <td className="px-4 py-3 text-gray-900">{log.workstation_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-center text-gray-900">{log.shift}</td>
                      <td className="px-4 py-3 text-center text-gray-600 text-xs">
                        {log.from_time} - {log.to_time}
                        <br />
                        <span className="text-gray-500">({log.time_in_minutes || 0} min)</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 font-medium">{log.completed_qty}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{log.accepted_qty}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{log.rejected_qty}</td>
                      <td className="px-4 py-3 text-center text-orange-600 font-medium">{log.scrap_qty}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          {log.inhouse && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">In</span>}
                          {log.outsource && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">Out</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeleteTimeLog(log.id)}
                          className="text-red-600 hover:text-red-900 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p>No time logs recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
