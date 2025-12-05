import React, { useState, useEffect } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import { useToast } from '../ToastContainer'

export default function CreateJobCardModal({ isOpen, onClose, onSuccess, editingId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [showWODropdown, setShowWODropdown] = useState(false)
  const [selectedWO, setSelectedWO] = useState(null)
  const [formData, setFormData] = useState({
    jc_id: '',
    wo_id: '',
    machine_id: '',
    operator_id: '',
    operation: '',
    quantity: '100',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'draft',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
      if (!editingId) {
        setFormData({
          jc_id: '',
          wo_id: '',
          machine_id: '',
          operator_id: '',
          operation: '',
          quantity: '100',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          status: 'draft',
          notes: ''
        })
        setSelectedWO(null)
      }
    }
  }, [isOpen, editingId])

  useEffect(() => {
    if (isOpen && editingId && workOrders.length > 0) {
      fetchJobCardDetails(editingId)
    }
  }, [workOrders])

  const fetchData = async () => {
    try {
      const [woRes, wsRes, empRes] = await Promise.all([
        productionService.getWorkOrders({ status: '' }),
        productionService.getWorkstationsList(),
        productionService.getEmployees()
      ])
      setWorkOrders(woRes.data || [])
      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  const fetchJobCardDetails = async (id) => {
    try {
      const response = await productionService.getJobCardDetails(id)
      const jc = response.data || response
      const wo = workOrders.find(w => w.wo_id === jc.work_order_id)
      
      if (wo) {
        setSelectedWO(wo)
      }
      
      setFormData({
        jc_id: jc.job_card_id || '',
        wo_id: jc.work_order_id || '',
        machine_id: jc.machine_id || '',
        operator_id: jc.operator_id || '',
        operation: jc.operation || '',
        quantity: String(jc.planned_quantity || jc.quantity || '100'),
        start_date: jc.scheduled_start_date ? jc.scheduled_start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: jc.scheduled_end_date ? (jc.scheduled_end_date.split('T')[0]) : '',
        status: jc.status || 'draft',
        notes: jc.notes || ''
      })
    } catch (err) {
      console.error('Error loading job card:', err)
      toast.addToast('Failed to load job card details', 'error')
    }
  }

  const handleSelectWorkOrder = (wo) => {
    setSelectedWO(wo)
    setFormData(prev => ({
      ...prev,
      wo_id: wo.wo_id,
      quantity: wo.quantity || wo.qty_to_manufacture || '100'
    }))
    setShowWODropdown(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.wo_id || !formData.machine_id || !formData.quantity || !formData.start_date) {
        throw new Error('Please fill all required fields')
      }

      if (formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
        throw new Error('End date must be after start date')
      }

      const payload = {
        work_order_id: formData.wo_id,
        machine_id: formData.machine_id,
        operator_id: formData.operator_id || null,
        operation: formData.operation || null,
        planned_quantity: parseFloat(formData.quantity),
        scheduled_start_date: formData.start_date,
        scheduled_end_date: formData.end_date,
        status: formData.status,
        notes: formData.notes
      }

      if (editingId) {
        await productionService.updateJobCard(editingId, payload)
      } else {
        await productionService.createJobCard(payload)
      }

      setFormData({
        jc_id: '',
        wo_id: '',
        machine_id: '',
        operator_id: '',
        operation: '',
        quantity: '100',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'draft',
        notes: ''
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to create job card', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingId ? '✏️ Edit Job Card' : '🎫 Create Job Card'} size="lg">
      <form onSubmit={handleSubmit}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Work Order *</label>
            <div 
              onClick={() => setShowWODropdown(!showWODropdown)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{selectedWO ? `${selectedWO.wo_id} - ${selectedWO.item_name || selectedWO.item_code}` : 'Select Work Order'}</span>
              <ChevronDown size={16} style={{ transform: showWODropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </div>
            
            {showWODropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 100,
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                  gap: '8px',
                  padding: '8px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  position: 'sticky',
                  top: 0
                }}>
                  <div>WO ID</div>
                  <div>Item</div>
                  <div>Qty</div>
                  <div>Priority</div>
                  <div>Status</div>
                </div>
                {workOrders.map(wo => (
                  <div
                    key={wo.wo_id}
                    onClick={() => handleSelectWorkOrder(wo)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                      gap: '8px',
                      padding: '10px 8px',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      hover: { background: '#f0f0f0' },
                      fontSize: '0.9rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontWeight: '600' }}>{wo.wo_id}</div>
                    <div>{wo.item_name || wo.item_code}</div>
                    <div>{wo.quantity || wo.qty_to_manufacture || 0}</div>
                    <div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        background: wo.priority === 'High' ? '#fee2e2' : wo.priority === 'Medium' ? '#fef3c7' : '#dbeafe',
                        color: wo.priority === 'High' ? '#dc2626' : wo.priority === 'Medium' ? '#b45309' : '#1e40af'
                      }}>
                        {wo.priority || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        background: '#f0f0f0'
                      }}>
                        {wo.status || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Workstation *</label>
            <select name="machine_id" value={formData.machine_id} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} required>
              <option value="">Select Workstation</option>
              {workstations.map(ws => (
                <option key={ws.name} value={ws.name}>{ws.workstation_name || ws.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Operator</label>
            <select name="operator_id" value={formData.operator_id} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="">Unassigned</option>
              {operators.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Operation</label>
            <input type="text" name="operation" value={formData.operation} onChange={handleInputChange} placeholder="e.g., Assembly, Cutting" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Quantity *</label>
            <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} step="0.01" required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Status</label>
            <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
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
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>End Date</label>
            <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Job card notes" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
            {loading ? 'Saving...' : editingId ? 'Update Card' : 'Create Card'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
