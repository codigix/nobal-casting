import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import { 
  Plus, Eye, FileText, CheckCircle, RefreshCw, 
  IndianRupee, Clock, AlertCircle, XCircle, Search, CreditCard,
  LayoutGrid, List, ChevronRight, History, Building2, MoreVertical,
  Calendar, ArrowUpRight, Filter, TrendingUp, Calculator, ShieldCheck,
  User, ChevronDown, Receipt, Trash2, Send, Download, ArrowRight
} from 'lucide-react'
import CreateInvoiceModal from '../../components/Selling/CreateInvoiceModal'
import './Selling.css'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive, trend, subtitle }) => {
  const colorMap = {
    primary: 'indigo',
    success: 'emerald',
    warning: 'amber',
    danger: 'rose',
    info: 'sky',
    indigo: 'indigo',
    slate: 'slate'
  }
  const theme = colorMap[color] || 'indigo'
  
  return (
    <div
      onClick={onClick}
      className={`bg-white p-2 rounded  border transition-all duration-300 group cursor-pointer ${
        isActive 
          ? `border-${theme}-500  shadow-${theme}-100 ring-1 ring-${theme}-500/20` 
          : 'border-slate-200 hover:border-slate-300 hover:'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 bg-${theme}-50 text-${theme}-600 rounded  group-hover:scale-110 transition-transform`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px]  tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            <TrendingUp size={10} />
            {trend}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-xl  text-slate-900  leading-none mb-1.5">{value}</h3>
        <p className="text-[10px]  text-slate-400  ">{label}</p>
        {subtitle && <p className="text-[10px] text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function SalesInvoice() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [invoices, setInvoices] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const response = await api.get('/selling/sales-invoices')
      setInvoices(response.data.data || [])
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.addToast('Error fetching sales invoices', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitInvoice = async (invoiceId) => {
    try {
      await api.put(`/selling/sales-invoices/${invoiceId}/submit`)
      toast.addToast('Invoice submitted successfully', 'success')
      fetchInvoices()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to submit invoice', 'error')
    }
  }

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this draft invoice?')) return
    try {
      await api.delete(`/selling/sales-invoices/${invoiceId}`)
      toast.addToast('Invoice deleted successfully', 'success')
      fetchInvoices()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to delete invoice', 'error')
    }
  }

  const stats = useMemo(() => {
    const total = invoices.length
    const draft = invoices.filter(i => i.status === 'draft').length
    const issued = invoices.filter(i => i.status === 'issued').length
    const paid = invoices.filter(i => i.status === 'paid').length
    const cancelled = invoices.filter(i => i.status === 'cancelled').length
    const total_amount = invoices.reduce((acc, i) => acc + parseFloat(i.amount || 0), 0)

    return { total, draft, issued, paid, cancelled, total_amount }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesFilter = !activeFilter || inv.status === activeFilter
      const searchStr = searchQuery.toLowerCase()
      const matchesSearch = 
        inv.invoice_id?.toLowerCase().includes(searchStr) ||
        inv.customer_name?.toLowerCase().includes(searchStr) ||
        inv.delivery_note_id?.toLowerCase().includes(searchStr)
      
      return matchesFilter && matchesSearch
    })
  }, [invoices, activeFilter, searchQuery])

  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        label: 'Draft', 
        badge: 'bg-amber-50 text-amber-600 border-amber-200', 
        dot: 'bg-amber-500'
      },
      issued: { 
        label: 'Issued', 
        badge: 'bg-blue-50 text-blue-600 border-blue-200', 
        dot: 'bg-blue-500'
      },
      paid: { 
        label: 'Paid', 
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', 
        dot: 'bg-emerald-500'
      },
      cancelled: { 
        label: 'Cancelled', 
        badge: 'bg-slate-100 text-slate-500 border-slate-200', 
        dot: 'bg-slate-400'
      }
    }
    return configs[status] || { 
      label: status, 
      badge: 'bg-slate-50 text-slate-600 border-slate-200', 
      dot: 'bg-slate-400'
    }
  }

  const columns = [
    { 
      key: 'invoice_id', 
      label: 'Invoice Details', 
      width: '25%',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className=" text-slate-900 flex items-center gap-2">
            {val}
            {row.status === 'draft' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider flex items-center gap-1 mt-0.5">
            <FileText size={10} /> DN: {row.delivery_note_id || 'Direct'}
          </span>
        </div>
      )
    },
    { 
      key: 'customer_name', 
      label: 'Customer', 
      width: '20%',
      render: (val) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-700">{val || 'N/A'}</span>
          <span className="text-[10px] text-slate-400    mt-0.5">Regular Client</span>
        </div>
      )
    },
    { 
      key: 'invoice_date', 
      label: 'Date', 
      width: '15%',
      render: (val) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar size={12} className="text-slate-400" />
            {val ? new Date(val).toLocaleDateString() : 'N/A'}
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">Standard Terms</span>
        </div>
      )
    },
    { 
      key: 'amount', 
      label: 'Financials', 
      width: '15%',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className=" text-slate-900">
            ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">
            Incl. Tax (₹{(parseFloat(val) * 0.18).toLocaleString('en-IN', { maximumFractionDigits: 0 })})
          </span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Lifecycle', 
      width: '12%',
      render: (val) => {
        const config = getStatusConfig(val)
        return (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.badge} text-[10px]   tracking-wider`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Operations',
      width: '13%',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/selling/sales-invoices/${row.invoice_id}`)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all"
            title="View Details"
          >
            <Eye size={16} />
          </button>

          {row.status === 'draft' && (
            <>
              <button
                onClick={() => handleSubmitInvoice(row.invoice_id)}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded  transition-all"
                title="Submit Invoice"
              >
                <CheckCircle size={16} />
              </button>
              <button
                onClick={() => handleDeleteInvoice(row.invoice_id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all"
                title="Delete Draft"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}

          {row.status === 'issued' && (
            <button
              onClick={() => navigate('/accounts/payments', { 
                state: { 
                  type: 'customer',
                  party_id: row.customer_id,
                  order_id: row.sales_order_id,
                  amount: parseFloat(row.amount) * (1 + parseFloat(row.tax_rate || 0)/100),
                  reference: row.invoice_id
                } 
              })}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded  transition-all flex items-center gap-1  text-[10px]"
              title="Record Receipt"
            >
              <IndianRupee size={14} />
              RECEIPT
            </button>
          )}
          
          {row.status === 'paid' && (
            <button
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded  transition-all"
              title="Download PDF"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Redesigned Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0">
        <div className=" mx-auto p-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-600 rounded   shadow-indigo-100">
                <Receipt className="text-white" size={15} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs   text-slate-400 ">
                  <span>Selling</span>
                  <ChevronRight size={10} />
                  <span className="text-indigo-600">Financials</span>
                </div>
                <h1 className="text-xl  text-slate-900 ">Sales Invoices</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden md:flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded  text-[10px]  text-slate-500 gap-2">
                <History size={14} className="text-indigo-500" />
                LAST REFRESHED: {refreshTime.toLocaleTimeString()}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2  bg-slate-900 text-white rounded  text-xs  hover:bg-slate-800 transition-all  shadow-slate-200 active:scale-95"
              >
                <Plus size={15} />
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1  w-full mx-auto p-2">
        {/* Modern Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="All Records"
            value={stats.total}
            icon={LayoutGrid}
            color="slate"
            isActive={activeFilter === ''}
            onClick={() => setActiveFilter('')}
          />
          <StatCard
            label="Pending Drafts"
            value={stats.draft}
            icon={Clock}
            color="warning"
            isActive={activeFilter === 'draft'}
            onClick={() => setActiveFilter('draft')}
            subtitle="Requires Review"
          />
          <StatCard
            label="Active Invoices"
            value={stats.issued}
            icon={Send}
            color="indigo"
            isActive={activeFilter === 'issued'}
            onClick={() => setActiveFilter('issued')}
            subtitle="Awaiting Payment"
          />
          <StatCard
            label="Realized Revenue"
            value={stats.paid}
            icon={CheckCircle}
            color="success"
            isActive={activeFilter === 'paid'}
            onClick={() => setActiveFilter('paid')}
            subtitle="Settled Records"
          />
          <StatCard
            label="Estimated Value"
            value={`₹${(stats.total_amount / 100000).toFixed(1)}L`}
            icon={IndianRupee}
            color="primary"
            subtitle="Gross Portfolio Value"
            trend="+12.4%"
          />
        </div>

        {/* Improved Table Container */}
        <div className="">
          <div className=" my-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Quick search by ID, Customer or DN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 text-sm rounded  focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchInvoices}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 rounded  transition-all"
                title="Refresh Data"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <button className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded  text-xs  hover:bg-slate-50 transition-all">
                <Filter size={14} />
                Advance Filter
              </button>
            </div>
          </div>

          <div className="modern-table">
            <DataTable
              columns={columns}
              data={filteredInvoices}
              loading={loading}
              emptyMessage="No invoices found matching your criteria"
            />
          </div>
        </div>
      </main>

      {showCreateModal && (
        <CreateInvoiceModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchInvoices()
          }}
        />
      )}
    </div>
  )
}
