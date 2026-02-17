import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, ChevronDown, FileText, Calendar, User, 
  CreditCard, Info, Package, DollarSign, Calculator, 
  CheckCircle, ArrowRight, Building2, Receipt, ShieldCheck,
  RefreshCw, Clock
} from 'lucide-react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { purchaseInvoicesAPI, purchaseReceiptsAPI } from '../../services/api'

export default function CreatePurchaseInvoiceModal({ isOpen, onClose, onSuccess, initialPoNo = null }) {
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
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    net_amount: '0.00',
    tax_rate: '18',
    tax_amount: '0.00',
    gross_amount: '0.00',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchAcceptedGRNs()
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      setFormData(prev => ({ 
        ...prev, 
        due_date: nextMonth.toISOString().split('T')[0] 
      }))
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && initialPoNo && grns.length > 0) {
      const grnForPo = grns.find(g => g.po_no === initialPoNo)
      if (grnForPo) {
        handleGRNChange({ target: { value: grnForPo.grn_no } })
      }
    }
  }, [isOpen, initialPoNo, grns])

  const fetchAcceptedGRNs = async () => {
    try {
      const res = await purchaseReceiptsAPI.list()
      const data = res.data
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
      const res = await purchaseReceiptsAPI.get(grnNo)
      const data = res.data
      if (data.success) {
        setSelectedGrn(data.data)
        
        if (data.data.items && data.data.items.length > 0) {
          const netAmount = data.data.items.reduce((sum, item) => {
            return sum + ((item.received_qty || 0) * (item.rate || 0))
          }, 0)
          
          calculateTotals(netAmount, formData.tax_rate)
        }
      }
    } catch (error) {
      console.error('Error fetching GRN details:', error)
      setError('Failed to fetch GRN details. Please try again.')
    } finally {
      setLoadingGrn(false)
    }
  }

  const calculateTotals = (net, taxR) => {
    const netAmount = parseFloat(net) || 0
    const taxRate = parseFloat(taxR) || 0
    const taxAmount = (netAmount * taxRate) / 100
    const grossAmount = netAmount + taxAmount
    
    setFormData(prev => ({
      ...prev,
      net_amount: netAmount.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      gross_amount: grossAmount.toFixed(2)
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      if (name === 'net_amount' || name === 'tax_rate') {
        calculateTotals(
          name === 'net_amount' ? value : newData.net_amount,
          name === 'tax_rate' ? value : newData.tax_rate
        )
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

  const handleSubmit = async (status = 'draft') => {
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

      const payload = {
        ...formData,
        net_amount: parseFloat(formData.net_amount),
        tax_rate: parseFloat(formData.tax_rate),
        tax_amount: parseFloat(formData.tax_amount),
        gross_amount: parseFloat(formData.gross_amount),
        status,
        payment_status: 'unpaid',
        items: invoiceItems
      }

      await purchaseInvoicesAPI.create(payload)
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
      title="Create Purchase Invoice" 
      size="5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={loading || !formData.grn_no}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />}
              Save as Draft
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSubmit('submitted')}
              disabled={loading || !formData.grn_no}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Submit Invoice
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {error && <Alert type="danger">{error}</Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Configuration & Financials */}
          <div className="lg:col-span-1 space-y-2">
            <section className="bg-neutral-50 rounded border border-neutral-200 p-2 space-y-2">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
                <div className="p-2 bg-indigo-500 rounded  text-white">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-xs  text-neutral-800 ">Invoice Details</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Link GRN and set dates</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                    <Package size={12} /> GRN Number <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="grn_no"
                    value={formData.grn_no}
                    onChange={handleGRNChange}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  >
                    <option value="">Select Accepted GRN</option>
                    {grns.map(grn => (
                      <option key={grn.grn_no} value={grn.grn_no}>
                        {grn.grn_no} ({grn.supplier_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                    <Calendar size={12} /> Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                    <Calendar size={12} /> Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </section>

            <section className="bg-slate-900 rounded  p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                  <Calculator size={18} className="text-indigo-400" />
                  <h3 className="text-sm   tracking-wider">Financial Summary</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px]  text-slate-400 ">Net Subtotal</span>
                    <div className="text-right">
                      <span className="text-lg ">₹{parseFloat(formData.net_amount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px]  text-slate-400 ">
                      <span>GST Rate (%)</span>
                      <input 
                        type="number"
                        name="tax_rate"
                        value={formData.tax_rate}
                        onChange={handleInputChange}
                        className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-right text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex justify-between text-[11px]  text-slate-400 ">
                      <span>Tax Amount</span>
                      <span className="text-white">₹{parseFloat(formData.tax_amount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-xs  text-indigo-400  ">Grand Total</span>
                      <span className="text-2xl  text-white">₹{parseFloat(formData.gross_amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Item Verification & Details */}
          <div className="lg:col-span-2 space-y-2">
            <div className="bg-white rounded  border border-neutral-200   overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded ">
                    <ShieldCheck size={16} />
                  </div>
                  <h3 className="text-sm  text-neutral-800">Verification Table</h3>
                </div>
                <Badge variant={selectedGrn ? "success" : "neutral"} className="px-2.5 py-1 text-[10px]">
                  {selectedGrn?.items?.length || 0} Items Linked
                </Badge>
              </div>

              <div className="p-0">
                {loadingGrn ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <RefreshCw className="text-indigo-500 animate-spin" size={32} />
                    <p className="text-xs  text-neutral-400  ">Syncing GRN Items...</p>
                  </div>
                ) : selectedGrn?.items?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-neutral-50/50 border-b border-neutral-100">
                          <th className="p-2  text-[10px]  text-neutral-400  tracking-wider">Item Details</th>
                          <th className="p-2  text-[10px]  text-neutral-400  tracking-wider text-right">Received</th>
                          <th className="p-2  text-[10px]  text-neutral-400  tracking-wider text-right">Unit Rate</th>
                          <th className="p-2  text-[10px]  text-neutral-400  tracking-wider text-right">Row Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50">
                        {selectedGrn.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                            <td className="p-2 ">
                              <div className="flex flex-col">
                                <span className="text-sm  text-neutral-800">{item.item_code}</span>
                                <span className="text-[10px] text-neutral-500 font-medium italic">{item.item_name}</span>
                              </div>
                            </td>
                            <td className="p-2  text-right">
                              <span className="text-sm  text-neutral-700">{item.received_qty}</span>
                            </td>
                            <td className="p-2  text-right text-neutral-500 font-medium">
                              ₹{(item.rate || 0).toLocaleString()}
                            </td>
                            <td className="p-2  text-right">
                              <span className="text-sm  text-neutral-900">₹{((item.received_qty || 0) * (item.rate || 0)).toLocaleString()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                    <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 border border-neutral-100">
                      <Receipt size={32} className="text-neutral-300" />
                    </div>
                    <h4 className="text-sm  text-neutral-800 mb-1">No Source Document Selected</h4>
                    <p className="text-xs text-neutral-500 max-w-[200px]">Select an accepted Good Receipt Note to pull item details and financials.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded  border border-neutral-200 p-4 space-y-3">
                <label className="text-[10px]  text-neutral-400  tracking-wider flex items-center gap-1.5">
                  <User size={12} /> Supplier Reference
                </label>
                <div className="p-3 bg-neutral-50 rounded  border border-neutral-100">
                  <p className="text-sm  text-neutral-800 truncate">{formData.supplier_name || 'Not Linked'}</p>
                  <p className="text-[10px] text-neutral-500 font-medium">ID: {formData.supplier_id || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-white rounded  border border-neutral-200 p-4 space-y-3">
                <label className="text-[10px]  text-neutral-400  tracking-wider flex items-center gap-1.5">
                  <FileText size={12} /> Order Context
                </label>
                <div className="p-3 bg-neutral-50 rounded  border border-neutral-100">
                  <p className="text-sm  text-neutral-800">PO: {formData.po_no || 'Manual'}</p>
                  <p className="text-[10px] text-neutral-500 font-medium">Ref: {formData.grn_no || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                <Info size={12} /> Notes & Internal Remarks
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Add any internal remarks or notes regarding this invoice..."
                className="w-full p-3 border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
