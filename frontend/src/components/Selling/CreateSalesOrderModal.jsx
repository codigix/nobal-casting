import React, { useState, useEffect } from 'react'
import api, { 
  customersAPI, 
  salesOrdersAPI, 
  itemsAPI, 
  taxTemplatesAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, User, Calendar, FileText, 
  Package, Trash2, ShoppingCart, Calculator,
  Tag, Truck, ClipboardList, Info, CheckCircle2
} from 'lucide-react'

export default function CreateSalesOrderModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    delivery_date: '',
    quotation_id: '',
    items: [],
    subtotal: 0,
    discount_type: 'percentage',
    discount_value: 0,
    discount_amount: 0,
    tax_rate: 0,
    tax_amount: 0,
    total_value: 0,
    order_terms: '',
    status: 'draft'
  })

  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  
  const [newItem, setNewItem] = useState({ 
    item_code: '', 
    item_name: '', 
    qty: 1, 
    rate: 0,
    size: '',
    color: '',
    specifications: '',
    special_requirements: ''
  })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await Promise.all([
        fetchCustomers(),
        fetchItems()
      ])
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await customersAPI.list()
      setCustomers(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.list()
      setItems(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'discount_type' || name === 'discount_value' || name === 'tax_rate') {
        return calculateTotals(updated)
      }
      return updated
    })
    setError(null)
  }

  const handleCustomerChange = (e) => {
    const customerId = e.target.value
    const customer = customers.find(c => String(c.customer_id) === String(customerId))
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.customer_name || ''
    }))
    setError(null)
  }

  const handleNewItemChange = (e) => {
    const { name, value } = e.target
    if (name === 'item_code') {
      const item = items.find(i => i.item_code === value)
      setNewItem(prev => ({
        ...prev,
        item_code: value,
        item_name: item?.item_name || '',
        rate: item?.valuation_rate || prev.rate
      }))
    } else {
      setNewItem(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const addItem = () => {
    if (!newItem.item_code || newItem.qty <= 0) {
      setError('Please select an item and enter quantity')
      return
    }

    setFormData(prev => {
      let updatedItems
      if (editingItemIndex !== null) {
        updatedItems = [...prev.items]
        updatedItems[editingItemIndex] = newItem
      } else {
        updatedItems = [...prev.items, newItem]
      }
      
      const updated = { ...prev, items: updatedItems }
      return calculateTotals(updated)
    })

    setNewItem({ 
      item_code: '', 
      item_name: '', 
      qty: 1, 
      rate: 0,
      size: '',
      color: '',
      specifications: '',
      special_requirements: ''
    })
    setEditingItemIndex(null)
    setError(null)
  }

  const removeItem = (index) => {
    setFormData(prev => {
      const updatedItems = prev.items.filter((_, i) => i !== index)
      const updated = { ...prev, items: updatedItems }
      return calculateTotals(updated)
    })
  }

  const editItem = (index) => {
    setNewItem(formData.items[index])
    setEditingItemIndex(index)
  }

  const calculateTotals = (data) => {
    const subtotal = data.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
    
    let discountAmount = 0
    if (data.discount_type === 'percentage') {
      discountAmount = (subtotal * data.discount_value) / 100
    } else {
      discountAmount = parseFloat(data.discount_value) || 0
    }

    const afterDiscount = subtotal - discountAmount
    const taxAmount = (afterDiscount * data.tax_rate) / 100
    const totalValue = afterDiscount + taxAmount

    return {
      ...data,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_value: totalValue
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      setError('Please add at least one item')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await salesOrdersAPI.create(formData)
      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(response.data.error || 'Failed to create sales order')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sales order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create Sales Order" 
      size="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Context & Configuration */}
          <div className="lg:w-1/3 space-y-4">
            <div className="bg-slate-50 p-4 rounded  border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-200 pb-2 mb-2">
                <Info size={18} className="text-blue-500" />
                Order Context
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Customer
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleCustomerChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c.customer_id} value={c.customer_id}>{c.customer_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Delivery Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="date"
                      name="delivery_date"
                      value={formData.delivery_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Quotation ID (Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="quotation_id"
                      value={formData.quotation_id}
                      onChange={handleInputChange}
                      placeholder="QTN-2024-001"
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded  border border-blue-100">
              <div className="flex items-center gap-2 text-blue-800 font-semibold mb-3">
                <Calculator size={18} />
                Financial Summary
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900">₹{formData.subtotal.toFixed(2)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      name="discount_type"
                      value={formData.discount_type}
                      onChange={handleInputChange}
                      className="w-full text-xs p-1 bg-white border border-blue-200 rounded"
                    >
                      <option value="percentage">Disc %</option>
                      <option value="fixed">Disc ₹</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    className="w-full text-xs p-1 bg-white border border-blue-200 rounded text-right"
                    placeholder="Value"
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Discount Amt</span>
                  <span className="font-medium text-red-600">-₹{formData.discount_amount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-xs  text-slate-500 ">Tax Rate %</span>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleInputChange}
                    className="w-16 text-xs p-1 bg-white border border-blue-200 rounded text-right"
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax Amount</span>
                  <span className="font-medium text-green-600">+₹{formData.tax_amount.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t-2 border-blue-300 flex justify-between items-center">
                  <span className="text-sm  text-slate-900">Grand Total</span>
                  <span className="text-lg  text-blue-600">₹{formData.total_value.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Area - Items and Terms */}
          <div className="lg:w-2/3 space-y-2">
            <div className="bg-white border border-slate-200 rounded  overflow-hidden  ">
              <div className="bg-slate-50 p-2  border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShoppingCart size={18} className="text-blue-500" />
                  Order Items
                </div>
                <Badge variant="blue">{formData.items.length} Items</Badge>
              </div>

              <div className="p-4">
                {/* Item Entry Form */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 bg-slate-50 p-3 rounded  border border-slate-100">
                  <div className="md:col-span-2">
                    <label className="block text-[10px]  text-slate-400  mb-1">Select Item</label>
                    <select
                      name="item_code"
                      value={newItem.item_code}
                      onChange={handleNewItemChange}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select an Item</option>
                      {items.map(i => (
                        <option key={i.item_code} value={i.item_code}>{i.item_name} ({i.item_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px]  text-slate-400  mb-1">Quantity</label>
                    <input
                      type="number"
                      name="qty"
                      value={newItem.qty}
                      onChange={handleNewItemChange}
                      min="1"
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px]  text-slate-400  mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      name="rate"
                      value={newItem.rate}
                      onChange={handleNewItemChange}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="md:col-span-1">
                    <label className="block text-[10px]  text-slate-400  mb-1">Size/Color</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="size"
                        placeholder="Size"
                        value={newItem.size}
                        onChange={handleNewItemChange}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                      />
                      <input
                        type="text"
                        name="color"
                        placeholder="Color"
                        value={newItem.color}
                        onChange={handleNewItemChange}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 text-right flex items-end justify-end">
                    <Button
                      type="button"
                      variant={editingItemIndex !== null ? "warning" : "primary"}
                      onClick={addItem}
                      className="w-full md:w-auto h-9"
                      icon={editingItemIndex !== null ? Edit : Plus}
                    >
                      {editingItemIndex !== null ? "Update" : "Add Item"}
                    </Button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Item</th>
                        <th className="px-3 py-2 font-semibold text-center">Qty</th>
                        <th className="px-3 py-2 font-semibold text-right">Rate</th>
                        <th className="px-3 py-2 font-semibold text-right">Amount</th>
                        <th className="px-3 py-2 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-3 py-8 text-center text-slate-400 italic text-xs">
                            No items added to this sales order yet.
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50 group transition-colors">
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-900">{item.item_name}</div>
                              <div className="text-[10px] text-slate-500 flex gap-2">
                                <span>{item.item_code}</span>
                                {item.size && <span>• Size: {item.size}</span>}
                                {item.color && <span>• Color: {item.color}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center font-medium">{item.qty}</td>
                            <td className="px-3 py-2 text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-blue-600">
                              ₹{(item.qty * item.rate).toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-center gap-1  transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => editItem(index)}
                                  className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded  border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-3">
                <ClipboardList size={18} className="text-blue-500" />
                Terms & Conditions
              </div>
              <textarea
                name="order_terms"
                value={formData.order_terms}
                onChange={handleInputChange}
                rows="4"
                placeholder="Specify payment terms, delivery conditions, or any special instructions..."
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              />
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
            Create Sales Order
          </Button>
        </div>
      </form>
    </Modal>
  )
}
