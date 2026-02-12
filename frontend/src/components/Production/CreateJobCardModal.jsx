import React, { useState, useEffect } from 'react'
import api, { 
  jobCardsAPI, 
  workOrdersAPI, 
  workstationsAPI, 
  employeesAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import { 
  Plus, X, Edit, User, Calendar, FileText, 
  Hash, ClipboardList, CheckCircle2, 
  Info, AlertCircle, Settings, 
  UserCheck, Activity, Clock
} from 'lucide-react'

export default function CreateJobCardModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingId, 
  preSelectedWorkOrderId, 
  preSelectedOperation 
}) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  
  const [workOrders, setWorkOrders] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [formData, setFormData] = useState({
    work_order_id: '',
    machine_id: '',
    operator_id: '',
    operation: '',
    operation_sequence: null,
    operation_type: 'IN_HOUSE',
    execution_mode: 'IN_HOUSE',
    vendor_id: '',
    vendor_name: '',
    vendor_rate_per_unit: 0,
    planned_quantity: '100',
    scheduled_start_date: new Date().toISOString().split('T')[0],
    scheduled_end_date: '',
    status: 'draft',
    notes: '',
    hourly_rate: 0,
    operating_cost: 0,
    operation_time: 0
  })

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && editingId && workOrders.length > 0) {
      fetchJobCardDetails(editingId)
    }
  }, [isOpen, editingId, workOrders])

  useEffect(() => {
    if (isOpen && preSelectedWorkOrderId && workOrders.length > 0 && !editingId) {
      const wo = workOrders.find(w => w.wo_id === preSelectedWorkOrderId)
      if (wo) {
        handleSelectWorkOrder(wo.wo_id)
        setFormData(prev => ({
          ...prev,
          work_order_id: wo.wo_id,
          planned_quantity: wo.quantity || wo.qty_to_manufacture || '100'
        }))

        if (preSelectedOperation) {
          setFormData(prev => ({
            ...prev,
            operation: preSelectedOperation.operation || preSelectedOperation.operation_name || '',
            machine_id: preSelectedOperation.workstation || preSelectedOperation.workstation_type || '',
            operation_sequence: preSelectedOperation.sequence || 0,
            operation_type: preSelectedOperation.operation_type || 'IN_HOUSE',
            execution_mode: preSelectedOperation.execution_mode || 'IN_HOUSE',
            vendor_id: preSelectedOperation.vendor_id || '',
            vendor_name: preSelectedOperation.vendor_name || '',
            vendor_rate_per_unit: preSelectedOperation.vendor_rate_per_unit || 0,
            hourly_rate: preSelectedOperation.hourly_rate || 0,
            operating_cost: preSelectedOperation.operating_cost || 0,
            operation_time: preSelectedOperation.operation_time || preSelectedOperation.time || 0
          }))
        }
      }
    }
  }, [isOpen, preSelectedWorkOrderId, workOrders, editingId, preSelectedOperation])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await Promise.all([
        fetchWorkOrders(),
        fetchWorkstations(),
        fetchOperators(),
        fetchSuppliers()
      ])
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      const response = await workOrdersAPI.list()
      setWorkOrders(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch work orders:', err)
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await workstationsAPI.list()
      setWorkstations(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchOperators = async () => {
    try {
      const response = await employeesAPI.list()
      setOperators(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch operators:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list()
      setSuppliers(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  const fetchJobCardDetails = async (id) => {
    try {
      const response = await jobCardsAPI.get(id)
      const jc = response.data.data || response.data
      
      if (jc.work_order_id) {
        handleSelectWorkOrder(jc.work_order_id)
      }
      
      setFormData({
        work_order_id: jc.work_order_id || '',
        machine_id: jc.machine_id || '',
        operator_id: jc.operator_id || '',
        operation: jc.operation || '',
        operation_sequence: jc.operation_sequence || null,
        operation_type: jc.operation_type || 'IN_HOUSE',
        execution_mode: jc.execution_mode || 'IN_HOUSE',
        vendor_id: jc.vendor_id || '',
        vendor_name: jc.vendor_name || '',
        vendor_rate_per_unit: jc.vendor_rate_per_unit || 0,
        planned_quantity: String(jc.planned_quantity || jc.quantity || '100'),
        scheduled_start_date: jc.scheduled_start_date ? jc.scheduled_start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        scheduled_end_date: jc.scheduled_end_date ? jc.scheduled_end_date.split('T')[0] : '',
        status: jc.status || 'draft',
        notes: jc.notes || '',
        hourly_rate: jc.hourly_rate || 0,
        operating_cost: jc.operating_cost || 0,
        operation_time: jc.operation_time || 0
      })
    } catch (err) {
      console.error('Error loading job card:', err)
      setError('Failed to load job card details')
    }
  }

  const handleSelectWorkOrder = async (woId) => {
    try {
      const response = await workOrdersAPI.get(woId)
      const woData = response.data.data || response.data
      
      const ops = (woData.operations || []).map(op => ({
        label: op.operation_name || op.operation || '',
        value: op.operation_name || op.operation || '',
        sequence: op.sequence || op.operation_sequence || 0,
        operation_type: op.operation_type || 'IN_HOUSE',
        execution_mode: op.execution_mode || 'IN_HOUSE',
        vendor_id: op.vendor_id || '',
        vendor_name: op.vendor_name || '',
        vendor_rate_per_unit: op.vendor_rate_per_unit || 0,
        hourly_rate: op.hourly_rate || 0,
        operating_cost: op.operating_cost || 0,
        operation_time: op.operation_time || op.time || 0
      }))
      
      setOperations(ops)
    } catch (err) {
      console.error('Failed to fetch work order operations:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const isOutsourced = formData.execution_mode === 'OUTSOURCE';
      const requiredFields = ['work_order_id', 'planned_quantity', 'scheduled_start_date'];
      
      if (!isOutsourced && !formData.machine_id) {
        throw new Error('Please select a workstation for in-house operation');
      }
      
      if (isOutsourced && !formData.vendor_id) {
        throw new Error('Please select a vendor for outsourced operation');
      }

      for (const field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`Please fill in all required fields (${field.replace(/_/g, ' ')})`);
        }
      }

      const response = editingId 
        ? await jobCardsAPI.update(editingId, formData)
        : await jobCardsAPI.create(formData)

      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(response.data.error || 'Failed to save job card')
      }
    } catch (err) {
      setError(err.message || 'Failed to save job card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingId ? 'Edit Job Card' : 'Create New Job Card'} 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assignment Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight border-b border-slate-100 pb-2">
              <Settings size={18} className="text-blue-500" />
              Resource Assignment
            </div>

            <div className="space-y-3">
              <div className="flex p-1 bg-slate-100 rounded-lg mb-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, execution_mode: 'IN_HOUSE' }))}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${formData.execution_mode === 'IN_HOUSE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  IN-HOUSE
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, execution_mode: 'OUTSOURCE' }))}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${formData.execution_mode === 'OUTSOURCE' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                >
                  OUTSOURCE
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Work Order *
                </label>
                <SearchableSelect
                  value={formData.work_order_id}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, work_order_id: value }))
                    if (value) handleSelectWorkOrder(value)
                  }}
                  options={workOrders.map(wo => ({
                    value: wo.wo_id,
                    label: `${wo.wo_id} - ${wo.item_name || wo.item_code}`
                  }))}
                  placeholder="Select Work Order"
                />
              </div>

              {formData.execution_mode === 'IN_HOUSE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Workstation *
                  </label>
                  <SearchableSelect
                    value={formData.machine_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, machine_id: value }))}
                    options={workstations.map(ws => ({
                      value: ws.workstation_id || ws.name,
                      label: ws.workstation_name || ws.name
                    }))}
                    placeholder="Select Workstation"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Vendor / Subcontractor *
                    </label>
                    <SearchableSelect
                      value={formData.vendor_id}
                      onChange={(value) => {
                        const vendor = suppliers.find(s => s.supplier_id === value)
                        setFormData(prev => ({ 
                          ...prev, 
                          vendor_id: value,
                          vendor_name: vendor?.name || ''
                        }))
                      }}
                      options={suppliers.map(s => ({
                        value: s.supplier_id,
                        label: s.name
                      }))}
                      placeholder="Select Vendor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Vendor Rate per Unit
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</div>
                      <input
                        type="number"
                        name="vendor_rate_per_unit"
                        value={formData.vendor_rate_per_unit}
                        onChange={handleInputChange}
                        className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </>
              )}

              {formData.execution_mode === 'IN_HOUSE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Operator
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="operator_id"
                      value={formData.operator_id}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Operator (Optional)</option>
                      {operators.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operation Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight border-b border-slate-100 pb-2">
              <Activity size={18} className="text-indigo-500" />
              Operation Details
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Operation *
                </label>
                <select
                  name="operation"
                  value={formData.operation}
                  onChange={(e) => {
                    const val = e.target.value
                    const selectedOp = operations.find(op => op.value === val)
                    setFormData(prev => ({ 
                      ...prev, 
                      operation: val,
                      operation_sequence: selectedOp?.sequence || null,
                      operation_type: selectedOp?.operation_type || 'IN_HOUSE',
                      hourly_rate: selectedOp?.hourly_rate || 0,
                      operating_cost: selectedOp?.operating_cost || 0,
                      operation_time: selectedOp?.operation_time || 0
                    }))
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  disabled={!formData.work_order_id}
                >
                  <option value="">Select Operation</option>
                  {operations.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Planned Qty *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="number"
                      name="planned_quantity"
                      value={formData.planned_quantity}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="scheduled_start_date"
                    value={formData.scheduled_start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="scheduled_end_date"
                    value={formData.scheduled_end_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Instructions & Notes
            </label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Specific instructions for the operator..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            {editingId ? 'Update Job Card' : 'Create Job Card'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
