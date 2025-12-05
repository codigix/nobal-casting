import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { Plus, X, Edit } from 'lucide-react'

export default function CreateMaterialRequestModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    series_no: '',
    transition_date: '',
    requested_by_id: '',
    department: '',
    purpose: 'purchase',
    required_by_date: '',
    target_warehouse: '',
    source_warehouse: '',
    items_notes: '',
    items: []
  })

  const [items, setItems] = useState([])
  const [contacts, setContacts] = useState([])
  const [departments, setDepartments] = useState(['Production', 'Maintenance', 'Store'])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newItem, setNewItem] = useState({ item_code: '', qty: 1, uom: 'pcs' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchItems()
      fetchContacts()
      fetchWarehouses()
      generateSeriesNumber()
    }
  }, [isOpen])

  const fetchItems = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await axios.get(`${apiUrl}/items?limit=1000`)
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchContacts = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await axios.get(`${apiUrl}/suppliers/contacts/all`)
      setContacts(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await axios.get(`${apiUrl}/stock/warehouses?limit=1000`)
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const generateSeriesNumber = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const seriesNo = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random}`
    setFormData(prev => ({ ...prev, series_no: seriesNo }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.qty) {
      setError('Please select item and enter quantity')
      return
    }

    const itemExists = formData.items.some(i => i.item_code === newItem.item_code && (editingItemIndex === null || formData.items.indexOf(i) !== editingItemIndex))
    if (itemExists) {
      setError('Item already added')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = { ...newItem, id: updatedItems[editingItemIndex].id }
      setFormData({ ...formData, items: updatedItems })
      setEditingItemIndex(null)
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { ...newItem, id: Date.now() }]
      })
    }

    setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
    setError(null)
  }

  const handleEditItem = (index) => {
    setEditingItemIndex(index)
    setNewItem(formData.items[index])
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
    if (editingItemIndex === index) {
      setEditingItemIndex(null)
      setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
    }
  }

  const handleCancelEdit = () => {
    setEditingItemIndex(null)
    setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.requested_by_id || !formData.department || formData.items.length === 0) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        items: formData.items.map(({ id, ...item }) => item)
      }

      const apiUrl = import.meta.env.VITE_API_URL
      await axios.post(`${apiUrl}/material-requests`, submitData)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create material request')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = items.find(i => i.item_code === code)
    return item ? item.name : code
  }

  const handleClose = () => {
    setFormData({
      series_no: '',
      transition_date: '',
      requested_by_id: '',
      department: '',
      purpose: 'purchase',
      required_by_date: '',
      target_warehouse: '',
      source_warehouse: '',
      items_notes: '',
      items: []
    })
    setError(null)
    setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
    setEditingItemIndex(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Material Request" size="xl">
      <div style={{ maxHeight: '85vh', overflowY: 'auto', padding: '4px' }}>
        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Basic Information</h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Series No</label>
                <input 
                  type="text"
                  name="series_no"
                  value={formData.series_no}
                  readOnly
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Transition Date</label>
                <input 
                  type="date"
                  name="transition_date"
                  value={formData.transition_date}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Requested By <span style={{ color: '#d32f2f' }}>*</span></label>
                <input 
                  type="text"
                  name="requested_by_id"
                  value={formData.requested_by_id}
                  onChange={handleChange}
                  placeholder="Enter name or select from list"
                  list="requestedByList"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                />
                <datalist id="requestedByList">
                  {contacts.map(contact => (
                    <option key={contact.contact_id} value={contact.name || contact.contact_id}>
                      {contact.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Department <span style={{ color: '#d32f2f' }}>*</span></label>
                <select 
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Purpose <span style={{ color: '#d32f2f' }}>*</span></label>
                <select 
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="purchase">Purchase</option>
                  <option value="material_transfer">Material Transfer</option>
                  <option value="material_issue">Material Issue</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Required By Date <span style={{ color: '#d32f2f' }}>*</span></label>
                <input 
                  type="date"
                  name="required_by_date"
                  value={formData.required_by_date}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Warehouses */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Warehouse Details</h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Target Warehouse</label>
                <select 
                  name="target_warehouse"
                  value={formData.target_warehouse}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Source Warehouse</label>
                <select 
                  name="source_warehouse"
                  value={formData.source_warehouse}
                  onChange={handleChange}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Notes */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Additional Notes</h5>
            
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Items Notes</label>
              <textarea 
                name="items_notes"
                value={formData.items_notes}
                onChange={handleChange}
                placeholder="Enter any additional notes about the items"
                rows="3"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Section 4: Add Items */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>
              {editingItemIndex !== null ? 'Edit Material Item' : 'Add Material Items'}
            </h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Item Code <span style={{ color: '#d32f2f' }}>*</span></label>
                <select 
                  value={newItem.item_code}
                  onChange={(e) => {
                    const item = items.find(i => i.item_code === e.target.value)
                    setNewItem({ 
                      ...newItem, 
                      item_code: e.target.value,
                      uom: item?.uom || 'pcs'
                    })
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">Select Item</option>
                  {items.map(item => (
                    <option key={item.item_code} value={item.item_code}>
                      {item.item_code} - {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Quantity <span style={{ color: '#d32f2f' }}>*</span></label>
                <input 
                  type="number"
                  value={newItem.qty}
                  onChange={(e) => setNewItem({...newItem, qty: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', fontWeight: '500' }}>UOM</label>
                <input 
                  type="text"
                  value={newItem.uom}
                  readOnly
                  disabled
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', backgroundColor: '#e8e8e8' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button 
                onClick={handleAddItem}
                variant="success"
                type="button"
                style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} /> {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
              </Button>
              {editingItemIndex !== null && (
                <Button 
                  onClick={handleCancelEdit}
                  variant="secondary"
                  type="button"
                  style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Items List */}
          {formData.items.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
              <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Selected Items ({formData.items.length})</h5>
              <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '50px' }}>No.</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Item Code</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '100px' }}>Quantity</th>
                      <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', width: '120px' }}>Unit of Measurement</th>
                      <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '80px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #ddd', backgroundColor: editingItemIndex === index ? '#fffbea' : 'transparent' }}>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ padding: '8px' }}>{item.item_code}</td>
                        <td style={{ padding: '8px' }}>{item.qty}</td>
                        <td style={{ padding: '8px' }}>{item.uom}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button 
                              type="button"
                              onClick={() => handleEditItem(index)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0066cc', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}
                              title="Delete"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e8e8e8' }}>
            <Button 
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
              style={{ padding: '10px 24px', fontSize: '13px' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="primary"
              disabled={loading}
              style={{ padding: '10px 24px', fontSize: '13px' }}
            >
              {loading ? 'Creating...' : 'Create Material Request'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}