import React, { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import Modal from '../../components/Modal/Modal'
import { Plus, Edit2, Trash2, Warehouse, X, MapPin, Package, BarChart3, Zap, Grid3x3, List, Settings2, Search, LayoutGrid, Table as TableIcon, RotateCcw } from 'lucide-react'
import './Inventory.css'

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  const [formData, setFormData] = useState({
    warehouse_code: '',
    warehouse_name: '',
    warehouse_type: 'Raw Material',
    location: '',
    capacity: '',
    parent_warehouse_id: '',
    department: 'all'
  })

  const [visibleColumns, setVisibleColumns] = useState(new Set(['warehouse_code', 'warehouse_name', 'warehouse_type', 'location', 'capacity']))

  useEffect(() => {
    fetchDepartments()
    fetchWarehouses()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/masters/departments')
      if (response.data.success) {
        setDepartments(['all', ...response.data.data])
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
      setDepartments(['all', 'inventory', 'manufacturing', 'admin'])
    }
  }

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch warehouses')
      setWarehouses([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) {
        await api.put(`/stock/warehouses/${editingId}`, formData)
        setSuccess('Warehouse updated successfully')
      } else {
        await api.post('/stock/warehouses', formData)
        setSuccess('Warehouse created successfully')
      }
      setFormData({
        warehouse_code: '',
        warehouse_name: '',
        warehouse_type: 'Raw Material',
        location: '',
        capacity: '',
        parent_warehouse_id: '',
        department: 'all'
      })
      setShowForm(false)
      setEditingId(null)
      fetchWarehouses()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save warehouse')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (warehouse) => {
    setFormData({
      ...warehouse,
      department: warehouse.department || 'all'
    })
    setEditingId(warehouse.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await api.delete(`/stock/warehouses/${id}`)
        setSuccess('Warehouse deleted successfully')
        fetchWarehouses()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete warehouse')
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      warehouse_code: '',
      warehouse_name: '',
      warehouse_type: 'Raw Material',
      location: '',
      capacity: '',
      parent_warehouse_id: '',
      department: 'all'
    })
  }

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(warehouse =>
      (warehouse.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       warehouse.warehouse_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       warehouse.location?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (locationFilter === '' || warehouse.location === locationFilter)
    )
  }, [warehouses, searchTerm, locationFilter])

  const uniqueLocations = useMemo(() => {
    return [...new Set(warehouses.map(w => w.location).filter(Boolean))]
  }, [warehouses])

  const handleClearFilters = () => {
    setSearchTerm('')
    setLocationFilter('')
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Raw Material':
        return <Package size={20} className="text-blue-500" />
      case 'Finished Goods':
        return <BarChart3 size={20} className="text-green-500" />
      case 'Scrap':
        return <Trash2 size={20} className="text-orange-500" />
      case 'WIP':
        return <Zap size={20} className="text-amber-500" />
      default:
        return <Warehouse size={20} className="text-gray-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Raw Material':
        return 'from-blue-50 to-blue-100'
      case 'Finished Goods':
        return 'from-green-50 to-green-100'
      case 'Scrap':
        return 'from-orange-50 to-orange-100'
      case 'WIP':
        return 'from-amber-50 to-amber-100'
      default:
        return 'from-gray-50 to-gray-100'
    }
  }

  const columns = useMemo(() => [
    { key: 'warehouse_code', label: 'Code' },
    { key: 'warehouse_name', label: 'Name' },
    { key: 'warehouse_type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'capacity', label: 'Capacity' }
  ], [])

  const renderActions = (row) => (
    <div className="flex gap-2">
      <button
        onClick={() => handleEdit(row)}
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xs transition-colors"
        title="Edit Warehouse"
      >
        <Edit2 size={14} />
      </button>
      <button
        onClick={() => handleDelete(row.id)}
        className="p-1.5 text-red-600 hover:bg-red-50 rounded-xs transition-colors"
        title="Delete Warehouse"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )

  const toggleColumn = (key) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        if (newSet.size > 1) newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Warehouse size={24} className="text-amber-500" />
              Warehouses
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Manage storage locations and inventory warehouses</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xs transition-all shadow-sm active:transform active:scale-95"
          >
            <Plus size={16} />
            Create Warehouse
          </button>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}
        {success && <Alert type="success" className="mb-4">{success}</Alert>}

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input
                  type="text"
                  placeholder="Search by name, code, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-[140px]"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              {(searchTerm || locationFilter) && (
                <button
                  onClick={handleClearFilters}
                  className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                  title="Clear filters"
                >
                  <RotateCcw size={16} />
                </button>
              )}

              <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'card' ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <div className="relative ml-auto">
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border rounded-xs transition-all ${showColumnMenu ? 'bg-neutral-100 border-neutral-300' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}
                >
                  <Settings2 size={14} />
                  Columns
                </button>

                {showColumnMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs shadow-xl z-20 py-2">
                      <div className="px-3 py-1 text-[10px] font-bold text-neutral-400  tracking-wider border-b border-neutral-100 dark:border-neutral-700 mb-1">
                        Visible Columns
                      </div>
                      {columns.map(col => (
                        <label key={col.key} className="flex items-center px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="w-3.5 h-3.5 rounded-xs border-neutral-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="ml-2 text-xs text-neutral-700 dark:text-neutral-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs text-neutral-500">Loading warehouses...</p>
              </div>
            ) : filteredWarehouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <Warehouse size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">No warehouses found</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  {searchTerm || locationFilter 
                    ? "Try adjusting your filters to find what you're looking for." 
                    : "Get started by creating your first warehouse."}
                </p>
                {(searchTerm || locationFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 text-xs text-amber-600 font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <DataTable
                columns={columns}
                data={filteredWarehouses}
                renderActions={renderActions}
                externalVisibleColumns={visibleColumns}
                hideColumnToggle={true}
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-neutral-50/50 dark:bg-neutral-950/50">
                {filteredWarehouses.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden hover:shadow-md transition-all duration-300"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${getTypeColor(warehouse.warehouse_type)}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xs">
                            {getTypeIcon(warehouse.warehouse_type)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors">
                              {warehouse.warehouse_code}
                            </h3>
                            <p className="text-[10px] text-neutral-500  font-bold tracking-wider">
                              {warehouse.warehouse_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(warehouse)}
                            className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xs transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(warehouse.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xs transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                            {warehouse.warehouse_name}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-y-2">
                          {warehouse.location && (
                            <div className="flex items-center gap-1.5 w-1/2">
                              <MapPin size={12} className="text-neutral-400" />
                              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">{warehouse.location}</span>
                            </div>
                          )}
                          {warehouse.capacity && (
                            <div className="flex items-center gap-1.5 w-1/2">
                              <Package size={12} className="text-neutral-400" />
                              <span className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">Cap: {warehouse.capacity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Modal
          isOpen={showForm}
          onClose={handleCancel}
          title={editingId ? 'Edit Warehouse' : 'Create New Warehouse'}
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="warehouse-form" loading={loading} className="bg-amber-500 hover:bg-amber-600">
                {editingId ? 'Update' : 'Create'} Warehouse
              </Button>
            </div>
          }
        >
          <form id="warehouse-form" onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Warehouse Code *
                </label>
                <input
                  type="text"
                  name="warehouse_code"
                  value={formData.warehouse_code}
                  onChange={handleChange}
                  required
                  disabled={editingId}
                  placeholder="e.g., WH001"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-neutral-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Warehouse Name *
                </label>
                <input
                  type="text"
                  name="warehouse_name"
                  value={formData.warehouse_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Main Warehouse"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Warehouse Type *
                </label>
                <select
                  name="warehouse_type"
                  value={formData.warehouse_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Scrap">Scrap</option>
                  <option value="WIP">WIP</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Department *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Mumbai"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Storage Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="e.g., 1000"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                Parent Warehouse ID
              </label>
              <input
                type="number"
                name="parent_warehouse_id"
                value={formData.parent_warehouse_id}
                onChange={handleChange}
                placeholder="Leave empty if no parent"
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
