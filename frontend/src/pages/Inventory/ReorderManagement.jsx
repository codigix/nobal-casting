import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import { Plus, Edit2, Trash2, AlertTriangle, X } from 'lucide-react'
import './Inventory.css'

export default function ReorderManagement() {
  const [reorders, setReorders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [items, setItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    item_code: '',
    warehouse_id: '',
    reorder_level: '',
    reorder_quantity: '',
    min_order_qty: '',
    supplier_id: '',
    lead_time_days: '',
    active: true
  })

  useEffect(() => {
    fetchReorders()
    fetchItems()
    fetchWarehouses()
  }, [])

  const fetchReorders = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/stock/reorder-management')
      setReorders(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reorder settings')
      setReorders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items?limit=1000')
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleEdit = (reorder) => {
    setFormData(reorder)
    setEditingId(reorder.reorder_id)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      if (editingId) {
        await axios.put(`/api/stock/reorder-management/${editingId}`, formData)
        setSuccess('Reorder setting updated successfully')
      } else {
        await axios.post('/api/stock/reorder-management', formData)
        setSuccess('Reorder setting created successfully')
      }
      resetForm()
      fetchReorders()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save reorder setting')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this reorder setting?')) {
      try {
        await axios.delete(`/api/stock/reorder-management/${id}`)
        setSuccess('Reorder setting deleted successfully')
        fetchReorders()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete reorder setting')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      item_code: '',
      warehouse_id: '',
      reorder_level: '',
      reorder_quantity: '',
      min_order_qty: '',
      supplier_id: '',
      lead_time_days: '',
      active: true
    })
    setShowForm(false)
    setEditingId(null)
  }

  // Filter and pagination logic
  const filteredReorders = reorders.filter(reorder =>
    (reorder.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     reorder.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     reorder.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === '' || (statusFilter === 'active' ? reorder.active : !reorder.active))
  )

  const totalPages = Math.ceil(filteredReorders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredReorders.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCurrentPage(1)
  }

  const columns = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'warehouse_name', label: 'Warehouse' },
    {
      key: 'reorder_level',
      label: 'Reorder Level'
    },
    {
      key: 'reorder_quantity',
      label: 'Reorder Qty'
    },
    {
      key: 'min_order_qty',
      label: 'Min Order Qty'
    },
    {
      key: 'lead_time_days',
      label: 'Lead Time (Days)'
    },
    {
      key: 'active',
      label: 'Status',
      render: (row) => <Badge className={row.active ? 'success' : 'danger'}>{row.active ? 'Active' : 'Inactive'}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="inventory-actions-cell">
          <button className="btn-edit" onClick={() => handleEdit(row)}>
            <Edit2 size={14} />
          </button>
          <button className="btn-delete" onClick={() => handleDelete(row.reorder_id)}>
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
          <AlertTriangle size={28} style={{ display: 'inline', marginRight: '10px' }} />
          Reorder Management
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={Plus}
        >
          {showForm ? 'Cancel' : 'Add Reorder Setting'}
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <Card title={editingId ? 'Edit Reorder Setting' : 'Add Reorder Setting'} className="inventory-form">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Item Code *</label>
                <select
                  name="item_code"
                  value={formData.item_code}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Item</option>
                  {items.map(item => (
                    <option key={item.item_code} value={item.item_code}>
                      {item.item_name} ({item.item_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Warehouse *</label>
                <select
                  name="warehouse_id"
                  value={formData.warehouse_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Reorder Level *</label>
                <input
                  type="number"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="Trigger level for reordering"
                />
              </div>
              <div className="form-group">
                <label>Reorder Quantity *</label>
                <input
                  type="number"
                  name="reorder_quantity"
                  value={formData.reorder_quantity}
                  onChange={handleChange}
                  required
                  min="1"
                  placeholder="Quantity to order"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Minimum Order Quantity</label>
                <input
                  type="number"
                  name="min_order_qty"
                  value={formData.min_order_qty}
                  onChange={handleChange}
                  min="1"
                  placeholder="Minimum quantity constraint"
                />
              </div>
              <div className="form-group">
                <label>Lead Time (Days)</label>
                <input
                  type="number"
                  name="lead_time_days"
                  value={formData.lead_time_days}
                  onChange={handleChange}
                  min="0"
                  placeholder="Supplier lead time"
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                />
                {' '}Active
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading}>
                {editingId ? 'Update' : 'Create'} Setting
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && reorders.length > 0 && (
        <div className="inventory-filters">
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by item code, name, or warehouse..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(searchTerm || statusFilter) && (
            <Button 
              variant="secondary" 
              onClick={handleClearFilters}
              icon={X}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {loading && !showForm ? (
        <div className="no-data">
          <AlertTriangle size={48} style={{ opacity: 0.5 }} />
          <p>Loading reorder settings...</p>
        </div>
      ) : reorders.length === 0 ? (
        <div className="no-data">
          <AlertTriangle size={48} style={{ opacity: 0.5 }} />
          <p>⚠️ No reorder settings found.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Set up reorder levels for your items to manage inventory automatically.</p>
        </div>
      ) : filteredReorders.length === 0 ? (
        <div className="no-data">
          <AlertTriangle size={48} style={{ opacity: 0.5 }} />
          <p>❌ No settings match your filters.</p>
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
            totalItems={filteredReorders.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  )
}