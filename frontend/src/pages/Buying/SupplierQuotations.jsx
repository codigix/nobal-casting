import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import Badge from '../../components/Badge/Badge'
import CreateQuotationModal from '../../components/Buying/CreateQuotationModal'
import { 
  Plus, Eye, Send, Trash2, CheckCircle, XCircle, 
  RefreshCw, ClipboardList, Clock, ShieldCheck, Search, IndianRupee,
  LayoutGrid, List, ChevronRight, Filter
} from 'lucide-react'
import { useToast } from '../../components/ToastContainer'
import './Buying.css'

const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-3 rounded border transition-all duration-200 cursor-pointer relative group ${
        isActive 
          ? 'border-indigo-600 ring-1 ring-indigo-600' 
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px]  text-neutral-500  ">{label}</span>
        <div className={`p-1.5 rounded ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-neutral-50 text-neutral-400 group-hover:text-neutral-600'}`}>
          <Icon size={14} />
        </div>
      </div>
      <div>
        <p className="text-2xl  text-neutral-900 ">{value}</p>
      </div>
      {isActive && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
      )}
    </div>
  )
}

const KanbanView = ({ data, onAction, getStatusColor }) => {
  const columns = [
    { id: 'draft', title: 'DRAFT', color: 'amber' },
    { id: 'received', title: 'RECEIVED', color: 'blue' },
    { id: 'accepted', title: 'ACCEPTED', color: 'emerald' },
    { id: 'rejected', title: 'REJECTED', color: 'rose' }
  ]

  return (
    <div className="flex gap-6 overflow-x-auto pb-6">
      {columns.map(column => (
        <div key={column.id} className="flex-1 min-w-[320px] bg-neutral-50/50 rounded border border-neutral-200 flex flex-col h-[calc(100vh-320px)]">
          <div className="p-3 border-b border-neutral-200 bg-white flex items-center justify-between">
            <h3 className="text-[11px]  text-neutral-600 flex items-center gap-2 ">
              <span className={`w-1.5 h-1.5 rounded-full bg-${column.color}-500`} />
              {column.title}
            </h3>
            <span className="text-[10px]  bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
              {data.filter(q => q.status === column.id).length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {data.filter(q => q.status === column.id).map(q => (
              <div 
                key={q.supplier_quotation_id} 
                className="bg-white p-4 rounded border border-neutral-200 hover:border-indigo-300 hover:  transition-all cursor-pointer group"
                onClick={() => onAction(q, 'view')}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[11px]  text-indigo-600 tracking-wider">
                    {q.supplier_quotation_id?.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-medium text-neutral-400">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h4 className="text-sm  text-neutral-900 mb-2 line-clamp-1">{q.supplier_name}</h4>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px]  bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded border border-neutral-200">
                    {q.rfq_id ? `RFQ: ${q.rfq_id}` : 'DIRECT'}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px]  text-neutral-400  ">Total Value</span>
                    <span className="text-sm  text-neutral-900">₹{(parseFloat(q.total_value) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction(q, 'view'); }}
                      className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    {q.status === 'draft' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAction(q, 'submit'); }}
                        className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    {q.status === 'received' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAction(q, 'accept'); }}
                        className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SupplierQuotations() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    received: 0,
    accepted: 0,
    rejected: 0,
    total_value: 0
  })
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewMode, setViewMode] = useState('list')
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    fetchQuotations()
  }, [])

  const fetchQuotations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/quotations')
      const data = response.data.data || []
      setQuotations(data)
      calculateStats(data)
      setRefreshTime(new Date())
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch quotations', 'error')
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      received: 0,
      accepted: 0,
      rejected: 0,
      total_value: 0
    }

    data.forEach((q) => {
      if (q.status) {
        newStats[q.status] = (newStats[q.status] || 0) + 1
      }
      newStats.total_value += parseFloat(q.total_value || 0)
    })

    setStats(newStats)
  }

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesFilter = activeFilter === 'all' || q.status === activeFilter
      const matchesSearch = 
        q.supplier_quotation_id?.toString().toLowerCase().includes(filters.search.toLowerCase()) ||
        q.supplier_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        q.rfq_id?.toString().toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = !filters.status || q.status === filters.status

      return matchesFilter && matchesSearch && matchesStatus
    })
  }, [quotations, activeFilter, filters])

  const handleSubmit = async (id) => {
    try {
      await api.patch(`/quotations/${id}/submit`)
      showToast('Quotation submitted successfully', 'success')
      fetchQuotations()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit quotation', 'error')
    }
  }

  const handleAccept = async (id) => {
    if (window.confirm('Are you sure you want to accept this quotation?')) {
      try {
        await api.patch(`/quotations/${id}/accept`)
        showToast('Quotation accepted successfully', 'success')
        fetchQuotations()
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to accept quotation', 'error')
      }
    }
  }

  const handleReject = async (id) => {
    try {
      await api.patch(`/quotations/${id}/reject`)
      showToast('Quotation rejected successfully', 'success')
      fetchQuotations()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject quotation', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await api.delete(`/quotations/${id}`)
        showToast('Quotation deleted successfully', 'success')
        fetchQuotations()
      } catch (err) {
        showToast(err.response?.data?.error || 'Failed to delete quotation', 'error')
      }
    }
  }

  const handleKanbanAction = (quotation, action) => {
    const id = quotation.supplier_quotation_id
    switch (action) {
      case 'view':
        navigate(`/buying/quotation/${id}`)
        break
      case 'submit':
        handleSubmit(id)
        break
      case 'accept':
        handleAccept(id)
        break
      default:
        break
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',           // Yellow - Action Required
      received: 'info',           // Blue - Quote Received from Supplier
      accepted: 'success',        // Green - Quote Selected/Accepted
      rejected: 'danger'          // Red - Quote Rejected
    }
    return colors[status] || 'secondary'
  }

  const columns = useMemo(() => [
    { 
      key: 'supplier_quotation_id', 
      label: 'QUOTE ID', 
      render: (val) => <span className="text-indigo-600  tracking-wider">{val?.toUpperCase()}</span>
    },
    { 
      key: 'supplier_name', 
      label: 'SUPPLIER',
      render: (val) => <span className=" text-neutral-900">{val}</span>
    },
    { 
      key: 'rfq_id', 
      label: 'RFQ REF', 
      render: (val) => val ? (
        <span className="text-[10px]  bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-200 ">
          {val}
        </span>
      ) : (
        <span className="text-[10px]  text-neutral-400  ">Direct</span>
      )
    },
    { 
      key: 'quote_date', 
      label: 'QUOTE DATE', 
      render: (val) => val ? (
        <span className="text-neutral-600 font-medium">{new Date(val).toLocaleDateString()}</span>
      ) : 'N/A'
    },
    { 
      key: 'total_value', 
      label: 'TOTAL VALUE', 
      render: (val) => (
        <div className="text-right">
          <span className="text-neutral-900 ">
            ₹{(parseFloat(val) || 0).toLocaleString('en-IN')}
          </span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'STATUS', 
      render: (val) => (
        <Badge color={getStatusColor(val)} variant="solid" className="  text-[9px]">
          {val?.toUpperCase()}
        </Badge>
      )
    },
    { 
      key: 'created_at', 
      label: 'CREATED', 
      render: (val) => val ? (
        <span className="text-neutral-500 font-medium text-xs">{new Date(val).toLocaleDateString()}</span>
      ) : 'N/A'
    }
  ], [])

  const [visibleColumns, setVisibleColumns] = useState(new Set(columns.map(c => c.key)))

  const renderActions = (row) => (
    <div className="flex gap-1 justify-end">
      <Button 
        size="sm"
        variant="secondary"
        onClick={() => navigate(`/buying/quotation/${row.supplier_quotation_id}`)}
        title="View Quotation"
        className="p-1.5 h-8 w-8 rounded  border-neutral-200"
      >
        <Eye size={14} className="text-neutral-600" />
      </Button>
      {row.status === 'draft' && (
        <>
          <Button 
            size="sm"
            variant="secondary"
            onClick={() => handleSubmit(row.supplier_quotation_id)}
            title="Submit Quotation"
            className="p-1.5 h-8 w-8 rounded  border-neutral-200 hover:border-emerald-500 group"
          >
            <Send size={14} className="text-neutral-500 group-hover:text-emerald-600" />
          </Button>
          <Button 
            size="sm"
            variant="secondary"
            onClick={() => handleDelete(row.supplier_quotation_id)}
            title="Delete Quotation"
            className="p-1.5 h-8 w-8 rounded  border-neutral-200 hover:border-rose-500 group"
          >
            <Trash2 size={14} className="text-neutral-500 group-hover:text-rose-600" />
          </Button>
        </>
      )}
      {row.status === 'received' && (
        <>
          <Button 
            size="sm"
            variant="secondary"
            onClick={() => handleAccept(row.supplier_quotation_id)}
            title="Accept Quotation"
            className="p-1.5 h-8 w-8 rounded  border-neutral-200 hover:border-emerald-500 group"
          >
            <CheckCircle size={14} className="text-neutral-500 group-hover:text-emerald-600" />
          </Button>
          <Button 
            size="sm"
            variant="secondary"
            onClick={() => handleReject(row.supplier_quotation_id)}
            title="Reject Quotation"
            className="p-1.5 h-8 w-8 rounded  border-neutral-200 hover:border-rose-500 group"
          >
            <XCircle size={14} className="text-neutral-500 group-hover:text-rose-600" />
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="w-full bg-neutral-50 min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto space-y-2">
        {/* Modern Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded border border-neutral-200 relative overflow-hidden  ">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600" />
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neutral-900 rounded">
              <ClipboardList className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl  text-neutral-900  ">
                Supplier Quotations
              </h1>
              <p className="text-[10px]  text-neutral-400 mt-0.5  ">Compare and manage quotes from suppliers</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-neutral-100 p-1 rounded border border-neutral-200">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white   text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                title="List View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded transition-all ${viewMode === 'kanban' ? 'bg-white   text-indigo-600' : 'text-neutral-400 hover:text-neutral-600'}`}
                title="Kanban View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            <button
              onClick={fetchQuotations}
              className="p-2.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 border border-neutral-200 rounded transition-all bg-white"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            <Button 
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              className="bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-2 px-4 py-2 rounded h-10 border-0"
            >
              <Plus size={16} strokeWidth={3} /> 
              <span className="text-xs   ">New Quotation</span>
            </Button>
          </div>
        </div>

        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Value"
            value={`₹${stats.total_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={IndianRupee}
            onClick={() => setActiveFilter('all')}
            isActive={activeFilter === 'all'}
          />
          <StatCard
            label="All Quotes"
            value={stats.total}
            icon={ClipboardList}
            onClick={() => setActiveFilter('all')}
            isActive={activeFilter === 'all'}
          />
          <StatCard
            label="Draft"
            value={stats.draft}
            icon={Clock}
            onClick={() => setActiveFilter('draft')}
            isActive={activeFilter === 'draft'}
          />
          <StatCard
            label="Received"
            value={stats.received}
            icon={Send}
            onClick={() => setActiveFilter('received')}
            isActive={activeFilter === 'received'}
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            icon={ShieldCheck}
            onClick={() => setActiveFilter('accepted')}
            isActive={activeFilter === 'accepted'}
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            onClick={() => setActiveFilter('rejected')}
            isActive={activeFilter === 'rejected'}
          />
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
            <input 
              type="text"
              placeholder="SEARCH QUOTATIONS..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-11 pr-4 py-2  bg-white border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all text-[11px]   "
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white border border-neutral-200 px-3 py-2 rounded">
              <Filter size={14} className="text-neutral-400" />
              <span className="text-[10px]  text-neutral-400  ">Status:</span>
              <select 
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="bg-transparent text-[11px]  text-indigo-600 focus:outline-none cursor-pointer  "
              >
                <option value="all">ALL STATUS</option>
                <option value="draft">DRAFT</option>
                <option value="received">RECEIVED</option>
                <option value="accepted">ACCEPTED</option>
                <option value="rejected">REJECTED</option>
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="flex items-center gap-2 text-[10px]  text-neutral-600 hover:border-indigo-600 hover:text-indigo-600 transition-all px-4 py-2  border border-neutral-200 rounded bg-white  "
              >
                <Eye size={14} />
                <span>Columns</span>
                <ChevronRight size={14} className={`transition-transform ${showColumnMenu ? 'rotate-90' : ''}`} />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded shadow  z-50 py-3 overflow-hidden">
                  <div className="px-4 py-2 border-b border-neutral-100 flex justify-between bg-neutral-50 mb-2">
                    <button 
                      onClick={() => setVisibleColumns(new Set(columns.map(c => c.key)))}
                      className="text-[9px]  text-indigo-600 hover:underline  "
                    >
                      Show All
                    </button>
                    <button 
                      onClick={() => setVisibleColumns(new Set())}
                      className="text-[9px]  text-rose-600 hover:underline  "
                    >
                      Hide All
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto px-1">
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50 cursor-pointer transition-colors group">
                        <input
                          type="checkbox"
                          className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-600 w-3.5 h-3.5"
                          checked={visibleColumns.has(col.key)}
                          onChange={() => {
                            const newSet = new Set(visibleColumns)
                            if (newSet.has(col.key)) newSet.delete(col.key)
                            else newSet.add(col.key)
                            setVisibleColumns(newSet)
                          }}
                        />
                        <span className="text-[10px]  text-neutral-600 group-hover:text-neutral-900  tracking-wider">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded border border-neutral-200   overflow-hidden">
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw size={40} className="text-indigo-600 animate-spin mx-auto mb-4 stroke-[1.5]" />
              <p className="text-[10px]  text-neutral-400  ">Syncing Quotations...</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="py-24 text-center px-4 bg-neutral-50/50">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-200">
                <ClipboardList size={32} className="text-neutral-300" />
              </div>
              <h3 className="text-sm  text-neutral-900 mb-2  ">No Quotations Found</h3>
              <p className="text-[11px] font-medium text-neutral-500 mb-8 max-w-xs mx-auto">Start by creating a new quotation or adjusting your search filters.</p>
              <Button 
                onClick={() => { setFilters({ status: '', search: '' }); setActiveFilter('all'); }}
                variant="secondary" 
                size="sm"
                className="p-2  rounded   text-[10px]   border-neutral-300"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="p-4">
              {viewMode === 'list' ? (
                <div className="overflow-x-auto">
                  <DataTable 
                    columns={columns}
                    data={filteredQuotations}
                    renderActions={renderActions}
                    filterable={false}
                    sortable={true}
                    pageSize={12}
                    externalVisibleColumns={visibleColumns}
                    hideColumnToggle={true}
                  />
                </div>
              ) : (
                <KanbanView 
                  data={filteredQuotations}
                  onAction={handleKanbanAction}
                  getStatusColor={getStatusColor}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <CreateQuotationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchQuotations()
          showToast('Quotation created successfully', 'success')
        }}
      />
    </div>
  )
}