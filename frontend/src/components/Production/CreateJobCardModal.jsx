import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import SearchableSelect from '../SearchableSelect'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../ToastContainer'

export default function CreateJobCardModal({ isOpen, onClose, onSuccess, editingId, preSelectedWorkOrderId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])
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
      }
    }
  }, [isOpen, editingId])

  useEffect(() => {
    if (isOpen && editingId && workOrders.length > 0) {
      fetchJobCardDetails(editingId)
    }
  }, [workOrders])

  useEffect(() => {
    if (isOpen && preSelectedWorkOrderId && workOrders.length > 0 && !editingId) {
      const wo = workOrders.find(w => w.wo_id === preSelectedWorkOrderId)
      if (wo) {
        setFormData(prev => ({
          ...prev,
          wo_id: wo.wo_id,
          quantity: wo.quantity || wo.qty_to_manufacture || '100'
        }))
        handleSelectWorkOrder(wo)
      }
    }
  }, [preSelectedWorkOrderId, workOrders, isOpen, editingId])

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
        handleSelectWorkOrder(wo)
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

  const handleSelectWorkOrder = async (wo) => {
    try {
      const response = await productionService.getWorkOrder(wo.wo_id)
      const woData = response.data || response
      
      const ops = (woData.operations || []).map(op => ({
        label: op.operation_name || op.operation || '',
        value: op.operation_name || op.operation || '',
        sequence: op.sequence || op.operation_sequence || 0
      }))
      
      setOperations(ops)
    } catch (err) {
      console.error('Failed to fetch work order operations:', err)
    }
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
        operation_sequence: formData.operation_sequence,
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
        operation_sequence: null,
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
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Work Order *</label>
            <SearchableSelect
              value={formData.wo_id}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  wo_id: value
                }))
                const wo = workOrders.find(w => w.wo_id === value)
                if (wo) {
                  handleSelectWorkOrder(wo)
                }
              }}
              options={workOrders.map(wo => ({
                value: wo.wo_id,
                label: `${wo.wo_id} - ${wo.item_name || wo.item_code || ''}`
              }))}
              placeholder="Select Work Order"
              isClearable={true}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Workstation *</label>
            <SearchableSelect
              value={formData.machine_id}
              onChange={(value) => setFormData(prev => ({ ...prev, machine_id: value }))}
              options={workstations.map(ws => ({
                value: ws.name || ws.workstation_id,
                label: ws.workstation_name || ws.name
              }))}
              placeholder="Select Workstation"
              isClearable={true}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Operator</label>
            <SearchableSelect
              value={formData.operator_id}
              onChange={(value) => setFormData(prev => ({ ...prev, operator_id: value }))}
              options={[
                { value: '', label: 'Unassigned' },
                ...operators.map(emp => ({
                  value: emp.employee_id || emp.id,
                  label: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name
                }))
              ]}
              placeholder="Select Operator"
              isClearable={true}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Operation</label>
            <SearchableSelect
              value={formData.operation}
              onChange={(value) => {
                const selectedOp = operations.find(op => op.value === value)
                setFormData(prev => ({ 
                  ...prev, 
                  operation: value,
                  operation_sequence: selectedOp?.sequence || null
                }))
              }}
              options={operations.length > 0 ? operations : [{ value: '', label: 'Select Work Order first' }]}
              placeholder="Select Operation from Work Order"
              isClearable={true}
              isDisabled={operations.length === 0}
            />
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
