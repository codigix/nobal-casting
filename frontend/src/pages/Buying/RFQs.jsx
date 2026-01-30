import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import CreateRFQModal from '../../components/Buying/CreateRFQModal'
import { 
  Plus, Eye, Send, Trash2, MessageSquare, XCircle, 
  RefreshCw, ClipboardList, Filter, Search, Clock, 
  CheckCircle, FileText, Mail, LayoutGrid, List,
  ChevronRight, History, Building2, MoreVertical, Calendar,
  ArrowUpRight, ArrowRight, User
} from 'lucide-react'
import './Buying.css'

export default function RFQs() {
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('kanban')
  const [activeFilter, setActiveFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    fetchRFQs()
  }, [])

  const fetchRFQs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/rfqs')
      setRfqs(response.data.data || [])
      setRefreshTime(new Date())
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch RFQs')
      toast.addToast('Failed to fetch RFQs', 'error')
      setRfqs([])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    return {
      total: rfqs.length,
      draft: rfqs.filter(r => r.status === 'draft').length,
      sent: rfqs.filter(r => r.status === 'sent').length,
      responses: rfqs.filter(r => r.status === 'responses_received').length,
      closed: rfqs.filter(r => r.status === 'closed').length
    }
  }, [rfqs])

  const filteredRFQs = useMemo(() => {
    return rfqs.filter(rfq => {
      const matchesFilter = !activeFilter || rfq.status === activeFilter
      const matchesSearch = 
        rfq.rfq_id?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        rfq.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesAdvancedSearch = 
        !filters.search || 
        rfq.rfq_id?.toString().toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = !filters.status || rfq.status === filters.status

      return matchesFilter && matchesSearch && matchesAdvancedSearch && matchesStatus
    })
  }, [rfqs, activeFilter, searchQuery, filters])

  const handleSend = async (id) => {
    try {
      await api.patch(`/rfqs/${id}/send`)
      toast.addToast('RFQ sent to suppliers successfully', 'success')
      fetchRFQs()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to send RFQ', 'error')
    }
  }

  const handleClose = async (id) => {
    if (window.confirm('Are you sure you want to close this RFQ?')) {
      try {
        await api.patch(`/rfqs/${id}/close`)
        toast.addToast('RFQ closed successfully', 'success')
        fetchRFQs()
      } catch (err) {
        toast.addToast(err.response?.data?.error || 'Failed to close RFQ', 'error')
      }
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this RFQ?')) {
      try {
        await api.delete(`/rfqs/${id}`)
        toast.addToast('RFQ deleted successfully', 'success')
        fetchRFQs()
      } catch (err) {
        toast.addToast(err.response?.data?.error || 'Failed to delete RFQ', 'error')
      }
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      draft: { 
        label: 'Draft', 
        color: 'from-amber-50 to-amber-100/50', 
        border: 'border-amber-200', 
        badge: 'bg-amber-50 text-amber-600 border-amber-100', 
        iconColor: 'text-amber-500', 
        icon: FileText 
      },
      sent: { 
        label: 'Sent', 
        color: 'from-blue-50 to-blue-100/50', 
        border: 'border-blue-200', 
        badge: 'bg-blue-50 text-blue-600 border-blue-100', 
        iconColor: 'text-blue-500', 
        icon: Send 
      },
      responses_received: { 
        label: 'Responses Received', 
        color: 'from-emerald-50 to-emerald-100/50', 
        border: 'border-emerald-200', 
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', 
        iconColor: 'text-emerald-500', 
        icon: MessageSquare 
      },
      closed: { 
        label: 'Closed', 
        color: 'from-slate-50 to-slate-100/50', 
        border: 'border-slate-200', 
        badge: 'bg-slate-50 text-slate-600 border-slate-100', 
        iconColor: 'text-slate-400', 
        icon: XCircle 
      }
    }
    return configs[status] || { 
      label: status?.replace('_', ' ').toUpperCase(), 
      color: 'from-slate-50 to-slate-100/50', 
      border: 'border-slate-200', 
      badge: 'bg-slate-50 text-slate-600 border-slate-100', 
      iconColor: 'text-slate-400', 
      icon: ClipboardList 
    }
  }

  const kanbanColumns = [
    { status: 'draft', title: 'Draft', icon: FileText },
    { status: 'sent', title: 'Sent to Suppliers', icon: Send },
    { status: 'responses_received', title: 'Responses Received', icon: MessageSquare },
    { status: 'closed', title: 'Closed', icon: XCircle }
  ]

  const columns = [
    { 
      key: 'rfq_id', 
      label: 'RFQ ID', 
      width: '12%',
      render: (val) => (
        <span className="font-semibold text-primary-600 dark:text-primary-400">
          {val}
        </span>
      )
    },
    { 
      key: 'created_by_name', 
      label: 'Created By', 
      width: '15%',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
            <User size={12} className="text-slate-500" />
          </div>
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {val || 'System'}
          </span>
        </div>
      )
    },
    { 
      key: 'created_date', 
      label: 'Created Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'valid_till', 
      label: 'Valid Till', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'supplier_count', 
      label: 'Suppliers', 
      width: '10%',
      render: (val) => (
        <Badge color="info" className="">
          {val || '0'}
        </Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
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
      key: 'item_count', 
      label: 'Items', 
      width: '10%',
      render: (val) => (
        <Badge color="secondary" className="">
          {val || '0'}
        </Badge>
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
          navigate(`/buying/rfq/${row.rfq_id}`)
        }}
        className="text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleSend(row.rfq_id)
          }}
          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
        >
          <Send size={16} />
        </Button>
      )}
      {(row.status === 'sent' || row.status === 'responses_received') && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/buying/rfq/${row.rfq_id}/responses`)
          }}
          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
        >
          <MessageSquare size={16} />
        </Button>
      )}
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
                <span className="text-indigo-600 bg-indigo-50 p-1 rounded ">RFQs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded  shadow-lg shadow-indigo-200">
                  <Mail className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl   text-slate-900 tracking-tight">Request for Quotation</h1>
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
                onClick={fetchRFQs}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all border border-transparent hover:border-indigo-100"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>

              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border-none  text-sm uppercase tracking-wide"
              >
                <Plus size={18} strokeWidth={3} />
                <span>New RFQ</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { id: '', label: 'Total RFQs', value: stats.total, icon: ClipboardList, color: 'indigo' },
            { id: 'draft', label: 'Draft', value: stats.draft, icon: FileText, color: 'amber' },
            { id: 'sent', label: 'Sent', value: stats.sent, icon: Send, color: 'blue' },
            { id: 'responses_received', label: 'Responses', value: stats.responses, icon: MessageSquare, color: 'emerald' },
            { id: 'closed', label: 'Closed', value: stats.closed, icon: XCircle, color: 'slate' }
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setActiveFilter(stat.id)}
              className={`group relative p-2 roundedborder-2 transition-all duration-300 text-left overflow-hidden hover:shadow-xl hover:-translate-y-1 ${
                activeFilter === stat.id 
                ? `bg-white border-${stat.color}-500 shadow-lg shadow-${stat.color}-100 ring-4 ring-${stat.color}-50` 
                : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
              }`}
            >
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-110 bg-${stat.color}-500`} />
              <div className="flex items-start justify-between relative z-10 mb-4">
                <div className={`p-2.5 rounded  bg-${stat.color}-50 text-${stat.color}-600`}>
                  <stat.icon size={20} />
                </div>
                {activeFilter === stat.id && (
                  <div className={`bg-${stat.color}-500 w-2 h-2 rounded-full animate-ping`} />
                )}
              </div>
              <div className="relative z-10">
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-xl   text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by RFQ ID or Creator..."
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
                { key: 'search', label: 'Search RFQ', type: 'text', placeholder: 'RFQ ID...' },
                { 
                  key: 'status', 
                  label: 'Status', 
                  type: 'select',
                  options: [
                    { value: '', label: 'All Status' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'responses_received', label: 'Responses Received' },
                    { value: 'closed', label: 'Closed' }
                  ]
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
            <h3 className="text-lg  text-slate-900">Synchronizing RFQs</h3>
            <p className="text-slate-500">Please wait while we fetch the latest requests...</p>
          </div>
        ) : filteredRFQs.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl  text-slate-900 mb-2">No RFQs Found</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              We couldn't find any RFQs matching your current filters. Try adjusting your search or filters.
            </p>
            <Button 
              onClick={() => {
                setFilters({ status: '', search: '' });
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
              const columnRFQs = filteredRFQs.filter(r => r.status === column.status)
              return (
                <div key={column.status} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 ${getStatusConfig(column.status).iconColor}`}>
                        <column.icon size={16} />
                      </div>
                      <h3 className=" text-slate-800 tracking-tight">{column.title}</h3>
                      <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs ">
                        {columnRFQs.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-h-[200px]">
                    {columnRFQs.map((rfq) => (
                      <div
                        key={rfq.rfq_id}
                        onClick={() => navigate(`/buying/rfq/${rfq.rfq_id}`)}
                        className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getStatusConfig(rfq.status).color.replace('from-', 'bg-')}`} />
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs  text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                            RFQ-{rfq.rfq_id}
                          </span>
                          <div className="flex items-center gap-1">
                            {rfq.status === 'draft' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSend(rfq.rfq_id); }}
                                className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"
                                title="Send RFQ"
                              >
                                <Send size={14} />
                              </button>
                            )}
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </div>
                        <h4 className=" text-slate-900 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {rfq.created_by_name || 'System'}
                        </h4>
                        <div className="flex flex-col gap-1.5 mb-4">
                          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <Calendar size={12} />
                            <span>Created: {rfq.created_date ? new Date(rfq.created_date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <Clock size={12} />
                            <span>Expires: {rfq.valid_till ? new Date(rfq.valid_till).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <div className="flex gap-2">
                            <Badge color="info" className="text-xs py-0 px-1.5">{rfq.supplier_count || 0} Suppliers</Badge>
                            <Badge color="secondary" className="text-xs py-0 px-1.5">{rfq.item_count || 0} Items</Badge>
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
              data={filteredRFQs}
              renderActions={renderActions}
              filterable={false}
              sortable={true}
              pageSize={10}
              onRowClick={(row) => navigate(`/buying/rfq/${row.rfq_id}`)}
              className="modern-table"
            />
          </div>
        )}
      </div>

      <CreateRFQModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchRFQs()
          toast.addToast('RFQ created successfully', 'success')
        }}
      />
    </div>
  )
}