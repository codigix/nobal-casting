import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Eye, FileText, DollarSign, CheckCircle, RefreshCw, 
  IndianRupee, Clock, AlertCircle, XCircle, Search, CreditCard,
  LayoutGrid, List, ChevronRight, History, Building2, MoreVertical,
  Calendar, ArrowUpRight, ArrowRight, Filter
} from 'lucide-react'
import CreatePurchaseInvoiceModal from '../../components/Buying/CreatePurchaseInvoiceModal'
import './Buying.css'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }) => {
  const colorMap = {
    primary: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700',
    success: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
    warning: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
    danger: 'from-rose-50 to-rose-100 border-rose-200 text-rose-700',
    info: 'from-sky-50 to-sky-100 border-sky-200 text-sky-700',
    indigo: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-700'
  }
  
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-4 rounded-md border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 shadow-md border-indigo-300' : ''}`}
    >
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex items-start justify-between mb-2 relative z-10">
        <span className="text-xs  text-gray-500 ">{label}</span>
        <div className="p-1.5 bg-white/50 rounded shadow-sm">
          <Icon size={16} className="text-gray-700" />
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-xl   text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function PurchaseInvoices() {
  const navigate = useNavigate()
  const toast = useToast()
  const [invoices, setInvoices] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState('kanban')
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

  const stats = useMemo(() => {
    const total = invoices.length
    const draft = invoices.filter(i => i.status === 'draft').length
    const submitted = invoices.filter(i => i.status === 'submitted').length
    const paid = invoices.filter(i => i.status === 'paid').length
    const cancelled = invoices.filter(i => i.status === 'cancelled').length
    const total_amount = invoices.reduce((acc, i) => acc + parseFloat(i.net_amount || 0), 0)

    return { total, draft, submitted, paid, cancelled, total_amount }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesFilter = !activeFilter || inv.status === activeFilter
      const matchesSearch = 
        inv.purchase_invoice_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesAdvancedSearch = 
        !filters.search || 
        inv.purchase_invoice_no?.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.supplier_name?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesSupplier = !filters.supplier || inv.supplier_name?.toLowerCase().includes(filters.supplier.toLowerCase())
      const matchesStatus = !filters.status || inv.status === filters.status

      return matchesFilter && matchesSearch && matchesAdvancedSearch && matchesSupplier && matchesStatus
    })
  }, [invoices, activeFilter, searchQuery, filters])

  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        label: 'Draft', 
        color: 'from-amber-50 to-amber-100/50', 
        border: 'border-amber-200', 
        badge: 'bg-amber-50 text-amber-600 border-amber-100', 
        iconColor: 'text-amber-500', 
        icon: Clock 
      },
      submitted: { 
        label: 'Submitted', 
        color: 'from-blue-50 to-blue-100/50', 
        border: 'border-blue-200', 
        badge: 'bg-blue-50 text-blue-600 border-blue-100', 
        iconColor: 'text-blue-500', 
        icon: AlertCircle 
      },
      paid: { 
        label: 'Paid', 
        color: 'from-emerald-50 to-emerald-100/50', 
        border: 'border-emerald-200', 
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
        iconColor: 'text-emerald-500', 
        icon: CheckCircle 
      },
      cancelled: { 
        label: 'Cancelled', 
        color: 'from-rose-50 to-rose-100/50', 
        border: 'border-rose-200', 
        badge: 'bg-rose-50 text-rose-600 border-rose-100', 
        iconColor: 'text-rose-500', 
        icon: XCircle 
      }
    }
    return configs[status] || { 
      label: status?.replace('_', ' ').toUpperCase(), 
      color: 'from-slate-50 to-slate-100/50', 
      border: 'border-slate-200', 
      badge: 'bg-slate-50 text-slate-600 border-slate-100', 
      iconColor: 'text-slate-400', 
      icon: FileText 
    }
  }

  const kanbanColumns = [
    { status: 'draft', title: 'Draft Invoices', icon: Clock },
    { status: 'submitted', title: 'Pending Payment', icon: AlertCircle },
    { status: 'paid', title: 'Paid', icon: CheckCircle },
    { status: 'cancelled', title: 'Cancelled', icon: XCircle }
  ]

  const columns = [
    { 
      key: 'purchase_invoice_no', 
      label: 'Invoice Number', 
      width: '12%',
      render: (val) => (
        <span className="font-semibold text-primary-600 dark:text-primary-400">
          {val}
        </span>
      )
    },
    { 
      key: 'supplier_name', 
      label: 'Supplier', 
      width: '15%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {val || 'N/A'}
        </span>
      )
    },
    { 
      key: 'invoice_date', 
      label: 'Invoice Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'due_date', 
      label: 'Due Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'net_amount', 
      label: 'Amount', 
      width: '12%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Payment Status', 
      width: '12%',
      render: (val) => {
        const config = getStatusConfig(val)
        const Icon = config.icon
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${config.color} ${config.iconColor}`}>
              <Icon size={14} />
            </div>
            <Badge className={`${config.badge}  border shadow-sm`}>
              {config.label.toUpperCase()}
            </Badge>
          </div>
        )
      }
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '13%',
      render: (val) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {val ? new Date(val).toLocaleString() : 'N/A'}
        </span>
      )
    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/purchase-invoice/${row.purchase_invoice_no}`)
        }}
        className="text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50"
      >
        <Eye size={16} />
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Modern Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Building2 size={14} />
                <span>Buying</span>
                <ChevronRight size={14} />
                <span className="text-indigo-600 bg-indigo-50 p-1 rounded ">Invoices</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded  shadow-lg shadow-indigo-200">
                  <CreditCard className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl   text-slate-900 tracking-tight">Purchase Invoices</h1>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <History size={14} className="animate-pulse text-indigo-400" />
                    <span>Updated {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-slate-100 p-1 rounded border border-slate-200 shadow-inner">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 p-2 rounded text-xs  transition-all duration-200 ${
                    viewMode === 'kanban' 
                      ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  <LayoutGrid size={16} />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 p-2 rounded text-xs  transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5' 
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                >
                  <List size={16} />
                  <span>List View</span>
                </button>
              </div>

              <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

              <button
                onClick={fetchInvoices}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all border border-transparent hover:border-indigo-100"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>

              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none  text-sm uppercase tracking-wide"
              >
                <Plus size={18} strokeWidth={3} />
                <span>New Invoice</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Amount"
            value={`₹${stats.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={IndianRupee}
            color="indigo"
            onClick={() => setActiveFilter('')}
            isActive={activeFilter === ''}
          />
          <StatCard
            label="All Invoices"
            value={stats.total}
            icon={FileText}
            color="primary"
            onClick={() => setActiveFilter('')}
            isActive={activeFilter === ''}
          />
          <StatCard
            label="Draft"
            value={stats.draft}
            icon={Clock}
            color="warning"
            onClick={() => setActiveFilter('draft')}
            isActive={activeFilter === 'draft'}
          />
          <StatCard
            label="Submitted"
            value={stats.submitted}
            icon={AlertCircle}
            color="info"
            onClick={() => setActiveFilter('submitted')}
            isActive={activeFilter === 'submitted'}
          />
          <StatCard
            label="Paid"
            value={stats.paid}
            icon={CheckCircle}
            color="success"
            onClick={() => setActiveFilter('paid')}
            isActive={activeFilter === 'paid'}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={XCircle}
            color="danger"
            onClick={() => setActiveFilter('cancelled')}
            isActive={activeFilter === 'cancelled'}
          />
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by Invoice # or Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm outline-none"
            />
          </div>
          <div className="bg-white p-1 rounded  border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="px-3 py-1.5 text-xs  text-slate-400  flex items-center gap-2">
              <Filter size={14} />
              Advanced Filters
            </div>
            <AdvancedFilters
              filters={filters}
              onFilterChange={setFilters}
              filterConfig={[
                { key: 'search', label: 'Search Invoice', type: 'text', placeholder: 'Invoice #, Supplier...' },
                { 
                  key: 'status', 
                  label: 'Payment Status', 
                  type: 'select',
                  options: [
                    { value: '', label: 'All Status' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]
                },
                { 
                  key: 'supplier', 
                  label: 'Supplier', 
                  type: 'text',
                  placeholder: 'Supplier name...'
                }
              ]}
            />
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
              <RefreshCw size={32} className="text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-lg  text-slate-900">Fetching Invoices</h3>
            <p className="text-slate-500">Please wait while we sync with the server...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl  text-slate-900 mb-2">No Invoices Found</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              We couldn't find any invoices matching your current filters. Try adjusting your search or filters.
            </p>
            <Button 
              onClick={() => {
                setFilters({ status: '', supplier: '', search: '' });
                setSearchQuery('');
                setActiveFilter('');
              }}
              variant="secondary"
              className="rounded  px-6"
            >
              Clear All Filters
            </Button>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kanbanColumns.map((column) => {
              const columnInvoices = filteredInvoices.filter(i => i.status === column.status)
              return (
                <div key={column.status} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 ${getStatusConfig(column.status).iconColor}`}>
                        <column.icon size={16} />
                      </div>
                      <h3 className=" text-slate-800 tracking-tight">{column.title}</h3>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ">
                        {columnInvoices.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-h-[200px]">
                    {columnInvoices.map((inv) => (
                      <div
                        key={inv.purchase_invoice_no}
                        onClick={() => navigate(`/buying/purchase-invoice/${inv.purchase_invoice_no}`)}
                        className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getStatusConfig(inv.status).color.replace('from-', 'bg-')}`} />
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs  text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                            {inv.purchase_invoice_no}
                          </span>
                          <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                        <h4 className=" text-slate-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {inv.supplier_name || 'N/A'}
                        </h4>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px] mb-4">
                          <Calendar size={12} />
                          <span>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="text-sm  text-slate-900">
                            ₹{(parseFloat(inv.net_amount) || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                            <ArrowUpRight size={14} />
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredInvoices}
              renderActions={renderActions}
              filterable={false}
              sortable={true}
              pageSize={10}
              onRowClick={(row) => navigate(`/buying/purchase-invoice/${row.purchase_invoice_no}`)}
              className="modern-table"
            />
          </div>
        )}
      </div>

      <CreatePurchaseInvoiceModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  )
}
