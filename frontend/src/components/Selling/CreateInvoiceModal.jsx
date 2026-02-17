import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryNotesAPI, salesInvoicesAPI, salesOrdersAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import { 
  FileText, Calendar, User, IndianRupee, 
  Calculator, CheckCircle2, Info, CreditCard,
  Clock, Receipt, ShoppingCart, Percent,
  ArrowRight, ShieldCheck, Wallet, X,
  Package, TrendingUp, RefreshCw
} from 'lucide-react'

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess, initialOrderId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetchingNote, setFetchingNote] = useState(false)
  const [fetchingOrder, setFetchingOrder] = useState(false)
  const [error, setError] = useState(null)
  const [deliveryNotes, setDeliveryNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [basis, setBasis] = useState('delivery_note') // 'delivery_note' or 'sales_order'
  
  const [formData, setFormData] = useState({
    delivery_note_id: '',
    sales_order_id: '',
    customer_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    total_value: '',
    due_date: '',
    tax_rate: '18',
    invoice_type: 'standard',
    notes: '',
    status: 'draft',
    payment_status: 'unpaid',
    amount_paid: 0
  })

  useEffect(() => {
    if (isOpen) {
      fetchDeliveryNotes()
      if (initialOrderId) {
        handleSalesOrderBasis(initialOrderId)
      }
    } else {
      resetForm()
    }
  }, [isOpen, initialOrderId])

  const resetForm = () => {
    setFormData({
      delivery_note_id: '',
      sales_order_id: '',
      customer_name: '',
      invoice_date: new Date().toISOString().split('T')[0],
      total_value: '',
      due_date: '',
      tax_rate: '18',
      invoice_type: 'standard',
      notes: '',
      status: 'draft',
      payment_status: 'unpaid',
      amount_paid: 0
    })
    setSelectedNote(null)
    setSelectedOrder(null)
    setBasis('delivery_note')
    setError(null)
  }

  const handleSalesOrderBasis = async (orderId) => {
    setBasis('sales_order')
    setFetchingOrder(true)
    try {
      const res = await salesOrdersAPI.get(orderId)
      if (res.data.success) {
        const order = res.data.data
        setSelectedOrder(order)
        
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 15) // Shorter due date for advance/direct order

        setFormData(prev => ({
          ...prev,
          sales_order_id: orderId,
          delivery_note_id: '',
          customer_name: order.customer_name || '',
          total_value: order.total_value || order.order_amount || '',
          due_date: dueDate.toISOString().split('T')[0],
          invoice_type: 'advance'
        }))
      }
    } catch (err) {
      console.error('Error fetching order details:', err)
      setError('Failed to fetch sales order details')
    } finally {
      setFetchingOrder(false)
    }
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
          total_value: note?.total_value || note?.items?.reduce((sum, i) => sum + (parseFloat(i.qty) * parseFloat(i.rate || 0)), 0) || '',
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
    let baseAmount = 0
    if (basis === 'delivery_note') {
      baseAmount = parseFloat(formData.total_value) || 0
    } else {
      // For sales order, calculate from items if total_value is not manually adjusted
      baseAmount = parseFloat(formData.total_value) || 0
    }
    const taxRate = parseFloat(formData.tax_rate) || 0
    const taxAmount = (baseAmount * taxRate) / 100
    const grandTotal = baseAmount + taxAmount
    return { baseAmount, taxAmount, grandTotal }
  }

  const { baseAmount, taxAmount, grandTotal } = calculateFinancials()

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if ((basis === 'delivery_note' && !formData.delivery_note_id) || 
          (basis === 'sales_order' && !formData.sales_order_id) ||
          !formData.invoice_date || !formData.total_value || !formData.due_date) {
        throw new Error('Please fill in all required fields')
      }

      const res = await salesInvoicesAPI.create({
        ...formData,
        amount: baseAmount,
        tax_amount: taxAmount,
        grand_total: grandTotal
      })
      if (res.data.success) {
        onSuccess?.()
        if (formData.invoice_type === 'advance') {
          // Redirect to payments to release payment
          navigate('/accounts/payments', {
            state: {
              type: 'customer',
              party_id: selectedOrder?.customer_id,
              order_id: formData.sales_order_id,
              amount: grandTotal,
              reference: res.data.data.invoice_id
            }
          })
        } else {
          onClose()
        }
      } else {
        throw new Error(res.data.error || 'Failed to create invoice')
      }
    } catch (err) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded   w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header - Subcontract Style */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded   ">
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900">Create Sales Invoice</h2>
              <p className="text-[10px]  text-slate-400   mt-0.5">Financial Document Generation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-50/30">
          <div className="p-6">
            {error && <Alert type="danger" className="mb-6">{error}</Alert>}

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Billing Information */}
              <div className="lg:w-2/5 space-y-2">
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded ">
                      <ShieldCheck size={16} />
                    </div>
                    <h3 className="text-xs  text-slate-800  ">Billing Context</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex p-1 bg-slate-100 rounded  gap-1">
                      <button
                        type="button"
                        onClick={() => { setBasis('delivery_note'); setFormData(prev => ({ ...prev, sales_order_id: '', delivery_note_id: '' })); setSelectedNote(null); setSelectedOrder(null); }}
                        className={`flex-1 py-1.5 text-[10px]  rounded  transition-all ${basis === 'delivery_note' ? 'bg-white text-blue-600  ' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Delivery Note Basis
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBasis('sales_order'); setFormData(prev => ({ ...prev, delivery_note_id: '', sales_order_id: '' })); setSelectedNote(null); setSelectedOrder(null); }}
                        className={`flex-1 py-1.5 text-[10px]  rounded  transition-all ${basis === 'sales_order' ? 'bg-white text-indigo-600  ' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Sales Order Basis
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px]  text-slate-400   flex items-center gap-1">
                        <Package size={12} className="text-slate-300" />
                        {basis === 'delivery_note' ? 'Delivery Note Basis' : 'Sales Order Basis'} <span className="text-rose-500">*</span>
                      </label>
                      {basis === 'delivery_note' ? (
                        <SearchableSelect
                          value={formData.delivery_note_id}
                          onChange={handleDeliveryNoteChange}
                          options={deliveryNotes.map(n => ({
                            value: n.delivery_note_id,
                            label: `${n.delivery_note_id} - ${n.customer_name}`
                          }))}
                          placeholder="Select Delivery Note"
                          required
                          containerClassName="border-slate-200"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData.sales_order_id}
                          readOnly
                          placeholder="Sales Order ID"
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded  text-xs font-semibold text-slate-700 outline-none"
                        />
                      )}
                    </div>

                    <div className="p-2 bg-slate-50 rounded  border border-slate-100 flex items-center gap-4">
                      <div className="p-2 bg-white rounded  border border-slate-200   text-blue-600">
                        <User size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px]  text-slate-400  ">Customer</p>
                        <p className="text-sm  text-slate-800">{formData.customer_name || 'Select delivery note...'}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px]  text-slate-400  ">Invoice Type</label>
                      <select
                        name="invoice_type"
                        value={formData.invoice_type}
                        onChange={handleInputChange}
                        className="w-full p-2  bg-slate-50 border border-slate-200 rounded  focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-xs font-semibold text-slate-700"
                      >
                        <option value="standard">Standard Invoice</option>
                        <option value="advance">Advance Payment</option>
                        <option value="credit">Credit Note</option>
                        <option value="debit">Debit Note</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px]  text-slate-400   flex items-center gap-1">
                          <Calendar size={12} className="text-slate-300" />
                          Invoice Date
                        </label>
                        <input
                          type="date"
                          name="invoice_date"
                          value={formData.invoice_date}
                          onChange={handleInputChange}
                          required
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded  text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px]  text-slate-400   flex items-center gap-1">
                          <Clock size={12} className="text-slate-300" />
                          Due Date
                        </label>
                        <input
                          type="date"
                          name="due_date"
                          value={formData.due_date}
                          onChange={handleInputChange}
                          required
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded  text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="bg-indigo-600 p-6 rounded  shadow-xl shadow-indigo-100 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Calculator size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="p-1 bg-white/10 rounded ">
                        <TrendingUp size={16} className="text-indigo-200" />
                      </div>
                      <span className="text-xs    text-indigo-100">Financial Summary</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-indigo-100/70">Subtotal Value</span>
                        <span className=" ">₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-indigo-100/70">GST Component ({formData.tax_rate}%)</span>
                        <span className="text-indigo-200 ">+₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="pt-4 border-t border-white/10 mt-2 flex justify-between items-center">
                        <div>
                          <p className="text-[10px]    text-indigo-100/50 mb-1">Final Invoice Amount</p>
                          <p className="text-3xl  er">
                            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-2 bg-white/10 rounded-full">
                          <IndianRupee size={24} className="text-indigo-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Items & Totals */}
              <div className="lg:w-3/5 space-y-2">
                <div className="bg-white border border-slate-200 rounded  overflow-hidden   flex flex-col h-full min-h-[400px]">
                  <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded  border border-slate-200   text-indigo-600">
                        <ShoppingCart size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm  text-slate-800  ">Billable Items</h3>
                        <p className="text-[10px] text-slate-400   ">
                          {basis === 'delivery_note' ? (selectedNote?.items?.length || 0) : (selectedOrder?.items?.length || 0)} Line Items Linked
                        </p>
                      </div>
                    </div>
                    {basis === 'delivery_note' && selectedNote && (
                      <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 rounded   px-3 py-1">
                        DN: {selectedNote.delivery_note_id}
                      </Badge>
                    )}
                    {basis === 'sales_order' && selectedOrder && (
                      <Badge className="bg-blue-50 text-blue-600 border-blue-100 rounded   px-3 py-1">
                        SO: {selectedOrder.sales_order_id}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/30 text-slate-400 sticky top-0 backdrop-blur-md">
                        <tr>
                          <th className="px-6 py-3 text-[10px]   ">Item Description</th>
                          <th className="px-6 py-3 text-center text-[10px]   ">Qty</th>
                          <th className="px-6 py-3 text-right text-[10px]   ">Rate</th>
                          <th className="px-6 py-3 text-right text-[10px]   ">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {fetchingNote || fetchingOrder ? (
                          <tr>
                            <td colSpan="4" className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                <span className="text-xs  text-slate-400  ">Syncing Strategic Data...</span>
                              </div>
                            </td>
                          </tr>
                        ) : (basis === 'delivery_note' ? selectedNote?.items : selectedOrder?.items)?.length > 0 ? (
                          (basis === 'delivery_note' ? selectedNote.items : selectedOrder.items).map((item, idx) => {
                            const displayQty = basis === 'delivery_note' 
                              ? (item.qty || item.quantity || 0) 
                              : (selectedOrder?.qty || selectedOrder?.quantity || item.qty || item.quantity || 1);
                            const itemRate = parseFloat(item.rate || 0);
                            const itemTotal = parseFloat(displayQty) * itemRate;

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                  <p className=" text-slate-700 group-hover:text-indigo-600 transition-colors">{item.item_name || item.item_code}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 tracking-wider ">{item.item_code}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className="inline-block px-3 py-1 bg-slate-100 rounded  text-slate-700  text-xs">{displayQty}</span>
                                </td>
                                <td className="px-6 py-4 text-right text-slate-500 font-medium text-xs ">
                                  ₹{itemRate.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-right  text-slate-900 text-sm">
                                  ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-4 opacity-30">
                                <Receipt size={48} className="text-slate-400" />
                                <div className="space-y-1">
                                  <p className="text-sm  text-slate-900  ">No Items Loaded</p>
                                  <p className="text-xs text-slate-400 font-medium">Select a {basis === 'delivery_note' ? 'delivery note' : 'sales order'} to preview items and pricing.</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px]  text-slate-400   flex items-center gap-1.5">
                          <Wallet size={14} className="text-indigo-500" />
                          Base Taxable Value
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            name="total_value"
                            value={formData.total_value}
                            onChange={handleInputChange}
                            required
                            step="0.01"
                            className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded  focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-base  text-slate-900"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px]  text-slate-400">INR</div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px]  text-slate-400   flex items-center gap-1.5">
                          <Percent size={14} className="text-indigo-500" />
                          GST Rate Plan
                        </label>
                        <select
                          name="tax_rate"
                          value={formData.tax_rate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded  focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all text-sm  text-slate-700"
                        >
                          <option value="0">0% (GST Exempt)</option>
                          <option value="5">5% GST - Essential</option>
                          <option value="12">12% GST - Standard</option>
                          <option value="18">18% GST - Professional</option>
                          <option value="28">28% GST - Luxury</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded  flex gap-3   shadow-amber-100/50">
                      <div className="p-2 bg-white rounded  text-amber-500 shrink-0 h-fit border border-amber-100">
                        <Info size={16} />
                      </div>
                      <div>
                        <p className="text-xs  text-amber-900   mb-0.5">Audit Notice</p>
                        <p className="text-[10px] text-amber-700/80 leading-relaxed font-medium">
                          Ensure all financial details are accurate. Once generated, this invoice will be sent to the customer and recorded in the <strong className="text-amber-900">Accounts Receivable</strong> ledger for tracking.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer - Professional Action Bar */}
        <div className="p-2 border-t border-slate-100 bg-white flex justify-between items-center sticky bottom-0 ">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs  text-slate-400 hover:text-slate-600   transition-colors"
          >
            Cancel Draft
          </button>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end px-4 border-r border-slate-100">
              <p className="text-[9px]  text-slate-400   mb-0.5">Invoice Grand Total</p>
              <p className="text-lg  text-slate-900 leading-none er">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
            </div>
            <button 
              onClick={handleSubmit}
              disabled={loading || (basis === 'delivery_note' ? !formData.delivery_note_id : !formData.sales_order_id)}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded  text-xs  hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-30 disabled:active:scale-100 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-400" />
              )}
              GENERATE FINAL INVOICE
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
