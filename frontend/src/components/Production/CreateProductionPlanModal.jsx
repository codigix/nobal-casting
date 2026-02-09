import React, { useState, useEffect } from 'react'
import api, { 
  productionPlansAPI, 
  bomAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, Calendar, FileText, 
  Hash, ClipboardList, CheckCircle2, 
  Info, AlertCircle, Layout, 
  Clock, Target, ArrowRight
} from 'lucide-react'

export default function CreateProductionPlanModal({ isOpen, onClose, onSuccess, editingId }) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [boms, setBOMs] = useState([])

  const [formData, setFormData] = useState({
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
      initializeModal()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && editingId && boms.length > 0) {
      fetchPlanDetails(editingId)
    }
  }, [isOpen, editingId, boms])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await fetchBOMs()
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
    }
  }

  const fetchBOMs = async () => {
    try {
      const response = await bomAPI.list()
      setBOMs(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch BOMs:', err)
    }
  }

  const fetchPlanDetails = async (id) => {
    try {
      const response = await productionPlansAPI.get(id)
      const plan = response.data.data || response.data
      setFormData({
        bom_id: plan.bom_id,
        product_name: plan.product_name,
        planned_quantity: plan.planned_quantity,
        start_date: plan.start_date ? plan.start_date.split('T')[0] : '',
        end_date: plan.end_date ? plan.end_date.split('T')[0] : '',
        status: plan.status || 'draft',
        priority: plan.priority || 'medium',
        notes: plan.notes || ''
      })
    } catch (err) {
      console.error('Error fetching plan details:', err)
      setError('Failed to load plan details')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'bom_id') {
        const selectedBom = boms.find(b => b.bom_id === value)
        updated.product_name = selectedBom?.product_name || selectedBom?.bom_name || ''
      }
      return updated
    })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.bom_id || !formData.planned_quantity || !formData.start_date || !formData.end_date) {
        throw new Error('Please fill in all required fields')
      }

      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        throw new Error('End date must be after start date')
      }

      const payload = {
        ...formData,
        planned_quantity: parseFloat(formData.planned_quantity)
      }

      const response = editingId 
        ? await productionPlansAPI.update(editingId, payload)
        : await productionPlansAPI.create(payload)

      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(response.data.error || 'Failed to save production plan')
      }
    } catch (err) {
      setError(err.message || 'Failed to save production plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingId ? 'Edit Production Plan' : 'Create Master Production Plan'} 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Scope */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight border-b border-slate-100 pb-2">
              <Target size={18} className="text-emerald-500" />
              Plan Scope
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Bill of Materials (BOM) *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    name="bom_id"
                    value={formData.bom_id}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  >
                    <option value="">Select BOM</option>
                    {boms.map(bom => (
                      <option key={bom.bom_id} value={bom.bom_id}>
                        {bom.product_name || bom.bom_name || bom.bom_id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <div className="relative">
                  <Layout className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    placeholder="Auto-filled from BOM"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm italic"
                    readOnly
                  />
                </div>
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
                      min="1"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight border-b border-slate-100 pb-2">
              <Clock size={18} className="text-blue-500" />
              Timeline & Execution
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Planned Start Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Planned End Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Plan Status
                </label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {['draft', 'planned', 'in-progress'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                        formData.status === s 
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Planning Notes & Strategy
            </label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Capacity constraints, procurement requirements, or customer-specific delivery notes..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none"
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
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            loading={loading}
            icon={CheckCircle2}
          >
            {editingId ? 'Update Production Plan' : 'Commit Production Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
