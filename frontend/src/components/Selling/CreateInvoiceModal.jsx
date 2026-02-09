import React, { useState, useEffect } from 'react'
import { deliveryNotesAPI, salesInvoicesAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import { 
  FileText, Calendar, User, IndianRupee, 
  Calculator, CheckCircle2, Info, CreditCard,
  Clock, Receipt, ShoppingCart, Percent,
  ArrowRight, ShieldCheck, Wallet
} from 'lucide-react'

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [fetchingNote, setFetchingNote] = useState(false)
  const [error, setError] = useState(null)
  const [deliveryNotes, setDeliveryNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
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
    } else {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
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
    setSelectedNote(null)
    setError(null)
  }

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

  const handleDeliveryNoteChange = async (noteId) => {
    if (!noteId) {
      setSelectedNote(null)
      setFormData(prev => ({ ...prev, delivery_note_id: '', customer_name: '', total_value: '' }))
      return
    }

    setFetchingNote(true)
    try {
      const res = await deliveryNotesAPI.get(noteId)
      if (res.data.success) {
        const note = res.data.data
        setSelectedNote(note)
        
        // Calculate due date (30 days from now by default)
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)
        
        setFormData(prev => ({
          ...prev,
          delivery_note_id: noteId,
          customer_name: note?.customer_name || '',
          total_value: note?.total_value || note?.items?.reduce((sum, i) => sum + (i.qty * i.rate), 0) || '',
          due_date: dueDate.toISOString().split('T')[0]
        }))
      }
    } catch (err) {
      console.error('Error fetching delivery note details:', err)
      setError('Failed to fetch delivery note details')
    } finally {
      setFetchingNote(false)
    }
    setError(null)
  }

  const calculateFinancials = () => {
    const baseAmount = parseFloat(formData.total_value) || 0
    const taxRate = parseFloat(formData.tax_rate) || 0
    const taxAmount = (baseAmount * taxRate) / 100
    const grandTotal = baseAmount + taxAmount
    return { baseAmount, taxAmount, grandTotal }
  }

  const { baseAmount, taxAmount, grandTotal } = calculateFinancials()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.delivery_note_id || !formData.invoice_date || !formData.total_value || !formData.due_date) {
        throw new Error('Please fill in all required fields')
      }

      const res = await salesInvoicesAPI.create({
        ...formData,
        tax_amount: taxAmount,
        grand_total: grandTotal
      })
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
      size="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Pane: Billing Basis */}
          <div className="lg:w-2/5 space-y-6">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight border-b border-slate-200 pb-3">
                <Receipt size={18} className="text-blue-500" />
                Billing Context
              </div>

              <div className="space-y-4">
                <SearchableSelect
                  label="Delivery Note"
                  value={formData.delivery_note_id}
                  onChange={handleDeliveryNoteChange}
                  options={deliveryNotes.map(n => ({
                    value: n.delivery_note_id,
                    label: `${n.delivery_note_id} - ${n.customer_name}`
                  }))}
                  placeholder="Select Delivery Note"
                  required
                />

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Customer
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 shadow-sm">
                    <User size={16} className="text-blue-500" />
                    <span className="text-sm font-semibold">{formData.customer_name || 'Select delivery note...'}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Invoice Type
                  </label>
                  <select
                    name="invoice_type"
                    value={formData.invoice_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                  >
                    <option value="standard">Standard Invoice</option>
                    <option value="advance">Advance Payment</option>
                    <option value="credit">Credit Note</option>
                    <option value="debit">Debit Note</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Invoice Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        name="invoice_date"
                        value={formData.invoice_date}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Due Date
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-200 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck size={100} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Calculator size={18} className="text-blue-200" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Financial Summary</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-80">Subtotal</span>
                    <span className="font-mono">₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="opacity-80 flex items-center gap-1.5">
                      GST/Tax 
                      <Badge variant="blue" className="bg-blue-500/30 text-[9px] py-0 px-1 border-blue-400/30">
                        {formData.tax_rate}%
                      </Badge>
                    </span>
                    <span className="text-blue-100 font-mono">+₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-4 border-t border-blue-500/50 flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Total Payable</div>
                      <div className="text-3xl font-black tracking-tighter">
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="pb-1">
                      <ArrowRight size={24} className="text-blue-300 opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Items & Totals */}
          <div className="lg:w-3/5 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-tight text-sm">
                  <ShoppingCart size={18} className="text-blue-500" />
                  Shipped Items ({selectedNote?.items?.length || 0})
                </div>
                {selectedNote && (
                  <Badge variant="gray">DN: {selectedNote.delivery_note_id}</Badge>
                )}
              </div>

              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-slate-500 sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Item</th>
                      <th className="px-5 py-3 text-center font-bold uppercase tracking-wider text-[10px]">Qty</th>
                      <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Rate</th>
                      <th className="px-5 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fetchingNote ? (
                      <tr>
                        <td colSpan="4" className="px-5 py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-400">Loading delivery details...</span>
                          </div>
                        </td>
                      </tr>
                    ) : selectedNote?.items?.length > 0 ? (
                      selectedNote.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-900">{item.item_name || item.item_code}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Ref: {item.item_code}</div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="font-semibold text-slate-600">{item.qty}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate-500">
                            ₹{parseFloat(item.rate || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">
                            ₹{(item.qty * (item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-5 py-10 text-center text-slate-400 italic">
                          Select a delivery note to preview items and pricing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <IndianRupee size={14} className="text-blue-500" />
                  Base Value (Subtotal)
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    name="total_value"
                    value={formData.total_value}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-slate-700 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Percent size={14} className="text-blue-500" />
                  GST Rate Selection
                </label>
                <select
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium shadow-sm"
                >
                  <option value="0">0% (GST Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-3">
              <Info size={20} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 leading-relaxed">
                Ensure all financial details are accurate. Once generated, this invoice will be sent to the customer and recorded in the <strong>Accounts Receivable</strong> ledger.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            Generate Final Invoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}

