import React, { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import Card from '../Card/Card'
import Input from '../Input/Input'
import SearchableSelect from '../SearchableSelect'
import { Plus, Trash2, AlertCircle, CheckCircle, Package, Receipt, CreditCard, Calendar } from 'lucide-react'
import { suppliersAPI, itemsAPI, taxTemplatesAPI, purchaseOrdersAPI, materialRequestsAPI } from '../../services/api'

export default function CreatePurchaseOrderModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    mr_id: '',
    order_date: '',
    expected_date: '',
    currency: 'INR',
    tax_template_id: '',
    items: []
  })

  const [suppliers, setSuppliers] = useState([])
  const [materialRequests, setMaterialRequests] = useState([])
  const [allItems, setAllItems] = useState([])
  const [taxTemplates, setTaxTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)
  const [supplierDetails, setSupplierDetails] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData()
    }
  }, [isOpen])

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      setError(null)
      
      const [supRes, itemRes, taxRes, mrRes] = await Promise.all([
        suppliersAPI.list(),
        itemsAPI.list(),
        taxTemplatesAPI.list().catch(() => ({ data: { data: [] } })),
        materialRequestsAPI.list().catch(() => ({ data: { data: [] } }))
      ])

      setSuppliers(supRes.data.data || [])
      setAllItems(itemRes.data.data || [])
      setTaxTemplates(taxRes.data.data || [])
      setMaterialRequests(mrRes.data.data || [])
      
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({
        ...prev,
        order_date: today,
        items: [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
      }))
    } catch (err) {
      console.error('Failed to fetch required data:', err)
      setError('Failed to load required data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.supplier_id === supplierId)
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId
    }))
    setSupplierDetails(supplier)
    setError(null)
  }

  const handleMRChange = async (value) => {
    // Value is passed directly from SearchableSelect
    const mrId = value;
    if (!mrId) {
      setFormData(prev => ({ ...prev, mr_id: '', items: [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }] }))
      return
    }

    try {
      setLoading(true)
      const res = await materialRequestsAPI.get(mrId)
      const mr = res.data.data
      
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toISOString().split('T')[0];
      }

      const items = mr.items.map(item => ({
        item_code: item.item_code,
        qty: item.qty - (item.issued_qty || 0), // Remaining quantity
        uom: item.uom,
        rate: item.rate || 0,
        schedule_date: formatDate(mr.required_by_date) || formData.expected_date
      })).filter(item => item.qty > 0)

      setFormData(prev => ({
        ...prev,
        mr_id: mrId,
        items: items.length > 0 ? items : [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }],
        expected_date: formatDate(mr.required_by_date) || prev.expected_date
      }))
    } catch (err) {
      console.error('Failed to fetch Material Request details:', err)
      setError('Failed to load Material Request details')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    
    if (field === 'item_code') {
      const item = allItems.find(i => i.item_code === value)
      newItems[index] = {
        ...newItems[index],
        item_code: value,
        uom: item?.uom || '',
        rate: item?.last_purchase_rate || 0
      }
    } else if (field === 'qty' || field === 'rate') {
      newItems[index][field] = value ? parseFloat(value) : ''
    } else {
      newItems[index][field] = value
    }

    setFormData(prev => ({
      ...prev,
      items: newItems
    }))
    setError(null)
  }

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
    }))
  }

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      items: newItems.length > 0 ? newItems : [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
    }))
  }

  const calculateLineAmount = (qty, rate) => {
    const q = parseFloat(qty) || 0
    const r = parseFloat(rate) || 0
    return q * r
  }

  const getCleanMRName = (mr) => {
    if (!mr.finished_goods_name) return 'Internal'
    
    // Normalize newlines
    const normalized = mr.finished_goods_name.replace(/\\n/g, '\n')
    
    // If it specifically contains "Item: " followed by text
    const itemMatch = normalized.match(/Item:\s*([^\n\r]+)/i)
    if (itemMatch && itemMatch[1]) {
      return itemMatch[1].trim()
    }
    
    // Split into lines and clean up
    const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // Filter out metadata lines
    const cleanLines = lines.filter(line => {
      const l = line.toLowerCase()
      return !l.startsWith('material request') && 
             !l.startsWith('planned quantity') && 
             !l.startsWith('includes raw') && 
             !l.startsWith('bom:')
    })
    
    if (cleanLines.length > 0) {
      return cleanLines[0].replace(/^Item:\s*/i, '').trim()
    }
    
    return lines[0]?.replace(/^Item:\s*/i, '').trim() || 'Internal'
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((total, item) => {
      return total + calculateLineAmount(item.qty, item.rate)
    }, 0)
  }

  const getTotalQty = () => {
    return formData.items.reduce((total, item) => total + (parseFloat(item.qty) || 0), 0)
  }

  const mrOptions = [
    { value: '', label: 'Direct PO (No MR)' },
    ...materialRequests.map(mr => ({
      value: mr.mr_id,
      label: `${mr.mr_id} - ${getCleanMRName(mr)} (${mr.status})`
    }))
  ]

  const supplierOptions = suppliers.map(s => ({
    value: s.supplier_id,
    label: s.name
  }))

  const itemOptions = allItems.map(i => ({
    value: i.item_code,
    label: `${i.item_code} - ${i.name}`
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.supplier_id) {
      setError('Please select a supplier')
      return
    }
    
    if (!formData.order_date) {
      setError('Please enter order date')
      return
    }

    if (!formData.expected_date) {
      setError('Please enter expected delivery date')
      return
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item')
      return
    }

    const invalidItems = formData.items.filter(item => !item.item_code || !item.qty || !item.rate)
    if (invalidItems.length > 0) {
      setError('Please fill in item code, quantity, and rate for all items')
      return
    }

    try {
      setLoading(true)
      
      const submitData = {
        supplier_id: formData.supplier_id,
        mr_id: formData.mr_id || null,
        order_date: formData.order_date,
        expected_date: formData.expected_date,
        currency: formData.currency,
        tax_template_id: formData.tax_template_id || null,
        items: formData.items.map(item => ({
          item_code: item.item_code,
          qty: parseFloat(item.qty),
          uom: item.uom,
          rate: parseFloat(item.rate),
          schedule_date: item.schedule_date || formData.expected_date
        })),
        subtotal: calculateSubtotal(),
        total_value: calculateSubtotal()
      }

      await purchaseOrdersAPI.create(submitData)
      
      onSuccess?.()
      onClose()
      
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        supplier_id: '',
        mr_id: '',
        order_date: today,
        expected_date: '',
        currency: 'INR',
        tax_template_id: '',
        items: [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
      })
      setSupplierDetails(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create purchase order')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Create New Purchase Order" size="3xl">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-6 h-6 border-4 border-neutral-200 border-t-primary-600 rounded  animate-spin"></div>
          <p className="mt-4 text-neutral-500">Loading required data...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Purchase Order" 
      size="5xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={loading} className='p-2'>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            loading={loading}
            className='p-2'
          >
            <CheckCircle size={15} className="mr-2" />
            Create Purchase Order
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <Alert variant="danger" className="mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        {/* Basic Information Section */}
        <section className="bg-white rounded  border border-neutral-200 ">
          <div className="bg-neutral-50 p-2  border-b border-neutral-200 flex items-center gap-2">
            <Receipt size={15} className="text-primary-600" />
            <h3 className=" text-neutral-800">Basic Information</h3>
          </div>
          
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Material Request</label>
              <SearchableSelect
                options={mrOptions}
                value={formData.mr_id}
                onChange={handleMRChange}
                placeholder="Select Material Request"
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Supplier *</label>
              <SearchableSelect
                options={supplierOptions}
                value={formData.supplier_id}
                onChange={handleSupplierChange}
                placeholder="Select Supplier"
                className="text-xs"
              />
            </div>

            <Input
              label="Order Date *"
              type="date"
              name="order_date"
              value={formData.order_date}
              onChange={handleInputChange}
              required
              className="text-xs p-2"
            />

            <Input
              label="Expected Delivery *"
              type="date"
              name="expected_date"
              value={formData.expected_date}
              onChange={handleInputChange}
              required
              className="text-xs p-2"
            />
          </div>

          {supplierDetails && (
            <div className="mx-4 mb-4 p-3 bg-green-50 rounded  border border-green-100 flex items-center gap-3">
              <div className="p-1.5 bg-green-100 rounded ">
                <CheckCircle size={14} className="text-green-600" />
              </div>
              <div className="text-xs text-green-700 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-medium">{supplierDetails.name}</span>
                <span>GSTIN: {supplierDetails.gstin || 'N/A'}</span>
                <span>Lead time: {supplierDetails.lead_time_days || 7} days</span>
              </div>
            </div>
          )}
        </section>

        {/* Items Section */}
        <section className="bg-white rounded  border border-neutral-200 ">
          <div className="bg-neutral-50 p-2  border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-primary-600" />
              <h3 className=" text-neutral-800">Purchase Order Items</h3>
            </div>
            <Button variant="outline" size="xs" onClick={handleAddItem} className="p-2 text-xs rounded">
              <Plus size={14} className="mr-1" /> Add Item
            </Button>
          </div>

          <div className="">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500  bg-neutral-50/50 border-b border-neutral-200">
                <tr>
                  <th className="p-2  ">Item Details</th>
                  <th className="p-2   w-24 text-right">Qty</th>
                  <th className="p-2   w-24">UOM</th>
                  <th className="p-2   w-32 text-right">Rate</th>
                  <th className="p-2   w-32 text-right">Amount</th>
                  <th className="p-2   w-16 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {formData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-2 ">
                      <SearchableSelect
                        options={itemOptions}
                        value={item.item_code}
                        onChange={(value) => handleItemChange(index, 'item_code', value)}
                        placeholder="Select Item"
                        className="text-sm"
                      />
                    </td>
                    <td className="p-2 ">
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0"
                        className="w-full p-2 text-right rounded border border-neutral-300 focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                      />
                    </td>
                    <td className="p-2 ">
                      <input
                        type="text"
                        value={item.uom}
                        readOnly
                        className="w-full p-2 rounded border border-neutral-200 bg-neutral-50 text-neutral-500 text-xs outline-none"
                      />
                    </td>
                    <td className="p-2 ">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full p-2 text-right rounded border border-neutral-300 focus:ring-1 focus:ring-primary-500 outline-none text-xs"
                      />
                    </td>
                    <td className="p-2  text-right font-medium text-neutral-900">
                      ₹{calculateLineAmount(item.qty, item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2  text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length === 1}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-2 bg-neutral-50/50 border-t border-neutral-100 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-xs    text-neutral-400 mb-1">Total Items</span>
              <span className="text-lg  text-neutral-800">{formData.items.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs    text-neutral-400 mb-1">Total Qty</span>
              <span className="text-lg  text-neutral-800">{getTotalQty().toLocaleString('en-IN')}</span>
            </div>
            <div className="flex flex-col md:items-end">
              <span className="text-xs    text-neutral-400 mb-1">Item Subtotal</span>
              <span className="text-lg  text-primary-600">
                ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Tax & Currency */}
          <section className="bg-white rounded  border border-neutral-200 ">
            <div className="bg-neutral-50 p-2  border-b border-neutral-200 flex items-center gap-2">
              <CreditCard size={15} className="text-primary-600" />
              <h3 className=" text-neutral-800">Tax & Currency</h3>
            </div>
            <div className="p-2 space-y-2">
              <div>
                <label className="block text-xs  text-neutral-700 mb-1.5">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded  border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-xs bg-white"
                >
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Tax Template</label>
                <select
                  name="tax_template_id"
                  value={formData.tax_template_id}
                  onChange={handleInputChange}
                  className="w-full p-2 rounded  border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-xs bg-white"
                >
                  <option value="">No Tax Template</option>
                  {taxTemplates.map(tax => (
                    <option key={tax.template_id} value={tax.template_id}>
                      {tax.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Financial Summary */}
          <section className="bg-primary-600 rounded  border border-primary-700  text-white flex flex-col justify-center p-2  shadow-primary-200">
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-primary-500/50 ">
                <span className="text-primary-100 text-sm">Subtotal</span>
                <span className="text-md ">
                  ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-primary-500/50 pb-3">
                <span className="text-primary-100 text-sm">Tax Amount</span>
                <span className="text-md ">₹0.00</span>
              </div>
              <div className="flex justify-between items-center ">
                <span className="text-primary-100 text-sm">Grand Total</span>
                <span className="text-xl ">
                  ₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className=" flex items-center gap-2 text-primary-100 text-xs bg-primary-700/50 p-2 rounded ">
              <Calendar size={14} />
              <span>Valid until {new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</span>
            </div>
          </section>
        </div>
      </form>
    </Modal>
  )
}
