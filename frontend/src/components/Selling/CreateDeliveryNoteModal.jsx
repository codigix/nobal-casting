import React, { useState, useEffect } from 'react'
import { salesOrdersAPI, deliveryNotesAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import { 
  Truck, Calendar, User, FileText, 
  Hash, ClipboardList, CheckCircle2, 
  Info, UserSquare, Navigation, ShoppingCart,
  Package, MapPin, Box
} from 'lucide-react'

export default function CreateDeliveryNoteModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [fetchingOrder, setFetchingOrder] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
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
    } else {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      sales_order_id: '',
      customer_name: '',
      delivery_date: new Date().toISOString().split('T')[0],
      total_qty: '',
      driver_name: '',
      vehicle_no: '',
      remarks: '',
      status: 'draft'
    })
    setSelectedOrder(null)
    setError(null)
  }

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

  const handleOrderChange = async (orderId) => {
    if (!orderId) {
      setSelectedOrder(null)
      setFormData(prev => ({ ...prev, sales_order_id: '', customer_name: '', total_qty: '' }))
      return
    }

    setFetchingOrder(true)
    try {
      const res = await salesOrdersAPI.get(orderId)
      if (res.data.success) {
        const order = res.data.data
        setSelectedOrder(order)
        setFormData(prev => ({
          ...prev,
          sales_order_id: orderId,
          customer_name: order?.customer_name || '',
          total_qty: order?.items?.reduce((sum, i) => sum + i.qty, 0) || ''
        }))
      }
    } catch (err) {
      console.error('Error fetching order details:', err)
      setError('Failed to fetch order details')
    } finally {
      setFetchingOrder(false)
    }
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
      size="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Pane: Source & Logistics */}
          <div className="lg:w-2/5 space-y-2">
            <div className="bg-slate-50 p-5 rounded  border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-800    border-b border-slate-200 pb-3">
                <FileText size={18} className="text-blue-500" />
                Execution Context
              </div>

              <div className="space-y-4">
                <SearchableSelect
                  label="Sales Order"
                  value={formData.sales_order_id}
                  onChange={handleOrderChange}
                  options={orders.map(o => ({
                    value: o.sales_order_id,
                    label: `${o.sales_order_id} - ${o.customer_name}`
                  }))}
                  placeholder="Select Sales Order"
                  required
                />

                <div>
                  <label className="block text-[10px]  text-slate-400   mb-1">
                    Customer Name
                  </label>
                  <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded  text-slate-600  ">
                    <User size={16} className="text-blue-500" />
                    <span className="text-sm font-semibold">{formData.customer_name || 'Select an order...'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px]  text-slate-400   mb-1">
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
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium  "
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px]  text-slate-400   mb-1">
                      Total Units
                    </label>
                    <div className="relative">
                      <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="number"
                        name="total_qty"
                        value={formData.total_qty}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm  text-blue-600  "
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded  border border-slate-200 space-y-4  ">
              <div className="flex items-center gap-2 text-slate-800    border-b border-slate-200 pb-3">
                <Truck size={18} className="text-blue-500" />
                Logistics & Dispatch
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px]  text-slate-400   mb-1">
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
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium  "
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px]  text-slate-400   mb-1">
                    Driver Details
                  </label>
                  <div className="relative">
                    <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      name="driver_name"
                      value={formData.driver_name}
                      onChange={handleInputChange}
                      placeholder="Enter driver name"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium  "
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Items & Remarks */}
          <div className="lg:w-3/5 space-y-2">
            <div className="bg-white border border-slate-200 rounded  overflow-hidden  ">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2  text-slate-800   text-sm">
                  <ShoppingCart size={18} className="text-blue-500" />
                  Order Items Preview
                </div>
                {selectedOrder && (
                  <Badge variant="blue">SO: {selectedOrder.sales_order_id}</Badge>
                )}
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 text-slate-500 sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="px-5 py-3 text-left   tracking-wider text-[10px]">Item</th>
                      <th className="px-5 py-3 text-center   tracking-wider text-[10px]">Ordered Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fetchingOrder ? (
                      <tr>
                        <td colSpan="2" className="px-5 py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-400">Fetching items...</span>
                          </div>
                        </td>
                      </tr>
                    ) : selectedOrder?.items?.length > 0 ? (
                      selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className=" text-slate-900">{item.item_name || item.item_code}</div>
                            {item.specifications && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5">{item.specifications}</div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded ">{item.qty}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="px-5 py-10 text-center text-slate-400 italic">
                          {formData.sales_order_id ? 'No items found in order.' : 'Select a sales order to view items.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[10px]  text-slate-400  ">
                <ClipboardList size={14} className="text-blue-500" />
                Special Instructions & Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows="4"
                placeholder="Enter any specific instructions for delivery, unloading, or logistics..."
                className="w-full p-2  border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm   resize-none bg-slate-50/30"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded  p-4 flex gap-3">
              <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Creating this delivery note will mark the items as <strong>In-Transit</strong> and ready for invoicing. Ensure vehicle and driver details are correct for gate pass generation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            Generate Dispatch Note
          </Button>
        </div>
      </form>
    </Modal>
  )
}

