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

  const subtotal = po.items?.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0) || 0
  const taxAmount = (subtotal * (po.tax_rate || 0)) / 100
  const total = subtotal + taxAmount

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 transition-colors duration-300 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Modern Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white dark:bg-neutral-900  ">
          <div className="flex items-center gap-4">
            <Button
              variant="icon"
              onClick={() => navigate('/buying/purchase-orders')}
              className="w-10 h-10 rounded  bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-neutral-200 dark:border-neutral-700 transition-all active:scale-95"
            >
              <ArrowLeft size={15} />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-[10px]  tracking-widest text-neutral-500 dark:text-neutral-400 ">
                <span>Buying</span>
                <ChevronRight size={12} />
                <span>Purchase Orders</span>
                <ChevronRight size={12} />
                <span className="text-indigo-600 dark:text-indigo-400">{po.po_no}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-xl  text-neutral-900 dark:text-white ">{po.po_no}</h1>
                <Badge color={getStatusColor(po.status)} variant="solid" className="flex items-center gap-1.5 px-2.5 py-1 text-[10px]  tracking-widest  rounded-lg">
                  {getStatusIcon(po.status)}
                  {po.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded  border border-neutral-200 dark:border-neutral-700 shadow-inner">
              <Button variant="ghost" size="sm" className="p-2.5 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => window.print()}>
                <Printer size={18} />
              </Button>
              <Button variant="ghost" size="sm" className="p-2.5 text-neutral-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                <Download size={18} />
              </Button>
            </div>
            
            <div className="h-8 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block"></div>
            
            {['submitted', 'to_receive', 'partially_received'].includes(po.status) && (
              <Button 
                variant="primary" 
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded  shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none text-[10px]  tracking-widest"
                onClick={() => setShowGRNModal(true)}
              >
                <Package size={18} strokeWidth={3} />
                RECEIVE MATERIAL
              </Button>
            )}
            {po.status === 'draft' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-6 py-3 rounded  hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all text-[10px]  tracking-widest "
                  onClick={() => navigate(`/buying/purchase-orders/${po_no}/edit`)}
                >
                  <Edit2 size={18} />
                  EDIT
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded  shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none text-[10px]  tracking-widest"
                  onClick={handleSubmit}
                  loading={actionLoading}
                >
                  <CheckCircle size={18} strokeWidth={3} />
                  SUBMIT ORDER
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Integrated Progress Stepper */}
        <div className="bg-white dark:bg-neutral-900 p-2 rounded border border-neutral-200 dark:border-neutral-800 hidden md:block">
          <div className="flex justify-between items-center max-full mx-auto relative">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-100 dark:bg-neutral-800 -translate-y-1/2 -z-0"></div>
            
            {[
              { status: 'draft', label: 'Draft', icon: Clock },
              { status: 'submitted', label: 'Submitted', icon: Send },
              { status: 'to_receive', label: 'Goods Arrival', icon: Truck },
              { status: 'completed', label: 'Fulfilled', icon: CheckCircle }
            ].map((step, idx) => {
              const isCompleted = po.status === step.status || 
                                 (step.status === 'draft') || 
                                 (step.status === 'submitted' && ['submitted', 'to_receive', 'partially_received', 'completed'].includes(po.status)) ||
                                 (step.status === 'to_receive' && ['to_receive', 'partially_received', 'completed'].includes(po.status)) ||
                                 (step.status === 'completed' && po.status === 'completed')
              
              const isActive = po.status === step.status
              
              return (
                <div key={idx} className="flex flex-col items-center gap-3 relative z-10 bg-white dark:bg-neutral-900 px-4">
                  <div className={`w-8 h-8 rounded flex items-center justify-center border-2 transition-all duration-500 ${
                    isActive ? 'bg-indigo-600 border-indigo-200 dark:border-indigo-500/50 text-white shadow-lg shadow-indigo-600/20 rotate-12' : 
                    isCompleted ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-500/50 text-white' : 
                    'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
                  }`}>
                    <step.icon size={15} strokeWidth={isActive ? 3 : 2} />
                  </div>
                  <span className={`text-[10px]  tracking-widest  ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progress Stepper for Mobile */}
        <div className="md:hidden">
          <Card className="p-4 bg-white dark:bg-neutral-900 overflow-hidden border border-neutral-200 dark:border-neutral-800 mt-3">
            <div className="relative flex justify-between items-start min-w-[500px] overflow-x-auto pb-2">
              <div className="absolute top-4 left-0 w-full h-0.5 bg-neutral-100 dark:bg-neutral-800"></div>
              {[
                { status: 'draft', label: 'Draft', icon: Clock },
                { status: 'submitted', label: 'Submitted', icon: Send },
                { status: 'to_receive', label: 'Arrival', icon: Truck },
                { status: 'completed', label: 'Done', icon: CheckCircle }
              ].map((step, idx) => {
                const isCompleted = po.status === step.status || 
                                   (step.status === 'draft') || 
                                   (step.status === 'submitted' && ['submitted', 'to_receive', 'partially_received', 'completed'].includes(po.status)) ||
                                   (step.status === 'to_receive' && ['to_receive', 'partially_received', 'completed'].includes(po.status)) ||
                                   (step.status === 'completed' && po.status === 'completed')
                const isActive = po.status === step.status
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 relative z-10 bg-white dark:bg-neutral-900 px-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive ? 'bg-indigo-600 border-indigo-200 dark:border-indigo-500/50 text-white' : 
                      isCompleted ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-500/50 text-white' : 
                      'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
                    }`}>
                      <step.icon size={14} />
                    </div>
                    <p className={`text-[8px]  tracking-widest  ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isCompleted ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}`}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* KPI Summary Grid - Full Width */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute -right-4 -top-4 p-3 text-neutral-500/10 dark:text-neutral-400/10 group-hover:scale-110 transition-transform duration-500">
              <Building2 size={84} />
            </div>
            <div className="p-2 relative z-10">
              <p className="text-xs text-neutral-400 dark:text-neutral-500  mb-2">Supplier</p>
              <h3 className="text-xl text-neutral-900 dark:text-white ">{po.supplier_name}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 w-fit p-1 rounded border border-indigo-100 dark:border-indigo-900/50 ">
                <MapPin size={12} />
                Ship to Main Warehouse
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute -right-4 -top-4 p-3 text-neutral-500/10 dark:text-neutral-400/10 group-hover:scale-110 transition-transform duration-500">
              <IndianRupee size={84} />
            </div>
            <div className="p-2 relative z-10">
              <p className="text-xs text-neutral-400 dark:text-neutral-500  mb-2">Total Value</p>
              <h3 className="text-xl  text-neutral-900 dark:text-white ">₹{total.toLocaleString('en-IN')}</h3>
              <p className="text-xs  text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-2 ">
                <CheckCircle size={12} /> INCL. ALL TAXES
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-lg transition-all duration-300 group">
            <div className="absolute -right-4 -top-4 p-3 text-neutral-500/10 dark:text-neutral-400/10 group-hover:scale-110 transition-transform duration-500">
              <Calendar size={84} />
            </div>
            <div className="p-2 relative z-10">
              <p className="text-xs text-neutral-400 dark:text-neutral-500  mb-2">Expected By</p>
              <h3 className="text-lg  text-neutral-900 dark:text-white ">
                {po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not Specified'}
              </h3>
              <div className={`mt-2 flex items-center gap-2 text-xs  w-fit p-1 rounded border  ${
                po.expected_date && (new Date(po.expected_date) - new Date()) < 0 
                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50'
              }`}>
                <Clock size={12} />
                {po.expected_date 
                  ? (new Date(po.expected_date) - new Date()) < 0 
                    ? 'OVERDUE' 
                    : `${Math.ceil((new Date(po.expected_date) - new Date()) / (1000 * 60 * 60 * 24))} Days Left` 
                  : 'TBD'}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Additional Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Card className="p-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-[10px]  text-neutral-900 dark:text-white flex items-center gap-2 ">
                    <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" /> Shipping Details
                  </h3>
                </div>
                <div className="p-2 space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 ">Address</span>
                    <span className="text-xs  text-neutral-900 dark:text-white text-right leading-relaxed max-w-[240px]">
                      {po.shipping_address_line1 || 'No address specified'}
                      {po.shipping_address_line2 ? `, ${po.shipping_address_line2}` : ''}
                      {po.shipping_city ? `, ${po.shipping_city}` : ''}
                      {po.shipping_state ? `, ${po.shipping_state}` : ''}
                      {po.shipping_pincode ? ` - ${po.shipping_pincode}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 ">Incoterm</span>
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[10px]  rounded-lg border border-indigo-100 dark:border-indigo-900/50 ">
                      {po.incoterm || 'EXW'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 ">Shipping Rule</span>
                    <span className="text-xs  text-neutral-900 dark:text-white ">{po.shipping_rule || 'Standard'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ">
                <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2 border-b border-neutral-200 dark:border-neutral-800">
                  <h3 className="text-[10px]  text-neutral-900 dark:text-white flex items-center gap-2 ">
                    <CreditCard size={16} className="text-indigo-600 dark:text-indigo-400" /> Payment & Others
                  </h3>
                </div>
                <div className="p-2 space-y-2">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 ">Tax Category</span>
                    <span className="px-3 py-1 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 text-[10px]  rounded-lg border border-sky-100 dark:border-sky-900/50 ">
                      {po.tax_category || 'GST'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 ">Currency</span>
                    <span className="text-xs  text-neutral-900 dark:text-white ">{po.currency || 'INR'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 ">Notes</span>
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 italic text-right max-w-[200px]">
                      {po.notes || 'No notes added'}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Items Table */}
            <Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-0 shadow-sm">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <h2 className="text-[10px]  text-neutral-900 dark:text-white flex items-center gap-2 ">
                  <Package size={18} className="text-indigo-600 dark:text-indigo-400" /> Items List
                </h2>
                <span className="text-[10px]  text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-lg ">
                  {po.items?.length || 0} ITEMS
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                      <th className="p-2 text-xs text-neutral-400 dark:text-neutral-500 ">Item</th>
                      <th className="p-2 text-xs text-neutral-400 dark:text-neutral-500  text-center">Quantity</th>
                      <th className="p-2 text-xs text-neutral-400 dark:text-neutral-500  text-center">Received</th>
                      <th className="p-2 text-xs text-neutral-400 dark:text-neutral-500  text-right">Rate</th>
                      <th className="p-2 text-xs text-neutral-400 dark:text-neutral-500  text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {po.items?.map((item, idx) => {
                      const received = item.received_qty || 0
                      const progress = Math.min(100, Math.round((received / item.qty) * 100))
                      
                      return (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                          <td className="p-2">
                            <div className="text-xs  text-neutral-900 dark:text-white  group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.item_code}</div>
                            <div className="text-xs text-neutral-400 dark:text-neutral-500  mt-0.5">{item.item_name}</div>
                          </td>
                          <td className="p-2 text-center">
                            <div className="inline-flex gap-1 items-center justify-center min-w-[80px] items-center p-2 rounded  bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                              <span className="text-xs  text-neutral-900 dark:text-white leading-none">{(item.qty || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              <span className="text-xs text-neutral-400 dark:text-neutral-500 ">{item.uom}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="max-w-[140px] mx-auto">
                              <div className="flex justify-between items-end mb-1.5">
                                <div className="flex flex-col">
                                  <span className={`text-[10px]  tracking-widest  ${received > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                    {(received || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {item.uom}
                                  </span>
                                </div>
                                <span className="text-[10px]  text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                                <div 
                                  className={`h-full transition-all duration-700 ease-out rounded-full ${
                                    progress === 100 ? 'bg-emerald-500' : 
                                    progress > 0 ? 'bg-indigo-600' : 'bg-neutral-200 dark:bg-neutral-700'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <span className="text-xs  text-neutral-600 dark:text-neutral-400">₹{(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </td>
                          <td className="p-2 text-right">
                            <span className="text-xs text-neutral-900 dark:text-white">₹{((item.qty || 0) * (item.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-neutral-50/50 dark:bg-neutral-800/30">
                    <tr className="border-t border-neutral-200 dark:border-neutral-800">
                      <td colSpan="4" className="p-2 text-right text-xs text-neutral-400 dark:text-neutral-500 ">Subtotal</td>
                      <td className="p-2 text-right text-xs text-neutral-900 dark:text-white">₹{(subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                    </tr>
                    {po.tax_rate > 0 && (
                      <tr className="border-t border-neutral-100 dark:border-neutral-800/50">
                        <td colSpan="4" className="p-2 text-right text-xs text-neutral-400 dark:text-neutral-500 ">Tax ({po.tax_rate}%)</td>
                        <td className="p-2 text-right text-sm  text-emerald-600 dark:text-emerald-400">+ ₹{(taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                      </tr>
                    )}
                    <tr className="bg-indigo-600 dark:bg-indigo-600/10 border-t-2 border-indigo-200 dark:border-indigo-500/30">
                      <td colSpan="4" className="p-2 text-right text-xs  text-white dark:text-indigo-400 ">Grand Total</td>
                      <td className="p-2 text-right text-xl  text-white dark:text-indigo-400 ">₹{(total || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column - Meta & Quick Actions */}
          <div className="space-y-6">
            <Card className="p-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 ">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-[10px]  text-neutral-900 dark:text-white flex items-center gap-2 ">
                  <Info size={18} className="text-indigo-600 dark:text-indigo-400" /> Document Info
                </h3>
              </div>
              <div className="p-2 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded  bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    <User size={15} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 ">Created By</p>
                    <p className="text-sm  text-neutral-900 dark:text-white">{po.created_by || 'System Administrator'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded  bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 ">Creation Date</p>
                    <p className="text-sm  text-neutral-900 dark:text-white">{new Date(po.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              <p className="text-xs text-neutral-400 dark:text-neutral-500  px-1">Quick Actions</p>
              <Button 
                variant="outline" 
                className="w-full justify-between gap-3 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all bg-white dark:bg-neutral-900 group rounded  p-2"
                onClick={() => navigate(`/inventory/suppliers?search=${po.supplier_name}`)}
              >
                <div className="flex items-center gap-3">
                  <User size={18} className="text-neutral-400 group-hover:text-indigo-500" />
                  <span className="text-xs  ">Supplier Profile</span>
                </div>
                <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between gap-3 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all bg-white dark:bg-neutral-900 group rounded  p-2"
                onClick={() => navigate(`/buying/purchase-receipts?search=${po.po_no}`)}
              >
                <div className="flex items-center gap-3">
                  <FileCheck size={18} className="text-neutral-400 group-hover:text-indigo-500" />
                  <span className="text-xs  ">Related GRNs</span>
                </div>
                <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-700" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between gap-3 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all bg-white dark:bg-neutral-900 group rounded  p-2"
                onClick={() => navigate(`/buying/purchase-invoices?search=${po.po_no}`)}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-neutral-400 group-hover:text-indigo-500" />
                  <span className="text-xs  ">Purchase Invoices</span>
                </div>
                <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-700" />
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
