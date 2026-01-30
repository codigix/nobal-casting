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
  LayoutGrid, List
} from 'lucide-react'
import { useToast } from '../../components/ToastContainer'
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
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-4 rounded-md border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 shadow-md border-indigo-300' : ''}`}
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

const KanbanView = ({ data, onAction, getStatusColor }) => {
  const columns = [
    { id: 'draft', title: 'Draft' },
    { id: 'received', title: 'Received' },
    { id: 'accepted', title: 'Accepted' },
    { id: 'rejected', title: 'Rejected' }
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {columns.map(column => (
        <div key={column.id} className="flex-1 min-w-[300px] bg-gray-100/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className=" text-gray-700 flex items-center gap-2 uppercase text-xs tracking-wider">
              <span className={`w-2 h-2 rounded-full bg-${getStatusColor(column.id)}-500`} />
              {column.title}
              <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                {data.filter(q => q.status === column.id).length}
              </span>
            </h3>
          </div>
          <div className="space-y-3">
            {data.filter(q => q.status === column.id).map(q => (
              <div 
                key={q.supplier_quotation_id} 
                className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onAction(q, 'view')}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs  text-blue-600">{q.supplier_quotation_id}</span>
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 className=" text-gray-900 text-sm mb-1 truncate">{q.supplier_name}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <Badge color="info" size="xs">{q.rfq_id ? `RFQ: ${q.rfq_id}` : 'Direct'}</Badge>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase  tracking-tighter">Total Value</span>
                    <span className="text-sm  text-gray-900">₹{(parseFloat(q.total_value) || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex gap-1  transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAction(q, 'view'); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye size={14} />
                    </button>
                    {q.status === 'draft' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAction(q, 'submit'); }}
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    {q.status === 'received' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onAction(q, 'accept'); }}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
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

  const columns = [
    { 
      key: 'supplier_quotation_id', 
      label: 'Quote ID', 
      width: '12%',
      render: (val) => <span className=" text-primary-600">{val}</span>
    },
    { key: 'supplier_name', label: 'Supplier', width: '15%' },
    { 
      key: 'rfq_id', 
      label: 'RFQ Ref', 
      width: '10%',
      render: (val) => val ? <Badge color="info">{val}</Badge> : 'Direct'
    },
    { 
      key: 'quote_date', 
      label: 'Quote Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'total_value', 
      label: 'Total Value', 
      width: '12%',
      render: (val) => (
        <span className=" text-gray-900">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (val) => (
        <Badge color={getStatusColor(val)} variant="solid">
          {val?.toUpperCase()}
        </Badge>
      )
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    }
  ]

  const renderActions = (row) => (
    <div className="flex gap-2">
      <Button 
        size="sm"
        variant="icon"
        onClick={() => navigate(`/buying/quotation/${row.supplier_quotation_id}`)}
        title="View Quotation"
        className="p-2"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'draft' && (
        <>
          <Button 
            size="sm"
            variant="icon-info"
            onClick={() => handleSubmit(row.supplier_quotation_id)}
            title="Submit Quotation"
            className="p-2"
          >
            <Send size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-danger"
            onClick={() => handleDelete(row.supplier_quotation_id)}
            title="Delete Quotation"
            className="p-2"
          >
            <Trash2 size={16} />
          </Button>
        </>
      )}
      {row.status === 'received' && (
        <>
          <Button 
            size="sm"
            variant="icon-success"
            onClick={() => handleAccept(row.supplier_quotation_id)}
            title="Accept Quotation"
            className="p-2 text-emerald-600 hover:bg-emerald-50"
          >
            <CheckCircle size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-danger"
            onClick={() => handleReject(row.supplier_quotation_id)}
            title="Reject Quotation"
            className="p-2 text-rose-600 hover:bg-rose-50"
          >
            <XCircle size={16} />
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="w-full bg-gray-50 min-h-screen p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Modern Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-3 rounded border border-gray-200  relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
          <div>
            <h1 className="text-xl   text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <ClipboardList className="text-indigo-600" size={24} />
              </div>
              Supplier Quotations
            </h1>
            <p className="text-xs text-gray-500 mt-1  ml-11">Compare and manage quotes from suppliers</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 p-1 rounded-lg mr-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="List View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Kanban View"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
            <div className="hidden lg:block text-right mr-2">
              <p className="text-xs text-gray-400  uppercase">Last Sync</p>
              <p className="text-xs text-gray-600 font-medium">{refreshTime.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={fetchQuotations}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <Button 
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-600/20 p-2"
            >
              <Plus size={18} strokeWidth={3} /> <span className="  text-xs text-white">New Quotation</span>
            </Button>
          </div>
        </div>

        {/* Interactive Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            label="Total Value"
            value={`₹${stats.total_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={IndianRupee}
            color="primary"
            onClick={() => setActiveFilter('all')}
            isActive={activeFilter === 'all'}
          />
          <StatCard
            label="All Quotes"
            value={stats.total}
            icon={ClipboardList}
            color="info"
            onClick={() => setActiveFilter('all')}
            isActive={activeFilter === 'all'}
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
            label="Received"
            value={stats.received}
            icon={Send}
            color="info"
            onClick={() => setActiveFilter('received')}
            isActive={activeFilter === 'received'}
          />
          <StatCard
            label="Accepted"
            value={stats.accepted}
            icon={ShieldCheck}
            color="success"
            onClick={() => setActiveFilter('accepted')}
            isActive={activeFilter === 'accepted'}
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="danger"
            onClick={() => setActiveFilter('rejected')}
            isActive={activeFilter === 'rejected'}
          />
        </div>

        {/* Filters Section */}
        <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <AdvancedFilters 
            filters={filters}
            onFilterChange={setFilters}
            filterConfig={[
              {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: [
                  { value: '', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'received', label: 'Received' },
                  { value: 'accepted', label: 'Accepted' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                key: 'search',
                label: 'Search',
                type: 'text',
                placeholder: 'Quote ID, supplier or RFQ...'
              }
            ]}
          />
        </div>

        <div className="bg-white rounded border border-gray-200 ">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={32} className="text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Loading quotations...</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="py-20 text-center px-4">
              <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg  text-gray-900 mb-1">No Quotations Found</h3>
              <p className="text-gray-500 mb-6">Start by creating a new quotation or adjusting your filters.</p>
              <Button 
                onClick={() => { setFilters({ status: '', search: '' }); setActiveFilter('all'); }}
                variant="secondary" 
                size="sm"
              >
                Clear all filters
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
                    pageSize={10}
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