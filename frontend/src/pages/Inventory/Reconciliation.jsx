import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import { Plus, CheckCircle, Trash2, Settings, X } from 'lucide-react'
import './Inventory.css'

export default function Reconciliation() {
  const [reconciliations, setReconciliations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [formData, setFormData] = useState({
    warehouse_id: '',
    reconciliation_date: new Date().toISOString().split('T')[0],
    status: 'draft',
    remarks: ''
  })

  const [reconcilItems, setReconcilItems] = useState([])
  const [newItem, setNewItem] = useState({ item_code: '', system_qty: 0, physical_qty: 0 })

  useEffect(() => {
    fetchReconciliations()
    fetchWarehouses()
    fetchItems()
  }, [])

  const fetchReconciliations = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/stock/reconciliations')
      setReconciliations(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reconciliations')
      setReconciliations([])
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
    if (newItem.item_code) {
      setReconcilItems([...reconcilItems, { ...newItem, id: Date.now() }])
      setNewItem({ item_code: '', system_qty: 0, physical_qty: 0 })
    }
  }

  const handleRemoveItem = (id) => {
    setReconcilItems(reconcilItems.filter(item => item.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (reconcilItems.length === 0) {
      setError('Please add at least one item to reconcile')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        items: reconcilItems
      }

      await axios.post('/api/stock/reconciliations', submitData)
      setSuccess('Reconciliation created successfully')

      setFormData({
        warehouse_id: '',
        reconciliation_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        remarks: ''
      })
      setReconcilItems([])
      setShowForm(false)
      fetchReconciliations()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save reconciliation')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReconciliation = async (id) => {
    try {
      await axios.patch(`/api/stock/reconciliations/${id}/submit`)
      setSuccess('Reconciliation submitted successfully')
      fetchReconciliations()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit reconciliation')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this reconciliation?')) {
      try {
        await axios.delete(`/api/stock/reconciliations/${id}`)
        setSuccess('Reconciliation deleted successfully')
        fetchReconciliations()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete reconciliation')
      }
    }
  }

  const getVariance = (system, physical) => {
    const diff = physical - system
    return {
      value: diff,
      percentage: system !== 0 ? ((diff / system) * 100).toFixed(2) : 0
    }
  }

  // Filter and pagination logic
  const filteredReconciliations = reconciliations.filter(rec =>
    (rec.reconciliation_id?.toString().includes(searchTerm.toLowerCase()) ||
     rec.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === '' || rec.status === statusFilter)
  )

  const totalPages = Math.ceil(filteredReconciliations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredReconciliations.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCurrentPage(1)
  }

  const columns = [
    { key: 'reconciliation_id', label: 'ID' },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'item_count', label: 'Items' },
    {
      key: 'reconciliation_date',
      label: 'Date',
      render: (row) => new Date(row.reconciliation_date).toLocaleDateString()
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge className={row.status === 'submitted' ? 'success' : 'warning'}>{row.status}</Badge>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="inventory-actions-cell">
          {row.status === 'draft' && (
            <>
              <button className="btn-edit" onClick={() => handleSubmitReconciliation(row.reconciliation_id)}>
                <CheckCircle size={14} />
              </button>
              <button className="btn-delete" onClick={() => handleDelete(row.reconciliation_id)}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <Settings size={28} style={{ display: 'inline', marginRight: '10px' }} />
          Stock Reconciliation
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={Plus}
        >
          {showForm ? 'Cancel' : 'New Reconciliation'}
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {showForm && (
        <Card title="Create Reconciliation" className="inventory-form">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
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
                <label>Date *</label>
                <input
                  type="date"
                  name="reconciliation_date"
                  value={formData.reconciliation_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Items Section */}
            <Card title="Add Items to Reconcile" style={{ marginBottom: '15px' }}>
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
                  <label>System Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.system_qty}
                    onChange={(e) => setNewItem({ ...newItem, system_qty: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Physical Qty *</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.physical_qty}
                    onChange={(e) => setNewItem({ ...newItem, physical_qty: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button variant="secondary" onClick={handleAddItem}>
                    Add Item
                  </Button>
                </div>
              </div>

              {reconcilItems.length > 0 && (
                <table className="inventory-items-table">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>System Qty</th>
                      <th>Physical Qty</th>
                      <th>Variance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconcilItems.map(item => {
                      const variance = getVariance(item.system_qty, item.physical_qty)
                      return (
                        <tr key={item.id}>
                          <td>{item.item_code}</td>
                          <td>{item.system_qty}</td>
                          <td>{item.physical_qty}</td>
                          <td className={variance.value > 0 ? 'optimal-stock' : variance.value < 0 ? 'low-stock' : ''}>
                            {variance.value > 0 ? '+' : ''}{variance.value} ({variance.percentage}%)
                          </td>
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
                      )
                    })}
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
                placeholder="Reconciliation notes"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading}>
                Create Reconciliation
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!showForm && reconciliations.length > 0 && (
        <div className="inventory-filters">
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by ID or warehouse..."
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
          <Settings size={48} style={{ opacity: 0.5 }} />
          <p>Loading reconciliations...</p>
        </div>
      ) : reconciliations.length === 0 ? (
        <div className="no-data">
          <Settings size={48} style={{ opacity: 0.5 }} />
          <p>⚖️ No reconciliations found.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Create your first reconciliation to track inventory accuracy.</p>
        </div>
      ) : filteredReconciliations.length === 0 ? (
        <div className="no-data">
          <Settings size={48} style={{ opacity: 0.5 }} />
          <p>❌ No reconciliations match your filters.</p>
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
            totalItems={filteredReconciliations.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  )
}