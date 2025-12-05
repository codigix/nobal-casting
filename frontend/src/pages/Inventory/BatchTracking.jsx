import React, { useState, useEffect } from 'react'
import axios from 'axios'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Button from '../../components/Button/Button'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import { Barcode, Plus, Trash2, Download, X } from 'lucide-react'
import './Inventory.css'

export default function BatchTracking() {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    batch_id: '',
    item_code: '',
    batch_no: '',
    qty_total: '',
    qty_available: '',
    expiry_date: '',
    manufacturing_date: '',
    warehouse_id: '',
    remarks: ''
  })

  const [warehouses, setWarehouses] = useState([])

  useEffect(() => {
    fetchBatches()
    fetchItems()
    fetchWarehouses()
  }, [])

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/stock/batches')
      setBatches(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch batches')
      setBatches([])
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
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await axios.post('/api/stock/batches', formData)
      setSuccess('Batch created successfully')
      setFormData({
        batch_id: '',
        item_code: '',
        batch_no: '',
        qty_total: '',
        qty_available: '',
        expiry_date: '',
        manufacturing_date: '',
        warehouse_id: '',
        remarks: ''
      })
      setShowForm(false)
      fetchBatches()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create batch')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      try {
        await axios.delete(`/api/stock/batches/${id}`)
        setSuccess('Batch deleted successfully')
        fetchBatches()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete batch')
      }
    }
  }

  const getBatchStatus = (expiryDate, qtyAvailable) => {
    if (qtyAvailable === 0) return { text: 'Exhausted', value: 'exhausted', color: 'danger' }
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { text: 'Expired', value: 'expired', color: 'danger' }
    if (daysLeft < 30) return { text: 'Expiring Soon', value: 'expiring-soon', color: 'warning' }
    return { text: 'Active', value: 'active', color: 'success' }
  }

  // Filter and pagination logic
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batch_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          batch.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          batch.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '' || getBatchStatus(batch.expiry_date, batch.qty_available).value === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredBatches.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCurrentPage(1)
  }

  const columns = [
    { key: 'batch_id', label: 'Batch ID' },
    { key: 'item_code', label: 'Item Code' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'batch_no', label: 'Batch Number' },
    { key: 'qty_available', label: 'Available Qty' },
    { key: 'qty_total', label: 'Total Qty' },
    {
      key: 'expiry_date',
      label: 'Expiry Date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => {
        if (!row) return null
        const status = getBatchStatus(row.expiry_date, row.qty_available)
        return <Badge className={status.color}>{status.text}</Badge>
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        if (!row) return null
        return (
        <button className="btn-delete" onClick={() => handleDelete(row.batch_id)}>
          <Trash2 size={14} />
        </button>
      )
      }
    }
  ]

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <Barcode size={28} style={{ display: 'inline', marginRight: '10px' }} />
          Batch Tracking
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={Plus}
        >
          {showForm ? 'Cancel' : 'New Batch'}
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <Card title="Track New Batch" className="inventory-form">
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
                <label>Batch Number *</label>
                <input
                  type="text"
                  name="batch_no"
                  value={formData.batch_no}
                  onChange={handleChange}
                  required
                  placeholder="e.g., BATCH-001"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Quantity *</label>
                <input
                  type="number"
                  name="qty_total"
                  value={formData.qty_total}
                  onChange={handleChange}
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Available Quantity *</label>
                <input
                  type="number"
                  name="qty_available"
                  value={formData.qty_available}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Manufacturing Date</label>
                <input
                  type="date"
                  name="manufacturing_date"
                  value={formData.manufacturing_date}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  required
                />
              </div>
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

            <div className="form-group">
              <label>Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Additional notes"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading}>
                Create Batch
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && batches.length > 0 && (
        <div className="inventory-filters">
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by batch number, item code, or name..."
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
            <option value="expiring-soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="exhausted">Exhausted</option>
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
          <Barcode size={48} style={{ opacity: 0.5 }} />
          <p>Loading batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="no-data">
          <Barcode size={48} style={{ opacity: 0.5 }} />
          <p>🏷️ No batches tracked yet.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Create your first batch to track inventory with expiry dates.</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="no-data">
          <Barcode size={48} style={{ opacity: 0.5 }} />
          <p>❌ No batches match your filters.</p>
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
            totalItems={filteredBatches.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  )
}