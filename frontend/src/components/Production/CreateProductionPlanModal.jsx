import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'

export default function CreateProductionPlanModal({ isOpen, onClose, onSuccess, editingId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [boms, setBOMs] = useState([])
  const [formData, setFormData] = useState({
    plan_id: '',
    bom_id: '',
    product_name: '',
    planned_quantity: '100',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    priority: 'medium',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchBOMs()
      if (editingId) {
        fetchPlanDetails(editingId)
      }
    }
  }, [isOpen, editingId])

  const fetchBOMs = async () => {
    try {
      const response = await productionService.getBOMs({ status: 'active' })
      setBOMs(response.data || [])
    } catch (err) {
      console.error('Failed to fetch BOMs:', err)
    }
  }

  const fetchPlanDetails = async (id) => {
    try {
      const response = await productionService.getProductionPlanDetails(id)
      const plan = response.data
      setFormData({
        plan_id: plan.plan_id,
        bom_id: plan.bom_id,
        product_name: plan.product_name,
        planned_quantity: plan.planned_quantity,
        start_date: plan.start_date.split('T')[0],
        end_date: plan.end_date.split('T')[0],
        status: plan.status || 'draft',
        priority: plan.priority || 'medium',
        notes: plan.notes || ''
      })
    } catch (err) {
      setError('Failed to load plan details')
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
      if (!formData.bom_id || !formData.planned_quantity || !formData.start_date || !formData.end_date) {
        throw new Error('Please fill all required fields')
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        throw new Error('End date must be after start date')
      }

      const payload = {
        ...formData,
        planned_quantity: parseFloat(formData.planned_quantity)
      }

      if (editingId) {
        await productionService.updateProductionPlan(editingId, payload)
      } else {
        await productionService.createProductionPlan(payload)
      }

      setFormData({
        plan_id: '',
        bom_id: '',
        product_name: '',
        planned_quantity: '100',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        priority: 'medium',
        notes: ''
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create production plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingId ? '✏️ Edit Production Plan' : '📅 Create Production Plan'} size="lg">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>BOM *</label>
            <select name="bom_id" value={formData.bom_id} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} required>
              <option value="">Select BOM</option>
              {boms.map(bom => (
                <option key={bom.bom_id} value={bom.bom_id}>{bom.bom_id} - {bom.product_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Product Name</label>
            <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} placeholder="Auto-fill from BOM" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Planned Quantity *</label>
            <input type="number" name="planned_quantity" value={formData.planned_quantity} onChange={handleInputChange} step="0.01" required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Priority</label>
            <select name="priority" value={formData.priority} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Status</label>
            <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="draft">Draft</option>
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Start Date *</label>
            <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>End Date *</label>
            <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Production plan notes" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
            {loading ? 'Saving...' : editingId ? 'Update Plan' : 'Create Plan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
