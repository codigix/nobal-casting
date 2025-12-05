import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { Plus, X, ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'

export default function CreateRFQModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    series_no: '',
    valid_till: '',
    items: [],
    suppliers: []
  })

  const [approvedMRs, setApprovedMRs] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [allItems, setAllItems] = useState([])
  const [companyInfo, setCompanyInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newSupplier, setNewSupplier] = useState('')
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ item_code: '', qty: '', uom: '' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData()
      generateSeriesNo()
    }
  }, [isOpen])

  const generateSeriesNo = () => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    const seriesNo = `RFQ-${dateStr}-${randomNum}`
    setFormData(prev => ({ ...prev, series_no: seriesNo }))
  }

  const fetchRequiredData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const [mrRes, supRes, itemRes, compRes] = await Promise.all([
        axios.get(`${apiUrl}/material-requests/approved`),
        axios.get(`${apiUrl}/suppliers?active=true`),
        axios.get(`${apiUrl}/items?limit=1000`),
        axios.get(`${apiUrl}/company-info`).catch(() => ({ data: { data: null } }))
      ])

      setApprovedMRs(mrRes.data.data || [])
      setSuppliers(supRes.data.data || [])
      setAllItems(itemRes.data.data || [])
      setCompanyInfo(compRes.data.data)
    } catch (err) {
      console.error('Failed to fetch required data:', err)
    }
  }

  const handleLoadFromMR = (mrId) => {
    const mr = approvedMRs.find(m => m.mr_id === mrId)
    if (mr) {
      const apiUrl = import.meta.env.VITE_API_URL
      axios.get(`${apiUrl}/material-requests/${mrId}`).then(res => {
        const items = res.data.data.items || []
        setFormData({
          ...formData,
          items: items.map(item => ({
            item_code: item.item_code,
            qty: item.qty,
            uom: item.uom,
            id: Date.now() + Math.random()
          }))
        })
      })
    }
  }

  const handleAddItem = () => {
    if (!itemForm.item_code || !itemForm.qty) {
      setError('Please select an item and enter quantity')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = {
        ...itemForm,
        id: updatedItems[editingItemIndex].id
      }
      setFormData({ ...formData, items: updatedItems })
      setEditingItemIndex(null)
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { ...itemForm, id: Date.now() + Math.random() }]
      })
    }
    setItemForm({ item_code: '', qty: '', uom: '' })
    setShowItemForm(false)
    setError(null)
  }

  const handleEditItem = (index) => {
    setItemForm(formData.items[index])
    setEditingItemIndex(index)
    setShowItemForm(true)
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const handleCancelItemEdit = () => {
    setItemForm({ item_code: '', qty: '', uom: '' })
    setEditingItemIndex(null)
    setShowItemForm(false)
  }

  const handleAddSupplier = () => {
    if (!newSupplier) {
      setError('Please select a supplier')
      return
    }

    const supplierExists = formData.suppliers.some(s => s.supplier_id === newSupplier)
    if (supplierExists) {
      setError('Supplier already added')
      return
    }

    setFormData({
      ...formData,
      suppliers: [...formData.suppliers, { supplier_id: newSupplier, id: Date.now() }]
    })
    setNewSupplier('')
    setError(null)
  }

  const handleRemoveSupplier = (id) => {
    setFormData({
      ...formData,
      suppliers: formData.suppliers.filter(s => s.id !== id)
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = []
    if (!formData.valid_till) errors.push('Valid Till')
    if (formData.items.length === 0) errors.push('at least 1 item')
    if (formData.suppliers.length === 0) errors.push('at least 1 supplier')

    if (errors.length > 0) {
      setError(`Please fill: ${errors.join(', ')}`)
      return
    }

    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      const submitData = {
        series_no: formData.series_no,
        valid_till: formData.valid_till,
        items: formData.items.map(({ id, ...item }) => item),
        suppliers: formData.suppliers.map(({ id, ...supplier }) => supplier)
      }

      await axios.post(`${apiUrl}/rfqs`, submitData)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create RFQ')
    } finally {
      setLoading(false)
    }
  }

  const getSupplierName = (id) => {
    const supplier = suppliers.find(s => s.supplier_id === id)
    return supplier ? supplier.name : id
  }

  const getItemName = (code) => {
    const item = allItems.find(i => i.item_code === code)
    return item ? item.name : code
  }

  const getItemSpec = (code) => {
    const item = allItems.find(i => i.item_code === code)
    if (!item) return ''
    const specs = [
      item.item_group && `Group: ${item.item_group}`,
      item.hsn_code && `HSN: ${item.hsn_code}`,
      item.gst_rate && `GST: ${item.gst_rate}%`
    ].filter(Boolean)
    return specs.join(' • ')
  }

  const handleClose = () => {
    setFormData({
      series_no: '',
      valid_till: '',
      items: [],
      suppliers: []
    })
    setError(null)
    setNewSupplier('')
    setItemForm({ item_code: '', qty: '', uom: '' })
    setEditingItemIndex(null)
    setShowItemForm(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Request for Quotation (RFQ)" size="xl">
      <div style={{ maxHeight: '85vh', overflowY: 'auto', padding: '4px' }}>
        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Basic Information</h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Series No</label>
                <input 
                  type="text"
                  value={formData.series_no}
                  readOnly
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Valid Till <span style={{ color: '#d32f2f' }}>*</span></label>
                <input 
                  type="date"
                  name="valid_till"
                  value={formData.valid_till}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Company Address */}
          {companyInfo && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
              <h5 style={{ marginTop: 0, marginBottom: '12px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Company Address</h5>
              <p style={{ margin: '0', lineHeight: '1.6', fontSize: '13px' }}>
                {companyInfo.company_name && <><strong>{companyInfo.company_name}</strong><br /></>}
                {companyInfo.address && <>{companyInfo.address}<br /></>}
                {companyInfo.city && <>{companyInfo.city}{companyInfo.state && `, ${companyInfo.state}`}{companyInfo.country && `, ${companyInfo.country}`}{companyInfo.postal_code && ` - ${companyInfo.postal_code}`}<br /></>}
                {companyInfo.phone && <>Ph: {companyInfo.phone}<br /></>}
                {companyInfo.email && <>Email: {companyInfo.email}</>}
              </p>
            </div>
          )}

          {/* Section 3: Load from Material Request */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '12px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Load from Material Request (Optional)</h5>
            <select 
              onChange={(e) => handleLoadFromMR(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
            >
              <option value="">Select Approved MR to load items...</option>
              {approvedMRs.map(mr => (
                <option key={mr.mr_id} value={mr.mr_id}>
                  {mr.mr_id} - {mr.purpose}
                </option>
              ))}
            </select>
          </div>

          {/* Section 4: Items for Quotation */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h5 style={{ margin: 0, color: '#333', fontSize: '14px', fontWeight: '600' }}>Items for Quotation ({formData.items.length})</h5>
              <Button 
                type="button"
                variant="success"
                onClick={() => setShowItemForm(!showItemForm)}
                style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} /> Add Item
              </Button>
            </div>

            {/* Item Form (Collapsible) */}
            {showItemForm && (
              <div style={{ padding: '16px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>Item <span style={{ color: '#d32f2f' }}>*</span></label>
                    <select 
                      value={itemForm.item_code}
                      onChange={(e) => {
                        const item = allItems.find(i => i.item_code === e.target.value)
                        setItemForm({ ...itemForm, item_code: e.target.value, uom: item?.uom || '' })
                      }}
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                    >
                      <option value="">Select Item</option>
                      {allItems.map(item => (
                        <option key={item.item_code} value={item.item_code}>
                          {item.name} ({item.item_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>Quantity <span style={{ color: '#d32f2f' }}>*</span></label>
                    <input 
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={itemForm.qty}
                      onChange={(e) => setItemForm({ ...itemForm, qty: e.target.value })}
                      placeholder="Qty"
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>UOM</label>
                    <input 
                      type="text"
                      value={itemForm.uom}
                      readOnly
                      style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Button 
                    type="button"
                    variant="secondary"
                    onClick={handleCancelItemEdit}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    variant="primary"
                    onClick={handleAddItem}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </div>
            )}

            {/* Items Table */}
            {formData.items.length > 0 && (
              <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '40px' }}>No.</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Item Name / Code</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Specification</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '80px' }}>Qty</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '70px' }}>UOM</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '80px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ padding: '10px' }}>
                          <strong>{getItemName(item.item_code)}</strong><br />
                          <span style={{ fontSize: '12px', color: '#666' }}>({item.item_code})</span>
                        </td>
                        <td style={{ padding: '10px', fontSize: '12px', color: '#666' }}>{getItemSpec(item.item_code)}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.uom}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            type="button"
                            onClick={() => handleEditItem(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff', marginRight: '8px', padding: '4px' }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 5: Add Suppliers */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Add Suppliers for Quotation</h5>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <select 
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.name}
                  </option>
                ))}
              </select>

              <Button 
                onClick={handleAddSupplier}
                variant="success"
                type="button"
                style={{ padding: '10px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                <Plus size={16} /> Add Supplier
              </Button>
            </div>
          </div>

          {/* Section 6: Suppliers List */}
          {formData.suppliers.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
              <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Selected Suppliers ({formData.suppliers.length})</h5>
              <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Supplier</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', width: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.suppliers.map(supplier => (
                      <tr key={supplier.id} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '10px' }}>{getSupplierName(supplier.supplier_id)}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button 
                            type="button"
                            onClick={() => handleRemoveSupplier(supplier.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '4px' }}
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
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
              {loading ? 'Creating...' : 'Create RFQ'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
