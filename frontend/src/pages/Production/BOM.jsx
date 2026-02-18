import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  BarChart3, 
  AlertCircle, 
  Zap, 
  TrendingUp, 
  FileText, 
  Trash,
  Layers,
  Settings,
  Database,
  RotateCcw,
  Check,
  ChevronRight,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  Filter,
  Activity,
  ClipboardCheck,
  X,
  Target,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Clock
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import DataTable from '../../components/Table/DataTable'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'

const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100 shadow-blue-100/50',
    emerald: 'text-emerald-600  shadow-emerald-100/50',
    amber: 'text-amber-600 shadow-amber-100/50',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-100/50',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100 shadow-cyan-100/50',
    rose: 'text-rose-600 bg-rose-50 border-rose-100 shadow-rose-100/50'
  }

  const colorStyle = colorMap[color] || colorMap.blue

  return (
    <div className="relative group  bg-white rounded p-2 border border-slate-100   transition-all duration-300 hover:shadow  hover:shadow-slate-200/50 hover:-translate-y-1">
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 ${colorStyle.split(' ')[1]}`} />
      
      <div className="relative flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-xs  text-slate-400 ">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl  text-slate-800 ">{value}</h3>
            {trend && (
              <span className={`text-xs  px-1.5 py-0.5 rounded  ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Activity size={10} className="text-slate-300" />
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-2 rounded  transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${colorStyle}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}

const FieldWrapper = ({ label, children, icon: Icon }) => (
  <div className="w-full .5">
    <div className="flex items-center gap-2 px-1">
      {Icon && <Icon size={12} className="text-slate-400" />}
      <label className="text-xs  text-slate-500 ">{label}</label>
    </div>
    <div className="relative group">
      {children}
    </div>
  </div>
)

