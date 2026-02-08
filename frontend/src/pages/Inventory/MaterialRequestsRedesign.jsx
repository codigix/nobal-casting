import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Eye, Trash2, Search, Filter, 
  ChevronRight, ClipboardList, Clock, CheckCheck, AlertCircle,
  MoreVertical, Sliders, ArrowRight, Package, Warehouse,
  Building2, Calendar, ShoppingCart, Truck
} from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Badge from '../../components/Badge/Badge'
import CreateMaterialRequestModal from '../../components/Buying/CreateMaterialRequestModal'
import ViewMaterialRequestModal from '../../components/Buying/ViewMaterialRequestModal'

export default function MaterialRequestsRedesign() {
  const navigate = useNavigate()
  const toast = useToast()
  
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({ status: '', department: '', search: '' })
  const [departments, setDepartments] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedMrId, setSelectedMrId] = useState(null)
  const [stockData, setStockData] = useState({})
  const [viewMode, setViewMode] = useState('grid')

  useEffect(() => {
    fetchRequests()
    fetchDepartments()
  }, [filters])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.department) params.append('department', filters.department)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/material-requests?${params}`)
      const data = response.data.data || []
      setRequests(data)
      await checkItemsAvailability(data)
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to fetch material requests', 'error')
    } finally {
      setLoading(false)
    }
  }

  const checkItemsAvailability = async (requestsList) => {
    try {
      const allStockData = {}
      for (const request of requestsList) {
        const warehouse = request.source_warehouse || 'warehouse'
        for (const item of request.items || []) {
          const key = `${item.item_code}-${warehouse}`
          if (allStockData[key]) continue
          
          try {
            const res = await api.get(`/stock/stock-balance`, {
              params: { item_code: item.item_code, warehouse_id: warehouse }
            })
            const balance = res.data.data || res.data
            let availableQty = 0
            if (Array.isArray(balance)) {
              availableQty = balance.reduce((sum, b) => sum + (parseFloat(b.available_qty || b.current_qty || 0)), 0)
            } else if (balance && typeof balance === 'object') {
              availableQty = parseFloat(balance.available_qty || balance.current_qty || 0)
            }
            allStockData[key] = {
              available: availableQty,
              requested: parseFloat(item.qty),
              status: availableQty >= parseFloat(item.qty) ? 'available' : 'unavailable'
            }
          } catch (err) {
            allStockData[key] = { available: 0, requested: parseFloat(item.qty), status: 'unavailable' }
          }
        }
      }
      setStockData(allStockData)
    } catch (err) {
      console.error('Error checking stock availability:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/material-requests/departments')
      setDepartments(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material request?')) return
    try {
      await api.delete(`/material-requests/${id}`)
      toast.addToast('Material request deleted', 'success')
      fetchRequests()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to delete', 'error')
    }
  }

  const stats = useMemo(() => {
    const total = requests.length
    const draft = requests.filter(r => r.status === 'draft').length
    const approved = requests.filter(r => r.status === 'approved').length
    const partial = requests.filter(r => r.status === 'partial').length
    const completed = requests.filter(r => r.status === 'completed').length
    const purchase = requests.filter(r => r.purpose === 'purchase').length
    return { total, draft, approved, partial, completed, purchase }
  }, [requests])

  const getStatusStyle = (status) => {
    const styles = {
      draft: 'bg-amber-50 text-amber-600 border-amber-100',
      approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      partial: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      completed: 'bg-blue-50 text-blue-600 border-blue-100',
      converted: 'bg-slate-100 text-slate-600 border-slate-200',
      cancelled: 'bg-rose-50 text-rose-600 border-rose-100'
    }
    return styles[status] || styles.draft
  }

  const getPurposeIcon = (purpose) => {
    switch (purpose) {
      case 'purchase': return <ShoppingCart size={16} />
      case 'material_transfer': return <Warehouse size={16} />
      case 'material_issue': return <Truck size={16} />
      default: return <Package size={16} />
    }
  }

  const getItemsAvailabilityStatus = (row) => {
    const warehouse = row.source_warehouse || 'warehouse'
    const items = row.items || []
    if (items.length === 0) return { all: 'available', available: 0, unavailable: 0 }
    let availableCount = 0
    let unavailableCount = 0
    for (const item of items) {
      const key = `${item.item_code}-${warehouse}`
      const itemStock = stockData[key]
      if (itemStock && itemStock.status === 'available') availableCount++
      else unavailableCount++
    }
    return {
      all: unavailableCount === 0 ? 'available' : (availableCount === 0 ? 'unavailable' : 'partial'),
      available: availableCount,
      unavailable: unavailableCount
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 p-6">
      <div className="max-w-5xl mx-auto">
        <CreateMaterialRequestModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchRequests()
            toast.addToast('Material request created successfully', 'success')
          }}
        />

        <ViewMaterialRequestModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false)
            setSelectedMrId(null)
          }}
          mrId={selectedMrId}
          onStatusChange={() => fetchRequests()}
        />

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 my-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded  bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <ClipboardList size={24} />
              </div>
              <div>
                <h1 className="text-xl   text-slate-900">Material Requests</h1>
                <p className="text-slate-500 font-medium text-sm">Manage and track material requisitions</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded  border border-slate-200  ">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded  text-sm  transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded  text-sm  transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                List
              </button>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded   text-sm shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
            >
              <Plus size={20} />
              New Request
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Requests', value: stats.total, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Draft', value: stats.draft, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Partial', value: stats.partial, icon: AlertCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Completed', value: stats.completed, icon: CheckCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Purchase Req', value: stats.purchase, icon: ShoppingCart, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded p-2 border border-slate-200  flex items-center gap-4">
              <div className={`w-12 h-12 rounded  ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs  text-slate-400 ">{stat.label}</p>
                <h3 className="text-xl   text-slate-900">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded p-2 border border-slate-200  mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by ID, Requester or Department..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-2 rounded bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="bg-slate-50 border-none rounded  p-2 text-xs  text-slate-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer "
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
              <option value="converted">Converted</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select 
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="bg-slate-50 border-none rounded  p-2 text-xs  text-slate-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer "
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200  ">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Loading material requests...</p>
          </div>
        ) : requests.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((row) => {
                const stockStatus = getItemsAvailabilityStatus(row)
                return (
                  <div 
                    key={row.mr_id}
                    className="bg-white rounded border border-slate-200  hover:shadow  hover:border-indigo-200 transition-all group "
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded  flex items-center justify-center ${getStatusStyle(row.status)}`}>
                            {getPurposeIcon(row.purpose)}
                          </div>
                          <div>
                            <h3 className=" text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {row.mr_id}
                            </h3>
                            <span className="text-xs font-medium text-slate-400 ">
                              {row.purpose.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <Badge color={getStatusStyle(row.status).split(' ')[1].replace('text-', '').replace('-600', '')}>
                          {row.status}
                        </Badge>
                      </div>

                      <div className="space-y-3 mb-5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium text-xs">Requester</span>
                          <span className="text-slate-700 text-xs flex items-center gap-1.5">
                            <Building2 size={14} className="text-slate-400" />
                            {row.requested_by_name || row.requested_by_id}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium text-xs">Department</span>
                          <span className="text-slate-700 ">{row.department}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium text-xs">Required By</span>
                          <span className="text-slate-700 text-xs flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            {row.required_by_date ? new Date(row.required_by_date).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-slate-50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs  text-slate-400 ">Stock Status</span>
                            <span className={`text-xs  ${
                              stockStatus.all === 'available' ? 'text-emerald-600' : 
                              stockStatus.all === 'partial' ? 'text-amber-600' : 'text-rose-600'
                            }`}>
                              {stockStatus.available}/{(row.items || []).length} Items Available
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                stockStatus.all === 'available' ? 'bg-emerald-500' : 
                                stockStatus.all === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${(stockStatus.available / (row.items?.length || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
                        <div className="flex gap-1">
                          {row.status === 'draft' && (
                            <button 
                              onClick={() => handleDelete(row.mr_id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded  transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedMrId(row.mr_id)
                            setViewModalOpen(true)
                          }}
                          className="p-2 bg-indigo-50 text-indigo-600 rounded  text-sm  flex items-center gap-2 hover:bg-indigo-100 transition-all"
                        >
                          Details <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded border border-slate-200 ">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-2 text-left text-xs text-slate-400 ">Request</th>
                      <th className="p-2 text-left text-xs text-slate-400 ">Requester</th>
                      <th className="p-2 text-left text-xs text-slate-400 ">Purpose</th>
                      <th className="p-2 text-left text-xs text-slate-400 ">Stock Status</th>
                      <th className="p-2 text-left text-xs text-slate-400 ">Status</th>
                      <th className="p-2 text-xs text-slate-400 ">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {requests.map((row) => {
                      const stockStatus = getItemsAvailabilityStatus(row)
                      return (
                        <tr key={row.mr_id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded  flex items-center justify-center ${getStatusStyle(row.status)}`}>
                                {getPurposeIcon(row.purpose)}
                              </div>
                              <div>
                                <p className=" text-slate-900 group-hover:text-indigo-600 transition-colors">{row.mr_id}</p>
                                <p className="text-xs font-medium text-slate-400">{new Date(row.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <p className="text-xs text-slate-700">{row.requested_by_name || row.requested_by_id}</p>
                            <p className="text-xs font-medium text-slate-400">{row.department}</p>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="text-xs  text-slate-600 capitalize">
                              {row.purpose.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    stockStatus.all === 'available' ? 'bg-emerald-500' : 
                                    stockStatus.all === 'partial' ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${(stockStatus.available / (row.items?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-xs  text-slate-500">
                                {stockStatus.available}/{(row.items || []).length}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 whitespace-nowrap">
                            <Badge color={getStatusStyle(row.status).split(' ')[1].replace('text-', '').replace('-600', '')}>
                              {row.status}
                            </Badge>
                          </td>
                          <td className="p-2 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedMrId(row.mr_id)
                                  setViewModalOpen(true)
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-colors"
                              >
                                <Eye size={18} />
                              </button>
                              {row.status === 'draft' && (
                                <button 
                                  onClick={() => handleDelete(row.mr_id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded  transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <ClipboardList size={32} />
            </div>
            <h3 className="text-lg  text-slate-900 mb-1">No requests found</h3>
            <p className="text-slate-500 max-w-xs text-center">Try adjusting your filters or create a new material request to get started.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-6 flex items-center gap-2 text-indigo-600  hover:text-indigo-700 transition-colors"
            >
              <Plus size={20} /> Create New Request
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
