import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import './Buying.css'

export default function QuotationForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'

  const [formData, setFormData] = useState({
    supplier_id: '',
    rfq_id: '',
    items: [],
    notes: ''
  })

  const [suppliers, setSuppliers] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [selectedRFQItems, setSelectedRFQItems] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [quotation, setQuotation] = useState(null)

  useEffect(() => {
    fetchRequiredData()
    if (isEditMode) {
      fetchQuotation()
    }
  }, [])

  const fetchRequiredData = async () => {
    try {
      const [supRes, rfqRes, itemRes] = await Promise.all([
        axios.get('/api/suppliers?active=true'),
        axios.get('/api/rfqs?status=sent'),
        axios.get('/api/items?limit=1000')
      ])

      setSuppliers(supRes.data.data || [])
      setRfqs(rfqRes.data.data || [])
      setAllItems(itemRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch required data:', err)
    }
  }

  const fetchQuotation = async () => {
    try {
      const response = await axios.get(`/api/quotations/${id}`)
      const quotationData = response.data.data
      setQuotation(quotationData)
      setFormData({
        supplier_id: quotationData.supplier_id,
        rfq_id: quotationData.rfq_id,
        items: quotationData.items || [],
        notes: quotationData.notes || ''
      })
      if (quotationData.rfq_id) {
        handleRFQSelect({ target: { value: quotationData.rfq_id } })
      }
    } catch (err) {
      setError('Failed to fetch quotation')
    }
  }

  const handleRFQSelect = async (e) => {
    const rfqId = e.target.value
    setFormData({ ...formData, rfq_id: rfqId })

    if (rfqId) {
      try {
        const response = await axios.get(`/api/rfqs/${rfqId}`)
        const rfq = response.data.data
        setSelectedRFQItems(rfq.items || [])
        // Initialize items from RFQ
        setFormData({
          ...formData,
          rfq_id: rfqId,
          items: (rfq.items || []).map(item => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: 0,
            lead_time_days: 0,
            min_qty: 1,
            id: Date.now() + Math.random()
          }))
        })
      } catch (err) {
        console.error('Failed to fetch RFQ details:', err)
      }
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleItemChange = (idx, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: field === 'rate' ? parseFloat(value) : value
    }
    setFormData({ ...formData, items: updatedItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = item.qty || 0
      const rate = item.rate || 0
      return sum + (qty * rate)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.supplier_id || !formData.rfq_id || formData.items.length === 0) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        supplier_id: formData.supplier_id,
        rfq_id: formData.rfq_id,
        items: formData.items.map(({ id, ...item }) => item),
        total_value: calculateTotal()
      }

      if (isEditMode) {
        await axios.put(`/api/quotations/${id}`, submitData)
        setSuccess('Quotation updated successfully')
      } else {
        await axios.post('/api/quotations', submitData)
        setSuccess('Quotation created successfully')
      }

      setTimeout(() => navigate('/buying/quotations'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quotation')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = allItems.find(i => i.item_code === code)
    return item ? item.name : code
  }

  return (
    <div className="w-full bg-neutral-50 min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded border border-neutral-200 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
          <div>
            <h1 className="text-xl font-black text-neutral-900 tracking-tight ">
              {isEditMode ? 'Edit Quotation' : 'New Supplier Quotation'}
            </h1>
            <p className="text-[10px]  text-neutral-400 mt-0.5 tracking-widest ">
              {isEditMode ? `ID: ${id?.toUpperCase()}` : 'Record supplier pricing and availability'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => navigate('/buying/quotations')}
              variant="secondary"
              className="px-4 py-2 h-10 border-neutral-200 font-black text-[10px] tracking-widest  rounded-none"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="primary"
              disabled={loading}
              className="bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2 h-10 border-0 font-black text-[10px] tracking-widest "
            >
              {loading ? 'Saving...' : 'Save Quotation'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <p className="text-[11px]  text-rose-700  tracking-wider">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-[11px]  text-emerald-700  tracking-wider">{success}</p>
          </div>
        )}

        <div className="bg-white rounded border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {isEditMode && quotation && (
                <div className="mb-8 pb-8 border-b border-neutral-100">
                  <AuditTrail 
                    createdAt={quotation.created_at}
                    createdBy={quotation.created_by}
                    updatedAt={quotation.updated_at}
                    updatedBy={quotation.updated_by}
                    status={quotation.status}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400  tracking-[0.2em]">Supplier *</label>
                  <select 
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleChange}
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm  text-neutral-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all  tracking-wider"
                  >
                    <option value="">SELECT SUPPLIER</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.name?.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-neutral-400  tracking-[0.2em]">RFQ REFERENCE *</label>
                  <select 
                    value={formData.rfq_id}
                    onChange={handleRFQSelect}
                    required
                    className="w-full bg-neutral-50 border border-neutral-200 p-3 rounded text-sm  text-neutral-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all  tracking-wider"
                  >
                    <option value="">SELECT RFQ</option>
                    {rfqs.map(rfq => (
                      <option key={rfq.rfq_id} value={rfq.rfq_id}>
                        {rfq.rfq_id?.toUpperCase()} - {rfq.supplier_count} SUPPLIERS
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.items.length > 0 ? (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                    <h3 className="text-[11px] font-black text-neutral-900  tracking-[0.3em]">Quotation Items</h3>
                    <span className="text-[10px]  text-neutral-400">{formData.items.length} ITEMS</span>
                  </div>
                  
                  <div className="overflow-x-auto border border-neutral-200 rounded">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                          <th className="px-4 py-3 text-left text-[10px] font-black text-neutral-500  tracking-widest">Item Detail</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black text-neutral-500  tracking-widest">Qty</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black text-neutral-500  tracking-widest w-32">Rate (₹)</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black text-neutral-500  tracking-widest">Amount</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black text-neutral-500  tracking-widest w-24">Lead Time</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black text-neutral-500  tracking-widest w-24">Min Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {formData.items.map((item, idx) => {
                          const amount = (item.qty || 0) * (item.rate || 0)
                          return (
                            <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                              <td className="px-4 py-4">
                                <div className="text-xs font-black text-neutral-900">{getItemName(item.item_code)}</div>
                                <div className="text-[9px]  text-neutral-400 mt-0.5 tracking-wider ">{item.item_code}</div>
                              </td>
                              <td className="px-4 py-4 text-right text-xs  text-neutral-600">{item.qty}</td>
                              <td className="px-4 py-4">
                                <input 
                                  type="number"
                                  value={item.rate || ''}
                                  onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  className="w-full bg-white border border-neutral-200 p-2 rounded text-right text-xs font-black text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                                />
                              </td>
                              <td className="px-4 py-4 text-right text-xs font-black text-neutral-900">
                                ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4">
                                <input 
                                  type="number"
                                  value={item.lead_time_days || ''}
                                  onChange={(e) => handleItemChange(idx, 'lead_time_days', e.target.value)}
                                  placeholder="0"
                                  min="0"
                                  className="w-full bg-white border border-neutral-200 p-2 rounded text-right text-xs  text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                                />
                              </td>
                              <td className="px-4 py-4">
                                <input 
                                  type="number"
                                  value={item.min_qty || ''}
                                  onChange={(e) => handleItemChange(idx, 'min_qty', e.target.value)}
                                  placeholder="1"
                                  min="0"
                                  step="0.01"
                                  className="w-full bg-white border border-neutral-200 p-2 rounded text-right text-xs  text-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-4">
                    <div className="bg-neutral-900 text-white p-6 rounded shadow-lg min-w-[300px]">
                      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                        <span className="text-[10px] font-black  tracking-[0.2em] text-neutral-400">Subtotal</span>
                        <span className="text-lg font-black tracking-tight">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black  tracking-[0.2em] text-indigo-400">Total Value</span>
                        <span className="text-2xl font-black tracking-tighter text-indigo-400">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center bg-neutral-50 rounded border border-dashed border-neutral-300">
                  <p className="text-[10px] font-black text-neutral-400  tracking-widest">Select an RFQ to load items</p>
                </div>
              )}

              <div className="space-y-2 pt-4">
                <label className="text-[10px] font-black text-neutral-400  tracking-[0.2em]">Notes & Special Instructions</label>
                <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="ADD ANY ADDITIONAL NOTES OR COMMENTS..."
                  rows="4"
                  className="w-full bg-neutral-50 border border-neutral-200 p-4 rounded text-xs  text-neutral-900 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all  tracking-wider"
                />
              </div>

              <div className="flex items-center justify-end gap-4 pt-8 border-t border-neutral-100">
                <Button 
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/buying/quotations')}
                  className="px-8 py-3 rounded-none font-black text-[10px] tracking-widest  border-neutral-300 h-12"
                >
                  Cancel Changes
                </Button>
                <Button 
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-12 py-3 rounded-none font-black text-[10px] tracking-widest  h-12 shadow  shadow-neutral-900/20"
                >
                  {loading ? 'PROCESSING...' : 'SAVE QUOTATION'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}