import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'

export default function CreateQuotationModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    rfq_id: '',
    items: [],
    notes: ''
  })

  const [suppliers, setSuppliers] = useState([])
  const [rfqs, setRfqs] = useState([])
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRFQ, setSelectedRFQ] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData()
    }
  }, [isOpen])

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      setError(null)
      const apiUrl = import.meta.env.VITE_API_URL
      
      const [supRes, rfqRes, itemRes] = await Promise.all([
        axios.get(`${apiUrl}/suppliers?active=true`),
        axios.get(`${apiUrl}/rfqs`),
        axios.get(`${apiUrl}/items?limit=1000`)
      ])

      setSuppliers(supRes.data.data || [])
      setRfqs(rfqRes.data.data || [])
      setAllItems(itemRes.data.data || [])
    } catch (err) {
      console.error('Failed to fetch required data:', err)
      setError('Failed to load suppliers and RFQs')
    } finally {
      setDataLoading(false)
    }
  }

  const handleRFQSelect = async (e) => {
    const rfqId = e.target.value
    
    if (rfqId) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL
        const response = await axios.get(`${apiUrl}/rfqs/${rfqId}`)
        const rfq = response.data.data
        setSelectedRFQ(rfq)
        
        setFormData({
          ...formData,
          rfq_id: rfqId,
          items: (rfq.items || []).map(item => ({
            item_code: item.item_code,
            qty: item.qty,
            rate: 0,
            lead_time_days: 0,
            min_qty: item.qty,
            id: Date.now() + Math.random()
          }))
        })
        setError(null)
      } catch (err) {
        console.error('Failed to fetch RFQ details:', err)
        setError('Failed to load RFQ items')
        setFormData({ ...formData, rfq_id: '', items: [] })
        setSelectedRFQ(null)
      }
    } else {
      setFormData({ ...formData, rfq_id: '', items: [] })
      setSelectedRFQ(null)
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
      [field]: field === 'rate' ? parseFloat(value) || 0 : value
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
    setError(null)

    if (!formData.supplier_id) {
      setError('Please select a supplier')
      return
    }
    
    if (!formData.rfq_id) {
      setError('Please select an RFQ')
      return
    }
    
    if (formData.items.length === 0) {
      setError('No items in quotation')
      return
    }

    const invalidItems = formData.items.filter(item => !item.rate || item.rate <= 0)
    if (invalidItems.length > 0) {
      setError(`Please enter valid rate for all ${invalidItems.length} item(s)`)
      return
    }

    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      const submitData = {
        supplier_id: formData.supplier_id,
        rfq_id: formData.rfq_id,
        items: formData.items.map(({ id, ...item }) => item),
        total_value: calculateTotal()
      }

      await axios.post(`${apiUrl}/quotations`, submitData)
      onSuccess()
      handleClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quotation')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = allItems.find(i => i.item_code === code)
    return item ? item.name : code
  }

  const handleClose = () => {
    setFormData({
      supplier_id: '',
      rfq_id: '',
      items: [],
      notes: ''
    })
    setSelectedRFQ(null)
    setError(null)
    onClose()
  }

  const getSupplierName = (id) => {
    const supplier = suppliers.find(s => s.supplier_id === id)
    return supplier?.name || 'Unknown Supplier'
  }

  const getRFQInfo = (id) => {
    const rfq = rfqs.find(r => r.rfq_id === id)
    return rfq || null
  }

  if (dataLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Create Supplier Quotation" size="xl">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading suppliers and RFQs...</div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Supplier Quotation" size="xl">
      <div style={{ maxHeight: '85vh', overflowY: 'auto', padding: '4px' }}>
        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Basic Information</h5>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>Supplier <span style={{ color: '#d32f2f' }}>*</span></label>
                <select 
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {formData.supplier_id && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} color="#4CAF50" />
                    Selected: {getSupplierName(formData.supplier_id)}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>RFQ <span style={{ color: '#d32f2f' }}>*</span></label>
                <select 
                  value={formData.rfq_id}
                  onChange={handleRFQSelect}
                  disabled={loading}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">Select RFQ Request</option>
                  {rfqs.map(rfq => (
                    <option key={rfq.rfq_id} value={rfq.rfq_id}>
                      {rfq.rfq_id} - Valid till {rfq.valid_till || 'N/A'}
                    </option>
                  ))}
                </select>
                {selectedRFQ && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} color="#4CAF50" />
                    {selectedRFQ.items?.length || 0} items loaded
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Quotation Items */}
          {formData.items.length > 0 && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
              <h5 style={{ marginTop: 0, marginBottom: '16px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Quotation Items ({formData.items.length})</h5>
              
              <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ backgroundColor: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: '600', width: '70px' }}>Qty</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', fontWeight: '600', width: '100px' }}>Rate/Unit</th>
                      <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #ddd', fontWeight: '600', width: '100px' }}>Amount</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: '600', width: '100px' }}>Lead Time</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: '600', width: '80px' }}>Min Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => {
                      const amount = (item.qty || 0) * (item.rate || 0)
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '10px' }}>
                            <strong>{getItemName(item.item_code)}</strong><br />
                            <span style={{ fontSize: '11px', color: '#666' }}>({item.item_code})</span>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{item.qty}</td>
                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number"
                              value={item.rate || ''}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              required
                              disabled={loading}
                              style={{ width: '100%', padding: '6px', borderRadius: '3px', border: `1px solid ${!item.rate || item.rate <= 0 ? '#d32f2f' : '#ddd'}`, fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2196F3' }}>₹{amount.toFixed(2)}</td>
                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number"
                              value={item.lead_time_days || ''}
                              onChange={(e) => handleItemChange(idx, 'lead_time_days', e.target.value)}
                              placeholder="0"
                              min="0"
                              disabled={loading}
                              style={{ width: '100%', padding: '6px', borderRadius: '3px', border: '1px solid #ddd', fontSize: '12px' }}
                            />
                          </td>
                          <td style={{ padding: '10px' }}>
                            <input 
                              type="number"
                              value={item.min_qty || ''}
                              onChange={(e) => handleItemChange(idx, 'min_qty', e.target.value)}
                              placeholder="1"
                              min="0"
                              step="0.01"
                              disabled={loading}
                              style={{ width: '100%', padding: '6px', borderRadius: '3px', border: '1px solid #ddd', fontSize: '12px' }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #4CAF50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#333' }}>Total Quotation Value:</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          )}

          {formData.items.length === 0 && formData.rfq_id && (
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fff3e0', borderRadius: '4px', border: '1px solid #FF9800', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={16} color="#FF9800" />
              <span style={{ fontSize: '13px', color: '#666' }}>Select an RFQ to load items</span>
            </div>
          )}

          {/* Section 3: Notes */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #e8e8e8' }}>
            <h5 style={{ marginTop: 0, marginBottom: '12px', color: '#333', fontSize: '14px', fontWeight: '600' }}>Notes & Comments</h5>
            <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes or comments about this quotation..."
              rows="3"
              disabled={loading}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
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
              disabled={loading || !formData.supplier_id || !formData.rfq_id || formData.items.length === 0}
              style={{ padding: '10px 24px', fontSize: '13px' }}
            >
              {loading ? 'Creating Quotation...' : 'Create Quotation'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}