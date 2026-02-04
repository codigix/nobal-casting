import React, { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import { useToast } from '../ToastContainer'

export default function DowntimeEntryModal({ isOpen, onClose, jobCardId, jobCardData }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [downtimeTypes] = useState([
    'Machine Breakdown',
    'Tool Change',
    'Maintenance',
    'Material Shortage',
    'Setup/Adjustment',
    'Quality Issue',
    'Operator Break',
    'Power Outage',
    'Other'
  ])
  const [downtimes, setDowntimes] = useState([])

  const [formData, setFormData] = useState({
    type: '',
    reason: '',
    from_time: '',
    to_time: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchDowntimes()
    }
  }, [isOpen, jobCardId])

  const fetchDowntimes = async () => {
    try {
      const response = await productionService.getDowntimes({ job_card_id: jobCardId })
      setDowntimes(response.data || [])
    } catch (err) {
      console.error('Failed to fetch downtimes:', err)
    }
  }

  const calculateDuration = (fromTime, toTime) => {
    if (!fromTime || !toTime) return 0
    const [fromHour, fromMin] = fromTime.split(':').map(Number)
    const [toHour, toMin] = toTime.split(':').map(Number)
    let fromTotal = fromHour * 60 + fromMin
    let toTotal = toHour * 60 + toMin
    
    if (toTotal < fromTotal) {
      toTotal += 24 * 60;
    }
    
    return toTotal - fromTotal
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddDowntime = async (e) => {
    e.preventDefault()
    
    if (!formData.type || !formData.from_time || !formData.to_time) {
      toast.addToast('Please fill all required fields', 'error')
      return
    }

    try {
      setLoading(true)
      const durationMinutes = calculateDuration(formData.from_time, formData.to_time)
      
      const payload = {
        job_card_id: jobCardId,
        downtime_type: formData.type,
        downtime_reason: formData.reason,
        from_time: formData.from_time,
        to_time: formData.to_time,
        duration_minutes: durationMinutes
      }

      await productionService.createDowntime(payload)
      toast.addToast('Downtime entry recorded', 'success')
      
      setFormData({
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

  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (d.duration_minutes || 0), 0)
  const totalDowntimeHours = (totalDowntimeMinutes / 60).toFixed(2)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Downtime Entry" size="lg">
      <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
        {jobCardData && (
          <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            <strong>Job Card:</strong> {jobCardData.job_card_id} | <strong>Item:</strong> {jobCardData.item_name} | <strong>Qty:</strong> {jobCardData.planned_quantity}
          </div>
        )}

        <form onSubmit={handleAddDowntime} style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1rem' }}>Record Downtime</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Downtime Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              >
                <option value="">Select type</option>
                {downtimeTypes.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Reason *</label>
              <input
                type="text"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                placeholder="Brief description"
                required
              />
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
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Duration (Minutes)</label>
              <input
                type="number"
                value={calculateDuration(formData.from_time, formData.to_time)}
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
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            {loading ? 'Recording...' : 'Record Downtime'}
          </button>
        </form>

        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px' }}>
          <strong>Total Downtime:</strong> {totalDowntimeMinutes} minutes ({totalDowntimeHours} hours)
        </div>

        <h3 style={{ marginBottom: '15px', fontSize: '1rem' }}>Downtime History ({downtimes.length})</h3>
        
        {downtimes.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>From - To</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Duration (min)</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {downtimes.map(downtime => (
                  <tr key={downtime.downtime_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px' }}>{downtime.downtime_type}</td>
                    <td style={{ padding: '10px' }}>{downtime.downtime_reason}</td>
                    <td style={{ padding: '10px', fontSize: '0.85rem' }}>{downtime.from_time} - {downtime.to_time}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{downtime.duration_minutes || 0}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteDowntime(downtime.downtime_id)}
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
            No downtime recorded
          </div>
        )}
      </div>
    </Modal>
  )
}
