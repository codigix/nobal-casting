import React, { useState, useEffect } from 'react'
import api, { 
  salesOrdersAPI, 
  itemsAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, User, Calendar, FileText, 
  ShoppingCart, Calculator, Trash2, ClipboardList, 
  Info, CheckCircle2, RefreshCw
} from 'lucide-react'

export default function EditSalesOrderModal({ isOpen, orderId, onClose, onSuccess }) {
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
    if (isOpen && orderId) {
      initializeModal()
    }
  }, [isOpen, orderId])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await Promise.all([
        fetchOrder(),
        fetchItems()
      ])
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
    }
  }

  const fetchOrder = async () => {
    try {
      const response = await salesOrdersAPI.get(orderId)
      if (response.data.success) {
        const order = response.data.data
        setFormData({
          ...order,
          delivery_date: order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : '',
          total_value: order.order_amount || order.total_value || 0
        })
      }
    } catch (err) {
      console.error('Failed to fetch order:', err)
      throw err
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
    const subtotal = data.items.reduce((sum, item) => sum + (parseFloat(item.qty) * parseFloat(item.rate)), 0)
    
    let discountAmount = 0
    if (data.discount_type === 'percentage') {
      discountAmount = (subtotal * parseFloat(data.discount_value || 0)) / 100
    } else {
      discountAmount = parseFloat(data.discount_value || 0)
    }

    const afterDiscount = subtotal - discountAmount
    const taxAmount = (afterDiscount * parseFloat(data.tax_rate || 0)) / 100
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
      const response = await salesOrdersAPI.update(orderId, formData)
      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        setError(response.data.error || 'Failed to update sales order')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update sales order')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingData && !formData.customer_id) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Sales Order" size="5xl">
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Fetching order details...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Edit Sales Order: ${formData.sales_order_id}`} 
      size="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-1/3 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-200 pb-2 mb-2">
                <Info size={18} className="text-blue-500" />
                Order Context
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Customer
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg text-slate-600">
                    <User size={16} className="text-slate-400" />
                    <span className="text-sm font-medium">{formData.customer_name}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
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
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Order Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
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
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="text-xs p-1 bg-white border border-blue-200 rounded"
                  >
                    <option value="percentage">Disc %</option>
                    <option value="fixed">Disc ₹</option>
                  </select>
                  <input
                    type="number"
                    name="discount_value"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    className="text-xs p-1 bg-white border border-blue-200 rounded text-right"
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium text-xs">Tax Rate %</span>
                  <input
                    type="number"
                    name="tax_rate"
                    value={formData.tax_rate}
                    onChange={handleInputChange}
                    className="w-16 text-xs p-1 bg-white border border-blue-200 rounded text-right"
                  />
                </div>

                <div className="pt-3 border-t-2 border-blue-300 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900">Grand Total</span>
                  <span className="text-lg font-bold text-blue-600">₹{formData.total_value.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Area */}
          <div className="lg:w-2/3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShoppingCart size={18} className="text-blue-500" />
                  Order Items
                </div>
                <Badge variant="blue">{formData.items.length} Items</Badge>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Item</label>
                    <select
                      name="item_code"
                      value={newItem.item_code}
                      onChange={handleNewItemChange}
                      className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md outline-none"
                    >
                      <option value="">Select an Item</option>
                      {items.map(i => (
                        <option key={i.item_code} value={i.item_code}>{i.item_name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    name="qty"
                    placeholder="Qty"
                    value={newItem.qty}
                    onChange={handleNewItemChange}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md outline-none"
                  />
                  <Button
                    type="button"
                    variant={editingItemIndex !== null ? "warning" : "primary"}
                    onClick={addItem}
                    className="h-9"
                    icon={editingItemIndex !== null ? Edit : Plus}
                  >
                    {editingItemIndex !== null ? "Update" : "Add"}
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Item</th>
                        <th className="px-3 py-2 font-semibold text-center">Qty</th>
                        <th className="px-3 py-2 font-semibold text-right">Rate</th>
                        <th className="px-3 py-2 font-semibold text-right">Total</th>
                        <th className="px-3 py-2 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50 group">
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-900">{item.item_name}</div>
                            <div className="text-[10px] text-slate-400">{item.item_code}</div>
                          </td>
                          <td className="px-3 py-2 text-center">{item.qty}</td>
                          <td className="px-3 py-2 text-right">₹{parseFloat(item.rate).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">
                            ₹{(item.qty * item.rate).toFixed(2)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                              <button type="button" onClick={() => editItem(index)} className="p-1 text-slate-400 hover:text-blue-600"><Edit size={14} /></button>
                              <button type="button" onClick={() => removeItem(index)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-3">
                <ClipboardList size={18} className="text-blue-500" />
                Terms & Conditions
              </div>
              <textarea
                name="order_terms"
                value={formData.order_terms}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="success" 
            loading={loading}
            icon={CheckCircle2}
          >
            Update Sales Order
          </Button>
        </div>
      </form>
    </Modal>
  )
}
