import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'

export default function RecordRejectionModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [entries, setEntries] = useState([])
  const [formData, setFormData] = useState({
    production_entry_id: '',
    rejection_reason: '',
    rejection_count: '',
    root_cause: '',
    corrective_action: '',
    reported_by_id: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchEntries()
    }
  }, [isOpen])

  const fetchEntries = async () => {
    try {
      const response = await productionService.getProductionEntries({
        entry_date: new Date().toISOString().split('T')[0]
      })
      setEntries(response.data || [])
    } catch (err) {
      console.error('Failed to fetch entries:', err)
    }
  }

  const rejectionReasons = [
    'Dimensional Error',
    'Surface Defect',
    'Material Defect',
    'Assembly Error',
    'Color/Finish Issue',
    'Functional Failure',
    'Packaging Damage',
    'Other'
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.production_entry_id || !formData.rejection_reason || !formData.rejection_count || !formData.reported_by_id) {
        throw new Error('Please fill in all required fields')
      }

      await productionService.recordRejection(formData)
      
      // Reset form
      setFormData({
        production_entry_id: '',
        rejection_reason: '',
        rejection_count: '',
        root_cause: '',
        corrective_action: '',
        reported_by_id: ''
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to record rejection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚠️ Record Production Issue" size="lg">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Production Entry *
          </label>
          <select
            name="production_entry_id"
            value={formData.production_entry_id}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          >
            <option value="">Select Production Entry</option>
            {entries.map(entry => (
              <option key={entry.entry_id} value={entry.entry_id}>
                {entry.entry_id} - {entry.wo_id} - {entry.machine_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Rejection Reason *
            </label>
            <select
              name="rejection_reason"
              value={formData.rejection_reason}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit'
              }}
            >
              <option value="">Select Reason</option>
              {rejectionReasons.map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Rejection Count *
            </label>
            <input
              type="number"
              name="rejection_count"
              placeholder="0"
              value={formData.rejection_count}
              onChange={handleInputChange}
              required
              min="1"
              step="1"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Root Cause *
          </label>
          <textarea
            name="root_cause"
            placeholder="Describe the root cause of the rejection..."
            value={formData.root_cause}
            onChange={handleInputChange}
            required
            rows="3"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Corrective Action *
          </label>
          <textarea
            name="corrective_action"
            placeholder="Describe the corrective action taken or proposed..."
            value={formData.corrective_action}
            onChange={handleInputChange}
            required
            rows="3"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Reported By (Employee ID) *
          </label>
          <input
            type="text"
            name="reported_by_id"
            placeholder="EMP-XXXXX"
            value={formData.reported_by_id}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fde047',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          color: '#92400e'
        }}>
          <strong>⚠️ Important:</strong> This record will be tracked for CAPA (Corrective and Preventive Action).
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: '#f9fafb',
              color: '#1a1a1a',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#ef4444',
              color: 'white',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Recording...' : '✓ Record Issue'}
          </button>
        </div>
      </form>
    </Modal>
  )
}