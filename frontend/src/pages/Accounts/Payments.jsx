import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import { 
  Plus, Eye, CheckCircle, RefreshCw, 
  IndianRupee, Clock, AlertCircle, XCircle,
  LayoutGrid, List, ChevronRight, History, Building2,
  Calendar, ArrowUpRight, Filter, TrendingUp, CreditCard,
  UserCheck, Truck, ArrowLeftRight, Search
} from 'lucide-react'
import CreatePaymentModal from '../../components/Accounts/CreatePaymentModal'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }) => {
  const colorMap = {
    primary: 'indigo',
    success: 'emerald',
    warning: 'amber',
    danger: 'rose',
    info: 'sky',
    rose: 'rose'
  }
  const theme = colorMap[color] || 'indigo'
  
  return (
    <div
      onClick={onClick}
      className={`bg-white p-2 rounded border transition-all duration-300 group cursor-pointer ${
        isActive 
          ? `border-${theme}-500   ring-1 ring-${theme}-500` 
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2.5 bg-neutral-50 rounded  border border-neutral-100 text-neutral-400 group-hover:text-${theme}-600 group-hover:border-${theme}-100 transition-colors`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-xl  text-neutral-900  leading-none mb-2 ">{value}</p>
        <p className="text-[10px]  text-neutral-400  ">{label}</p>
      </div>
    </div>
  )
}

export default function Payments() {
  const location = useLocation()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('customer') // 'customer' or 'vendor'
  const [payments, setPayments] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [preFilledData, setPreFilledData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    if (location.state) {
      const { type, party_id, order_id, amount, reference } = location.state
      setActiveTab(type || 'vendor')
      setPreFilledData({
        party_id,
        order_id,
        amount,
        notes: reference ? `Payment for Invoice: ${reference}` : ''
      })
      setShowCreateModal(true)
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    fetchPayments()
  }, [activeTab])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'customer' ? '/finance/customer-payments' : '/finance/vendor-payments'
      const response = await api.get(endpoint)
      setPayments(response.data.data || [])
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.addToast('Error fetching payments', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPayment = async (paymentId) => {
    try {
      const endpoint = activeTab === 'customer' 
        ? `/finance/customer-payments/${paymentId}/status` 
        : `/finance/vendor-payments/${paymentId}/status`
      
      const status = activeTab === 'customer' ? 'received' : 'paid'
      
      await api.put(endpoint, { status })
      toast.addToast('Payment submitted and ledger updated', 'success')
      fetchPayments()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to submit payment', 'error')
    }
  }

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const searchStr = searchQuery.toLowerCase()
      const partyName = activeTab === 'customer' ? p.customer_name : p.vendor_name
      const orderId = activeTab === 'customer' ? p.sales_order_id : p.purchase_order_id
      
      return (
        p.payment_id?.toLowerCase().includes(searchStr) ||
        partyName?.toLowerCase().includes(searchStr) ||
        orderId?.toLowerCase().includes(searchStr) ||
        p.payment_reference?.toLowerCase().includes(searchStr)
      )
    })
  }, [payments, searchQuery, activeTab])

  const stats = useMemo(() => {
    const total_count = payments.length
    const pending = payments.filter(p => p.status === 'pending').length
    const completed = payments.filter(p => p.status === 'received' || p.status === 'paid').length
    const total_amount = payments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0)

    return { total_count, pending, completed, total_amount }
  }, [payments])

  const columns = [
    { 
      key: 'payment_id', 
      label: 'ID', 
      width: '15%',
      render: (val) => <span className="  text-indigo-600">{val}</span>
    },
    { 
      key: activeTab === 'customer' ? 'customer_name' : 'vendor_name', 
      label: activeTab === 'customer' ? 'Customer' : 'Vendor', 
      width: '20%',
      render: (val) => <span className="  text-neutral-900">{val || 'N/A'}</span>
    },
    { 
      key: 'payment_date', 
      label: 'Date', 
      width: '12%',
      render: (val) => (
        <div className="flex items-center gap-2 text-neutral-400  ">
          <Calendar size={14} strokeWidth={3} />
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    { 
      key: activeTab === 'customer' ? 'sales_order_id' : 'purchase_order_id', 
      label: 'Reference Order', 
      width: '15%',
      render: (val) => val ? (
        <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200   rounded ">
          {val}
        </Badge>
      ) : 'Direct Payment'
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      width: '15%',
      render: (val) => (
        <span className="  text-neutral-900">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (val) => {
        const isCompleted = val === 'received' || val === 'paid'
        return (
          <Badge className={`${
            isCompleted 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }   rounded  px-3 py-1.5`}>
            {val.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '10%',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && (
            <Button
              size="sm"
              variant="icon"
              onClick={() => handleSubmitPayment(row.payment_id)}
              className="h-8 w-8 rounded  bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
              title="Submit & Post to Ledger"
            >
              <CheckCircle size={14} strokeWidth={3} />
            </Button>
          )}
          <Button
            size="sm"
            variant="icon"
            className="h-8 w-8 rounded  border-neutral-200 text-neutral-400 hover:text-indigo-600 hover:border-indigo-200"
            title="View Details"
          >
            <Eye size={14} strokeWidth={3} />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className=" mx-auto p-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px]   text-neutral-400 ">
                <Building2 size={12} strokeWidth={3} className="text-indigo-500" />
                <span>Accounts</span>
                <ChevronRight size={10} strokeWidth={3} />
                <span className="text-neutral-900">Payments & Receipts</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded ">
                  <CreditCard size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    {activeTab === 'customer' ? 'Customer Receipts' : 'Vendor Payments'}
                  </h1>
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px]   mt-1">
                    <History size={12} strokeWidth={3} className="text-indigo-500" />
                    <span>Last Refreshed {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-neutral-100 p-1 rounded  border border-neutral-200 flex items-center">
                <button
                  onClick={() => setActiveTab('customer')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded  text-[10px]   transition-all ${
                    activeTab === 'customer' 
                      ? 'bg-white text-indigo-600   border border-neutral-200' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <UserCheck size={14} strokeWidth={3} />
                  <span>RECEIPTS</span>
                </button>
                <button
                  onClick={() => setActiveTab('vendor')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded  text-[10px]   transition-all ${
                    activeTab === 'vendor' 
                      ? 'bg-white text-rose-600   border border-neutral-200' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Truck size={14} strokeWidth={3} />
                  <span>PAYMENTS</span>
                </button>
              </div>

              <div className="h-8 w-[1px] bg-neutral-200 mx-2 hidden lg:block" />

              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 p-2  rounded  bg-neutral-900 text-white hover:bg-neutral-800 text-[10px]   transition-all"
              >
                <Plus size={16} strokeWidth={3} />
                RECORD PAYMENT
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={`TOTAL ${activeTab === 'customer' ? 'RECEIPTS' : 'PAYMENTS'}`}
            value={stats.total_count}
            icon={List}
            color="primary"
          />
          <StatCard
            label="PENDING SUBMISSION"
            value={stats.pending}
            icon={Clock}
            color="warning"
          />
          <StatCard
            label="POSTED TO LEDGER"
            value={stats.completed}
            icon={CheckCircle}
            color="success"
          />
          <StatCard
            label="TOTAL VOLUME"
            value={`₹${stats.total_amount.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            color={activeTab === 'customer' ? 'success' : 'rose'}
          />
        </div>

        <div className="bg-white border border-neutral-200 rounded   ">
          <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search by ID, Name or Reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all rounded "
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="rounded  gap-2" onClick={fetchPayments}>
                <RefreshCw size={14} />
                Refresh
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredPayments}
            loading={loading}
          />
        </div>
      </main>

      <CreatePaymentModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setPreFilledData(null)
        }}
        onSuccess={fetchPayments}
        initialData={preFilledData}
        initialType={activeTab}
      />
    </div>
  )
}
