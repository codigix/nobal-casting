import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, ChevronDown, FileText, Calendar, User, 
  CreditCard, Info, DollarSign, CheckCircle, ArrowRight, 
  Building2, Receipt, ShieldCheck, RefreshCw, Clock, ArrowLeftRight,
  UserCheck, Truck
} from 'lucide-react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import api from '../../services/api'
import SearchableSelect from '../SearchableSelect'

export default function CreatePaymentModal({ isOpen, onClose, onSuccess, initialData = null, initialType = 'customer' }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [paymentType, setPaymentType] = useState(initialType) // 'customer' or 'vendor'
  
  const [partyList, setPartyList] = useState([])
  const [loadingParties, setLoadingParties] = useState(false)
  
  const [orderList, setOrderList] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  const [formData, setFormData] = useState({
    party_id: '',
    order_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'transfer',
    payment_reference: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (initialType) setPaymentType(initialType)
      fetchParties()
      if (initialData) {
        setFormData(prev => ({
          ...prev,
          party_id: initialData.party_id || '',
          order_id: initialData.order_id || '',
          amount: initialData.amount || '',
          notes: initialData.notes || '',
          payment_date: new Date().toISOString().split('T')[0]
        }))
        if (initialData.party_id) fetchOrders(initialData.party_id)
      } else {
        resetForm()
      }
    }
  }, [isOpen, paymentType, initialData, initialType])

  const resetForm = () => {
    setFormData({
      party_id: '',
      order_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      payment_method: 'transfer',
      payment_reference: '',
      notes: ''
    })
    setOrderList([])
    setError(null)
  }

  const fetchParties = async () => {
    setLoadingParties(true)
    try {
      const endpoint = paymentType === 'customer' ? '/customers' : '/suppliers'
      const res = await api.get(endpoint)
      const data = res.data.data || []
      setPartyList(data.map(p => ({
        value: paymentType === 'customer' ? p.customer_id : p.supplier_id,
        label: p.name,
        balance: p.balance
      })))
    } catch (error) {
      console.error('Error fetching parties:', error)
      setError(`Failed to fetch ${paymentType === 'customer' ? 'customers' : 'vendors'}`)
    } finally {
      setLoadingParties(false)
    }
  }

  const fetchOrders = async (partyId) => {
    if (!partyId) {
      setOrderList([])
      return
    }
    setLoadingOrders(true)
    try {
      // For now, let's fetch all orders and filter by party. 
      // In a real app, the API should handle filtering.
      const endpoint = paymentType === 'customer' ? '/selling/sales-orders' : '/purchase-orders'
      const res = await api.get(endpoint)
      const allOrders = res.data.data || []
      
      const filtered = allOrders.filter(o => {
        const oPartyId = paymentType === 'customer' ? o.customer_id : o.supplier_id
        return oPartyId === partyId
      }).map(o => ({
        value: paymentType === 'customer' ? o.sales_order_no : o.po_no,
        label: `${paymentType === 'customer' ? o.sales_order_no : o.po_no} (₹${parseFloat(o.grand_total || o.total_amount || 0).toLocaleString()})`
      }))
      
      setOrderList(filtered)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handlePartyChange = (val) => {
    setFormData(prev => ({ ...prev, party_id: val, order_id: '' }))
    fetchOrders(val)
  }

  const handleSubmit = async (status = 'draft') => {
    setLoading(true)
    setError(null)

    try {
      if (!formData.party_id || !formData.amount || !formData.payment_date) {
        throw new Error('Please fill in all required fields (Party, Amount, Date)')
      }

      const payload = {
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference,
        notes: formData.notes,
        status: status
      }

      let endpoint = ''
      if (paymentType === 'customer') {
        endpoint = '/finance/customer-payments'
        payload.customer_id = formData.party_id
        payload.sales_order_id = formData.order_id
      } else {
        endpoint = '/finance/vendor-payments'
        payload.vendor_id = formData.party_id
        payload.purchase_order_id = formData.order_id
      }

      await api.post(endpoint, payload)
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
      title={`Create ${paymentType === 'customer' ? 'Customer Receipt' : 'Vendor Payment'}`} 
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => handleSubmit('pending')}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Save Payment
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2 p-1">
        {error && <Alert type="danger">{error}</Alert>}

        {/* Type Toggle */}
        <div className="flex p-1 bg-neutral-100 rounded  border border-neutral-200">
          <button
            onClick={() => setPaymentType('customer')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded  text-xs    transition-all ${
              paymentType === 'customer' 
                ? 'bg-white text-indigo-600   border border-neutral-200' 
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <UserCheck size={14} />
            Customer Receipt
          </button>
          <button
            onClick={() => setPaymentType('vendor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded  text-xs    transition-all ${
              paymentType === 'vendor' 
                ? 'bg-white text-rose-600   border border-neutral-200' 
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Truck size={14} />
            Vendor Payment
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Party Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <User size={12} /> {paymentType === 'customer' ? 'Customer' : 'Vendor'} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={partyList}
              value={formData.party_id}
              onChange={handlePartyChange}
              placeholder={`Select ${paymentType === 'customer' ? 'Customer' : 'Vendor'}`}
              loading={loadingParties}
            />
            {formData.party_id && (
              <p className="text-[10px] text-neutral-500 mt-1">
                Current Balance: <span className=" text-neutral-900">₹{parseFloat(partyList.find(p => p.value === formData.party_id)?.balance || 0).toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Order Link (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <FileText size={12} /> Link to Order (Optional)
            </label>
            <SearchableSelect
              options={orderList}
              value={formData.order_id}
              onChange={(val) => setFormData(prev => ({ ...prev, order_id: val }))}
              placeholder="Select Order"
              loading={loadingOrders}
              disabled={!formData.party_id}
            />
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

          {/* Payment Date */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <Calendar size={12} /> Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="payment_date"
              value={formData.payment_date}
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
              <option value="other">Other</option>
            </select>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
              <Info size={12} /> Reference No / UTR
            </label>
            <input
              type="text"
              name="payment_reference"
              value={formData.payment_reference}
              onChange={handleInputChange}
              placeholder="Transaction ID, Cheque No, etc."
              className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
            <FileText size={12} /> Internal Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Add any additional details..."
            rows={3}
            className="w-full px-4 py-2  bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none"
          />
        </div>

        <section className="bg-neutral-50 rounded  border border-neutral-200 p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded  text-white ${paymentType === 'customer' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
              <ArrowLeftRight size={16} />
            </div>
            <div>
              <h4 className="text-xs  text-neutral-800  tracking-wider">Accounting Impact</h4>
              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                {paymentType === 'customer' 
                  ? "This will DEBIT Bank/Cash and CREDIT the Customer account, reducing their outstanding balance."
                  : "This will DEBIT the Vendor account and CREDIT Bank/Cash, reducing your outstanding payable balance."
                }
              </p>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  )
}
