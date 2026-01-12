import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import Modal from '../../components/Modal/Modal'
import { Plus, Edit2, Trash2, Warehouse, X, MapPin, Package, BarChart3, Zap, Grid3x3, List } from 'lucide-react'
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [viewMode, setViewMode] = useState('table')

  const [formData, setFormData] = useState({
    warehouse_code: '',
    warehouse_name: '',
    warehouse_type: 'Raw Material',
    location: '',
    capacity: '',
    parent_warehouse_id: '',
    department: 'all'
  })

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

  // Filter and pagination logic
  const filteredWarehouses = warehouses.filter(warehouse =>
    (warehouse.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     warehouse.warehouse_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     warehouse.location?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (locationFilter === '' || warehouse.location === locationFilter)
  )

  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredWarehouses.slice(startIndex, endIndex)

  // Get unique locations for filter
  const uniqueLocations = [...new Set(warehouses.map(w => w.location).filter(Boolean))]

  const handleClearFilters = () => {
    setSearchTerm('')
    setLocationFilter('')
    setCurrentPage(1)
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

  const columns = [
    { key: 'warehouse_code', label: 'Code' },
    { key: 'warehouse_name', label: 'Name' },
    { key: 'warehouse_type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        if (!row) return null
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => handleEdit(row)}
            >
              <Edit2 size={10} /> 
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
              onClick={() => handleDelete(row.id)}
            >
              <Trash2 size={10}  /> 
            </button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-5 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <Warehouse size={28} className="text-amber-500" />
              Warehouses
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Manage storage locations and inventory warehouses</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 whitespace-nowrap text-sm"
          >
            <Plus size={15} />
            Create Warehouse
          </button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <Modal
          isOpen={showForm}
          onClose={handleCancel}
          title={editingId ? 'Edit Warehouse' : 'Create New Warehouse'}
          size="md"
          footer={
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="warehouse-form" loading={loading}>
                {editingId ? 'Update' : 'Create'} Warehouse
              </Button>
            </div>
          }
        >
          <form id="warehouse-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
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
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
                Warehouse Name *
              </label>
              <input
                type="text"
                name="warehouse_name"
                value={formData.warehouse_name}
                onChange={handleChange}
                required
                placeholder="e.g., Main Warehouse"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
                Warehouse Type *
              </label>
              <select
                name="warehouse_type"
                value={formData.warehouse_type}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Scrap">Scrap</option>
                <option value="WIP">WIP</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Mumbai"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept.charAt(0).toUpperCase() + dept.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
                Storage Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g., 1000"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: '#374151', textTransform: 'uppercase' }}>
                Parent Warehouse ID
              </label>
              <input
                type="number"
                name="parent_warehouse_id"
                value={formData.parent_warehouse_id}
                onChange={handleChange}
                placeholder="Leave empty if no parent"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </form>
        </Modal>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4 animate-pulse">
              <Warehouse size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4">
              <Warehouse size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Warehouses Found</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md mb-6">Create your first warehouse to get started managing inventory locations.</p>
          </div>
        ) : (
          <>
            {!showForm && warehouses.length > 0 && (
              <div className="mb-5 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by name, code, or location..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="flex-1 p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <select 
                  value={locationFilter} 
                  onChange={(e) => {
                    setLocationFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Locations</option>
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                {(searchTerm || locationFilter) && (
                  <button 
                    onClick={handleClearFilters}
                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 text-sm"
                  >
                    <X size={14} />
                    Clear
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                    title="Table view"
                  >
                    <List size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                    title="Card view"
                  >
                    <Grid3x3 size={15} />
                  </button>
                </div>
              </div>
            )}

            {filteredWarehouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4">
                  <Warehouse size={40} className="text-neutral-400 dark:text-neutral-600" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Matching Warehouses</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md">Try adjusting your search or filters.</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className=" ">
                <DataTable columns={columns} data={paginatedData} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedData.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className={`bg-gradient-to-br ${getTypeColor(warehouse.warehouse_type)} p-4 flex items-start justify-between`}>
                      <div className="flex items-start gap-2">
                        <div className="p-1 bg-white/50 rounded-lg">
                          {getTypeIcon(warehouse.warehouse_type)}
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-900 text-base">{warehouse.warehouse_code}</h3>
                          <p className="text-xs text-neutral-700 font-medium">{warehouse.warehouse_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary">{warehouse.warehouse_type}</Badge>
                      </div>

                      {warehouse.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-neutral-400" />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{warehouse.location}</span>
                        </div>
                      )}

                      {warehouse.capacity && (
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-neutral-400" />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">Capacity: <strong>{warehouse.capacity}</strong></span>
                        </div>
                      )}

                      {warehouse.parent_warehouse_id && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-500">
                          Parent ID: {warehouse.parent_warehouse_id}
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all"
                        >
                          <Edit2 size={10} />
                          
                        </button>
                        <button
                          onClick={() => handleDelete(warehouse.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                        >
                          <Trash2 size={10} />
                          
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredWarehouses.length)} of {filteredWarehouses.length} warehouses
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          currentPage === page
                            ? 'bg-amber-500 text-white'
                            : 'border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}