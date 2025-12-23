import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Card from '../../components/Card/Card'
import DataTable from '../../components/Table/DataTable'
import Modal, { useModal } from '../../components/Modal/Modal'
import { Plus, Trash2, Package, X, Calendar, Warehouse, Tag, Database, Grid3x3, List, Eye, Edit2 } from 'lucide-react'
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
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState('table')
  
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Material Receipt':
        return <Package size={20} className="text-green-500" />
      case 'Material Transfer':
        return <Database size={20} className="text-blue-500" />
      case 'Material Issue':
        return <Tag size={20} className="text-orange-500" />
      case 'Manufacturing Return':
        return <Package size={20} className="text-purple-500" />
      default:
        return <Package size={20} className="text-gray-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Material Receipt':
        return 'from-green-50 to-green-100'
      case 'Material Transfer':
        return 'from-blue-50 to-blue-100'
      case 'Material Issue':
        return 'from-orange-50 to-orange-100'
      case 'Manufacturing Return':
        return 'from-purple-50 to-purple-100'
      default:
        return 'from-gray-50 to-gray-100'
    }
  }

  const columns = [
    { key: 'entry_id', label: 'Entry ID' },
    {
      key: 'entry_type',
      label: 'Type',
      render: (value, row) => row ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getTypeIcon(row.entry_type)}
          <span>{row.entry_type}</span>
        </div>
      ) : '-'
    },
    { key: 'warehouse_name', label: 'Warehouse' },
    {
      key: 'entry_date',
      label: 'Entry Date',
      render: (value, row) => row && row.entry_date ? new Date(row.entry_date).toLocaleDateString() : '-'
    },
    {
      key: 'total_items',
      label: 'Items',
      render: (value, row) => row ? (value || 0) : '-'
    },
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
              onClick={() => {
                setEditingId(row.id)
                setFormData({
                  entry_date: row.entry_date,
                  entry_type: row.entry_type,
                  from_warehouse_id: row.from_warehouse_id || '',
                  to_warehouse_id: row.to_warehouse_id || '',
                  purpose: row.purpose || '',
                  reference_doctype: row.reference_doctype || '',
                  reference_name: row.reference_name || '',
                  remarks: row.remarks || '',
                  grn_id: row.grn_id || ''
                })
                setEntryItems(row.items || [])
                formModal.open()
              }}
            >
              <Edit2 size={14} style={{ marginRight: '4px' }} /> Edit
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
              onClick={() => handleDelete(row.id)}
            >
              <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
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
              <Package size={28} className="text-amber-500" />
              Stock Entries
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Track and manage inventory stock movements</p>
          </div>
          <button
            onClick={formModal.open}
            className="flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 whitespace-nowrap text-sm"
          >
            <Plus size={18} />
            Create Entry
          </button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <Modal
          isOpen={formModal.isOpen}
          onClose={formModal.close}
          title="Create Stock Entry"
          size="2xl"
          footer={
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={formModal.close}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="manual-entry-form" loading={loading}>
                Create Entry
              </Button>
            </div>
          }
        >
          <form id="manual-entry-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4 animate-pulse">
              <Package size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Loading stock entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4">
              <Package size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Stock Entries Found</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md mb-6">Create your first stock entry to start tracking inventory movements.</p>
          </div>
        ) : (
          <>
            {entries.length > 0 && (
              <div className="mb-5 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by entry ID or warehouse..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="flex-1 p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <select 
                  value={typeFilter} 
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
                {(searchTerm || typeFilter || warehouseFilter) && (
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
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                    title="Card view"
                  >
                    <Grid3x3 size={18} />
                  </button>
                </div>
              </div>
            )}

            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4">
                  <Package size={40} className="text-neutral-400 dark:text-neutral-600" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Matching Entries</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md">Try adjusting your search or filters.</p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto ">
                <DataTable columns={columns} data={filteredEntries} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedData.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className={`bg-gradient-to-br ${getTypeColor(entry.entry_type || entry.reference_doctype)} p-4 flex items-start justify-between`}>
                      <div className="flex items-start gap-2">
                        <div className="p-1 bg-white/50 rounded-lg">
                          {getTypeIcon(entry.entry_type || entry.reference_doctype)}
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-900 text-base">{entry.entry_id}</h3>
                          <p className="text-xs text-neutral-700 font-medium">{entry.entry_type || entry.reference_doctype || 'Entry'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary">{entry.reference_doctype || 'Stock Entry'}</Badge>
                      </div>

                      {entry.warehouse_name && (
                        <div className="flex items-center gap-2">
                          <Warehouse size={14} className="text-neutral-400" />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{entry.warehouse_name}</span>
                        </div>
                      )}

                      {entry.entry_date && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-neutral-400" />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{new Date(entry.entry_date).toLocaleDateString()}</span>
                        </div>
                      )}

                      {entry.total_items && (
                        <div className="flex items-center gap-2">
                          <Tag size={14} className="text-neutral-400" />
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">Items: <strong>{entry.total_items}</strong></span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                          onClick={() => handleDelete(entry.entry_id || entry.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'card' && totalPages > 1 && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredEntries.length)} of {filteredEntries.length} entries
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