import React, { useState, useEffect } from 'react'
import { 
  productionEntriesAPI, 
  workOrdersAPI, 
  workstationsAPI, 
  employeesAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  ClipboardList, 
  Settings, 
  User, 
  Calendar, 
  Clock, 
  Package, 
  AlertCircle, 
  FileText,
  CheckCircle2,
  Activity,
  UserCheck
} from 'lucide-react'

export default function CreateProductionEntryModal({ isOpen, onClose, onSuccess }) {
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

  const [workOrders, setWorkOrders] = useState([])
  const [machines, setMachines] = useState([])
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      const [woRes, wsRes, opRes] = await Promise.all([
        workOrdersAPI.list({ status: 'in_progress' }),
        workstationsAPI.list(),
        employeesAPI.list()
      ])
      
      setWorkOrders(woRes.data.data || woRes.data || [])
      setMachines(wsRes.data.data || wsRes.data || [])
      setOperators(opRes.data.data || opRes.data || [])
    } catch (err) {
      console.error('Failed to load initial data:', err)
      setError('Failed to load required data. Please try again.')
    } finally {
      setFetchingData(false)
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

      const response = await productionEntriesAPI.create(formData)
      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(response.data.error || 'Failed to record production entry')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to record production entry')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Record Daily Production" 
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Pane - Context */}
          <div className="lg:w-5/12 space-y-4">
            <div className="bg-slate-50 p-5 rounded  border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-200 pb-3 mb-2">
                <ClipboardList size={18} className="text-blue-500" />
                Execution Context
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1.5">
                    Work Order *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="work_order_id"
                      value={formData.work_order_id}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2  bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Work Order</option>
                      {workOrders.map(wo => (
                        <option key={wo.work_order_id} value={wo.work_order_id}>
                          {wo.work_order_id} - {wo.item_name || wo.item_code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1.5">
                    Machine/Workstation *
                  </label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="machine_id"
                      value={formData.machine_id}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2  bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Workstation</option>
                      {machines.map(m => (
                        <option key={m.workstation_id || m.machine_id} value={m.workstation_id || m.machine_id}>
                          {m.workstation_name || m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1.5">
                    Operator
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="operator_id"
                      value={formData.operator_id}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2  bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Operator</option>
                      {operators.map(op => (
                        <option key={op.employee_id || op.operator_id} value={op.employee_id || op.operator_id}>
                          {op.first_name ? `${op.first_name} ${op.last_name}` : op.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-5 rounded  border border-blue-100 space-y-4">
              <div className="flex items-center gap-2 text-blue-800 font-semibold mb-1">
                <Clock size={18} />
                Timing & Shift
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px]  text-blue-600  mb-1">Entry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                    <input
                      type="date"
                      name="entry_date"
                      value={formData.entry_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-8 pr-3 py-2 bg-white border border-blue-200 rounded  text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px]  text-blue-600  mb-1">Shift</label>
                  <select
                    name="shift_no"
                    value={formData.shift_no}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded  text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="1">Shift 1</option>
                    <option value="2">Shift 2</option>
                    <option value="3">Shift 3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane - Output & Quality */}
          <div className="lg:w-7/12 space-y-4">
            <div className="bg-white border border-slate-200 rounded  overflow-hidden  ">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <Activity size={18} className="text-blue-500" />
                  Production Metrics
                </div>
                {formData.quantity_produced && (
                  <Badge variant="green">
                    Efficiency: {((formData.quantity_produced / (formData.hours_worked || 8)) * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>

              <div className="p-5 space-y-2">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Quantity Produced *</label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="number"
                        name="quantity_produced"
                        value={formData.quantity_produced}
                        onChange={handleInputChange}
                        placeholder="0"
                        required
                        min="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded  text-lg  text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Quantity Rejected</label>
                    <div className="relative">
                      <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" size={18} />
                      <input
                        type="number"
                        name="quantity_rejected"
                        value={formData.quantity_rejected}
                        onChange={handleInputChange}
                        placeholder="0"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 bg-red-50/30 border border-red-100 rounded  text-lg  text-red-700 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    Production Remarks
                  </label>
                  <textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleInputChange}
                    placeholder="Describe any issues, downtime causes, or quality observations..."
                    rows="3"
                    className="w-full p-2  bg-slate-50 border border-slate-200 rounded  focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="px-8"
            icon={<CheckCircle2 size={18} />}
          >
            Record Entry
          </Button>
        </div>
      </form>
    </Modal>
  )
}
