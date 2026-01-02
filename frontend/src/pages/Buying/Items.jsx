import { useState, useEffect } from 'react'
import Button from '../../components/Button/Button'
import Table from '../../components/Table/Table'
import Input from '../../components/Input/Input'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Package, Tag, AlertTriangle } from 'lucide-react'

export default function Items() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [groups, setGroups] = useState([])
  const [stats, setStats] = useState({
    totalItems: 0,
    activeGroups: 0,
    lowStockItems: 0
  })
  const [filters, setFilters] = useState({
    item_group: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchItemGroups()
    setCurrentPage(1)
    fetchItems()
  }, [filters])

  const fetchItemGroups = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/item-groups`)
      const data = await res.json()
      if (data.success) {
        setGroups(data.data.map(g => g.name))
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items?${query}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.data)
        setStats({
          totalItems: data.data.length,
          activeGroups: new Set(data.data.map(item => item.item_group)).size,
          lowStockItems: data.data.filter(item => item.quantity <= 10).length
        })
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemCode) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items/${itemCode}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setItems(items.filter(item => item.item_code !== itemCode))
        alert('Item deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className={`flex items-center gap-3 rounded-lg border-l-4 bg-white p-4 ${
      color === 'blue' ? 'border-l-blue-500' :
      color === 'purple' ? 'border-l-purple-500' :
      'border-l-amber-500'
    }`}>
      <div className="text-2xl flex items-center justify-center text-gray-600">
        <Icon size={24} />
      </div>
      <div>
        <div className="text-xs font-medium text-gray-600">
          {label}
        </div>
        <div className="text-xl font-bold text-gray-900">
          {value}
        </div>
      </div>
    </div>
  )

  const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false }) => {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-1 rounded-md p-2 text-xs font-medium transition-all ${
          variant === 'edit'
            ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
            : 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50'
        }`}
      >
        <Icon size={14} />
        {label}
      </button>
    )
  }

  // Pagination calculations
  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = items.slice(startIndex, endIndex)

  const columns = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'name', label: 'Item Name' },
    { key: 'item_group', label: 'Group' },
    { key: 'uom', label: 'UOM' },
    { key: 'gst_rate', label: 'GST %', format: (val) => `${val}%` }
  ]

  const paginatedItemsWithActions = paginatedItems.map(item => ({
    ...item,
    actions: (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ActionButton
          icon={Edit2}
          
          variant="edit"
          onClick={() => navigate(`/manufacturing/items/${item.item_code}`)}
        />
        <ActionButton
          icon={Trash2}
         
          variant="delete"
          onClick={() => handleDelete(item.item_code)}
        />
      </div>
    )
  }))

  const columnsWithActions = [
    ...columns,
    { key: 'actions', label: 'Actions' }
  ]

  return (
    <div className='bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6 min-h-screen'>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Items Master</h1>
            <p className="text-xs text-gray-600">Manage your product catalog</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/manufacturing/items/new')}
          className="btn-primary flex items-center gap-2 bg-gradient-to-br from-blue-400 to-blue-600"
        >
          <Plus size={16} /> Create Item
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color="blue"
        />
        <StatCard
          icon={Tag}
          label="Active Groups"
          value={stats.activeGroups}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock Items"
          value={stats.lowStockItems}
          color="amber"
        />
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-3 grid-cols-1 sm:grid-cols-2 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Search size={14} /> Search Items
          </label>
          <Input
            type="text"
            placeholder="Search by code or name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-500"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Package size={14} /> Filter by Group
          </label>
          <select
            value={filters.item_group}
            onChange={(e) => setFilters({ ...filters, item_group: e.target.value })}
            className="rounded-xs border border-gray-300 bg-white py-2 text-xs text-gray-900 cursor-pointer transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Groups</option>
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden ">
        {loading ? (
          <div className="flex items-center justify-center px-4 py-12 text-gray-500">
            <div className="text-sm">Loading items...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-gray-500">
            <Package size={32} className="mb-3 opacity-50" />
            <div className="text-sm">No items found</div>
            <Link to="/manufacturing/items/new">
              <button className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all">
                Create First Item
              </button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {columnsWithActions.map(col => (
                    <th
                      key={col.key}
                      className="px-3 py-2 text-left font-semibold text-gray-700"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItemsWithActions.map((item, idx) => (
                  <tr
                    key={item.item_code}
                    className={`border-b border-gray-100 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition-colors`}
                  >
                    {columnsWithActions.map(col => (
                      <td
                        key={`${item.item_code}-${col.key}`}
                        className="px-3 py-2 text-gray-700"
                      >
                        {col.key === 'actions'
                          ? item.actions
                          : col.format
                          ? col.format(item[col.key])
                          : item[col.key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-xs text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, items.length)} of {items.length} items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-all ${
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
