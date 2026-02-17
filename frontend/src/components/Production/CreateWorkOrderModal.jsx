import React, { useState, useEffect } from 'react'
import api, { 
  workOrdersAPI, 
  itemsAPI, 
  salesOrdersAPI,
  bomAPI
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Package, Calendar, FileText, 
  Hash, ClipboardList, CheckCircle2, 
  Info, AlertCircle, Layers, 
  TrendingUp, Clock, ShoppingBag
} from 'lucide-react'

export default function CreateWorkOrderModal({ isOpen, onClose, onSuccess, bom }) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [salesOrders, setSalesOrders] = useState([])
  const [boms, setBoms] = useState([])

  const [formData, setFormData] = useState({
    sales_order_id: '',
    item_code: '',
    bom_no: '',
    quantity: '',
    unit_cost: '',
    required_date: '',
    priority: 'medium',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && bom) {
      setFormData(prev => ({
        ...prev,
        item_code: bom.item_code || '',
        bom_no: bom.bom_id || '',
        quantity: bom.quantity || ''
      }))
    }
  }, [isOpen, bom])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await Promise.all([
        fetchItems(),
        fetchSalesOrders(),
        fetchBOMs()
      ])
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
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

  const fetchSalesOrders = async () => {
    try {
      const response = await salesOrdersAPI.list()
      setSalesOrders(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch sales orders:', err)
    }
  }

  const fetchBOMs = async () => {
    try {
      const response = await bomAPI.list()
      setBoms(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch BOMs:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.item_code || !formData.quantity || !formData.required_date) {
        throw new Error('Please fill in all required fields')
      }

      const response = await workOrdersAPI.create(formData)
      if (response.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(response.data.error || 'Failed to create work order')
      }
    } catch (err) {
      setError(err.message || 'Failed to create work order')
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'gray'
      case 'medium': return 'blue'
      case 'high': return 'warning'
      case 'critical': return 'error'
      default: return 'gray'
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create Production Work Order" 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Context Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800    border-b border-slate-100 pb-2">
              <Layers size={18} className="text-amber-500" />
              Production Target
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Item to Produce *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    name="item_code"
                    value={formData.item_code}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                  >
                    <option value="">Select Item</option>
                    {items.map(item => (
                      <option key={item.item_code} value={item.item_code}>
                        {item.item_name} ({item.item_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Bill of Materials (BOM)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    name="bom_no"
                    value={formData.bom_no}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                  >
                    <option value="">Select BOM (Optional)</option>
                    {boms.filter(b => b.item_code === formData.item_code).map(bom => (
                      <option key={bom.bom_id} value={bom.bom_id}>
                        {bom.bom_name || bom.bom_id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Qty to Manufacture *
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Planned Unit Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm ">₹</span>
                    <input
                      type="number"
                      name="unit_cost"
                      value={formData.unit_cost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduling Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800    border-b border-slate-100 pb-2">
              <Calendar size={18} className="text-blue-500" />
              Scheduling & Links
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Sales Order Reference
                </label>
                <div className="relative">
                  <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    name="sales_order_id"
                    value={formData.sales_order_id}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                  >
                    <option value="">Direct Production (No SO)</option>
                    {salesOrders.map(so => (
                      <option key={so.sales_order_id} value={so.sales_order_id}>
                        {so.sales_order_id} - {so.customer_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Required By Date *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    name="required_date"
                    value={formData.required_date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Priority Level
                </label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded  border border-slate-200">
                  {['low', 'medium', 'high', 'critical'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 py-1.5 text-[10px]   rounded-md transition-all ${
                        formData.priority === p 
                          ? 'bg-white text-slate-900   ring-1 ring-slate-200' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Detailed Instructions */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs  text-slate-500  tracking-wider mb-1">
              Production Notes & Instructions
            </label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Special manufacturing instructions, quality checkpoints, or packaging requirements..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            className="bg-amber-600 hover:bg-amber-700 border-amber-600"
            loading={loading}
            icon={CheckCircle2}
          >
            Issue Work Order
          </Button>
        </div>
      </form>
    </Modal>
  )
}
