import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import './Buying.css'

export default function QuotationForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'

  const [formData, setFormData] = useState({
    supplier_id: '',
    rfq_id: '',
    items: [],
    notes: ''
  })

  const [suppliers, setSuppliers] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [selectedRFQItems, setSelectedRFQItems] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [quotation, setQuotation] = useState(null)

  useEffect(() => {
    fetchRequiredData()
    if (isEditMode) {
      fetchQuotation()
    }
  }, [])

  const fetchRequiredData = async () => {
    try {
      const [supRes, rfqRes, itemRes] = await Promise.all([
        axios.get('/api/suppliers?active=true'),
        axios.get('/api/rfqs?status=sent'),
        axios.get('/api/items?limit=1000')
      ])

      setSuppliers(supRes.data.data || [])
      setRfqs(rfqRes.data.data || [])
      setAllItems(itemRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch required data:', err)
    }
  }

  const fetchQuotation = async () => {
    try {
      const response = await axios.get(`/api/quotations/${id}`)
      const quotationData = response.data.data
      setQuotation(quotationData)
      setFormData({
        supplier_id: quotationData.supplier_id,
        rfq_id: quotationData.rfq_id,
        items: quotationData.items || [],
        notes: quotationData.notes || ''
      })
      if (quotationData.rfq_id) {
        handleRFQSelect({ target: { value: quotationData.rfq_id } })
      }
    } catch (err) {
      setError('Failed to fetch quotation')
    }
  }

  const handleRFQSelect = async (e) => {
    const rfqId = e.target.value
    setFormData({ ...formData, rfq_id: rfqId })

    if (rfqId) {
      try {
        const response = await axios.get(`/api/rfqs/${rfqId}`)
        const rfq = response.data.data
        setSelectedRFQItems(rfq.items || [])
        // Initialize items from RFQ
        setFormData({
          ...formData,
          rfq_id: rfqId,
          items: (rfq.items || []).map(item => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: 0,
            lead_time_days: 0,
            min_qty: 1,
            id: Date.now() + Math.random()
          }))
        })
      } catch (err) {
        console.error('Failed to fetch RFQ details:', err)
      }
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleItemChange = (idx, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: field === 'rate' ? parseFloat(value) : value
    }
    setFormData({ ...formData, items: updatedItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = item.qty || 0
      const rate = item.rate || 0
      return sum + (qty * rate)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.supplier_id || !formData.rfq_id || formData.items.length === 0) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        supplier_id: formData.supplier_id,
        rfq_id: formData.rfq_id,
        items: formData.items.map(({ id, ...item }) => item),
        total_value: calculateTotal()
      }

      if (isEditMode) {
        await axios.put(`/api/quotations/${id}`, submitData)
        setSuccess('Quotation updated successfully')
      } else {
        await axios.post('/api/quotations', submitData)
        setSuccess('Quotation created successfully')
      }

      setTimeout(() => navigate('/buying/quotations'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quotation')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = allItems.find(i => i.item_code === code)
    return item ? item.name : code
  }

  return (
    <div className="buying-container">
      <Card>
        <div className="page-header">
          <h2>{isEditMode ? 'Edit Quotation' : 'Create Supplier Quotation'}</h2>
          <Button 
            onClick={() => navigate('/buying/quotations')}
            variant="secondary"
          >
            Back
          </Button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {isEditMode && quotation && (
          <AuditTrail 
            createdAt={quotation.created_at}
            createdBy={quotation.created_by}
            updatedAt={quotation.updated_at}
            updatedBy={quotation.updated_by}
            status={quotation.status}
          />
        )}

        <form onSubmit={handleSubmit} className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label>Supplier *</label>
              <select 
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>RFQ *</label>
              <select 
                value={formData.rfq_id}
                onChange={handleRFQSelect}
                required
              >
                <option value="">Select RFQ</option>
                {rfqs.map(rfq => (
                  <option key={rfq.rfq_id} value={rfq.rfq_id}>
                    {rfq.rfq_id} - {rfq.supplier_count} suppliers
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr />

          {formData.items.length > 0 && (
            <div className="items-section">
              <h3>Quotation Items</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                      <th>Lead Time (days)</th>
                      <th>Min Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => {
                      const amount = (item.qty || 0) * (item.rate || 0)
                      return (
                        <tr key={idx}>
                          <td>{getItemName(item.item_code)}</td>
                          <td>{item.qty}</td>
                          <td>
                            <input 
                              type="number"
                              value={item.rate || ''}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td>₹{amount.toFixed(2)}</td>
                          <td>
                            <input 
                              type="number"
                              value={item.lead_time_days || ''}
                              onChange={(e) => handleItemChange(idx, 'lead_time_days', e.target.value)}
                              placeholder="0"
                              min="0"
                              style={{ width: '100%' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="number"
                              value={item.min_qty || ''}
                              onChange={(e) => handleItemChange(idx, 'min_qty', e.target.value)}
                              placeholder="1"
                              min="0"
                              step="0.01"
                              style={{ width: '100%' }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold' }}>
                <p>Total Quotation Value: <span style={{ color: '#28a745' }}>₹{calculateTotal().toFixed(2)}</span></p>
              </div>
            </div>
          )}

          <hr />

          <div className="form-group">
            <label>Notes & Comments</label>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes or comments about this quotation..."
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div className="form-actions">
            <Button 
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Quotation'}
            </Button>
            <Button 
              type="button"
              variant="secondary"
              onClick={() => navigate('/buying/quotations')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}