import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import { Plus, Edit2, Trash2, Truck, CheckCircle, X } from 'lucide-react'
import './Inventory.css'

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    status: 'draft',
    remarks: ''
  })

  const [transferItems, setTransferItems] = useState([])
  const [newItem, setNewItem] = useState({ item_code: '', qty: 1 })

  useEffect(() => {
    fetchTransfers()
    fetchWarehouses()
    fetchItems()
  }, [])

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/stock/transfers')
      setTransfers(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch transfers')
      setTransfers([])
    } finally {
      setLoading(false)
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

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items?limit=1000')
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAddItem = () => {
    if (newItem.item_code && newItem.qty > 0) {
      setTransferItems([...transferItems, { ...newItem, id: Date.now() }])
      setNewItem({ item_code: '', qty: 1 })
    }
  }

  const handleRemoveItem = (id) => {
    setTransferItems(transferItems.filter(item => item.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (transferItems.length === 0) {
      setError('Please add at least one item to transfer')
      return
    }
    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      setError('Source and destination warehouses must be different')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        items: transferItems
      }

      if (editingId) {
        await axios.put(`/api/stock/transfers/${editingId}`, submitData)
        setSuccess('Transfer updated successfully')
      } else {
        await axios.post('/api/stock/transfers', submitData)
        setSuccess('Transfer created successfully')
      }

      resetForm()
      fetchTransfers()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save transfer')
    } finally {
      setLoading(false)
    }
  }

  const handleReceive = async (id) => {
    try {
      await axios.patch(`/api/stock/transfers/${id}/receive`)
      setSuccess('Transfer received successfully')
      fetchTransfers()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to receive transfer')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transfer?')) {
      try {
        await axios.delete(`/api/stock/transfers/${id}`)
        setSuccess('Transfer deleted successfully')
        fetchTransfers()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete transfer')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      from_warehouse_id: '',
      to_warehouse_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      remarks: ''
    })
    setTransferItems([])
    setShowForm(false)
    setEditingId(null)
  }

  // Filter and pagination logic
  const filteredTransfers = transfers.filter(transfer =>
    (transfer.transfer_id?.toString().includes(searchTerm.toLowerCase()) ||
     transfer.from_warehouse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     transfer.to_warehouse?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === '' || transfer.status === statusFilter)
  )

  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredTransfers.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCurrentPage(1)
  }

  const getStatusBadge = (status) => {
    const badges = {
      'draft': 'warning',
      'submitted': 'info',
      'in-transit': 'info',
      'received': 'success',
      'cancelled': 'danger'
    }
    return badges[status] || 'secondary'
  }

  const columns = [
    { key: 'transfer_id', label: 'Transfer ID' },
    { key: 'from_warehouse', label: 'From' },
    { key: 'to_warehouse', label: 'To' },
    { key: 'item_count', label: 'Items' },
    {
      key: 'transfer_date',
      label: 'Date',
      render: (row) => new Date(row.transfer_date).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge className={getStatusBadge(row.status)}>{row.status}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="inventory-actions-cell">
          {row.status === 'in-transit' && (
            <button className="btn-edit" onClick={() => handleReceive(row.transfer_id)}>
              <CheckCircle size={14} />
            </button>
          )}
          {row.status === 'draft' && (
            <button className="btn-edit" onClick={() => handleDelete(row.transfer_id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <Truck size={28} style={{ display: 'inline', marginRight: '10px' }} />
          Stock Transfers
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={Plus}
        >
          {showForm ? 'Cancel' : 'New Transfer'}
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <Card title="Create Stock Transfer" className="inventory-form">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>From Warehouse *</label>
                <select
                  name="from_warehouse_id"
                  value={formData.from_warehouse_id}
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
                <label>To Warehouse *</label>
                <select
                  name="to_warehouse_id"
                  value={formData.to_warehouse_id}
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
                <label>Transfer Date *</label>
                <input
                  type="date"
                  name="transfer_date"
                  value={formData.transfer_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="in-transit">In Transit</option>
                </select>
              </div>
            </div>

            {/* Items Section */}
            <Card title="Add Items to Transfer" style={{ marginBottom: '15px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Item Code *</label>
                  <select
                    value={newItem.item_code}
                    onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
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
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.qty}
                    onChange={(e) => setNewItem({ ...newItem, qty: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button variant="secondary" onClick={handleAddItem}>
                    Add Item
                  </Button>
                </div>
              </div>

              {transferItems.length > 0 && (
                <table className="inventory-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Quantity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.item_code}</td>
                        <td>{item.qty}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

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
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading}>
                Create Transfer
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && transfers.length > 0 && (
        <div className="inventory-filters">
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by transfer ID or warehouse..."
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
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in-transit">In Transit</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
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
          <Truck size={48} style={{ opacity: 0.5 }} />
          <p>Loading transfers...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="no-data">
          <Truck size={48} style={{ opacity: 0.5 }} />
          <p>🚚 No stock transfers found.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Create your first transfer to move stock between warehouses.</p>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="no-data">
          <Truck size={48} style={{ opacity: 0.5 }} />
          <p>❌ No transfers match your filters.</p>
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
            totalItems={filteredTransfers.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  )
}