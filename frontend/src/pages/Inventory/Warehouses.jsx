import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import { Plus, Eye, Edit2, Trash2, Warehouse, X } from 'lucide-react'
import './Inventory.css'

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    warehouse_code: '',
    warehouse_name: '',
    warehouse_type: 'Raw Material',
    location: '',
    capacity: '',
    parent_warehouse_id: ''
  })

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/stock/warehouses')
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
        await axios.put(`/api/stock/warehouses/${editingId}`, formData)
        setSuccess('Warehouse updated successfully')
      } else {
        await axios.post('/api/stock/warehouses', formData)
        setSuccess('Warehouse created successfully')
      }
      setFormData({
        warehouse_code: '',
        warehouse_name: '',
        warehouse_type: 'Raw Material',
        location: '',
        capacity: '',
        parent_warehouse_id: ''
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
    setFormData(warehouse)
    setEditingId(warehouse.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await axios.delete(`/api/stock/warehouses/${id}`)
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
      parent_warehouse_id: ''
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

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'warehouse_code', label: 'Code' },
    { key: 'warehouse_name', label: 'Name' },
    { key: 'warehouse_type', label: 'Type' },
    { key: 'location', label: 'Location' },
    { key: 'capacity', label: 'Capacity' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="inventory-actions-cell">
          <button className="btn-edit" onClick={() => handleEdit(row)}>
            <Edit2 size={14} />
          </button>
          <button className="btn-delete" onClick={() => handleDelete(row.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <Warehouse size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Warehouses
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={Plus}
          style={{ padding: '6px 10px', fontSize: '11px' }}
        >
          {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <Card title={editingId ? 'Edit' : 'Add Warehouse'} className="inventory-form">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Warehouse Code *</label>
                <input
                  type="text"
                  name="warehouse_code"
                  value={formData.warehouse_code}
                  onChange={handleChange}
                  required
                  disabled={editingId}
                  placeholder="e.g., WH001"
                />
              </div>
              <div className="form-group">
                <label>Warehouse Name *</label>
                <input
                  type="text"
                  name="warehouse_name"
                  value={formData.warehouse_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Main Warehouse"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Warehouse Type *</label>
                <select
                  name="warehouse_type"
                  value={formData.warehouse_type}
                  onChange={handleChange}
                  required
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Finished Goods">Finished Goods</option>
                  <option value="Scrap">Scrap</option>
                  <option value="WIP">WIP</option>
                </select>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Mumbai"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Storage Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="e.g., 1000"
                />
              </div>
              <div className="form-group">
                <label>Parent Warehouse</label>
                <input
                  type="number"
                  name="parent_warehouse_id"
                  value={formData.parent_warehouse_id}
                  onChange={handleChange}
                  placeholder="Leave empty if no parent"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading}>
                {editingId ? 'Update' : 'Create'} Warehouse
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && warehouses.length > 0 && (
        <div className="inventory-filters">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            style={{ minWidth: '150px' }}
          />
          <select 
            value={locationFilter} 
            onChange={(e) => {
              setLocationFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">All Locations</option>
            {uniqueLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {(searchTerm || locationFilter) && (
            <Button 
              variant="secondary" 
              onClick={handleClearFilters}
              icon={X}
              style={{ padding: '6px 10px', fontSize: '11px' }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {loading && !showForm ? (
        <div className="no-data">
          <Warehouse size={48} style={{ opacity: 0.5 }} />
          <p>Loading warehouses...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="no-data">
          <Warehouse size={48} style={{ opacity: 0.5 }} />
          <p>📦 No warehouses found.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Create your first warehouse to get started.</p>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="no-data">
          <Warehouse size={48} style={{ opacity: 0.5 }} />
          <p>❌ No warehouses match your filters.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={paginatedData} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredWarehouses.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  )
}