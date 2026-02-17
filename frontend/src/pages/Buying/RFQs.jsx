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
  const [showColumnMenu, setShowColumnMenu] = useState(false)
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
        badge: 'bg-amber-50 text-amber-700 border-amber-200', 
        iconColor: 'text-amber-500', 
        icon: FileText 
      },
      sent: { 
        label: 'Sent', 
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', 
        iconColor: 'text-indigo-500', 
        icon: Send 
      },
      responses_received: { 
        label: 'Responses Received', 
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        iconColor: 'text-emerald-500', 
        icon: MessageSquare 
      },
      closed: { 
        label: 'Closed', 
        badge: 'bg-neutral-100 text-neutral-600 border-neutral-200', 
        iconColor: 'text-neutral-400', 
        icon: XCircle 
      }
    }
    return configs[status] || { 
      label: status?.replace('_', ' ').toUpperCase(), 
      badge: 'bg-neutral-50 text-neutral-600 border-neutral-200', 
      iconColor: 'text-neutral-400', 
      icon: ClipboardList 
    }
  }

  const kanbanColumns = [
    { status: 'draft', title: 'Draft', icon: FileText, theme: 'amber' },
    { status: 'sent', title: 'Sent to Suppliers', icon: Send, theme: 'indigo' },
    { status: 'responses_received', title: 'Responses Received', icon: MessageSquare, theme: 'emerald' },
    { status: 'closed', title: 'Closed', icon: XCircle, theme: 'neutral' }
  ]

  const columns = useMemo(() => [
    { 
      key: 'rfq_id', 
      label: 'RFQ ID', 
      render: (val) => (
        <span className="  text-indigo-600 ">
          RFQ-{val}
        </span>
      )
    },
    { 
      key: 'created_by_name', 
      label: 'Created By', 
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded  bg-neutral-100 flex items-center justify-center border border-neutral-200">
            <User size={12} strokeWidth={3} className="text-neutral-400" />
          </div>
          <span className="  text-neutral-900 ">
            {val || 'System'}
          </span>
        </div>
      )
    },
    { 
      key: 'created_date', 
      label: 'Created Date', 
      render: (val) => (
        <div className="  text-neutral-400 ">
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    { 
      key: 'valid_till', 
      label: 'Valid Till', 
      render: (val) => (
        <div className="  text-neutral-400 ">
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    { 
      key: 'supplier_count', 
      label: 'Suppliers', 
      render: (val) => (
        <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200    rounded ">
          {val || '0'}
        </Badge>
      )
    },
    { 
      key: 'item_count', 
      label: 'Items', 
      render: (val) => (
        <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100    rounded ">
          {val || '0'}
        </Badge>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (val) => {
        const config = getStatusConfig(val)
        return (
          <Badge className={`${config.badge}    rounded  px-3 py-1.5`}>
            {config.label}
          </Badge>
        )
      }
    }
  ], [])

  const [visibleColumns, setVisibleColumns] = useState(new Set(columns.map(c => c.key)))

  const renderActions = (row) => (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/rfq/${row.rfq_id}`)
        }}
        className="h-8 w-8 rounded  border-neutral-200 text-neutral-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30"
        title="View Details"
      >
        <Eye size={14} strokeWidth={3} />
      </Button>
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="icon"
          onClick={(e) => {
            e.stopPropagation()
            handleSend(row.rfq_id)
          }}
          className="h-8 w-8 rounded  bg-emerald-50/50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white"
          title="Send RFQ"
        >
          <Send size={14} strokeWidth={3} />
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
          className="h-8 w-8 rounded  bg-indigo-50/50 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white"
          title="View Responses"
        >
          <MessageSquare size={14} strokeWidth={3} />
        </Button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Modern Header Section */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className=" mx-auto p-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px]    text-neutral-400">
                <Building2 size={12} strokeWidth={3} className="text-indigo-500" />
                <span>Buying</span>
                <ChevronRight size={10} strokeWidth={3} />
                <span className="text-neutral-900">RFQs</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded ">
                  <Mail size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900   leading-none">Request for Quotation</h1>
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px]    mt-1">
                    <History size={12} strokeWidth={3} className="text-indigo-500" />
                    <span>Last Refreshed {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-neutral-100 p-1 rounded  border border-neutral-200 flex items-center">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded  text-[10px]    transition-all ${
                    viewMode === 'kanban' 
                      ? 'bg-white text-indigo-600   border border-neutral-200' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <LayoutGrid size={14} strokeWidth={3} />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded  text-[10px]    transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-indigo-600   border border-neutral-200' 
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <List size={14} strokeWidth={3} />
                  <span>List View</span>
                </button>
              </div>

              <div className="h-8 w-[1px] bg-neutral-200 mx-1 hidden sm:block"></div>

              <button
                onClick={fetchRFQs}
                className="p-2 text-neutral-400 hover:text-indigo-600 transition-all"
                title="Refresh Data"
              >
                <RefreshCw size={16} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
              </button>

              <Button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2  rounded   flex items-center gap-2 transition-all border-none text-[10px]   "
              >
                <Plus size={16} strokeWidth={3} />
                <span>New RFQ</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto w-full px-4 lg:px-8 py-8 space-y-8">
        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { id: '', label: 'Total RFQs', value: stats.total, icon: ClipboardList, color: 'indigo' },
            { id: 'draft', label: 'Draft', value: stats.draft, icon: FileText, color: 'amber' },
            { id: 'sent', label: 'Sent', value: stats.sent, icon: Send, color: 'indigo' },
            { id: 'responses_received', label: 'Responses', value: stats.responses, icon: MessageSquare, color: 'emerald' },
            { id: 'closed', label: 'Closed', value: stats.closed, icon: XCircle, color: 'neutral' }
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setActiveFilter(stat.id)}
              className={`bg-white p-2 rounded border transition-all duration-300 group text-left ${
                activeFilter === stat.id 
                ? `border-indigo-500   ring-1 ring-indigo-500` 
                : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2.5 bg-neutral-50 rounded  border border-neutral-100 text-neutral-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors`}>
                  <stat.icon size={20} />
                </div>
                {activeFilter === stat.id && (
                  <div className="bg-indigo-500 w-1.5 h-1.5 rounded-full" />
                )}
              </div>
              <div>
                <p className="text-xl  text-neutral-900  leading-none mb-2 ">{stat.value}</p>
                <p className="text-[10px]  text-neutral-400  ">{stat.label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-500 transition-colors" size={16} strokeWidth={3} />
            <input 
              type="text"
              placeholder="SEARCH BY RFQ ID OR CREATOR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2  bg-white border border-neutral-200 rounded  focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-[10px]    placeholder:text-neutral-300"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-200">
              <div className="flex items-center gap-2">
                <Filter size={12} strokeWidth={3} className="text-neutral-400" />
                <span className="text-[10px]  text-neutral-400  ">Status:</span>
              </div>
              <div className="h-4 w-[1px] bg-neutral-200 mx-1"></div>
              <select 
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="bg-transparent text-[10px]  text-indigo-600 focus:outline-none cursor-pointer  "
              >
                <option value="">ALL STATUS</option>
                <option value="draft">DRAFT</option>
                <option value="sent">SENT</option>
                <option value="responses_received">RESPONSES</option>
                <option value="closed">CLOSED</option>
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-[10px]  text-neutral-600 hover:border-indigo-500 hover:text-indigo-600 transition-all  "
              >
                <Eye size={12} strokeWidth={3} />
                <span>Columns</span>
                <ChevronRight size={12} strokeWidth={3} className={`transition-transform ${showColumnMenu ? 'rotate-90' : ''}`} />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-900  z-50 py-0">
                  <div className="p-2  border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                    <span className="text-[10px]  text-neutral-900  ">Visible Columns</span>
                  </div>
                  <div className="p-2 border-b border-neutral-100 flex gap-2">
                    <button 
                      onClick={() => setVisibleColumns(new Set(columns.map(c => c.key)))}
                      className="flex-1 py-1.5 text-[9px]  text-indigo-600 hover:bg-indigo-50   border border-indigo-100"
                    >
                      Show All
                    </button>
                    <button 
                      onClick={() => setVisibleColumns(new Set())}
                      className="flex-1 py-1.5 text-[9px]  text-rose-600 hover:bg-rose-50   border border-rose-100"
                    >
                      Hide All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="rounded  border-neutral-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                          checked={visibleColumns.has(col.key)}
                          onChange={() => {
                            const newSet = new Set(visibleColumns)
                            if (newSet.has(col.key)) newSet.delete(col.key)
                            else newSet.add(col.key)
                            setVisibleColumns(newSet)
                          }}
                        />
                        <span className="text-[10px]  text-neutral-600 group-hover:text-neutral-900  ">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="py-32 text-center bg-white border border-neutral-200">
            <div className="inline-flex p-6 bg-neutral-50 mb-6">
              <RefreshCw size={40} strokeWidth={3} className="text-indigo-600 animate-spin" />
            </div>
            <h3 className="text-xl  text-neutral-900   mb-2">Synchronizing RFQs</h3>
            <p className="text-neutral-400 text-[10px]   ">Please wait while we fetch the latest requests...</p>
          </div>
        ) : filteredRFQs.length === 0 ? (
          <div className="py-24 text-center bg-white border border-neutral-200 flex flex-col items-center">
            <div className="w-16 h-16 bg-neutral-50 flex items-center justify-center mb-8 border border-neutral-100">
              <Search size={32} strokeWidth={3} className="text-neutral-200" />
            </div>
            <h3 className="text-xl  text-neutral-900   mb-2">No RFQs Found</h3>
            <p className="text-neutral-400 text-[10px]    mb-8 max-w-sm leading-loose">
              We couldn't find any RFQs matching your current filters. Try adjusting your search or filters.
            </p>
            <Button 
              onClick={() => {
                setFilters({ status: '', search: '' });
                setSearchQuery('');
                setActiveFilter('');
              }}
              variant="secondary"
              className="rounded  px-12 py-3 border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white  text-[10px]   transition-all"
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
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 bg-${column.theme === 'neutral' ? 'neutral-100' : `${column.theme}-50`} text-${column.theme === 'neutral' ? 'neutral-600' : `${column.theme}-600`} border border-${column.theme === 'neutral' ? 'neutral-200' : `${column.theme}-100`}`}>
                        <column.icon size={14} strokeWidth={3} />
                      </div>
                      <h3 className="text-[10px]  text-neutral-900  ">{column.title}</h3>
                    </div>
                    <span className="bg-neutral-900 text-white px-2 py-0.5 text-[10px]  ">
                      {columnRFQs.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-h-[500px]">
                    {columnRFQs.map((rfq) => (
                      <div
                        key={rfq.rfq_id}
                        onClick={() => navigate(`/buying/rfq/${rfq.rfq_id}`)}
                        className="bg-white p-5 border border-neutral-200 hover:border-indigo-500 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[9px]  text-indigo-500   mb-1">
                              RFQ ID
                            </span>
                            <span className="text-xs  text-neutral-900   group-hover:text-indigo-600 transition-colors">
                              RFQ-{rfq.rfq_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {rfq.status === 'draft' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSend(rfq.rfq_id); }}
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                                title="Send RFQ"
                              >
                                <Send size={14} strokeWidth={3} />
                              </button>
                            )}
                            <div className="p-1.5 bg-neutral-50 text-neutral-400  transition-all">
                              <ArrowUpRight size={14} strokeWidth={3} />
                            </div>
                          </div>
                        </div>
                        <h4 className=" text-neutral-700 text-[10px]   mb-4 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {rfq.created_by_name || 'System'}
                        </h4>
                        <div className="flex flex-col gap-2 mb-5">
                          <div className="flex items-center gap-2 text-neutral-400 text-[9px]   ">
                            <Calendar size={12} strokeWidth={3} />
                            <span>Created: {rfq.created_date ? new Date(rfq.created_date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-neutral-400 text-[9px]   ">
                            <Clock size={12} strokeWidth={3} />
                            <span>Expires: {rfq.valid_till ? new Date(rfq.valid_till).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                          <div className="flex gap-2">
                            <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200    rounded  text-[9px] px-2 py-0.5">{rfq.supplier_count || 0} Suppliers</Badge>
                            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100    rounded  text-[9px] px-2 py-0.5">{rfq.item_count || 0} Items</Badge>
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
              data={filteredRFQs}
              renderActions={renderActions}
              filterable={false}
              sortable={true}
              pageSize={10}
              onRowClick={(row) => navigate(`/buying/rfq/${row.rfq_id}`)}
              className="modern-table"
              externalVisibleColumns={visibleColumns}
              hideColumnToggle={true}
            />
          </div>
        )}
      </main>

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