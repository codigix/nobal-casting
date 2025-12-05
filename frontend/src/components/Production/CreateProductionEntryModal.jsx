import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'

export default function CreateProductionEntryModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [machines, setMachines] = useState([])
  const [operators, setOperators] = useState([])
  const [formData, setFormData] = useState({
    work_order_id: '',
    machine_id: '',
    operator_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    shift_no: '1',
    quantity_produced: '',
    quantity_rejected: '',
    hours_worked: '',
    remarks: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      const [machinesRes, operatorsRes] = await Promise.all([
        productionService.getMachines(),
        productionService.getOperators()
      ])
      setMachines(machinesRes.data || [])
      setOperators(operatorsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

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
      if (!formData.work_order_id || !formData.machine_id || !formData.quantity_produced) {
        throw new Error('Please fill in all required fields')
      }

      await productionService.createProductionEntry(formData)
      
      // Reset form
      setFormData({
        work_order_id: '',
        machine_id: '',
        operator_id: '',
        entry_date: new Date().toISOString().split('T')[0],
        shift_no: '1',
        quantity_produced: '',
        quantity_rejected: '',
        hours_worked: '',
        remarks: ''
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create production entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 Record Daily Production Entry" size="lg">
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Work Order ID *
            </label>
            <input
              type="text"
              name="work_order_id"
              placeholder="WO-XXXXX"
              value={formData.work_order_id}
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

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Machine *
            </label>
            <select
              name="machine_id"
              value={formData.machine_id}
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
              <option value="">Select Machine</option>
              {machines.map(m => (
                <option key={m.machine_id} value={m.machine_id}>
                  {m.name} ({m.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Operator
            </label>
            <select
              name="operator_id"
              value={formData.operator_id}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit'
              }}
            >
              <option value="">Select Operator</option>
              {operators.map(op => (
                <option key={op.operator_id} value={op.operator_id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Entry Date *
            </label>
            <input
              type="date"
              name="entry_date"
              value={formData.entry_date}
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Shift No *
            </label>
            <select
              name="shift_no"
              value={formData.shift_no}
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
              <option value="1">Shift 1 (6AM - 2PM)</option>
              <option value="2">Shift 2 (2PM - 10PM)</option>
              <option value="3">Shift 3 (10PM - 6AM)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Hours Worked
            </label>
            <input
              type="number"
              name="hours_worked"
              placeholder="0.0"
              value={formData.hours_worked}
              onChange={handleInputChange}
              min="0"
              step="0.5"
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Quantity Produced *
            </label>
            <input
              type="number"
              name="quantity_produced"
              placeholder="0"
              value={formData.quantity_produced}
              onChange={handleInputChange}
              required
              min="0"
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

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Quantity Rejected
            </label>
            <input
              type="number"
              name="quantity_rejected"
              placeholder="0"
              value={formData.quantity_rejected}
              onChange={handleInputChange}
              min="0"
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
            Remarks
          </label>
          <textarea
            name="remarks"
            placeholder="Add any notes or observations about production..."
            value={formData.remarks}
            onChange={handleInputChange}
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
              background: '#f59e0b',
              color: 'white',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Recording...' : '✓ Record Entry'}
          </button>
        </div>
      </form>
    </Modal>
  )
}