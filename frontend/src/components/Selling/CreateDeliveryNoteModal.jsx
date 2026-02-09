import React, { useState, useEffect } from 'react'
import { salesOrdersAPI, deliveryNotesAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Truck, Calendar, User, FileText, 
  Hash, ClipboardList, CheckCircle2, 
  Info, UserSquare, Navigation
} from 'lucide-react'

export default function CreateDeliveryNoteModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [formData, setFormData] = useState({
    sales_order_id: '',
    customer_name: '',
    delivery_date: new Date().toISOString().split('T')[0],
    total_qty: '',
    driver_name: '',
    vehicle_no: '',
    remarks: '',
    status: 'draft'
  })

  useEffect(() => {
    if (isOpen) {
      fetchSalesOrders()
    }
  }, [isOpen])

  const fetchSalesOrders = async () => {
    try {
      const res = await salesOrdersAPI.list()
      if (res.data.success) {
        setOrders(res.data.data?.filter(o => o.status === 'confirmed' || o.status === 'draft') || [])
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleOrderChange = (e) => {
    const orderId = e.target.value
    const order = orders.find(o => String(o.sales_order_id) === String(orderId))
    setFormData(prev => ({
      ...prev,
      sales_order_id: orderId,
      customer_name: order?.customer_name || '',
      total_qty: order?.total_qty || order?.items?.reduce((sum, i) => sum + i.qty, 0) || ''
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.sales_order_id || !formData.delivery_date || !formData.total_qty) {
        throw new Error('Please fill in all required fields')
      }

      const res = await deliveryNotesAPI.create(formData)
      if (res.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(res.data.error || 'Failed to create delivery note')
      }
    } catch (err) {
      setError(err.message || 'Failed to create delivery note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create Delivery Note" 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order & Customer Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <FileText size={18} className="text-blue-500" />
              Source Information
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Sales Order *
                </label>
                <select
                  name="sales_order_id"
                  value={formData.sales_order_id}
                  onChange={handleOrderChange}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                >
                  <option value="">Select Sales Order</option>
                  {orders.map(o => (
                    <option key={o.sales_order_id} value={o.sales_order_id}>
                      {o.sales_order_id} - {o.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                  <User size={16} className="text-slate-400" />
                  <span className="text-sm font-medium">{formData.customer_name || 'Select an order first'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Total Quantity to Dispatch *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="number"
                    name="total_qty"
                    value={formData.total_qty}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder="Enter total units"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logistics & Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <Truck size={18} className="text-blue-500" />
              Logistics & Schedule
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Delivery Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Driver Name
                </label>
                <div className="relative">
                  <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleInputChange}
                    placeholder="Enter driver name"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Vehicle Number
                </label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    name="vehicle_no"
                    value={formData.vehicle_no}
                    onChange={handleInputChange}
                    placeholder="e.g. MH-12-AB-1234"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Remarks & Special Instructions
            </label>
            <div className="relative">
              <ClipboardList className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows="3"
                placeholder="Additional details about the delivery..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
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
            Create Delivery Note
          </Button>
        </div>
      </form>
    </Modal>
  )
}
