import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, ChevronDown, FileText, Calendar, User, 
  CreditCard, Info, Package, DollarSign, Calculator, 
  CheckCircle, ArrowRight, Building2, Receipt, ShieldCheck
} from 'lucide-react'
import Modal from '../Modal'
import Button from '../Button/Button'

export default function CreatePurchaseInvoiceModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [grns, setGrns] = useState([])
  const [selectedGrn, setSelectedGrn] = useState(null)
  const [loadingGrn, setLoadingGrn] = useState(false)
  const [formData, setFormData] = useState({
    grn_no: '',
    po_no: '',
    supplier_name: '',
    supplier_id: '',
    invoice_date: '',
    due_date: '',
    net_amount: '',
    tax_rate: '18',
    tax_amount: '0',
    gross_amount: '0',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchAcceptedGRNs()
      const today = new Date().toISOString().split('T')[0]
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const dueDate = nextMonth.toISOString().split('T')[0]
      
      setFormData(prev => ({ 
        ...prev, 
        invoice_date: today,
        due_date: dueDate 
      }))
    }
  }, [isOpen])

  const fetchAcceptedGRNs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-receipts`)
      const data = await res.json()
      if (data.success) {
        setGrns(data.data?.filter(grn => grn.status === 'accepted') || [])
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error)
    }
  }

  const fetchGRNDetails = async (grnNo) => {
    setLoadingGrn(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-receipts/${grnNo}`)
      const data = await res.json()
      if (data.success) {
        setSelectedGrn(data.data)
        
        if (data.data.items && data.data.items.length > 0) {
          const netAmount = data.data.items.reduce((sum, item) => {
            return sum + ((item.received_qty || 0) * (item.rate || 0))
          }, 0)
          
          const taxRate = parseFloat(formData.tax_rate) || 18
          const taxAmount = (netAmount * taxRate) / 100
          const grossAmount = netAmount + taxAmount
          
          setFormData(prev => ({
            ...prev,
            net_amount: netAmount.toFixed(2),
            tax_amount: taxAmount.toFixed(2),
            gross_amount: grossAmount.toFixed(2)
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching GRN details:', error)
      setError('Failed to fetch GRN details. Please try again.')
    } finally {
      setLoadingGrn(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      
      if (name === 'net_amount' || name === 'tax_rate') {
        const netAmount = name === 'net_amount' ? parseFloat(value) || 0 : parseFloat(newData.net_amount) || 0
        const taxRate = name === 'tax_rate' ? parseFloat(value) || 0 : parseFloat(newData.tax_rate) || 0
        const taxAmount = (netAmount * taxRate) / 100
        const grossAmount = netAmount + taxAmount
        
        newData.tax_amount = taxAmount.toFixed(2)
        newData.gross_amount = grossAmount.toFixed(2)
      }
      
      return newData
    })
    setError(null)
  }

  const handleGRNChange = async (e) => {
    const grnNo = e.target.value
    const grn = grns.find(g => g.grn_no === grnNo)
    
    setFormData(prev => ({
      ...prev,
      grn_no: grnNo,
      po_no: grn?.po_no || '',
      supplier_name: grn?.supplier_name || '',
      supplier_id: grn?.supplier_id || ''
    }))
    setError(null)
    
    if (grnNo) {
      await fetchGRNDetails(grnNo)
    } else {
      setSelectedGrn(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.grn_no || !formData.invoice_date || !formData.net_amount || !formData.due_date) {
        throw new Error('Please fill in all required fields')
      }

      const invoiceItems = selectedGrn?.items?.map(item => ({
        item_code: item.item_code,
        qty: item.received_qty || 0,
        rate: item.rate || 0
      })) || []

      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          net_amount: parseFloat(formData.net_amount),
          tax_rate: parseFloat(formData.tax_rate),
          tax_amount: parseFloat(formData.tax_amount),
          gross_amount: parseFloat(formData.gross_amount),
          status: 'draft',
          payment_status: 'unpaid',
          items: invoiceItems
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create purchase invoice')

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded  text-indigo-600">
            <Receipt size={20} />
          </div>
          <div>
            <h2 className="text-lg  text-slate-800">Create Purchase Invoice</h2>
            <p className="text-xs font-medium text-slate-500">Record a new invoice against a Good Receipt Note</p>
          </div>
        </div>
      } 
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-1">
        {error && (
          <div className="flex items-center gap-3 p-2 mb-6 text-xs border bg-rose-50 border-rose-200 text-rose-600 rounded">
            <AlertCircle size={15} className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className=" gap-8">
          {/* Left Column: Form Fields */}
          <div className="">
            {/* Section 1: Source Info */}
            <section>
              <div className="flex items-center gap-2 mb-4 text-slate-800">
                <div className="p-2 bg-slate-100 rounded">
                  <Building2 size={16} />
                </div>
                <h3 className="text-xs    text-slate-600">Source Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-slate-50 rounded border border-slate-200 ">
                <div className="">
                  <label className="text-xs  text-slate-700 flex items-center gap-1.5">
                    GRN Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="grn_no"
                      value={formData.grn_no}
                      onChange={handleGRNChange}
                      required
                      className="w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none appearance-none  font-medium"
                    >
                      <option value="">Select an accepted GRN</option>
                      {grns.map(grn => (
                        <option key={grn.grn_no} value={grn.grn_no}>
                          {grn.grn_no} - {grn.supplier_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="">
                  <label className="text-xs  text-slate-700">Supplier</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.supplier_name}
                      readOnly
                      placeholder="Auto-populated"
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-medium cursor-not-allowed outline-none"
                    />
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="">
                  <label className="text-xs  text-slate-700">Purchase Order</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.po_no}
                      readOnly
                      placeholder="Auto-populated"
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-medium cursor-not-allowed outline-none"
                    />
                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="">
                  <label className="text-xs  text-slate-700">Invoice Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="invoice_date"
                      value={formData.invoice_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none  font-medium"
                    />
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="">
                  <label className="text-xs  text-slate-700">Due Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none  font-medium"
                    />
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Items Verification */}
            <section className='my-2'>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-800">
                  <div className="p-1.5 bg-slate-100 rounded ">
                    <Package size={16} />
                  </div>
                  <h3 className="text-xs    text-slate-600">Item Verification</h3>
                </div>
                {selectedGrn && (
                  <span className="text-xs  px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100  tracking-tight">
                    {selectedGrn.items?.length || 0} Items Linked
                  </span>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden ">
                {loadingGrn ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <RefreshCw className="text-indigo-500 animate-spin" size={24} />
                    <p className="text-xs font-medium text-slate-500 italic">Fetching GRN items...</p>
                  </div>
                ) : selectedGrn?.items?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                          <th className="px-5 py-3 text-[11px]  text-slate-500  ">Item Details</th>
                          <th className="px-5 py-3 text-[11px]  text-slate-500   text-right">Received</th>
                          <th className="px-5 py-3 text-[11px]  text-slate-500   text-right">Rate</th>
                          <th className="px-5 py-3 text-[11px]  text-slate-500   text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedGrn.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs  text-slate-800">{item.item_code}</span>
                                <span className="text-xs text-slate-400 font-medium italic">{item.item_name || 'No description'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-xs font-medium text-slate-600">{item.received_qty}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-xs font-medium text-slate-600">₹{(item.rate || 0).toLocaleString()}</span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-xs  text-slate-900">₹{((item.received_qty || 0) * (item.rate || 0)).toLocaleString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Receipt size={24} className="text-slate-300" />
                    </div>
                    <p className="text-xs font-medium text-slate-400">Select a GRN to verify items</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Financials & Summary */}
          <div className="my-3">
            <section className="bg-slate-900 rounded p-2 text-white  relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl" />
              
              <div className="relative z-10 ">
                <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                  <Calculator size={15} className="text-indigo-400" />
                  <h3 className="text-xs text-white">Financial Summary</h3>
                </div>

                <div className="">
                  <div className="mt-2">
                    <label className="text-xs  text-slate-400  ">Net Amount (Subtotal)</label>
                    <div className="relative group">
                      <input
                        type="number"
                        name="net_amount"
                        value={formData.net_amount}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full pl-10 pr-4 p-2 bg-white/5 border border-white/10 rounded text-xs  text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                      <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="">
                      <label className="text-xs  text-slate-400  ">Tax Rate (%)</label>
                      <select
                        name="tax_rate"
                        value={formData.tax_rate}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-white/5 border border-white/10 rounded text-xs  text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="0" className="text-slate-900">0%</option>
                        <option value="5" className="text-slate-900">5%</option>
                        <option value="12" className="text-slate-900">12%</option>
                        <option value="18" className="text-slate-900">18%</option>
                        <option value="28" className="text-slate-900">28%</option>
                      </select>
                    </div>
                    <div className="">
                      <label className="text-xs  text-slate-400  ">Tax Amount</label>
                      <div className="w-full p-2 bg-white/5 border border-white/10 rounded text-xs  text-indigo-300">
                        ₹{(parseFloat(formData.tax_amount) || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-400">Total Payable</span>
                      <ShieldCheck size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-xl  text-white ">
                      ₹{(parseFloat(formData.gross_amount) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </section>

           

            <div className="flex  gap-3 pt-2">
              <Button
                type="submit"
                loading={loading}
                className="w-full  bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98]"
              >
                {loading ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle size={15} />}
                Create Purchase Invoice
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="w-full  text-slate-500  hover:bg-slate-100 transition-all rounded p-2"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}
