import React, { useState, useEffect } from 'react'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import { useToast } from '../ToastContainer'

export default function TimeLogsModal({ isOpen, onClose, jobCardId, jobCardData }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [timeLogs, setTimeLogs] = useState([])
  const [operators, setOperators] = useState([])
  const [shifts] = useState(['A', 'B', 'C'])

  const [formData, setFormData] = useState({
    employee_id: '',
    operator_name: '',
    shift: 'A',
    from_time: '',
    to_time: '',
    completed_qty: 0,
    accepted_qty: 0,
    rejected_qty: 0,
    scrap_qty: 0
  })

  useEffect(() => {
    if (isOpen) {
      fetchOperators()
      fetchTimeLogs()
    }
  }, [isOpen, jobCardId])

  const fetchOperators = async () => {
    try {
      const response = await productionService.getEmployees()
      setOperators(response.data || [])
    } catch (err) {
      console.error('Failed to fetch operators:', err)
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
      setLoading(true)
      const payload = {
        job_card_id: jobCardId,
        employee_id: formData.employee_id,
        operator_name: formData.operator_name,
        shift: formData.shift,
        from_time: formData.from_time,
        to_time: formData.to_time,
        completed_qty: parseFloat(formData.completed_qty) || 0,
        accepted_qty: parseFloat(formData.accepted_qty) || 0,
        rejected_qty: parseFloat(formData.rejected_qty) || 0,
        scrap_qty: parseFloat(formData.scrap_qty) || 0,
        time_in_minutes: calculateTimeDuration()
      }

      await productionService.createTimeLog(payload)
      toast.addToast('Time log added successfully', 'success')
      
      setFormData({
        employee_id: '',
        operator_name: '',
        shift: 'A',
        from_time: '',
        to_time: '',
        completed_qty: 0,
        accepted_qty: 0,
        rejected_qty: 0,
        scrap_qty: 0
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
      <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
        {jobCardData && (
          <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            <strong>Job Card:</strong> {jobCardData.job_card_id} | <strong>Item:</strong> {jobCardData.item_name} | <strong>Qty:</strong> {jobCardData.planned_quantity}
          </div>
        )}

        <form onSubmit={handleAddTimeLog} style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1rem' }}>Add Time Log Entry</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Employee/Operator *</label>
              <select
                name="employee_id"
                value={formData.employee_id}
                onChange={(e) => handleOperatorChange(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Shift *</label>
              <select
                name="shift"
                value={formData.shift}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {shifts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>From Time *</label>
              <input
                type="time"
                name="from_time"
                value={formData.from_time}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>To Time *</label>
              <input
                type="time"
                name="to_time"
                value={formData.to_time}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Completed Qty</label>
              <input
                type="number"
                name="completed_qty"
                value={formData.completed_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Accepted Qty</label>
              <input
                type="number"
                name="accepted_qty"
                value={formData.accepted_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Rejected Qty</label>
              <input
                type="number"
                name="rejected_qty"
                value={formData.rejected_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Scrap Qty</label>
              <input
                type="number"
                name="scrap_qty"
                value={formData.scrap_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Time (Minutes)</label>
              <input
                type="number"
                value={calculateTimeDuration()}
                disabled
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f3f4f6' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            {loading ? 'Adding...' : 'Add Time Log'}
          </button>
        </form>

        <h3 style={{ marginBottom: '15px', fontSize: '1rem' }}>Time Log Entries ({timeLogs.length})</h3>
        
        {timeLogs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Operator</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Shift</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>From-To</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Completed</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Accepted</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Rejected</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Scrap</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Time (min)</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {timeLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px' }}>{log.operator_name}</td>
                    <td style={{ padding: '10px' }}>{log.shift}</td>
                    <td style={{ padding: '10px' }}>{log.from_time} - {log.to_time}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{log.completed_qty}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{log.accepted_qty}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{log.rejected_qty}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{log.scrap_qty}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>{log.time_in_minutes || 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteTimeLog(log.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
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
          <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            No time logs recorded yet
          </div>
        )}
      </div>
    </Modal>
  )
}
