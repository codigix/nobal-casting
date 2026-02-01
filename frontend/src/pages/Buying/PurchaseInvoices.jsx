import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { 
  Plus, Eye, FileText, CheckCircle, RefreshCw, 
  IndianRupee, Clock, AlertCircle, XCircle, Search, CreditCard,
  LayoutGrid, List, ChevronRight, History, Building2, MoreVertical,
  Calendar, ArrowUpRight, Filter, TrendingUp, Calculator, ShieldCheck,
  User, ChevronDown
} from 'lucide-react'
import CreatePurchaseInvoiceModal from '../../components/Buying/CreatePurchaseInvoiceModal'
import './Buying.css'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive, trend }) => {
  const colorMap = {
    primary: 'indigo',
    success: 'emerald',
    warning: 'amber',
    danger: 'rose',
    info: 'sky',
    indigo: 'indigo'
  }
  const theme = colorMap[color] || 'indigo'
  
  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-none border transition-all duration-300 group cursor-pointer ${
        isActive 
          ? `border-${theme}-500 shadow-sm ring-1 ring-${theme}-500` 
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 bg-neutral-50 rounded-none border border-neutral-100 text-neutral-400 group-hover:text-${theme}-600 group-hover:border-${theme}-100 transition-colors`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-emerald-600  bg-emerald-50/50 px-2 py-1 border border-emerald-100">
            <TrendingUp size={10} strokeWidth={3} />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-neutral-900 tracking-tight leading-none mb-2 ">{value}</p>
        <p className="text-[10px] font-black text-neutral-400  tracking-widest">{label}</p>
      </div>
    </div>
  )
}

export default function PurchaseInvoices() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [invoices, setInvoices] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState('kanban')
  const [visibleColumns, setVisibleColumns] = useState(null)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const searchParam = params.get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
      setViewMode('list')
    }
  }, [location.search])

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.get('/purchase-invoices')
      const data = response.data.data || []
      setInvoices(data)
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setError('Error fetching purchase invoices')
      toast.addToast('Error fetching purchase invoices', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitInvoice = async (invoiceNo) => {
    try {
      await api.post(`/purchase-invoices/${invoiceNo}/submit`)
      toast.addToast('Invoice submitted successfully', 'success')
      fetchInvoices()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to submit invoice', 'error')
    }
  }

  const handleCancelInvoice = async (invoiceNo) => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return
    try {
      await api.post(`/purchase-invoices/${invoiceNo}/cancel`)
      toast.addToast('Invoice cancelled successfully', 'success')
      fetchInvoices()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to cancel invoice', 'error')
    }
  }

  const handleDeleteInvoice = async (invoiceNo) => {
    if (!window.confirm('Are you sure you want to delete this draft invoice?')) return
    try {
      await api.delete(`/purchase-invoices/${invoiceNo}`)
      toast.addToast('Invoice deleted successfully', 'success')
      fetchInvoices()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to delete invoice', 'error')
    }
  }

  const stats = useMemo(() => {
    const total = invoices.length
    const draft = invoices.filter(i => i.status === 'draft').length
    const submitted = invoices.filter(i => i.status === 'submitted').length
    const paid = invoices.filter(i => i.status === 'paid').length
    const cancelled = invoices.filter(i => i.status === 'cancelled').length
    const total_amount = invoices.reduce((acc, i) => acc + parseFloat(i.gross_amount || 0), 0)

    return { total, draft, submitted, paid, cancelled, total_amount }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesFilter = !activeFilter || inv.status === activeFilter
      const matchesSearch = 
        inv.purchase_invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.po_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.grn_no?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesAdvancedSearch = 
        !filters.search || 
        inv.purchase_invoice_no?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.po_no?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.grn_no?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesSupplier = !filters.supplier || inv.supplier_name?.toLowerCase().includes(filters.supplier.toLowerCase())
      const matchesStatus = !filters.status || inv.status === filters.status

      return matchesFilter && matchesSearch && matchesAdvancedSearch && matchesSupplier && matchesStatus
    })
  }, [invoices, activeFilter, searchQuery, filters])

  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        label: 'Draft', 
        badge: 'bg-amber-50 text-amber-700 border-amber-200', 
        iconColor: 'text-amber-500', 
        icon: Clock 
      },
      submitted: { 
        label: 'Submitted', 
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', 
        iconColor: 'text-indigo-500', 
        icon: AlertCircle 
      },
      paid: { 
        label: 'Paid', 
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        iconColor: 'text-emerald-500', 
        icon: CheckCircle 
      },
      cancelled: { 
        label: 'Cancelled', 
        badge: 'bg-neutral-100 text-neutral-600 border-neutral-200', 
        iconColor: 'text-neutral-400', 
        icon: XCircle 
      }
    }
    return configs[status] || { 
      label: status?.replace('_', ' ').toUpperCase(), 
      badge: 'bg-neutral-50 text-neutral-600 border-neutral-200', 
      iconColor: 'text-neutral-400', 
      icon: FileText 
    }
  }

  const kanbanColumns = [
    { status: 'draft', title: 'Draft Invoices', icon: Clock, theme: 'amber' },
    { status: 'submitted', title: 'Pending Payment', icon: AlertCircle, theme: 'indigo' },
    { status: 'paid', title: 'Paid', icon: CheckCircle, theme: 'emerald' },
    { status: 'cancelled', title: 'Cancelled', icon: XCircle, theme: 'neutral' }
  ]

  const columns = [
    { 
      key: 'purchase_invoice_no', 
      label: 'Invoice Number', 
      width: '12%',
      render: (val) => (
        <span className="font-black tracking-widest text-indigo-600 ">
          {val}
        </span>
      )
    },
    { 
      key: 'supplier_name', 
      label: 'Supplier', 
      width: '20%',
      render: (val) => (
        <span className="font-black tracking-widest text-neutral-900 ">
          {val || 'N/A'}
        </span>
      )
    },
    { 
      key: 'invoice_date', 
      label: 'Date', 
      width: '10%',
      render: (val) => (
        <div className="flex items-center gap-2 text-neutral-400 font-black tracking-widest ">
          <Calendar size={14} strokeWidth={3} />
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    { 
      key: 'po_ref', 
      label: 'PO Ref', 
      width: '12%',
      render: (_, row) => row.po_no ? (
        <div className="flex items-center gap-2">
          <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200 font-black tracking-widest  rounded-none">
            {row.po_no}
          </Badge>
          {row.grn_no && (
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black tracking-widest  rounded-none">
              {row.grn_no}
            </Badge>
          )}
        </div>
      ) : 'N/A'
    },
    { 
      key: 'gross_amount', 
      label: 'Total Amount', 
      width: '12%',
      render: (val) => (
        <span className="font-black tracking-widest text-neutral-900 ">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (val) => {
        const config = getStatusConfig(val)
        return (
          <Badge className={`${config.badge} font-black tracking-widest  rounded-none px-3 py-1.5`}>
            {config.label}
          </Badge>
        )
      }
    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/purchase-invoice/${row.purchase_invoice_no}`)
        }}
        className="h-8 w-8 rounded-none border-neutral-200 text-neutral-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30"
        title="View Details"
      >
        <Eye size={14} strokeWidth={3} />
      </Button>

      {row.status === 'draft' && (
        <>
          <Button
            size="sm"
            variant="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleSubmitInvoice(row.purchase_invoice_no)
            }}
            className="h-8 w-8 rounded-none bg-emerald-50/50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white"
            title="Submit Invoice"
          >
            <CheckCircle size={14} strokeWidth={3} />
          </Button>
          <Button
            size="sm"
            variant="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteInvoice(row.purchase_invoice_no)
            }}
            className="h-8 w-8 rounded-none bg-rose-50/50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white"
            title="Delete Draft"
          >
            <XCircle size={14} strokeWidth={3} />
          </Button>
        </>
      )}

      {row.status === 'submitted' && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleCancelInvoice(row.purchase_invoice_no)
          }}
          className="h-8 w-8 rounded-none bg-amber-50/50 border-amber-100 text-amber-600 hover:bg-amber-600 hover:text-white"
          title="Cancel Invoice"
        >
          <RefreshCw size={14} strokeWidth={3} />
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Dynamic Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black  tracking-[0.2em] text-neutral-400">
                <Building2 size={12} strokeWidth={3} className="text-indigo-500" />
                <span>Buying</span>
                <ChevronRight size={10} strokeWidth={3} />
                <span className="text-neutral-900">Accounts Payable</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded-none">
                  <CreditCard size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-neutral-900 tracking-tight  leading-none">Purchase Invoices</h1>
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-black  tracking-widest mt-1">
                    <History size={12} strokeWidth={3} className="text-indigo-500" />
                    <span>Last Refreshed {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-neutral-100 p-1 rounded-none border border-neutral-200 flex items-center">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-none text-[10px] font-black  tracking-widest transition-all ${
                    viewMode === 'kanban' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-neutral-200' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <LayoutGrid size={14} strokeWidth={3} />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-none text-[10px] font-black  tracking-widest transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-sm border border-neutral-200' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <List size={14} strokeWidth={3} />
                  <span>List View</span>
                </button>
              </div>

              <div className="h-8 w-[1px] bg-neutral-200 mx-1"></div>

              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-none shadow-md flex items-center gap-2 transition-all border-none text-[10px] font-black  tracking-widest"
              >
                <Plus size={16} strokeWidth={3} />
                <span>New Invoice</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full px-4 lg:px-8 py-8 space-y-8">
        {/* Statistics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Gross Value"
            value={`₹${stats.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={IndianRupee}
            color="indigo"
            onClick={() => setActiveFilter('')}
            isActive={activeFilter === ''}
            trend="+12.5%"
          />
          <StatCard
            label="In Preparation"
            value={stats.draft}
            icon={Clock}
            color="warning"
            onClick={() => setActiveFilter('draft')}
            isActive={activeFilter === 'draft'}
          />
          <StatCard
            label="Pending Payment"
            value={stats.submitted}
            icon={AlertCircle}
            color="info"
            onClick={() => setActiveFilter('submitted')}
            isActive={activeFilter === 'submitted'}
          />
          <StatCard
            label="Finalized"
            value={stats.paid}
            icon={CheckCircle}
            color="success"
            onClick={() => setActiveFilter('paid')}
            isActive={activeFilter === 'paid'}
          />
          <StatCard
            label="Annulled"
            value={stats.cancelled}
            icon={XCircle}
            color="danger"
            onClick={() => setActiveFilter('cancelled')}
            isActive={activeFilter === 'cancelled'}
          />
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" size={16} strokeWidth={3} />
            <input
              type="text"
              placeholder="SEARCH BY INVOICE, SUPPLIER OR PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-neutral-200 rounded-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-[10px] font-black  tracking-widest placeholder:text-neutral-300"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200">
              <div className="flex items-center gap-2">
                <Filter size={12} strokeWidth={3} className="text-neutral-400" />
                <span className="text-[10px] font-black text-neutral-400  tracking-widest">Status:</span>
              </div>
              <div className="h-4 w-[1px] bg-neutral-200 mx-1"></div>
              <select 
                className="bg-transparent text-[10px] font-black text-indigo-600 focus:outline-none cursor-pointer  tracking-widest"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
              >
                <option value="">ALL STATUSES</option>
                <option value="draft">DRAFT</option>
                <option value="submitted">SUBMITTED</option>
                <option value="paid">PAID</option>
                <option value="cancelled">CANCELLED</option>
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-[10px] font-black text-neutral-600 hover:border-indigo-500 hover:text-indigo-600 transition-all  tracking-widest"
              >
                <Eye size={12} strokeWidth={3} />
                <span>Columns</span>
                <ChevronDown size={12} strokeWidth={3} className={`transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-900 shadow-2xl z-50 py-0">
                  <div className="px-4 py-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                    <span className="text-[10px] font-black text-neutral-900  tracking-widest">Visible Columns</span>
                  </div>
                  <div className="p-2 border-b border-neutral-100 flex gap-2">
                    <button 
                      onClick={() => setVisibleColumns(new Set(columns.map(c => c.key)))}
                      className="flex-1 py-1.5 text-[9px] font-black text-indigo-600 hover:bg-indigo-50  tracking-widest border border-indigo-100"
                    >
                      Show All
                    </button>
                    <button 
                      onClick={() => setVisibleColumns(new Set())}
                      className="flex-1 py-1.5 text-[9px] font-black text-rose-600 hover:bg-rose-50  tracking-widest border border-rose-100"
                    >
                      Hide All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="rounded-none border-neutral-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                          checked={visibleColumns?.has(col.key) ?? true}
                          onChange={() => {
                            const newSet = new Set(visibleColumns || columns.map(c => c.key))
                            if (newSet.has(col.key)) newSet.delete(col.key)
                            else newSet.add(col.key)
                            setVisibleColumns(newSet)
                          }}
                        />
                        <span className="text-[10px] font-black text-neutral-600 group-hover:text-neutral-900  tracking-widest">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

            <AdvancedFilters
              filters={filters}
              onFilterChange={setFilters}
              filterConfig={[
                { key: 'search', label: 'Reference Search', type: 'text', placeholder: 'ID, Supplier...' },
                { 
                  key: 'status', 
                  label: 'State', 
                  type: 'select',
                  options: [
                    { value: '', label: 'All Lifecycle States' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]
                }
              ]}
            />

        {/* Data Presentation */}
        {loading ? (
          <div className="py-32 text-center bg-white border border-neutral-200">
            <div className="inline-flex p-6 bg-neutral-50 mb-6">
              <RefreshCw size={40} strokeWidth={3} className="text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-xl font-black text-neutral-900  tracking-widest mb-2">Syncing Ledger</h3>
            <p className="text-neutral-400 text-[10px] font-black  tracking-[0.2em]">Updating real-time financial records...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-24 text-center bg-white border border-neutral-200 flex flex-col items-center">
            <div className="w-16 h-16 bg-neutral-50 flex items-center justify-center mb-8 border border-neutral-100">
              <Search size={32} strokeWidth={3} className="text-neutral-200" />
            </div>
            <h3 className="text-xl font-black text-neutral-900  tracking-widest mb-2">No Matching Records</h3>
            <p className="text-neutral-400 text-[10px] font-black  tracking-[0.2em] mb-8 max-w-sm leading-loose">
              We couldn't find any invoices matching your search criteria. Try a different ID or supplier name.
            </p>
            <Button 
              onClick={() => {
                setFilters({ status: '', supplier: '', search: '' });
                setSearchQuery('');
                setActiveFilter('');
              }}
              variant="secondary"
              className="rounded-none px-12 py-3 border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white font-black text-[10px]  tracking-widest transition-all"
            >
              Reset All Filters
            </Button>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {kanbanColumns.map((column) => {
              const columnInvoices = filteredInvoices.filter(i => i.status === column.status)
              return (
                <div key={column.status} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 bg-${column.theme === 'neutral' ? 'neutral-100' : `${column.theme}-50`} text-${column.theme === 'neutral' ? 'neutral-600' : `${column.theme}-600`} border border-${column.theme === 'neutral' ? 'neutral-200' : `${column.theme}-100`}`}>
                        <column.icon size={14} strokeWidth={3} />
                      </div>
                      <h3 className="text-[10px] font-black text-neutral-900  tracking-widest">{column.title}</h3>
                    </div>
                    <span className="bg-neutral-900 text-white px-2 py-0.5 text-[10px] font-black tracking-widest">
                      {columnInvoices.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-h-[500px]">
                    {columnInvoices.map((inv) => (
                      <div
                        key={inv.purchase_invoice_no}
                        onClick={() => navigate(`/buying/purchase-invoice/${inv.purchase_invoice_no}`)}
                        className="bg-white p-5 border border-neutral-200 hover:border-indigo-500 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-indigo-500  tracking-widest mb-1">
                              Invoice ID
                            </span>
                            <span className="text-xs font-black text-neutral-900  tracking-widest group-hover:text-indigo-600 transition-colors">
                              {inv.purchase_invoice_no}
                            </span>
                          </div>
                          <div className="p-1.5 bg-neutral-50 text-neutral-400 opacity-0 group-hover:opacity-100 transition-all">
                            <ArrowUpRight size={14} strokeWidth={3} />
                          </div>
                        </div>

                        <div className="space-y-3 mb-5">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-neutral-50 border border-neutral-100">
                              <User size={12} strokeWidth={3} className="text-neutral-400" />
                            </div>
                            <h4 className="font-black text-neutral-700 text-[10px]  tracking-widest truncate">
                              {inv.supplier_name || 'Anonymous Supplier'}
                            </h4>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-neutral-400 text-[9px] font-black  tracking-widest">
                              <Calendar size={10} strokeWidth={3} />
                              <span>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            {inv.po_no && (
                              <div className="flex items-center gap-1.5 text-indigo-400 text-[9px] font-black  tracking-widest">
                                <FileText size={10} strokeWidth={3} />
                                <span>{inv.po_no}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-neutral-400  tracking-widest mb-0.5">Gross Payable</span>
                            <div className="text-sm font-black text-neutral-900 group-hover:text-indigo-600 transition-colors  tracking-widest">
                              ₹{(parseFloat(inv.gross_amount) || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {inv.status === 'draft' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubmitInvoice(inv.purchase_invoice_no);
                                }}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                title="Authorize"
                              >
                                <ShieldCheck size={14} strokeWidth={3} />
                              </button>
                            )}
                            {inv.status === 'submitted' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelInvoice(inv.purchase_invoice_no);
                                }}
                                className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                                title="Annul"
                              >
                                <XCircle size={14} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 overflow-hidden p-2">
            <DataTable
              columns={columns}
              data={filteredInvoices}
              renderActions={renderActions}
              filterable={false}
              sortable={true}
              pageSize={10}
              onRowClick={(row) => navigate(`/buying/purchase-invoice/${row.purchase_invoice_no}`)}
              hideColumnToggle
              externalVisibleColumns={visibleColumns}
            />
          </div>
        )}
      </main>

      <CreatePurchaseInvoiceModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  )
}
