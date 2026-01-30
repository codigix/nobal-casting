import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import api from '../../services/api'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'
import { useToast } from '../../components/ToastContainer'
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, Package, User, ChevronRight, 
  Truck, FileCheck, IndianRupee, Send, Printer, Download, Edit2, 
  Calendar, Building2, MapPin, CreditCard, Info
} from 'lucide-react'
import './Buying.css'

export default function PurchaseOrderDetail() {
  const { po_no } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [po, setPo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showGRNModal, setShowGRNModal] = useState(false)

  useEffect(() => {
    if (po_no) {
      fetchPO()
    }
  }, [po_no])

  const fetchPO = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/purchase-orders/${po_no}`)
      if (res.data.success) {
        setPo(res.data.data)
      } else {
        setError(res.data.error || 'Failed to fetch Purchase Order')
      }
    } catch (error) {
      console.error('Error fetching PO:', error)
      setError('Error fetching purchase order details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit this Purchase Order?')) return
    
    setActionLoading(true)
    try {
      const res = await api.post(`/purchase-orders/${po_no}/submit`)
      if (res.data.success) {
        toast.addToast('Purchase Order submitted successfully', 'success')
        fetchPO()
      } else {
        toast.addToast(res.data.error || 'Failed to submit PO', 'error')
      }
    } catch (error) {
      toast.addToast('Error submitting purchase order', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',
      submitted: 'info',
      to_receive: 'info',
      partially_received: 'warning',
      completed: 'success',
      cancelled: 'danger'
    }
    return colors[status] || 'secondary'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <Clock size={16} />
      case 'submitted': return <Send size={16} />
      case 'to_receive': return <Truck size={16} />
      case 'partially_received': return <Info size={16} />
      case 'completed': return <CheckCircle size={16} />
      case 'cancelled': return <XCircle size={16} />
      default: return null
    }
  }

  if (loading && !po) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">Loading PO details...</p>
        </div>
      </div>
    )
  }

  if (error && !po) {
    return (
      <div className="p-4">
        <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
            <XCircle size={24} />
            <h2 className="text-lg ">{error}</h2>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate('/buying/purchase-orders')}>
            Back to List
          </Button>
        </Card>
      </div>
    )
  }

  if (!po) return null

  const subtotal = po.items?.reduce((sum, item) => sum + (item.qty * item.rate), 0) || 0
  const taxAmount = (subtotal * (po.tax_rate || 0)) / 100
  const total = subtotal + taxAmount

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="icon"
              onClick={() => navigate('/buying/purchase-orders')}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>Buying</span>
                <ChevronRight size={14} />
                <span>Purchase Orders</span>
                <ChevronRight size={14} />
                <span className="font-semibold text-indigo-600">{po.po_no}</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{po.po_no}</h1>
                <Badge color={getStatusColor(po.status)} variant="solid" className="flex items-center gap-2 px-3 py-1 text-xs uppercase tracking-wider">
                  {getStatusIcon(po.status)}
                  {po.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => window.print()}>
              <Printer size={16} /> Print
            </Button>
            <Button variant="ghost" className="gap-2">
              <Download size={16} /> PDF
            </Button>
            {['submitted', 'to_receive', 'partially_received'].includes(po.status) && (
              <Button 
                variant="primary" 
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setShowGRNModal(true)}
              >
                <Download size={16} /> Receive Material
              </Button>
            )}
            {po.status === 'draft' && (
              <>
                <Button 
                  variant="ghost" 
                  className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => navigate(`/buying/purchase-orders/${po_no}/edit`)}
                >
                  <Edit2 size={16} /> Edit
                </Button>
                <Button 
                  variant="primary" 
                  className="gap-2"
                  onClick={handleSubmit}
                  loading={actionLoading}
                >
                  <CheckCircle size={16} /> Submit Order
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-indigo-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</p>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{po.supplier_name}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Amount</p>
                    <p className="text-sm font-bold text-slate-900">₹{total.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Expected Date</p>
                    <p className="text-sm font-bold text-slate-900">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Items Table */}
            <Card className="overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package size={18} className="text-indigo-600" /> Items List
                </h2>
                <Badge color="info" variant="solid" className="text-xs">
                  {po.items?.length || 0} ITEMS
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px]">Item</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-center">Quantity</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-center">Received</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Rate</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {po.items?.map((item, idx) => {
                      const received = item.received_qty || 0
                      const progress = Math.min(100, Math.round((received / item.qty) * 100))
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{item.item_code}</div>
                            <div className="text-xs text-slate-500">{item.item_name}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-100">
                              {item.qty} {item.uom}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className=".5 max-w-[120px] mx-auto">
                              <div className="flex justify-between text-xs font-bold">
                                <span className={received > 0 ? 'text-indigo-600' : 'text-slate-400'}>
                                  {received} {item.uom}
                                </span>
                                <span className="text-slate-400">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    progress === 100 ? 'bg-emerald-500' : 
                                    progress > 0 ? 'bg-indigo-500' : 'bg-slate-200'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-700">
                            ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900">
                            ₹{(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50/50">
                    <tr>
                      <td colSpan="4" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Subtotal</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    {po.tax_rate > 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Tax ({po.tax_rate}%)</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-900 text-amber-600">+ ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-slate-200">
                      <td colSpan="4" className="px-6 py-4 text-right text-sm font-bold text-indigo-600 uppercase tracking-wider">Grand Total</td>
                      <td className="px-6 py-4 text-right font-black text-lg text-indigo-600">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-0 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <MapPin size={14} className="text-indigo-600" /> Shipping Details
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-50 pb-2">
                    <span className="text-xs font-medium text-slate-500">Address</span>
                    <span className="text-xs font-bold text-slate-900 text-right max-w-[200px]">
                      {po.shipping_address_line1 || 'No address specified'}
                      {po.shipping_address_line2 ? `, ${po.shipping_address_line2}` : ''}
                      {po.shipping_city ? `, ${po.shipping_city}` : ''}
                      {po.shipping_state ? `, ${po.shipping_state}` : ''}
                      {po.shipping_pincode ? ` - ${po.shipping_pincode}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-xs font-medium text-slate-500">Incoterm</span>
                    <Badge color="info" className="text-xs">{po.incoterm || 'N/A'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Shipping Rule</span>
                    <span className="text-xs font-bold text-slate-900">{po.shipping_rule || 'Standard'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard size={14} className="text-indigo-600" /> Payment & Others
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-xs font-medium text-slate-500">Tax Category</span>
                    <Badge color="warning" className="text-xs">{po.tax_category || 'GST'}</Badge>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-xs font-medium text-slate-500">Currency</span>
                    <span className="text-xs font-bold text-slate-900">{po.currency || 'INR'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-medium text-slate-500">Notes</span>
                    <span className="text-xs text-slate-600 text-right italic max-w-[200px]">{po.notes || 'No notes added'}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right Column - Workflow & Meta */}
          <div className="space-y-6">
            <Card className="p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck size={18} /> Order Status
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-6 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                  
                  {[
                    { status: 'draft', label: 'Draft Created', date: po.created_at, icon: Clock, color: 'amber' },
                    { status: 'submitted', label: 'Order Submitted', date: po.updated_at, icon: Send, color: 'blue' },
                    { status: 'to_receive', label: 'Goods Arrival', icon: Truck, color: 'indigo' },
                    { status: 'completed', label: 'PO Fulfilled', icon: CheckCircle, color: 'emerald' }
                  ].map((step, idx) => {
                    const isCompleted = po.status === step.status || 
                                       (step.status === 'draft') || 
                                       (step.status === 'submitted' && ['submitted', 'to_receive', 'partially_received', 'completed'].includes(po.status)) ||
                                       (step.status === 'to_receive' && ['to_receive', 'partially_received', 'completed'].includes(po.status)) ||
                                       (step.status === 'completed' && po.status === 'completed')
                    
                    const isActive = po.status === step.status
                    
                    return (
                      <div key={idx} className="flex gap-4 relative z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                          isActive ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100 text-white' : 
                          isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                          'bg-white border-slate-200 text-slate-300'
                        }`}>
                          <step.icon size={12} />
                        </div>
                        <div>
                          <p className={`text-xs font-bold ${isActive ? 'text-indigo-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          {isCompleted && step.date && (
                            <p className="text-xs text-slate-500">{new Date(step.date).toLocaleString()}</p>
                          )}
                          {isActive && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-bold animate-pulse">
                              CURRENT STATUS
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-indigo-50 border-indigo-100">
              <div className="flex items-center gap-3 text-indigo-700">
                <User size={20} className="opacity-50" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70">Created By</p>
                  <p className="text-xs font-bold">{po.created_by || 'System Administrator'}</p>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 border-slate-200 text-slate-700 hover:bg-slate-50">
                <Info size={16} /> View Supplier Profile
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 border-slate-200 text-slate-700 hover:bg-slate-50"
                onClick={() => navigate(`/buying/purchase-receipts?search=${po.po_no}`)}
              >
                <FileCheck size={16} /> View Related GRNs
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <CreateGRNModal
        isOpen={showGRNModal}
        onClose={() => setShowGRNModal(false)}
        onSuccess={fetchPO}
        initialPoNo={po.po_no}
      />
    </div>
  )
}
