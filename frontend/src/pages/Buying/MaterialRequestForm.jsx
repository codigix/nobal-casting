import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import { Edit } from 'lucide-react'
import './Buying.css'

export default function MaterialRequestForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'

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

  const [materialRequest, setMaterialRequest] = useState(null)
  const [items, setItems] = useState([])
  const [contacts, setContacts] = useState([])
  const [departments, setDepartments] = useState(['Production', 'Maintenance', 'Store'])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [newItem, setNewItem] = useState({ item_code: '', qty: 1, uom: 'pcs' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  
  // Check if form should be disabled (not editable)
  const isFormDisabled = isEditMode && materialRequest && materialRequest.status !== 'draft'

  useEffect(() => {
    fetchItems()
    fetchContacts()
    fetchWarehouses()
    if (!isEditMode) {
      generateSeriesNumber()
    }
    if (isEditMode) {
      fetchMaterialRequest()
    }
  }, [])

  const fetchMaterialRequest = async () => {
    try {
      const response = await axios.get(`/api/material-requests/${id}`)
      const mr = response.data.data
      setMaterialRequest(mr)
      setFormData({
        requested_by_id: mr.requested_by_id,
        department: mr.department,
        required_by_date: mr.required_by_date,
        purpose: mr.purpose,
        items: mr.items || []
      })
    } catch (err) {
      setError('Failed to fetch material request')
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

  const fetchContacts = async () => {
    try {
      const response = await axios.get('/api/suppliers/contacts/all')
      setContacts(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/warehouses?limit=1000')
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

    if (isFormDisabled) {
      setError('Cannot edit an approved material request. Only draft requests can be edited.')
      return
    }

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

      if (isEditMode) {
        await axios.put(`/api/material-requests/${id}`, submitData)
        setSuccess('Material request updated successfully')
      } else {
        await axios.post('/api/material-requests', submitData)
        setSuccess('Material request created successfully')
      }

      setTimeout(() => navigate('/buying/material-requests'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save material request')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = items.find(i => i.item_code === code)
    return item ? item.name : code
  }

  return (
    <div className="buying-container">
      <Card>
        <div className="page-header">
          <h2>{isEditMode ? 'Edit Material Request' : 'Create Material Request'}</h2>
          <Button 
            onClick={() => navigate('/buying/material-requests')}
            variant="secondary"
          >
            Back
          </Button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {isEditMode && materialRequest && (
          <>
            {materialRequest.status !== 'draft' && (
              <Alert type="info">
                ⚠️ This material request is {materialRequest.status}. You can view the details but cannot edit it. Only draft requests can be edited.
              </Alert>
            )}
            <AuditTrail 
              createdAt={materialRequest.created_at}
              createdBy={materialRequest.created_by}
              updatedAt={materialRequest.updated_at}
              updatedBy={materialRequest.updated_by}
              status={materialRequest.status}
            />
          </>
        )}

        <form onSubmit={handleSubmit} className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Series No</label>
              <input 
                type="text"
                name="series_no"
                value={formData.series_no}
                readOnly
                disabled
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </div>

            <div className="form-group">
              <label>Transition Date</label>
              <input 
                type="date"
                name="transition_date"
                value={formData.transition_date}
                onChange={handleChange}
                disabled={isFormDisabled}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Requested By *</label>
              <select 
                name="requested_by_id"
                value={formData.requested_by_id}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              >
                <option value="">Select Contact</option>
                {contacts.map(contact => (
                  <option key={contact.contact_id} value={contact.contact_id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Department *</label>
              <select 
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Purpose *</label>
              <select 
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              >
                <option value="purchase">Purchase</option>
                <option value="material_transfer">Material Transfer</option>
                <option value="material_issue">Material Issue</option>
              </select>
            </div>

            <div className="form-group">
              <label>Required By Date *</label>
              <input 
                type="date"
                name="required_by_date"
                value={formData.required_by_date}
                onChange={handleChange}
                disabled={isFormDisabled}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Target Warehouse</label>
              <select 
                name="target_warehouse"
                value={formData.target_warehouse}
                onChange={handleChange}
                disabled={isFormDisabled}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Source Warehouse</label>
              <select 
                name="source_warehouse"
                value={formData.source_warehouse}
                onChange={handleChange}
                disabled={isFormDisabled}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Items Notes</label>
              <textarea 
                name="items_notes"
                value={formData.items_notes}
                onChange={handleChange}
                disabled={isFormDisabled}
                placeholder="Enter any additional notes about the items"
                rows="3"
              />
            </div>
          </div>

          <hr />

          <div className="items-section">
            <h3>{editingItemIndex !== null ? 'Edit Material Item' : 'Add Material Items'}</h3>
            
            <div className="add-item-section">
              <div className="form-row">
                <div className="form-group">
                  <label>Item Code *</label>
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
                    disabled={isFormDisabled}
                  >
                    <option value="">Select Item</option>
                    {items.map(item => (
                      <option key={item.item_code} value={item.item_code}>
                        {item.item_code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input 
                    type="number"
                    value={newItem.qty}
                    onChange={(e) => setNewItem({...newItem, qty: parseFloat(e.target.value) || 0})}
                    disabled={isFormDisabled}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Unit of Measurement</label>
                  <input 
                    type="text"
                    value={newItem.uom}
                    readOnly
                    disabled
                  />
                </div>

                <div>
                  <Button 
                    onClick={handleAddItem}
                    variant="success"
                    type="button"
                    disabled={isFormDisabled}
                    style={{ marginTop: '24px' }}
                  >
                    {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                  </Button>
                  {editingItemIndex !== null && (
                    <Button 
                      onClick={handleCancelEdit}
                      variant="secondary"
                      type="button"
                      disabled={isFormDisabled}
                      style={{ marginTop: '24px', marginLeft: '8px' }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {formData.items.length > 0 && (
              <div className="items-list">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>No.</th>
                      <th>Item Code</th>
                      <th style={{ width: '120px' }}>Quantity</th>
                      <th style={{ width: '150px' }}>Unit of Measurement</th>
                      <th style={{ width: '80px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={item.id} style={{ backgroundColor: editingItemIndex === index ? '#fffbea' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td>{item.item_code}</td>
                        <td>{item.qty}</td>
                        <td>{item.uom}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              type="button"
                              onClick={() => handleEditItem(index)}
                              disabled={isFormDisabled}
                              style={{ background: 'none', border: 'none', cursor: isFormDisabled ? 'not-allowed' : 'pointer', color: '#0066cc', padding: '4px' }}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              type="button"
                              className="btn-sm btn-danger"
                              onClick={() => handleRemoveItem(index)}
                              disabled={isFormDisabled}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="form-actions">
            <Button 
              type="submit"
              variant="primary"
              disabled={loading || isFormDisabled}
            >
              {loading ? 'Saving...' : 'Save Material Request'}
            </Button>
            <Button 
              type="button"
              variant="secondary"
              onClick={() => navigate('/buying/material-requests')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}