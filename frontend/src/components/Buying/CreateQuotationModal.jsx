import React, { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Input from '../Input/Input'
import { Plus, Trash2, AlertCircle, CheckCircle, FileText, User, Tag, ShoppingBag, Info } from 'lucide-react'
import { suppliersAPI, rfqsAPI, itemsAPI, quotationsAPI } from '../../services/api'

export default function CreateQuotationModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    rfq_id: '',
    items: [],
    notes: ''
  })

  const [suppliers, setSuppliers] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRFQ, setSelectedRFQ] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData()
    }
  }, [isOpen])

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      setError(null)
      
      const [supRes, rfqRes, itemRes] = await Promise.all([
        suppliersAPI.list(),
        rfqsAPI.list(),
        itemsAPI.list()
      ])

      setSuppliers(supRes.data.data || [])
      setRfqs(rfqRes.data.data || [])
      setAllItems(itemRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch required data:', err)
      setError('Failed to load required data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleRFQSelect = async (e) => {
    const rfqId = e.target.value
    
    if (rfqId) {
      try {
        const response = await rfqsAPI.get(rfqId)
        const rfq = response.data.data
        setSelectedRFQ(rfq)
        
        setFormData(prev => ({
          ...prev,
          rfq_id: rfqId,
          items: (rfq.items || []).map(item => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: 0,
            lead_time_days: 0,
            min_qty: item.qty
          }))
        }))
        setError(null)
      } catch (err) {
        console.error('Failed to fetch RFQ details:', err)
        setError('Failed to load RFQ items')
        setFormData(prev => ({ ...prev, rfq_id: '', items: [] }))
        setSelectedRFQ(null)
      }
    } else {
      setFormData(prev => ({ ...prev, rfq_id: '', items: [] }))
      setSelectedRFQ(null)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (idx, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: (field === 'rate' || field === 'qty' || field === 'lead_time_days' || field === 'min_qty') 
        ? parseFloat(value) || 0 
        : value
    }
    setFormData(prev => ({ ...prev, items: updatedItems }))
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
    setError(null)

    if (!formData.supplier_id) {
      setError('Please select a supplier')
      return
    }
    
    if (!formData.rfq_id) {
      setError('Please select an RFQ')
      return
    }
    
    if (formData.items.length === 0) {
      setError('No items in quotation')
      return
    }

    const invalidItems = formData.items.filter(item => !item.rate || item.rate <= 0)
    if (invalidItems.length > 0) {
      setError(`Please enter valid rate for all ${invalidItems.length} item(s)`)
      return
    }

    try {
      setLoading(true)
      const submitData = {
        supplier_id: formData.supplier_id,
        rfq_id: formData.rfq_id,
        items: formData.items,
        total_value: calculateTotal(),
        notes: formData.notes
      }

      await quotationsAPI.create(submitData)
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quotation')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = allItems.find(i => i.item_code === code)
    return item ? item.name : code
  }

  const handleClose = () => {
    setFormData({
      supplier_id: '',
      rfq_id: '',
      items: [],
      notes: ''
    })
    setSelectedRFQ(null)
    setError(null)
    onClose()
  }

  if (dataLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Create Supplier Quotation" size="3xl">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-neutral-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-500">Loading required data...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create Supplier Quotation" 
      size="3xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            loading={loading}
            disabled={!formData.supplier_id || !formData.rfq_id || formData.items.length === 0}
          >
            <CheckCircle size={16} className="mr-2" />
            Create Quotation
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="danger">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supplier & RFQ Selection */}
          <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-50 p-2  border-b border-neutral-200 flex items-center gap-2">
              <User size={18} className="text-primary-600" />
              <h3 className="font-semibold text-neutral-800">Source Information</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Supplier *</label>
                <select 
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">RFQ Request *</label>
                <select 
                  value={formData.rfq_id}
                  onChange={handleRFQSelect}
                  disabled={loading}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                >
                  <option value="">Select RFQ</option>
                  {rfqs.map(rfq => (
                    <option key={rfq.rfq_id} value={rfq.rfq_id}>
                      {rfq.rfq_id} - Valid till {rfq.valid_till || 'N/A'}
                    </option>
                  ))}
                </select>
                {selectedRFQ && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 p-2 rounded-md border border-green-100">
                    <CheckCircle size={14} />
                    {selectedRFQ.items?.length || 0} items loaded from RFQ
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Quotation Summary */}
          <section className="bg-primary-600 rounded-xl border border-primary-700 overflow-hidden text-white flex flex-col justify-center p-6 shadow-md shadow-primary-200">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-primary-500/50 pb-3">
                <span className="text-primary-100 text-sm">Total Items</span>
                <span className="text-xl font-semibold">{formData.items.length}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-primary-100 font-medium">Quotation Value</span>
                <span className="text-3xl font-bold">
                  ₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-primary-100 text-[10px] uppercase tracking-wider font-bold">
              <Tag size={14} />
              <span>Quoted Price (Excl. Tax)</span>
            </div>
          </section>
        </div>

        {/* Quotation Items */}
        {formData.items.length > 0 && (
          <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-50 p-2  border-b border-neutral-200 flex items-center gap-2">
              <ShoppingBag size={18} className="text-primary-600" />
              <h3 className="font-semibold text-neutral-800">Quotation Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200">
                  <tr>
                    <th className="p-2  font-semibold">Item Details</th>
                    <th className="p-2  font-semibold w-24 text-center">Qty</th>
                    <th className="p-2  font-semibold w-32 text-right">Rate/Unit</th>
                    <th className="p-2  font-semibold w-32 text-right">Amount</th>
                    <th className="p-2  font-semibold w-28 text-center">Lead Time</th>
                    <th className="p-2  font-semibold w-24 text-center">Min Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-2 ">
                        <div className="font-medium text-neutral-900">{getItemName(item.item_code)}</div>
                        <div className="text-xs text-neutral-500">{item.item_code}</div>
                      </td>
                      <td className="p-2  text-center text-neutral-600 font-medium">
                        {item.qty}
                      </td>
                      <td className="p-2 ">
                        <input 
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          required
                          className={`w-full h-9 px-2 text-right rounded-md border focus:ring-1 outline-none text-sm ${
                            !item.rate || item.rate <= 0 ? 'border-red-300 bg-red-50' : 'border-neutral-300'
                          }`}
                        />
                      </td>
                      <td className="p-2  text-right font-bold text-primary-600">
                        ₹{((item.qty || 0) * (item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 ">
                        <div className="flex items-center gap-1">
                          <input 
                            type="number"
                            value={item.lead_time_days || ''}
                            onChange={(e) => handleItemChange(idx, 'lead_time_days', e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full h-9 px-2 text-center rounded-md border border-neutral-300 focus:ring-1 outline-none text-sm"
                          />
                          <span className="text-[10px] text-neutral-400">days</span>
                        </div>
                      </td>
                      <td className="p-2 ">
                        <input 
                          type="number"
                          value={item.min_qty || ''}
                          onChange={(e) => handleItemChange(idx, 'min_qty', e.target.value)}
                          placeholder="1"
                          min="0"
                          step="0.01"
                          className="w-full h-9 px-2 text-center rounded-md border border-neutral-300 focus:ring-1 outline-none text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Notes Section */}
        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="bg-neutral-50 p-2  border-b border-neutral-200 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" />
            <h3 className="font-semibold text-neutral-800">Notes & Comments</h3>
          </div>
          <div className="p-4">
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes or comments about this quotation..."
              rows="3"
              className="w-full p-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm min-h-[100px]"
            />
          </div>
        </section>

        {!formData.rfq_id && (
          <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 text-sm">
            <Info size={18} />
            <span>Select an RFQ request from the source information to load quotation items.</span>
          </div>
        )}
      </form>
    </Modal>
  )
}
