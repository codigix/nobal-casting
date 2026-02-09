import React, { useState, useEffect } from 'react'
import api, { salesOrdersAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  X, User, Calendar, FileText, ShoppingCart, 
  Calculator, Tag, Truck, Info, Clock, 
  CheckCircle2, Package, IndianRupee
} from 'lucide-react'

export default function ViewSalesOrderModal({ isOpen, orderId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder()
    }
  }, [isOpen, orderId])

  const fetchOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await salesOrdersAPI.get(orderId)
      if (response.data.success) {
        setOrder(response.data.data)
      } else {
        setError(response.data.error || 'Failed to fetch order')
      }
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Error fetching order details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'warning'
      case 'confirmed': return 'blue'
      case 'ready_for_production': return 'blue'
      case 'production': return 'blue'
      case 'dispatched': return 'blue'
      case 'invoiced': return 'success'
      case 'complete': return 'success'
      case 'delivered': return 'success'
      case 'cancelled': return 'error'
      default: return 'gray'
    }
  }

  if (!order && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="View Sales Order" size="4xl">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading order details...</p>
        </div>
      </Modal>
    )
  }

  if (!order) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sales Order: ${order.sales_order_id}`} size="5xl">
      <div className="space-y-6">
        {error && <Alert type="error" message={error} />}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Details */}
          <div className="lg:w-1/3 space-y-4">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                  <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created On</div>
                  <div className="text-sm font-semibold text-slate-700">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</div>
                    <div className="text-sm font-bold text-slate-800">{order.customer_name || 'N/A'}</div>
                    <div className="text-xs text-slate-500">ID: {order.customer_id}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Date</div>
                    <div className="text-sm font-bold text-slate-800">
                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quotation ID</div>
                    <div className="text-sm font-bold text-slate-800">{order.quotation_id || 'Direct Order'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-5 rounded-xl shadow-lg shadow-blue-200 text-white">
              <div className="flex items-center gap-2 mb-4 opacity-90">
                <Calculator size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Financial Summary</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm opacity-80">
                  <span>Subtotal</span>
                  <span>₹{parseFloat(order.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Discount</span>
                    <span className="text-orange-200 font-medium">
                      -₹{parseFloat(order.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {order.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80 text-xs">Tax ({order.tax_rate}%)</span>
                    <span className="text-green-200 font-medium">
                      +₹{parseFloat(order.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-blue-500 mt-2 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-90">Grand Total</span>
                  <div className="text-2xl font-black">
                    ₹{parseFloat(order.total_value || order.order_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Items & Terms */}
          <div className="lg:w-2/3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-2  border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-tight">
                  <ShoppingCart size={18} className="text-blue-500" />
                  Order Items ({order.items?.length || 0})
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-left uppercase tracking-wider text-[10px]">Product / Spec</th>
                      <th className="px-6 py-3 font-semibold text-center uppercase tracking-wider text-[10px]">Qty</th>
                      <th className="px-6 py-3 font-semibold text-right uppercase tracking-wider text-[10px]">Rate</th>
                      <th className="px-6 py-3 font-semibold text-right uppercase tracking-wider text-[10px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items && order.items.length > 0 ? order.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-2 ">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.item_name || item.item_code}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.size && <Badge variant="gray" className="text-[9px] py-0 px-1.5">{item.size}</Badge>}
                            {item.color && <Badge variant="gray" className="text-[9px] py-0 px-1.5">{item.color}</Badge>}
                            {item.specifications && <span className="text-[10px] text-slate-400 italic">| {item.specifications}</span>}
                          </div>
                        </td>
                        <td className="p-2  text-center">
                          <span className="px-2 py-1 bg-slate-100 rounded-md font-bold text-slate-700">{item.qty}</span>
                        </td>
                        <td className="p-2  text-right font-medium text-slate-600">
                          ₹{parseFloat(item.rate || 0).toFixed(2)}
                        </td>
                        <td className="p-2  text-right font-bold text-blue-600">
                          ₹{(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">
                          No items found in this sales order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {order.order_terms && (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight mb-4">
                  <ClipboardList size={18} className="text-blue-500" />
                  Terms & Conditions
                </div>
                <div className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
                  {order.order_terms}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={onClose} icon={X}>
            Close View
          </Button>
        </div>
      </div>
    </Modal>
  )
}
