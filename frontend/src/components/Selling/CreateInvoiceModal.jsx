import React, { useState, useEffect } from 'react'
import { deliveryNotesAPI, salesInvoicesAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  FileText, Calendar, User, IndianRupee, 
  Calculator, CheckCircle2, Info, CreditCard,
  Clock, Receipt
} from 'lucide-react'

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deliveryNotes, setDeliveryNotes] = useState([])
  const [formData, setFormData] = useState({
    delivery_note_id: '',
    customer_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    total_value: '',
    due_date: '',
    tax_rate: '18',
    invoice_type: 'standard',
    status: 'draft',
    payment_status: 'unpaid',
    amount_paid: 0
  })

  useEffect(() => {
    if (isOpen) {
      fetchDeliveryNotes()
    }
  }, [isOpen])

  const fetchDeliveryNotes = async () => {
    try {
      const res = await deliveryNotesAPI.list()
      if (res.data.success) {
        setDeliveryNotes(res.data.data?.filter(d => d.status === 'delivered' || d.status === 'draft') || [])
      }
    } catch (error) {
      console.error('Error fetching delivery notes:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleDeliveryNoteChange = (e) => {
    const noteId = e.target.value
    const note = deliveryNotes.find(n => String(n.delivery_note_id) === String(noteId))
    setFormData(prev => ({
      ...prev,
      delivery_note_id: noteId,
      customer_name: note?.customer_name || '',
      total_value: note?.total_value || ''
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.delivery_note_id || !formData.invoice_date || !formData.total_value || !formData.due_date) {
        throw new Error('Please fill in all required fields')
      }

      const res = await salesInvoicesAPI.create(formData)
      if (res.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(res.data.error || 'Failed to create invoice')
      }
    } catch (err) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create Sales Invoice" 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source & Customer */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <Receipt size={18} className="text-blue-500" />
              Billing Basis
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Delivery Note *
                </label>
                <select
                  name="delivery_note_id"
                  value={formData.delivery_note_id}
                  onChange={handleDeliveryNoteChange}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                >
                  <option value="">Select Delivery Note</option>
                  {deliveryNotes.map(n => (
                    <option key={n.delivery_note_id} value={n.delivery_note_id}>
                      {n.delivery_note_id} - {n.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span className="text-sm font-medium">{formData.customer_name || 'Select a delivery note'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Invoice Type
                </label>
                <select
                  name="invoice_type"
                  value={formData.invoice_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                >
                  <option value="standard">Standard Invoice</option>
                  <option value="advance">Advance Payment</option>
                  <option value="credit">Credit Note</option>
                  <option value="debit">Debit Note</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financial & Dates */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <Calculator size={18} className="text-blue-500" />
              Financial Details
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Invoice Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      name="invoice_date"
                      value={formData.invoice_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Due Date *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Total Payable (₹) *
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    name="total_value"
                    value={formData.total_value}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tax Rate (%)
                </label>
                <select
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                >
                  <option value="0">0% (GST Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            Generate Invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}
