import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Eye, Trash2, Search, Filter, 
  ChevronRight, ClipboardList, Clock, CheckCheck, AlertCircle,
  MoreVertical, Sliders, ArrowRight, Package, Warehouse,
  Building2, Calendar, ShoppingCart, Truck, RefreshCw,
  History, TrendingUp, CheckCircle2, ShieldCheck, Info,
  LayoutGrid, List, FileText, Download, Settings2, X, XCircle,
  Zap, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Badge from '../../components/Badge/Badge'
import Card from '../../components/Card/Card'
import CreateMaterialRequestModal from '../../components/Buying/CreateMaterialRequestModal'
import ViewMaterialRequestModal from '../../components/Buying/ViewMaterialRequestModal'

// --- Custom Components ---

const MaterialGauge = ({ available, total }) => {
  const percentage = total > 0 ? Math.min(100, Math.round((available / total) * 100)) : 0;
  const data = [
    { name: 'Available', value: percentage, fill: percentage === 100 ? '#10b981' : percentage > 50 ? '#3b82f6' : '#f59e0b' },
    { name: 'Missing', value: 100 - percentage, fill: '#f1f5f9' }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center w-12 h-12">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={20}
            outerRadius={22}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px]  text-slate-700">{percentage}%</span>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, status, icon: Icon, colorClass, trend }) => (
  <Card className="p-2 bg-white border-slate-100 relative overflow-hidden group hover: transition-all duration-300">
    <div className={`absolute top-0 right-0 w-20 h-20 opacity-[0.03] -mr-6 -mt-6 rounded transition-transform group-hover:scale-150 duration-700 ${colorClass.split(' ')[0].replace('text-', 'bg-')}`}></div>
    
    <div className="flex justify-between items-start mb-2 relative">
      <div className={`p-2 rounded ${colorClass.replace('text-', 'bg-').replace('-600', '-500/10')} ${colorClass}`}>
        <Icon size={10} strokeWidth={2.5} />
      </div>
      {status && (
        <span className={`p-1 rounded  text-[9px]   border ${colorClass.replace('text-', 'bg-').replace('-600', '-500/10')} ${colorClass.replace('text-', 'border-').replace('-600', '-500/20')}`}>
          {status}
        </span>
      )}
    </div>

    <div className="relative">
      <p className="text-xs  text-slate-400   mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-xl  text-slate-900">{value}</h3>
        {trend && (
          <span className={`text-xs  flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  </Card>
);

const SkeletonRow = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 animate-pulse">
    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
      <div key={i} className="bg-white rounded p-6 border border-slate-100 h-64  relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100"></div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-slate-100"></div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-100 rounded"></div>
              <div className="h-2 w-16 bg-slate-50 rounded"></div>
            </div>
          </div>
          <div className="w-6 h-6 rounded  bg-slate-50"></div>
        </div>
        <div className="space-y-2 mb-2">
          <div className="h-12 w-full bg-slate-50 rounded"></div>
          <div className="flex justify-between px-1">
            <div className="h-6 w-20 bg-slate-100 rounded "></div>
            <div className="h-6 w-16 bg-slate-100 rounded "></div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-10 flex-1 bg-slate-100 rounded"></div>
          <div className="h-10 w-10 bg-slate-50 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

const FilterPill = ({ label, active, onClick, icon: Icon }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 p-2 px-3 rounded text-xs  transition-all border ${
      active 
        ? 'bg-blue-600 text-white border-blue-600  shadow-blue-600/20' 
        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
    }`}
  >
    {Icon && <Icon size={14} />}
    {label}
  </button>
);

export default function MaterialRequestsRedesign() {
  const navigate = useNavigate()
  const toast = useToast()
  
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', department: '', search: '' })
  const [departments, setDepartments] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedMrId, setSelectedMrId] = useState(null)
  const [stockData, setStockData] = useState({})
  const [viewMode, setViewMode] = useState('grid')
  const [refreshTime, setRefreshTime] = useState(new Date())

  const getCleanFGName = (name) => {
    if (!name) return ''
    
    // Normalize newlines (handle literal \n strings if they exist)
    const normalized = name.replace(/\\n/g, '\n')
    
    // Split into lines by actual newlines OR literal \n characters
    const lines = normalized.split(/\n|\\n/).map(l => l.trim()).filter(l => l.length > 0)
    
    // 1. Look for a line that contains "Item:" (case-insensitive)
    const itemLine = lines.find(line => line.toLowerCase().includes('item:'))
    if (itemLine) {
      // Extract only what follows "Item:" on that line
      return itemLine.replace(/.*item:\s*/i, '').trim()
    }
    
    // 2. Filter out common metadata lines if we haven't found an Item: line
    const metadataKeywords = ['material request', 'planned quantity', 'includes raw', 'bom:', 'quantity:']
    const cleanLines = lines.filter(line => {
      const l = line.toLowerCase()
      return !metadataKeywords.some(kw => l.includes(kw))
    })
    
    if (cleanLines.length > 0) {
      return cleanLines[0].replace(/^Item:\s*/i, '').trim()
    }
    
    return lines[0]?.replace(/^Item:\s*/i, '').trim() || ''
  }

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.department) params.append('department', filters.department)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/material-requests?${params}`)
      const data = response.data.data || []
      setRequests(data)
      setRefreshTime(new Date())
      await checkItemsAvailability(data)
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to fetch material requests', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  const checkItemsAvailability = async (requestsList) => {
    try {
      const allStockData = {}
      // To optimize, let's collect unique item-warehouse pairs
      const uniquePairs = new Set()
      requestsList.forEach(r => {
        const warehouse = r.source_warehouse || 'warehouse'
        r.items?.forEach(item => {
          uniquePairs.add(`${item.item_code}|${warehouse}`)
        })
      })

      // Fetch availability for each unique pair
      // In a real app, you'd want a bulk endpoint for this
      for (const pair of uniquePairs) {
        const [item_code, warehouse_id] = pair.split('|')
        try {
          const res = await api.get(`/stock/stock-balance`, {
            params: { item_code, warehouse_id: warehouse_id === 'warehouse' ? undefined : warehouse_id }
          })
          const balance = res.data.data || res.data
          let availableQty = 0
          if (Array.isArray(balance)) {
            availableQty = balance.reduce((sum, b) => sum + (parseFloat(b.available_qty || b.current_qty || 0)), 0)
          } else if (balance && typeof balance === 'object') {
            availableQty = parseFloat(balance.available_qty || balance.current_qty || 0)
          }
          allStockData[`${item_code}-${warehouse_id}`] = availableQty
        } catch (err) {
          allStockData[`${item_code}-${warehouse_id}`] = 0
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

  useEffect(() => {
    fetchRequests()
    fetchDepartments()
  }, [fetchRequests])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material request?')) return
    try {
      await api.delete(`/material-requests/${id}`)
      toast.addToast('Material request deleted successfully', 'success')
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
    
    // Simple mock trends
    return { total, draft, approved, partial, completed, purchase }
  }, [requests])

  const getStatusConfig = (status) => {
    const configs = {
      draft: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock, label: 'Draft' },
      pending: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Clock, label: 'Pending' },
      approved: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2, label: 'Approved' },
      partial: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: Activity, label: 'Partial' },
      completed: { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: ShieldCheck, label: 'Completed' },
      cancelled: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: XCircle, label: 'Cancelled' },
      rejected: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: XCircle, label: 'Rejected' }
    }
    return configs[status] || configs.draft
  }

  const getRequestAvailability = useCallback((row) => {
    const warehouse = row.source_warehouse || 'warehouse'
    const items = row.items || []
    if (items.length === 0) return { availableCount: 0, totalCount: 0, percentage: 0 }
    
    let availableCount = 0
    items.forEach(item => {
      const available = stockData[`${item.item_code}-${warehouse}`] || 0
      if (available >= parseFloat(item.qty)) availableCount++
    })
    
    return {
      availableCount,
      totalCount: items.length,
      percentage: Math.round((availableCount / items.length) * 100)
    }
  }, [stockData])

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = !filters.search || 
        r.mr_id?.toString().toLowerCase().includes(filters.search.toLowerCase()) || 
        r.project_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.requested_by_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.department?.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.finished_goods_name?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = !filters.status || r.status === filters.status
      const matchesDept = !filters.department || r.department === filters.department
      
      return matchesSearch && matchesStatus && matchesDept
    })
  }, [requests, filters])

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 p-2">
      {/* Header - Industrial Blue Theme */}
      <div className=" text-white p-2">
        <div className=" bg-white/5 rounded "></div>
        <div className=" mx-auto relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/10 rounded backdrop-blur-md border border-white/20">
                  <ClipboardList size={24} className="text-blue-800" />
                </div>
                <div>
                  <h1 className="text-xl  ">Material Requisitions</h1>
                  <div className="flex items-center ga2 mt-1">
                    <span className="text-xs text-blue-800 flex items-center gap-1.5 font-medium">
                      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                      Refreshed {refreshTime.toLocaleTimeString()}
                    </span>
                    <span className="text-xs text-blue-800 flex items-center gap-1.5 font-medium">
                      <Zap size={12} className="text-blue-800" />
                      Live Inventory Sync Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-black/20 p-1 rounded backdrop-blur-md border border-white/10">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 p-2 rounded text-xs  transition-all ${viewMode === 'grid' ? 'bg-white text-[#1e3a8a] ' : 'text-white/60 hover:text-white'}`}
                >
                  <LayoutGrid size={14} /> Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 p-2 rounded text-xs  transition-all ${viewMode === 'list' ? 'bg-white text-[#1e3a8a] ' : 'text-white/60 hover:text-white'}`}
                >
                  <List size={14} /> List
                </button>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded  text-xs  shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <Plus size={18} strokeWidth={3} />
                Create Material Request
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className=" relative">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 ga2 mb-8">
          <KPICard label="Total Active" value={stats.total} icon={ClipboardList} colorClass="text-blue-600" status="ACTIVE" trend={12} />
          <KPICard label="Pending Approval" value={stats.draft} icon={Clock} colorClass="text-amber-600" status="DRAFT" trend={-5} />
          <KPICard label="Approved Requests" value={stats.approved} icon={ShieldCheck} colorClass="text-emerald-600" status="OPTIMAL" />
          <KPICard label="Partial Release" value={stats.partial} icon={Activity} colorClass="text-indigo-600" status="IN-PROGRESS" trend={8} />
          <KPICard label="Completed" value={stats.completed} icon={CheckCircle2} colorClass="text-slate-600" status="FULFILLED" />
          <KPICard label="Direct Purchase" value={stats.purchase} icon={ShoppingCart} colorClass="text-rose-600" status="EXTERNAL" trend={15} />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="   flex flex-col lg:flex-row items-center gap-2">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search by ID, Project, Department or Requester..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-12 pr-4 p-2 text-xs rounded bg-white border-none focus:ring-2 focus:ring-blue-500/20  text-slate-700 placeholder:text-slate-400 transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto px-2 border-l border-slate-100 pl-4">
              <span className="text-xs  text-slate-400   mr-2">Dept:</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 ">
                <FilterPill label="All" active={!filters.department} onClick={() => setFilters(prev => ({ ...prev, department: '' }))} />
                {departments.map(dept => (
                  <FilterPill 
                    key={dept} 
                    label={dept} 
                    active={filters.department === dept} 
                    onClick={() => setFilters(prev => ({ ...prev, department: dept }))} 
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
              <FilterPill label="All Status" active={!filters.status} onClick={() => setFilters(prev => ({ ...prev, status: '' }))} icon={List} />
              <FilterPill label="Draft" active={filters.status === 'draft'} onClick={() => setFilters(prev => ({ ...prev, status: 'draft' }))} icon={Clock} />
              <FilterPill label="Approved" active={filters.status === 'approved'} onClick={() => setFilters(prev => ({ ...prev, status: 'approved' }))} icon={CheckCircle2} />
              <FilterPill label="Partial" active={filters.status === 'partial'} onClick={() => setFilters(prev => ({ ...prev, status: 'partial' }))} icon={Activity} />
              <FilterPill label="Completed" active={filters.status === 'completed'} onClick={() => setFilters(prev => ({ ...prev, status: 'completed' }))} icon={ShieldCheck} />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs  text-slate-400 bg-white p-1 rounded border border-slate-100 ">
                Showing {filteredRequests.length} of {requests.length} results
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <SkeletonRow />
        ) : filteredRequests.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2">
              {filteredRequests.map((row) => {
                const availability = getRequestAvailability(row)
                const config = getStatusConfig(row.status)
                const StatusIcon = config.icon

                return (
                  <Card 
                    key={row.mr_id}
                    className="bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
                  >
                    <div className={`h-1 w-full ${config.bg} ${config.color.replace('text-', 'bg-')}`}></div>
                    
                    <div className="p-2">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${config.bg} ${config.color} transition-transform group-hover:rotate-6`}>
                            <StatusIcon size={20} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className=" text-slate-900 group-hover:text-blue-600 transition-colors ">
                              {row.mr_id}
                            </h3>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs  text-slate-400 ">
                                {row.purpose.replace('_', ' ')}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs  text-slate-400 ">
                                {row.department}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <MaterialGauge available={availability.availableCount} total={availability.totalCount} />
                        </div>
                      </div>

                      <div className="space-y-2 mb-2">
                        <div className="bg-slate-50 rounded p-3 flex flex-col gap-2 border border-slate-100 group-hover:bg-blue-50/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="p-1 bg-white rounded border border-slate-200 text-blue-600 shadow-sm">
                                <Package size={12} />
                              </div>
                              <div>
                                <p className="text-[8px]  text-slate-400 uppercase tracking-tighter">Finished Goods</p>
                                <p className="text-[11px] font-bold text-blue-700 truncate max-w-[140px]" title={row.finished_goods_name || 'Manual Requisition'}>
                                  {getCleanFGName(row.finished_goods_name) || 'MANUAL REQ'}
                                </p>
                              </div>
                            </div>
                          <div className="text-right">
                            <p className="text-[8px]  text-slate-400 uppercase tracking-tighter">Requested By</p>
                            <p className="text-[11px] font-bold text-slate-700">{row.required_by_date ? new Date(row.required_by_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          </div>

                          <div className="h-[1px] w-full bg-slate-200/50"></div>

                          <div className="flex items-center gap-3">
                            <div className="p-1 bg-white rounded border border-slate-200 text-slate-400 shadow-sm">
                              <Building2 size={12} />
                            </div>
                            <div>
                              <p className="text-[8px]  text-slate-400 uppercase tracking-tighter">PROJECT CONTEXT</p>
                              <p className="text-[11px] font-bold text-slate-600 truncate max-w-[180px]">{row.project_name || 'INTERNAL OPERATIONS'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded  bg-slate-200 border-2 border-white flex items-center justify-center text-xs  text-slate-500 overflow-hidden">
                              {row.requested_by_name?.charAt(0) || 'S'}
                            </div>
                            <span className="text-xs  text-slate-500">{row.requested_by_name?.split(' ')[0] || 'System'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package size={14} className="text-slate-400" />
                            <span className=" text-slate-700">{row.items?.length || 0} Items</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button 
                          onClick={() => { setSelectedMrId(row.mr_id); setViewModalOpen(true); }}
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white p-2 rounded  text-xs  transition-all"
                        >
                          <Eye size={14} /> View Details
                        </button>
                        {['draft', 'pending', 'rejected', 'cancelled'].includes(row.status) && (
                          <button 
                            onClick={() => handleDelete(row.mr_id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                            title="Delete Requisition"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-2 text-xs  text-slate-400  ">Request Identifier</th>
                      <th className="p-2 text-xs  text-slate-400  ">Finished Goods</th>
                      <th className="p-2 text-xs  text-slate-400  ">Project Context</th>
                      <th className="p-2 text-xs  text-slate-400   text-center">Fulfillment</th>
                      <th className="p-2 text-xs  text-slate-400  ">Requisition Status</th>
                      <th className="p-2 text-xs  text-slate-400   text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map((row) => {
                      const availability = getRequestAvailability(row)
                      const config = getStatusConfig(row.status)
                      const StatusIcon = config.icon

                      return (
                        <tr key={row.mr_id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="p-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded ${config.bg} ${config.color}`}>
                                <StatusIcon size={15} />
                              </div>
                              <div>
                                <p className="text-xs  text-slate-900  group-hover:text-blue-600 transition-colors">{row.mr_id}</p>
                                <p className="text-xs  text-slate-400  ">{row.purpose.replace('_', ' ')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-blue-700">{getCleanFGName(row.finished_goods_name) || 'MANUAL REQUISITION'}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-tight">Parent Product</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col">
                              <span className="text-xs  text-slate-700">{row.project_name || 'Internal Operations'}</span>
                              <span className="text-xs  text-slate-400  ">{row.department}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="flex justify-between items-center w-32">
                                <span className="text-xs  text-slate-500">{availability.availableCount}/{availability.totalCount} items</span>
                                <span className={`text-xs  ${availability.percentage === 100 ? 'text-emerald-500' : 'text-blue-500'}`}>{availability.percentage}%</span>
                              </div>
                              <div className="w-32 h-1.5 bg-slate-100 rounded overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-1000 ${availability.percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                  style={{ width: `${availability.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded  text-xs  border ${config.bg} ${config.color} ${config.border.replace('border-', 'border-opacity-50 border-')}`}>
                              <StatusIcon size={12} />
                              {config.label}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { setSelectedMrId(row.mr_id); setViewModalOpen(true); }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>
                              {['draft', 'pending', 'rejected', 'cancelled'].includes(row.status) && (
                                <button 
                                  onClick={() => handleDelete(row.mr_id)}
                                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                                  title="Delete Requisition"
                                >
                                  <Trash2 size={15} />
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
          <div className="bg-white rounded border border-dashed border-slate-300 p-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded flex items-center justify-center text-slate-300 mb-6 border border-slate-100">
              <ClipboardList size={40} />
            </div>
            <h3 className="text-xl  text-slate-900 mb-2">No Material Requests Found</h3>
            <p className="text-slate-500 max-w-sm mb-8">We couldn't find any requisitions matching your current filters. Try adjusting your search criteria or create a new request.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded  text-sm shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1"
            >
              <Plus size={20} strokeWidth={3} />
              NEW REQUISITION
            </button>
          </div>
        )}
      </div>

      <CreateMaterialRequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchRequests()
          toast.addToast('Material requisition created successfully', 'success')
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
    </div>
  )
}
