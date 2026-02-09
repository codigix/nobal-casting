import React, { useState, useEffect } from 'react'
import { 
  rejectionsAPI, 
  productionEntriesAPI, 
  employeesAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  AlertTriangle, 
  ClipboardList, 
  User, 
  Search, 
  FileText, 
  ShieldAlert, 
  CheckCircle2,
  BarChart3,
  Stethoscope,
  Hammer
} from 'lucide-react'

export default function RecordRejectionModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    production_entry_id: '',
    rejection_reason: '',
    rejection_count: '',
    root_cause: '',
    corrective_action: '',
    reported_by_id: ''
  })

  const [entries, setEntries] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      const [entriesRes, employeesRes] = await Promise.all([
        productionEntriesAPI.list({ limit: 50 }),
        employeesAPI.list()
      ])
      
      setEntries(entriesRes.data.data || entriesRes.data || [])
      setEmployees(employeesRes.data.data || employeesRes.data || [])
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
      if (!formData.production_entry_id || !formData.rejection_reason || !formData.rejection_count || !formData.reported_by_id) {
        throw new Error('Please fill in all required fields')
      }

      const response = await rejectionsAPI.create(formData)
      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(response.data.error || 'Failed to record rejection')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to record rejection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Record Production Rejection (QA)" 
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Pane - Source & Reason */}
          <div className="lg:w-1/2 space-y-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-200 pb-3 mb-2">
                <ShieldAlert size={18} className="text-red-500" />
                Rejection Context
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Production Entry *
                  </label>
                  <div className="relative">
                    <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="production_entry_id"
                      value={formData.production_entry_id}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Entry</option>
                      {entries.map(entry => (
                        <option key={entry.entry_id} value={entry.entry_id}>
                          {entry.entry_id} - {entry.work_order_id} ({entry.machine_name || 'No Machine'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Reported By *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="reported_by_id"
                      value={formData.reported_by_id}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Reason *
                    </label>
                    <select
                      name="rejection_reason"
                      value={formData.rejection_reason}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    >
                      <option value="">Select Reason</option>
                      {rejectionReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Count *
                    </label>
                    <input
                      type="number"
                      name="rejection_count"
                      value={formData.rejection_count}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                      min="1"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-red-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold block mb-1 uppercase">Quality Protocol</span>
                All rejections are tracked for CAPA (Corrective and Preventive Action). 
                Please ensure root cause analysis is accurate to prevent future occurrences.
              </div>
            </div>
          </div>

          {/* Right Pane - Analysis */}
          <div className="lg:w-1/2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-800">
                <BarChart3 size={18} className="text-blue-500" />
                Root Cause Analysis
              </div>

              <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Stethoscope size={16} className="text-blue-400" />
                    Root Cause *
                  </label>
                  <textarea
                    name="root_cause"
                    value={formData.root_cause}
                    onChange={handleInputChange}
                    placeholder="Why did this rejection happen? (e.g., Machine calibration drift, Material impurity)"
                    required
                    rows="4"
                    className="w-full p-2  bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Hammer size={16} className="text-green-500" />
                    Corrective Action *
                  </label>
                  <textarea
                    name="corrective_action"
                    value={formData.corrective_action}
                    onChange={handleInputChange}
                    placeholder="What was done to fix this? (e.g., Reset machine parameters, Switched material batch)"
                    required
                    rows="4"
                    className="w-full p-2  bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
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
            variant="danger"
            isLoading={loading}
            className="px-8 shadow-lg shadow-red-100"
            icon={<CheckCircle2 size={18} />}
          >
            Record Rejection
          </Button>
        </div>
      </form>
    </Modal>
  )
}
