import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Edit2, Trash2, Package, Tag, 
  AlertTriangle, FolderOpen, RefreshCw, CheckCircle2,
  Filter, LayoutGrid, List as ListIcon, ArrowUpRight,
  Settings2, X, Activity, Box, IndianRupee, Info,
  ChevronRight, MoreVertical, Database
} from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import DataTable from '../../components/Table/DataTable'
import Badge from '../../components/Badge/Badge'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'

export default function Items() {
  const navigate = useNavigate()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [activeGroup, setActiveGroup] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'item_details', 'item_group', 'stock', 'valuation_rate', 'gst_rate'
  ]))

  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [groupsRes, itemsRes] = await Promise.all([
        api.get('/item-groups'),
        api.get('/items')
      ])

      if (groupsRes.data.success) {
        const priorityGroups = ['Finished Goods', 'Sub-Assembly', 'Raw Material']
        const allGroups = groupsRes.data.data.map(g => g.name)
        const sortedGroups = [
          'All',
          ...priorityGroups.filter(pg => allGroups.includes(pg)),
          ...allGroups.filter(g => !priorityGroups.includes(g)).sort()
        ]
        setGroups(sortedGroups)
      }

      if (itemsRes.data.success) {
        setItems(itemsRes.data.data || [])
      }
      setRefreshTime(new Date())
    } catch (err) {
      console.error('Error fetching items data:', err)
      setError('Failed to load items. Please check your connection.')
      toast.addToast('Failed to load items data', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  const handleDelete = async (itemCode) => {
    if (!window.confirm(`Are you sure you want to delete item ${itemCode}?`)) return
    
    try {
      const res = await api.delete(`/items/${itemCode}`)
      if (res.data.success) {
        toast.addToast('Item deleted successfully', 'success')
        setItems(prev => prev.filter(item => item.item_code !== itemCode))
      }
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Error deleting item', 'error')
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesGroup = activeGroup === 'All' || item.item_group === activeGroup
      const matchesSearch = !searchTerm || 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesGroup && matchesSearch
    })
  }, [items, activeGroup, searchTerm])

  const stats = useMemo(() => {
    const total = items.length
    const finishedGoods = items.filter(i => i.item_group === 'Finished Goods').length
    const lowStock = items.filter(i => (i.quantity || 0) <= 10).length
    const activeGroups = new Set(items.map(i => i.item_group)).size
    
    return { total, finishedGoods, lowStock, activeGroups }
  }, [items])

  const columns = useMemo(() => [
    {
      key: 'item_details',
      label: 'Item Details',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 group-hover:border-blue-200 dark:group-hover:border-blue-800 group-hover:text-blue-500 transition-colors shadow-sm">
            <Package size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs  text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[200px]">
              {row.name}
            </span>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400  tracking-tight">
              {row.item_code}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'item_group',
      label: 'Group',
      render: (val) => {
        let color = 'secondary'
        if (val === 'Finished Goods') color = 'success'
        if (val === 'Raw Material') color = 'primary'
        if (val === 'Sub-Assembly') color = 'warning'
        return <Badge color={color} variant="flat" className="text-[10px]  ">{val}</Badge>
      }
    },
    {
      key: 'stock',
      label: 'Stock & UOM',
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${(row.quantity || 0) <= 10 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span className="text-xs  text-slate-700 dark:text-slate-300">{row.quantity || 0}</span>
            <span className="text-[10px]  text-slate-400 dark:text-slate-500  tracking-tighter bg-slate-100 dark:bg-slate-800 px-1 rounded">{row.uom}</span>
          </div>
          {(row.quantity || 0) <= 10 && (
            <span className="text-[10px]  text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={10} /> LOW STOCK
            </span>
          )}
        </div>
      )
    },
    {
      key: 'valuation_rate',
      label: 'Valuation Rate',
      render: (val) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <IndianRupee size={12} className="text-slate-400" />
            <span className="text-xs  text-slate-700 dark:text-slate-300">{parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Valuation Rate</span>
        </div>
      )
    },
    {
      key: 'gst_rate',
      label: 'Taxation',
      render: (val) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-700 dark:text-slate-300">{val}%</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium  tracking-widest">GST Rate</span>
        </div>
      )
    }
  ], [])

  const StatCard = ({ label, value, icon: Icon, color, onClick, isActive, description }) => {
    const colorMap = {
      primary: 'from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
      success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400',
      warning: 'from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400',
      danger: 'from-rose-500/10 to-rose-500/5 border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400',
      info: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400'
    }
    
    return (
      <Card
        onClick={onClick}
        className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-2 border-1 transition-all duration-300 hover:shadow  hover:-translate-y-1 relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-blue-500 border-transparent shadow-blue-500/20' : ''}`}
      >
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-current opacity-5 rounded-full group-hover:scale-125 transition-transform" />
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[10px]   tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
            <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{value}</p>
            {description && <p className="text-[10px] mt-1 text-slate-400 dark:text-slate-500">{description}</p>}
          </div>
          <div className={`p-2 rounded  bg-white dark:bg-slate-900 shadow-sm border border-inherit transition-transform group-hover:rotate-12`}>
            <Icon size={20} className="text-inherit" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen p-4 transition-colors duration-300">
      <div className="mx-auto space-y-6">
        
        {/* Modern Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 dark:bg-slate-900  ">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded  shadow-lg shadow-blue-600/20">
              <Database className="text-white" size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs  text-blue-600 dark:text-blue-400  tracking-widest">
                <span>Buying</span>
                <ChevronRight size={12} />
                <span>Product Management</span>
              </div>
              <h1 className="text-xl  text-slate-900 dark:text-white ">Items Master</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Comprehensive catalog of Raw Materials, Sub-Assemblies, and Finished Goods
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:block text-right px-4 border-r border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500   tracking-tighter">System Health</p>
              <p className="text-xs  text-emerald-500 flex items-center justify-end gap-1">
                <Activity size={12} /> Sync Active
              </p>
            </div>
            <button
              onClick={fetchInitialData}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded  transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
              title="Force Refresh"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <Button 
              onClick={() => navigate('/manufacturing/item-groups')}
              variant="secondary"
              className="flex items-center gap-2 p-2 rounded  text-xs  border-2"
            >
              <FolderOpen size={18} /> Item Groups
            </Button>
            <Button 
              onClick={() => navigate('/manufacturing/items/new')}
              variant="primary"
              className="flex items-center gap-2 p-2 rounded  text-xs font-black shadow  shadow-blue-600/20 active:scale-95 transition-all"
            >
              <Plus size={18} strokeWidth={3} /> New Item
            </Button>
          </div>
        </div>

        {error && (
          <Alert type="danger" className="rounded  border-2 animate-in fade-in slide-in-from-top-4 duration-300">
            {error}
          </Alert>
        )}

        {/* Dynamic Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Catalog"
            value={stats.total}
            icon={Box}
            color="primary"
            description="Active products in database"
          />
          <StatCard
            label="Finished Goods"
            value={stats.finishedGoods}
            icon={CheckCircle2}
            color="success"
            description="Ready for sales delivery"
          />
          <StatCard
            label="Critical Stock"
            value={stats.lowStock}
            icon={AlertTriangle}
            color="danger"
            description="Items below reorder level"
          />
          <StatCard
            label="Tax Categories"
            value={stats.activeGroups}
            icon={Tag}
            color="info"
            description="Distinct item classifications"
          />
        </div>

        {/* Command Center Toolbar */}
        <div className=" dark:bg-slate-900  dark:border-slate-800  ">
          <div className="mb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide no-scrollbar">
              <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 rounded  border border-slate-200 dark:border-slate-700 shadow-sm">
                {groups.map(group => (
                  <button
                    key={group}
                    onClick={() => setActiveGroup(group)}
                    className={`p-2 rounded text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${
                      activeGroup === group
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {group.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search by name or item code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded  text-xs font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all dark:text-white"
                />
              </div>
              
              <div className="relative">
                <Button
                  variant="secondary"
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className="flex items-center gap-2 p-3 rounded  border-2"
                >
                  <Settings2 size={15} />
                </Button>
                
                {showColumnMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded  border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-[10px] font-black text-slate-400  tracking-widest">Display Columns</span>
                      <button onClick={() => setShowColumnMenu(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    <div className="space-y-1">
                      {['item_details', 'item_group', 'stock', 'valuation_rate', 'gst_rate'].map(col => (
                        <label key={col} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded  cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(col)}
                            onChange={() => {
                              const newCols = new Set(visibleColumns)
                              if (newCols.has(col)) newCols.delete(col)
                              else newCols.add(col)
                              setVisibleColumns(newCols)
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs  text-slate-700 dark:text-slate-300 capitalize">{col.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <DataTable
              columns={columns.filter(c => visibleColumns.has(c.key))}
              data={filteredItems}
              loading={loading}
              filterable={false}
              className="border-none"
              rowClassName="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
              renderActions={(row) => (
                <div className="flex items-center gap-2 justify-end pr-4">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => navigate(`/manufacturing/items/${row.item_code}`)}
                    className="p-2 rounded  border shadow-sm bg-white dark:bg-slate-800"
                  >
                    <Edit2 size={14} className="text-slate-600 dark:text-slate-400" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => navigate(`/manufacturing/items/${row.item_code}`)}
                    className="p-2 rounded  border shadow-sm bg-white dark:bg-slate-800"
                  >
                    <ArrowUpRight size={14} className="text-blue-600" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(row.item_code)
                    }}
                    className="p-2 rounded  border-2 shadow-sm"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

