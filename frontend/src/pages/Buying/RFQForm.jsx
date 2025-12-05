import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import { Edit2, Trash2, Plus } from 'lucide-react'
import './Buying.css'

export default function RFQForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'

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
  const [success, setSuccess] = useState(null)
  const [newSupplier, setNewSupplier] = useState('')
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ item_code: '', qty: '', uom: '' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    fetchRequiredData()
    if (isEditMode) {
      fetchRFQ()
    } else {
      generateSeriesNo()
    }
  }, [])

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

  const fetchRFQ = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await axios.get(`${apiUrl}/rfqs/${id}`)
      const rfq = response.data.data
      setFormData({
        series_no: rfq.series_no || '',
        valid_till: rfq.valid_till,
        items: rfq.items || [],
        suppliers: rfq.suppliers || []
      })
    } catch (err) {
      setError('Failed to fetch RFQ')
    }
  }

  const handleLoadFromMR = (mrId) => {
    const mr = approvedMRs.find(m => m.mr_id === mrId)
    if (mr) {
      axios.get(`/api/material-requests/${mrId}`).then(res => {
        const items = res.data.data.items || []
        setFormData({
          ...formData,
          items: items.map(item => ({
            item_code: item.item_code,
            qty: item.qty,
            uom: item.uom
          }))
        })
      })
    }
  }

  const handleAddItem = () => {
    if (!itemForm.item_code || !itemForm.qty || !itemForm.uom) {
      setError('Please fill all item fields')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = itemForm
      setFormData({ ...formData, items: updatedItems })
      setEditingItemIndex(null)
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, itemForm]
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.valid_till || formData.items.length === 0 || formData.suppliers.length === 0) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      const submitData = {
        series_no: formData.series_no,
        valid_till: formData.valid_till,
        items: formData.items,
        suppliers: formData.suppliers.map(({ id, ...supplier }) => supplier)
      }

      if (isEditMode) {
        await axios.put(`${apiUrl}/rfqs/${id}`, submitData)
        setSuccess('RFQ updated successfully')
      } else {
        await axios.post(`${apiUrl}/rfqs`, submitData)
        setSuccess('RFQ created successfully')
      }

      setTimeout(() => navigate('/buying/rfqs'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save RFQ')
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

  return (
    <div className="buying-container">
      <Card>
        <div className="page-header">
          <h2>{isEditMode ? 'Edit RFQ' : 'Create RFQ'}</h2>
          <Button 
            onClick={() => navigate('/buying/rfqs')}
            variant="secondary"
          >
            Back
          </Button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit} className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Series No</label>
              <input 
                type="text"
                value={formData.series_no}
                readOnly
                style={{ backgroundColor: '#f5f5f5', cursor: 'default' }}
              />
            </div>

            <div className="form-group">
              <label>Valid Till *</label>
              <input 
                type="date"
                name="valid_till"
                value={formData.valid_till}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Company Address */}
          {companyInfo && (
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '13px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Company Address</h4>
              <p style={{ margin: '4px 0', lineHeight: '1.5' }}>
                {companyInfo.company_name && <strong>{companyInfo.company_name}</strong>}
                {companyInfo.address && <><br />{companyInfo.address}</>}
                {companyInfo.city && <><br />{companyInfo.city}{companyInfo.state && `, ${companyInfo.state}`}{companyInfo.country && `, ${companyInfo.country}`}</> }
                {companyInfo.postal_code && <> - {companyInfo.postal_code}</>}
                {companyInfo.phone && <><br />Ph: {companyInfo.phone}</>}
                {companyInfo.email && <><br />Email: {companyInfo.email}</>}
              </p>
            </div>
          )}

          <hr />

          <div className="items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Items for Quotation ({formData.items.length})</h3>
              <Button 
                type="button"
                variant="success"
                size="sm"
                onClick={() => setShowItemForm(!showItemForm)}
                className="flex items-center gap-2"
              >
                <Plus size={16} /> Add Item
              </Button>
            </div>

            {!isEditMode && (
              <div className="load-from-mr-section" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Load from Material Request (Optional)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    onChange={(e) => handleLoadFromMR(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Approved MR to load items...</option>
                    {approvedMRs.map(mr => (
                      <option key={mr.mr_id} value={mr.mr_id}>
                        {mr.mr_id} - {mr.purpose}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Item Form (Collapsible) */}
            {showItemForm && (
              <div style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Item *</label>
                    <select 
                      value={itemForm.item_code}
                      onChange={(e) => {
                        const item = allItems.find(i => i.item_code === e.target.value)
                        setItemForm({ ...itemForm, item_code: e.target.value, uom: item?.uom || '' })
                      }}
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
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Quantity *</label>
                    <input 
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={itemForm.qty}
                      onChange={(e) => setItemForm({ ...itemForm, qty: e.target.value })}
                      placeholder="Qty"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>UOM *</label>
                    <input 
                      type="text"
                      value={itemForm.uom}
                      readOnly
                      style={{ backgroundColor: '#f5f5f5', cursor: 'default' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button 
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCancelItemEdit}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    {editingItemIndex !== null ? 'Update' : 'Add'}
                  </Button>
                </div>
              </div>
            )}

            {formData.items.length > 0 && (
              <div className="items-list" style={{ marginBottom: '20px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>No.</th>
                      <th>Item Name / Code</th>
                      <th>Specification</th>
                      <th style={{ width: '70px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '60px', textAlign: 'center' }}>UOM</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{getItemName(item.item_code)}</strong><br />
                          <span style={{ fontSize: '11px', color: '#666' }}>({item.item_code})</span>
                        </td>
                        <td style={{ fontSize: '11px', color: '#666' }}>{getItemSpec(item.item_code)}</td>
                        <td style={{ textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ textAlign: 'center' }}>{item.uom}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button"
                            onClick={() => handleEditItem(idx)}
                            className="btn-sm btn-info"
                            style={{ marginRight: '5px' }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="btn-sm btn-danger"
                            title="Remove"
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
          </div>

          <hr />

          <div className="suppliers-section">
            <h3>Suppliers for Quotation ({formData.suppliers.length})</h3>
            
            <div className="add-supplier-section" style={{ marginBottom: '20px' }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Supplier *</label>
                  <select 
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.name} ({supplier.supplier_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <Button 
                    onClick={handleAddSupplier}
                    variant="success"
                    type="button"
                    style={{ marginTop: '23px' }}
                  >
                    Add Supplier
                  </Button>
                </div>
              </div>
            </div>

            {formData.suppliers.length > 0 && (
              <div className="suppliers-list">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.suppliers.map(supplier => (
                      <tr key={supplier.id}>
                        <td>{getSupplierName(supplier.supplier_id)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button"
                            className="btn-sm btn-danger"
                            onClick={() => handleRemoveSupplier(supplier.id)}
                          >
                            Remove
                          </button>
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
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save RFQ'}
            </Button>
            <Button 
              type="button"
              variant="secondary"
              onClick={() => navigate('/buying/rfqs')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
