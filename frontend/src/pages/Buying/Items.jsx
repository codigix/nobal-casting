import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Edit2, Trash2, Package, Tag, 
  AlertTriangle, FolderOpen, RefreshCw, CheckCircle2,
  Filter, LayoutGrid, List, ArrowUpRight
} from 'lucide-react'
import api from '../../services/api'
import DataTable from '../../components/Table/DataTable'
import Badge from '../../components/Badge/Badge'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'

export default function Items() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [activeGroup, setActiveGroup] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchItemGroups(), fetchItems()])
      setRefreshTime(new Date())
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchItemGroups = async () => {
    try {
      const res = await api.get('/item-groups')
      if (res.data.success) {
        const priorityGroups = ['Finished Goods', 'Sub-Assembly', 'Raw Material']
        const allGroups = res.data.data.map(g => g.name)
        
        const sortedGroups = [
          'All',
          ...priorityGroups.filter(pg => allGroups.includes(pg)),
          ...allGroups.filter(g => !priorityGroups.includes(g)).sort()
        ]
        
        setGroups(sortedGroups)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const res = await api.get('/items')
      if (res.data.success) {
        setItems(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching items:', error)
      throw error
    }
  }

  const handleDelete = async (itemCode) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    
    try {
      const res = await api.delete(`/items/${itemCode}`)
      if (res.data.success) {
        setSuccess('Item deleted successfully')
        setItems(items.filter(item => item.item_code !== itemCode))
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error deleting item')
      setTimeout(() => setError(null), 3000)
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesGroup = activeGroup === 'All' || item.item_group === activeGroup
      const matchesSearch = 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesGroup && matchesSearch
    })
  }, [items, activeGroup, searchTerm])

  const stats = useMemo(() => {
    return {
      total: items.length,
      finishedGoods: items.filter(i => i.item_group === 'Finished Goods').length,
      lowStock: items.filter(i => (i.quantity || 0) <= 10).length,
      activeGroups: new Set(items.map(i => i.item_group)).size
    }
  }, [items])

  const columns = [
    {
      key: 'item_details',
      label: 'Item Details',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs  text-slate-900 group-hover:text-blue-600 transition-colors">{row.name}</div>
            <div className="text-xs font-medium text-slate-500">{row.item_code}</div>
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
        return <Badge color={color}>{val}</Badge>
      }
    },
    {
      key: 'stock',
      label: 'Stock & UOM',
      render: (_, row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${(row.quantity || 0) <= 10 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
            <span className="text-xs  text-slate-700">{row.quantity || 0}</span>
            <span className="text-xs font-medium text-slate-400 uppercase">{row.uom}</span>
          </div>
          {(row.quantity || 0) <= 10 && (
            <span className="text-xs  text-amber-600">Low Stock</span>
          )}
        </div>
      )
    },
    {
      key: 'selling_rate',
      label: 'Price',
      render: (val) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-700">₹{parseFloat(val || 0).toLocaleString()}</span>
          <span className="text-xs text-slate-400">Unit Rate</span>
        </div>
      )
    },
    {
      key: 'gst_rate',
      label: 'Tax',
      render: (val) => (
        <div className="flex flex-col">
          <span className="text-xs  text-slate-700">{val}%</span>
          <span className="text-xs text-slate-400">GST</span>
        </div>
      )
    }
  ]

  const StatCard = ({ label, value, icon: Icon, color, onClick, isActive }) => {
    const colorMap = {
      primary: 'from-blue-50 to-blue-100 border-blue-200 text-blue-700',
      success: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700',
      warning: 'from-amber-50 to-amber-100 border-amber-200 text-amber-700',
      danger: 'from-rose-50 to-rose-100 border-rose-200 text-rose-700',
      info: 'from-purple-50 to-purple-100 border-purple-200 text-purple-700'
    }
    
    return (
      <div
        onClick={onClick}
        className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-4 rounded-md border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group cursor-pointer ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : ''}`}
      >
        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full group-hover:scale-110 transition-transform" />
        <div className="flex items-start justify-between mb-2 relative z-10">
          <span className="text-xs  text-gray-500 ">{label}</span>
          <div className="p-1.5 bg-white/50 rounded shadow-sm">
            <Icon size={16} className="text-gray-700" />
          </div>
        </div>
        <p className="text-xl   text-gray-900 relative z-10">{value}</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-3 rounded border border-gray-200 ">
          <div>
            <h1 className="text-xl   text-gray-900 flex items-center gap-2">
              <Package className="text-blue-600" />
              Items Master
            </h1>
            <p className="text-xs text-gray-500 mt-1 ">Manage your comprehensive product catalog and stock levels</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:block text-right mr-2">
              <p className="text-xs text-gray-400  uppercase">Last Sync</p>
              <p className="text-xs text-gray-600 font-medium">{refreshTime.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={fetchInitialData}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <Button 
              onClick={() => navigate('/manufacturing/item-groups')}
              variant="secondary"
              className="flex items-center gap-2 p-2.5"
            >
              <FolderOpen size={18} /> <span className="  text-xs">Item Groups</span>
            </Button>
            <Button 
              onClick={() => navigate('/manufacturing/items/new')}
              variant="primary"
              className="flex items-center gap-2 shadow-lg shadow-blue-600/20 p-2"
            >
              <Plus size={18} strokeWidth={3} /> <span className="  text-xs">New Item</span>
            </Button>
          </div>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Items"
            value={stats.total}
            icon={Package}
            color="primary"
          />
          <StatCard
            label="Finished Goods"
            value={stats.finishedGoods}
            icon={CheckCircle2}
            color="success"
          />
          <StatCard
            label="Low Stock"
            value={stats.lowStock}
            icon={AlertTriangle}
            color="danger"
          />
          <StatCard
            label="Item Groups"
            value={stats.activeGroups}
            icon={Tag}
            color="info"
          />
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded border border-gray-200 ">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`p-2 rounded-md text-xs  transition-all whitespace-nowrap ${
                    activeGroup === group
                      ? 'bg-blue-600 text-white shadow-md border-transparent'
                      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {group.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filteredItems}
              loading={loading}
              filterable={false}
              renderActions={(row) => (
                <div className="flex items-center gap-1 justify-center">
                  <Button 
                    size="sm" 
                    variant="icon" 
                    onClick={() => navigate(`/manufacturing/items/${row.item_code}`)}
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="icon-danger" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(row.item_code)
                    }}
                    title="Delete"
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
