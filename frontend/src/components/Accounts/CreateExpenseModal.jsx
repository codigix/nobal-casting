import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, ChevronDown, FileText, Calendar, User, 
  CreditCard, Info, DollarSign, CheckCircle, ArrowRight, 
  Building2, Receipt, ShieldCheck, RefreshCw, Clock, Layers
} from 'lucide-react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import api from '../../services/api'

export default function CreateExpenseModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const categories = [
    'Raw Material', 'Office Supplies', 'Utilities', 'Maintenance', 
    'Travel', 'Meals & Entertainment', 'Salaries', 'Rent', 'Insurance', 
    'Marketing', 'Software/SaaS', 'Other'
  ]

  const departments = [
    'Administration', 'Manufacturing', 'Inventory', 'Sales', 'Accounts', 'Quality Control'
  ]

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    department: '',
    expense_type: 'operating',
    payment_method: 'transfer',
    status: 'draft'
  })

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      expense_date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      department: '',
      expense_type: 'operating',
      payment_method: 'transfer',
      status: 'draft'
    })
    setError(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (status = 'draft') => {
    setLoading(true)
    setError(null)

    try {
      if (!formData.category || !formData.amount || !formData.department) {
        throw new Error('Please fill in all required fields (Category, Amount, Department)')
      }

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        status
      }

      await api.post('/finance/expenses', payload)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Record New Expense" 
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />}
              Save Draft
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSubmit('paid')}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Record as Paid
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2 p-1">
        {error && <Alert type="danger">{error}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <Layers size={12} /> Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <Building2 size={12} /> Department <span className="text-red-500">*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            >
              <option value="">Select Department</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <DollarSign size={12} /> Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400  text-sm">₹</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all "
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <Calendar size={12} /> Expense Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleInputChange}
              className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <CreditCard size={12} /> Payment Method
            </label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleInputChange}
              className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            >
              <option value="transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="corporate_card">Corporate Card</option>
            </select>
          </div>

          {/* Expense Type */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <Info size={12} /> Expense Type
            </label>
            <select
              name="expense_type"
              value={formData.expense_type}
              onChange={handleInputChange}
              className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            >
              <option value="operating">Operating Expense</option>
              <option value="non_operating">Non-Operating Expense</option>
              <option value="capital">Capital Expenditure</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
            <FileText size={12} /> Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="What was this expense for?"
            rows={3}
            className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none"
          />
        </div>

        <section className="bg-neutral-50 rounded  border border-neutral-200 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 rounded  text-white">
              <Info size={16} />
            </div>
            <div>
              <h4 className="text-xs  text-neutral-800  tracking-wider">Note</h4>
              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                Recording an expense as "Paid" will immediately reflect in the financial dashboard and deduct from your cash/bank balance.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  )
}
