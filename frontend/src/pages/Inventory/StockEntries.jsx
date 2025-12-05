import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Modal, { useModal } from '../../components/Modal/Modal'
import Pagination from './Pagination'
import { Plus, Edit2, Trash2, Package, Eye, X } from 'lucide-react'
import './Inventory.css'

export default function StockEntries() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const formModal = useModal(false)
  const [showGRNForm, setShowGRNForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [grnRequests, setGrnRequests] = useState([])
  const [grnWithEntries, setGrnWithEntries] = useState(new Set())
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    purpose: '',
    reference_doctype: '',
    reference_name: '',
    remarks: '',
    grn_id: ''
  })

  const [entryItems, setEntryItems] = useState([])
  const [newItem, setNewItem] = useState({ 
    item_code: '', 
    qty: 1,
    valuation_rate: 0,
    uom: 'Kg',
    batch_no: ''
  })

  useEffect(() => {
    fetchEntries()
    fetchWarehouses()
    fetchItems()
    fetchApprovedGRNs()
  }, [])

  useEffect(() => {
    if (!formModal.isOpen) {
      resetForm()
      setSelectedGRN(null)
    }
  }, [formModal.isOpen])

  const fetchApprovedGRNs = async () => {
    try {
      const [grnRes, entriesRes] = await Promise.all([
        axios.get('/api/grn-requests?status=approved'),
        axios.get('/api/stock/entries')
      ])
      
      const grns = grnRes.data.data || []
      const entries = entriesRes.data.data || []
      
      const grnNosWithEntries = new Set(
        entries
          .filter(entry => entry.reference_doctype === 'GRN')
          .map(entry => entry.reference_name)
      )
      
      setGrnRequests(grns)
      setGrnWithEntries(grnNosWithEntries)
    } catch (err) {
      console.error('Failed to fetch approved GRNs:', err)
    }
  }

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/stock/entries')
      setEntries(response.data.data || [])
      
      const grnNosWithEntries = new Set(
        (response.data.data || [])
          .filter(entry => entry.reference_doctype === 'GRN')
          .map(entry => entry.reference_name)
      )
      setGrnWithEntries(grnNosWithEntries)
      
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock entries')
      setEntries([])
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

  const handleGRNSelectInForm = (grnId) => {
    const grn = grnRequests.find(g => g.id === parseInt(grnId))
    if (!grn) return

    setSelectedGRN(grn)
    
    const grnItems = (grn.items || []).map(item => ({
      _key: `grn_${item.id}`,
      item_code: item.item_code,
      item_name: item.item_name,
      qty: Number(item.accepted_qty) || 0,
      grn_item_id: item.id,
      batch_no: item.batch_no || '',
      valuation_rate: Number(item.valuation_rate) || 0,
      uom: 'Kg'
    }))
    
    setFormData(prev => ({
      ...prev,
      entry_type: 'Material Receipt',
      purpose: `GRN: ${grn.grn_no}`,
      reference_doctype: 'GRN',
      reference_name: grn.grn_no,
      remarks: grn.notes || '',
      grn_id: grnId
    }))
    
    setEntryItems(grnItems)
  }



  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'grn_id') {
      handleGRNSelectInForm(value)
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAddItem = () => {
    if (newItem.item_code && newItem.qty > 0) {
      setEntryItems([...entryItems, { ...newItem, _key: `manual_${Date.now()}` }])
      setNewItem({ item_code: '', qty: 1, valuation_rate: 0, uom: 'Kg', batch_no: '' })
    }
  }

  const handleRemoveItem = (key) => {
    setEntryItems(entryItems.filter(item => item._key !== key))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (entryItems.length === 0) {
      setError('Please add at least one item')
      return
    }

    try {
      setLoading(true)
      const cleanItems = entryItems.map(item => ({
        item_code: item.item_code,
        qty: Number(item.qty) || 0,
        valuation_rate: Number(item.valuation_rate) || 0,
        uom: item.uom || 'Kg',
        batch_no: item.batch_no || null
      }))
      const submitData = {
        ...formData,
        from_warehouse_id: formData.from_warehouse_id ? Number(formData.from_warehouse_id) : null,
        to_warehouse_id: formData.to_warehouse_id ? Number(formData.to_warehouse_id) : null,
        grn_id: formData.grn_id ? Number(formData.grn_id) : null,
        items: cleanItems
      }

      if (editingId) {
        await axios.put(`/api/stock/entries/${editingId}`, submitData)
        setSuccess('Stock entry updated successfully')
      } else {
        await axios.post('/api/stock/entries', submitData)
        setSuccess('Stock entry created successfully')
      }

      resetForm()
      fetchEntries()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save stock entry')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      purpose: '',
      reference_doctype: '',
      reference_name: '',
      remarks: '',
      grn_id: ''
    })
    setEntryItems([])
    setSelectedGRN(null)
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock entry?')) {
      try {
        await axios.delete(`/api/stock/entries/${id}`)
        setSuccess('Stock entry deleted successfully')
        fetchEntries()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete stock entry')
      }
    }
  }

  // Filter and pagination logic
  const filteredEntries = entries.filter(entry =>
    (entry.entry_id?.toString().includes(searchTerm.toLowerCase()) ||
     entry.warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (typeFilter === '' || entry.reference_doctype === typeFilter) &&
    (warehouseFilter === '' || String(entry.warehouse_id || entry.to_warehouse_id) === warehouseFilter)
  )

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredEntries.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setSearchTerm('')
    setTypeFilter('')
    setWarehouseFilter('')
    setCurrentPage(1)
  }

  const columns = [
    { key: 'entry_id', label: 'Entry ID' },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'total_items', label: 'Items Count' },
    {
      key: 'entry_date',
      label: 'Date',
      render: (row) => new Date(row.entry_date).toLocaleDateString()
    },
    { key: 'reference_doctype', label: 'Type' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="inventory-actions-cell">
          <button className="btn-delete" onClick={() => handleDelete(row.entry_id)}>
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
          <Package size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Stock Entries
        </h1>
        <Button
          variant="primary"
          onClick={formModal.open}
          icon={Plus}
          style={{ padding: '6px 10px', fontSize: '11px' }}
        >
          Add
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title="Create Stock Entry"
        size="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={formModal.close}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="manual-entry-form" loading={loading}>
              Create Entry
            </Button>
          </>
        }
      >
        <form id="manual-entry-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Select GRN Request (Optional)</label>
              <select
                name="grn_id"
                value={formData.grn_id}
                onChange={handleChange}
              >
                <option value="">-- Manual Entry --</option>
                {grnRequests.map(grn => {
                  const hasEntry = grnWithEntries.has(grn.grn_no)
                  return (
                    <option 
                      key={grn.id} 
                      value={grn.id}
                      disabled={hasEntry}
                      style={{ color: hasEntry ? '#999' : 'inherit' }}
                    >
                      {grn.grn_no} - {grn.supplier_name} ({grn.items?.length} items)
                      {hasEntry ? ' (Already Processed)' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
            <span>Available GRNs: {grnRequests.filter(g => !grnWithEntries.has(g.grn_no)).length} | Already Processed: {grnWithEntries.size}</span>
          </div>

          {selectedGRN && (
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#1e40af', fontSize: '14px', fontWeight: '500' }}>
                GRN: {selectedGRN.grn_no} | PO: {selectedGRN.po_no} | Supplier: {selectedGRN.supplier_name}
              </p>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Entry Date *</label>
                <input
                  type="date"
                  name="entry_date"
                  value={formData.entry_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Entry Type *</label>
                <select
                  name="entry_type"
                  value={formData.entry_type}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Material Transfer">Material Transfer</option>
                  <option value="Material Receipt">Material Receipt</option>
                  <option value="Material Issue">Material Issue</option>
                  <option value="Manufacturing Return">Manufacturing Return</option>
                  <option value="Repack">Repack</option>
                  <option value="Scrap Entry">Scrap Entry</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>From Warehouse</label>
                <select
                  name="from_warehouse_id"
                  value={formData.from_warehouse_id}
                  onChange={handleChange}
                >
                  <option value="">Select Source Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={String(wh.id)}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>To Warehouse {formData.entry_type === 'Material Receipt' && '*'}</label>
                <select
                  name="to_warehouse_id"
                  value={formData.to_warehouse_id}
                  onChange={handleChange}
                  required={formData.entry_type === 'Material Receipt'}
                >
                  <option value="">Select Destination Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={String(wh.id)}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Purpose</label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  placeholder="Purpose of the entry"
                />
              </div>
              <div className="form-group">
                <label>Reference Type</label>
                <select
                  name="reference_doctype"
                  value={formData.reference_doctype}
                  onChange={handleChange}
                >
                  <option value="">Select Type</option>
                  <option value="GRN">GRN</option>
                  <option value="purchase_receipt">Purchase Receipt</option>
                  <option value="production">Production</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Reference Name</label>
              <input
                type="text"
                name="reference_name"
                value={formData.reference_name}
                onChange={handleChange}
                placeholder="Reference document name"
              />
            </div>

            {/* Items Section */}
            <Card title="Add Items" style={{ marginBottom: '15px' }}>
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
                        {item.name || item.item_name} ({item.item_code})
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
                <div className="form-group">
                  <label>UOM</label>
                  <input
                    type="text"
                    value={newItem.uom}
                    onChange={(e) => setNewItem({ ...newItem, uom: e.target.value })}
                    placeholder="Kg"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Batch No</label>
                  <input
                    type="text"
                    value={newItem.batch_no}
                    onChange={(e) => setNewItem({ ...newItem, batch_no: e.target.value })}
                    placeholder="Batch number (optional)"
                  />
                </div>
                <div className="form-group">
                  <label>Valuation Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.valuation_rate}
                    onChange={(e) => setNewItem({ ...newItem, valuation_rate: parseFloat(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button variant="secondary" onClick={handleAddItem}>
                    Add Item
                  </Button>
                </div>
              </div>

              {entryItems.length > 0 && (
                <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                  <table className="inventory-items-table">
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th>Quantity</th>
                        <th>UOM</th>
                        <th>Batch No</th>
                        <th>Valuation Rate (₹)</th>
                        <th style={{ width: '80px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entryItems.map(item => (
                        <tr key={item._key || Math.random()}>
                          <td>{item.item_code}</td>
                          <td>{Number(item.qty || 0)}</td>
                          <td>{item.uom || 'Kg'}</td>
                          <td>{item.batch_no || '-'}</td>
                          <td>₹{Number(item.valuation_rate || 0).toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-delete"
                              onClick={() => handleRemoveItem(item._key)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

        </form>
      </Modal>

      {entries.length > 0 && (
        <div className="inventory-filters">
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by entry ID or warehouse..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <select 
            value={typeFilter} 
            onChange={(e) => {
              setTypeFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">All Types</option>
            <option value="GRN">GRN</option>
            <option value="purchase_receipt">Purchase Receipt</option>
            <option value="production">Production</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <select 
            value={warehouseFilter} 
            onChange={(e) => {
              setWarehouseFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.warehouse_name}
              </option>
            ))}
          </select>
          {(searchTerm || typeFilter || warehouseFilter) && (
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

      {loading ? (
        <div className="no-data">
          <Package size={48} style={{ opacity: 0.5 }} />
          <p>Loading stock entries...</p>
        </div>
      ) : (
        <>
          <DataTable 
            columns={columns} 
            data={paginatedData}
            disablePagination={true}
            filterable={true}
            sortable={true}
          />
          {filteredEntries.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredEntries.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      )}
    </div>
  )
}