const StatusBadge = ({ status }) => {
  const configs = {
    active: { label: 'Active', icon: Check, color: 'text-emerald-600 ' },
    draft: { label: 'Draft', icon: Edit2, color: 'text-amber-600' },
    inactive: { label: 'Archived', icon: X, color: 'text-slate-400 bg-slate-50 border-slate-100' }
  }
  const config = configs[status] || configs.draft
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded text-xs   ${config.color}`}>
      <Icon size={10} strokeWidth={3} />
      {config.label}
    </span>
  )
}

const BOMTypeBadge = ({ type }) => {
  const isFG = type === 'Finished Good'
  return (
    <span className={`inline-flex items-center gap-1.5  text-xs ${
      isFG 
        ? ' text-indigo-700 ' 
        : ' text-cyan-700 '
    }`}>
      
      {type}
    </span>
  )
}

export default function BOM() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [boms, setBOMs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(location.state?.success || null)
  const [stats, setStats] = useState({
    totalBOMs: 0,
    activeBOMs: 0,
    draftBOMs: 0,
    totalCost: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    type: ''
  })

  const getBOMType = (bom) => {
    const itemGroup = (bom.item_group || bom.items_group || '').toLowerCase()
    const itemCode = bom.item_code || ''
    
    if (itemGroup.includes('finished') || itemCode.startsWith('FG-')) {
      return 'Finished Good'
    }
    return 'Sub-Assembly'
  }

  useEffect(() => {
    fetchBOMs()
  }, [filters])

  const fetchBOMs = async () => {
    try {
      setLoading(true)
      const response = await productionService.getBOMs(filters)
      let bomData = response.data || []
      
      // Apply type filter on client side
      if (filters.type) {
        bomData = bomData.filter(bom => getBOMType(bom) === filters.type)
      }
      
      // Fetch sales orders to calculate total quantity
      let bomsWithTotals = bomData
      try {
        const token = localStorage.getItem('token')
        const soResponse = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const soData = await soResponse.json()
        const allSalesOrders = soData.data || []
        
        // Add sales order item count to each BOM
        bomsWithTotals = bomData.map(bom => {
          const relatedSOs = allSalesOrders.filter(so => so.item_code === bom.item_code)
          const totalItems = relatedSOs.reduce((sum, so) => sum + (parseFloat(so.qty) || 0), 0)
          const totalQty = totalItems > 0 ? parseFloat(bom.quantity || 0) * totalItems : 0
          return { 
            ...bom, 
            totalItems, 
            totalQty,
            soCount: relatedSOs.length 
          }
        })
      } catch (soErr) {
        console.error('Failed to fetch sales orders:', soErr)
      }
      
      setBOMs(bomsWithTotals)
      
      const allResponse = await productionService.getBOMs({})
      const allBOMs = allResponse.data || []
      const activeBOMs = allBOMs.filter(b => b.status === 'active').length
      const draftBOMs = allBOMs.filter(b => b.status === 'draft').length
      const totalCost = allBOMs.reduce((sum, b) => sum + (parseFloat(b.total_cost) || 0), 0)
      
      setStats({
        totalBOMs: allBOMs.length,
        activeBOMs,
        draftBOMs,
        totalCost
      })
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch BOMs')
      setBOMs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (bom_id) => {
    if (window.confirm('Delete this BOM?')) {
      try {
        await productionService.deleteBOM(bom_id)
        setSuccess('BOM deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchBOMs()
      } catch (err) {
        setError(err.message || 'Failed to delete BOM')
      }
    }
  }

  const handleTruncate = async () => {
    if (window.confirm('⚠️ Warning: This will permanently delete ALL BOMs. Are you sure?')) {
      try {
        setLoading(true)
        await fetch(`${import.meta.env.VITE_API_URL}/production/boms/truncate/all`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        setSuccess('All BOMs truncated successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchBOMs()
      } catch (err) {
        setError('Failed to truncate BOMs')
        toast?.error('Failed to truncate BOMs')
      }
    }
  }

  const handleEdit = (bom) => {
    navigate(`/manufacturing/bom/${bom.bom_id}`)
  }

  const handleSyncStatuses = async () => {
    try {
      setLoading(true)
      const response = await productionService.syncBOMStatuses()
      if (response.success) {
        setSuccess(`Successfully synchronized ${response.data.affectedRows} BOM statuses`)
        setTimeout(() => setSuccess(null), 5000)
        fetchBOMs()
      }
    } catch (err) {
      setError(err.message || 'Failed to synchronize BOM statuses')
      toast?.error('Failed to synchronize BOM statuses')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'status-completed',
      draft: 'status-draft',
      inactive: 'status-cancelled'
    }
    return colors[status] || 'status-draft'
  }

  const getBOMTypeColor = (type) => {
    if (type === 'Finished Good') {
      return 'bg-blue-100 text-blue-800 border border-blue-300'
    }
    return 'bg-purple-100 text-purple-800 border border-purple-300'
  }

  const getBOMTypeIcon = (type) => {
    if (type === 'Finished Good') {
      return '✓'
    }
    return '⚙️'
  }

  const columns = [
    {
      key: 'item_code',
      label: 'BOM ID / Names',
      render: (value, row) => (
        <div 
          onClick={() => handleEdit(row)}
          className="group cursor-pointer "
        >
          <div className="flex items-center gap-3">
            
            <div>
              <div className="text-xs text-slate-800 group-hover:text-indigo-600 transition-colors   flex items-center gap-2">
                {row.product_name}
                <ChevronRight size={12} className=" transition-all -translate-x-2 group-hover:translate-x-0" />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs  text-slate-400 font-mono ">{row.bom_id}</span>
                
                <span className="text-xs  text-slate-400 font-mono ">{row.item_code}</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'bom_type',
      label: 'BOM TYpe',
      render: (value, row) => <BOMTypeBadge type={getBOMType(row)} />
    },
    // {
    //   key: 'quantity',
    //   label: 'Standard Batch',
    //   render: (value, row) => (
    //     <div className="flex flex-col">
    //       <div className="flex items-center gap-1.5">
    //         <span className="text-xs  text-slate-700">
    //           {parseFloat(row.quantity || 0).toLocaleString()} 
    //         </span>
    //         <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs  rounded ">{row.uom}</span>
    //       </div>
    //       <span className="text-xs  text-slate-400 mt-1 ">Base Unit Qty</span>
    //     </div>
    //   )
    // },
    {
      key: 'total_cost',
      label: 'Cost',
      render: (value, row) => {
        const cost = parseFloat(row.total_cost || 0)
        const qty = parseFloat(row.quantity || 1)
        const unitCost = cost / qty
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="text-xs ">
                ₹{unitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <TrendingUp size={10} strokeWidth={3} />
            </div>
            {/* <div className="flex items-center gap-1 mt-1">
              <span className="text-xs  text-slate-400 ">Total Value:</span>
              <span className="text-xs  text-slate-500">₹{cost.toLocaleString('en-IN')}</span>
            </div> */}
          </div>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => <StatusBadge status={row.status || 'draft'} />
    },
    {
      key: 'updated_at',
      label: 'Updated Date',
      render: (value, row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock size={12} className="text-slate-300" />
            <span className="text-xs ">
              {row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} 
               ({row.updated_at ? new Date(row.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''})
            </span>
          </div>
          <span className="text-xs  text-slate-400  mt-1 ml-4">
          </span>
        </div>
      )
    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center justify-end gap-1 pr-4">
      <button 
        onClick={() => handleEdit(row)}
        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all duration-300 hover: hover:shadow-indigo-100"
        title="Analyze & Edit"
      >
        <Edit2 size={15} />
      </button>
      <button 
        onClick={() => handleDelete(row.bom_id)}
        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all duration-300 hover: hover:shadow-rose-100"
        title="Remove Formulation"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )

  const intelligence = useMemo(() => {
    if (!boms.length) return null
    
    const sortedByCost = [...boms].sort((a, b) => {
      const costA = (parseFloat(a.total_cost) || 0) / (parseFloat(a.quantity) || 1)
      const costB = (parseFloat(b.total_cost) || 0) / (parseFloat(b.quantity) || 1)
      return costB - costA
    })
    
    const top3 = sortedByCost.slice(0, 3)
    const fgCount = boms.filter(b => getBOMType(b) === 'Finished Good').length
    const saCount = boms.length - fgCount
    
    return { top3, fgCount, saCount }
  }, [boms])

  return (
    <div className=" flex flex-col p-4 overflow-hidden bg-[#fbfcfd]">
      <div className="flex-shrink-0">
        {/* Strategic Header Section */}
        <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center shadow  shadow-indigo-100 rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <Layers size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl  text-slate-800  flex items-center gap-3">
              Formulation Intelligence
              <span className="p-1 bg-indigo-50 text-indigo-600 text-xs  rounded border border-indigo-100 ">BOM Management</span>
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500 flex items-center gap-2">
              <Database size={14} className="text-slate-300" />
              Strategic Recipe Management & Cost Analytics for Manufacturing
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleSyncStatuses}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded bg-white p-2 text-xs  text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-all active:scale-95   hover: disabled:opacity-50"
          >
            <RefreshCw size={18} className={`text-amber-500 ${loading ? 'animate-spin' : ''}`} />
            Sync Lifecycle
          </button>
          
          <button 
            onClick={() => navigate('/manufacturing/bom/new')}
            className="inline-flex items-center gap-2 rounded bg-indigo-600 p-6  py-2  text-xs  text-white hover:bg-indigo-700 transition-all active:scale-95 shadow  shadow-indigo-100"
          >
            <Plus size={18} strokeWidth={3} />
            Initialize BOM
          </button>
          
          <button 
            onClick={handleTruncate}
            className="inline-flex items-center gap-2 rounded bg-white p-2.5 text-xs  text-rose-600 ring-1 ring-inset ring-rose-100 hover:bg-rose-50 transition-all active:scale-95  "
          >
            <Trash2 size={18} />
            Reset System
          </button>
        </div>
      </div>

      {/* High-Fidelity Stats Grid */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Total Formulations" 
          value={stats.totalBOMs} 
          icon={Database} 
          color="indigo" 
          subtitle="System-wide recipes"
        />
        <StatCard 
          label="Active Production" 
          value={stats.activeBOMs} 
          icon={Zap} 
          color="emerald" 
          subtitle="Operational BOMs"
          trend={12}
        />
        <StatCard 
          label="In-Draft Specs" 
          value={stats.draftBOMs} 
          icon={Edit2} 
          color="amber" 
          subtitle="Pending validation"
        />
        <StatCard 
          label="Valuation Intelligence" 
          value={`₹${(stats.totalCost / 1000000).toFixed(2)}M`} 
          icon={TrendingUp} 
          color="cyan" 
          subtitle="Aggregate manufacturing value"
        />
      </div>

      {/* Strategic Intelligence Widgets */}
      {intelligence && !loading && boms.length > 0 && (
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <Card className="bg-slate-900 border-slate-800 p-2 rounded lg:col-span-2 relative overflow-hidden group  shadow-indigo-900/10">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
              <TrendingUp size={120} className="text-indigo-400" />
            </div>
            <div className="relative z-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/20 rounded border border-indigo-400/30 text-indigo-400">
                  <BarChart3 size={18} strokeWidth={2.5} />
                </div>
                <h3 className="text-xs  text-indigo-400">Critical Cost Intelligence</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {intelligence.top3.map((bom, idx) => {
                  const unitCost = (parseFloat(bom.total_cost) || 0) / (parseFloat(bom.quantity) || 1)
                  const maxUnitCost = (parseFloat(intelligence.top3[0].total_cost) || 1) / (parseFloat(intelligence.top3[0].quantity) || 1)
                  return (
                    <div key={bom.bom_id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs  text-indigo-500/50 px-2 py-0.5 rounded bg-white/5">0{idx + 1}</span>
                        <p className="text-xs  text-slate-400 truncate ">{bom.product_name || 'Unnamed Spec'}</p>
                      </div>
                      <div className="text-lg  text-white  flex items-baseline gap-1">
                        <span className="text-xs text-indigo-500">₹</span>
                        {unitCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs text-slate-600  ml-1 ">/ {bom.uom || 'unit'}</span>
                      </div>
                      <div className="w-full bg-slate-800/50 h-1.5 rounded overflow-hidden border border-white/5">
                        <div 
                          className="bg-indigo-500 h-full rounded transition-all duration-1000 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${(unitCost / maxUnitCost) * 100}%` }} 
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
          
          <Card className="bg-white border-slate-100 p-2 ">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-50 rounded border border-indigo-100 text-indigo-600  ">
                <Target size={15} strokeWidth={2.5} />
              </div>
              <h3 className="text-xs  text-slate-800 ">Strategic Composition</h3>
            </div>
            
            <div className="space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                    <span className="text-xs  text-slate-500 ">Finished Goods</span>
                  </div>
                  <span className="text-xs  text-slate-800">{intelligence.fgCount}</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded overflow-hidden border border-slate-100">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-1000" 
                    style={{ width: `${(intelligence.fgCount / boms.length) * 100}%` }} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                    <span className="text-xs  text-slate-500 ">Sub-Assemblies</span>
                  </div>
                  <span className="text-xs  text-slate-800">{intelligence.saCount}</span>
                </div>
                <div className="w-full bg-slate-50 h-2 rounded overflow-hidden border border-slate-100">
                  <div 
                    className="bg-cyan-500 h-full transition-all duration-1000" 
                    style={{ width: `${(intelligence.saCount / boms.length) * 100}%` }} 
                  />
                </div>
              </div>

              
            </div>
          </Card>
        </div>
      )}

      {/* Dynamic Alerts */}
      <div className="">
        {success && (
          <div className="flex items-center gap-3 rounded  border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-800   animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="rounded bg-white p-2   text-emerald-600"><Check size={18} strokeWidth={3} /></div>
            <div>
              <p className="  text-xs">Strategic Success</p>
              <p className=" opacity-80">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded  border border-rose-100 bg-rose-50/50 p-4 text-xs text-rose-800   animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="rounded bg-white p-2   text-rose-600"><AlertCircle size={18} strokeWidth={3} /></div>
            <div>
              <p className="  text-xs">Operational ror</p>
              <p className=" opacity-80">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>

    <Card className="flex-1 flex flex-col min-h-0 bg-white border-slate-200 rounded overflow-hidden ">
        {/* Intelligence Filter Bar */}
        <div className=" mb-2">
          <div className="flex flex-col lg:flex-row gap-2 items-end">
            <div className="flex-1 w-full lg:max-w-md">
              <FieldWrapper >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    name="search" 
                    placeholder="Search by ID, Product, or Item Code..." 
                    value={filters.search} 
                    onChange={handleFilterChange}
                    className="w-full bg-white border border-slate-200 rounded pl-10 pr-4 py-2  text-xs  text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                  />
                </div>
              </FieldWrapper>
            </div>

            <div className="w-full lg:w-48">
              <FieldWrapper >
                <div className="relative">
                  <select 
                    name="status" 
                    value={filters.status} 
                    onChange={handleFilterChange}
                    className="w-full bg-white border border-slate-200 rounded p-2  text-xs  text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none cursor-pointer appearance-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Formulation</option>
                    <option value="draft">Draft Specifications</option>
                    <option value="inactive">Archived</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </FieldWrapper>
            </div>

            <div className="w-full lg:w-48">
              <FieldWrapper >
                <div className="relative">
                  <select 
                    name="type" 
                    value={filters.type} 
                    onChange={handleFilterChange}
                    className="w-full bg-white border border-slate-200 rounded p-2  text-xs  text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none cursor-pointer appearance-none"
                  >
                    <option value="">All Categories</option>
                    <option value="Finished Good">Finished Goods</option>
                    <option value="Sub-Assembly">Sub-Assemblies</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </FieldWrapper>
            </div>

            <button
              onClick={() => setFilters({ status: '', search: '', type: '' })}
              className="flex items-center justify-center gap-2 p-2 text-xs  text-slate-400 hover:text-indigo-600 transition-colors  border border-dashed border-slate-200 rounded hover:border-indigo-200 group  min-w-[140px]"
            >
              <RotateCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              Reset Filters
            </button>
          </div>
        </div>

        {/* Intelligence Data Table */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded animate-spin" />
                <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600/30" size={24} />
              </div>
              <p className="text-xs   animate-pulse">Synchronizing Intelligence...</p>
            </div>
          ) : boms.length > 0 ? (
            <DataTable 
              columns={columns} 
              data={boms} 
              renderActions={renderActions}
              filterable={true}
              sortable={true}
              pageSize={10}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-50/30">
              <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100   flex items-center justify-center mb-6 group hover:scale-110 transition-transform duration-500">
                <FileText size={40} className="text-slate-200 group-hover:text-indigo-200 transition-colors" />
              </div>
              <p className="text-xs  text-slate-400 ">No Formulations Found</p>
              <p className="mt-2 text-xs text-slate-400 font-medium text-xs">Initialize your first BOM to begin manufacturing intelligence</p>
              <button 
                onClick={() => navigate('/manufacturing/bom/new')}
                className="mt-6 inline-flex items-center gap-2 rounded bg-white p-6  py-2  text-xs  text-indigo-600 border border-indigo-100 hover:bg-indigo-50 transition-all  "
              >
                <Plus size={14} strokeWidth={3} />
                Create New Specification
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
