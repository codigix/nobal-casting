import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { Plus, Trash2, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'

export default function CreatePurchaseOrderModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: '',
    expected_date: '',
    currency: 'INR',
    tax_template_id: '',
    items: []
  })

  const [suppliers, setSuppliers] = useState([])
  const [allItems, setAllItems] = useState([])
  const [taxTemplates, setTaxTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)
  const [supplierDetails, setSupplierDetails] = useState(null)

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
      
      const [supRes, itemRes] = await Promise.all([
        axios.get(`${apiUrl}/suppliers?active=true`),
        axios.get(`${apiUrl}/items?limit=1000`)
      ])

      setSuppliers(supRes.data.data || [])
      setAllItems(itemRes.data.data || [])
      
      try {
        const taxRes = await axios.get(`${apiUrl}/tax-templates`)
        setTaxTemplates(taxRes.data.data || [])
      } catch (err) {
        console.log('Tax templates not available')
        setTaxTemplates([])
      }
      
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({
        ...prev,
        order_date: today,
        items: [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
      }))
    } catch (err) {
      console.error('Failed to fetch required data:', err)
      setError('Failed to load suppliers, items, or tax templates')
    } finally {
      setDataLoading(false)
    }
  }

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value
    const supplier = suppliers.find(s => s.supplier_id === supplierId)
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId
    }))
    setSupplierDetails(supplier)
    setError(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    
    if (field === 'item_code') {
      const item = allItems.find(i => i.item_code === value)
      newItems[index] = {
        ...newItems[index],
        item_code: value,
        uom: item?.uom || '',
        rate: 0
      }
    } else if (field === 'qty' || field === 'rate') {
      newItems[index][field] = value ? parseFloat(value) : ''
    } else {
      newItems[index][field] = value
    }

    setFormData(prev => ({
      ...prev,
      items: newItems
    }))
    setError(null)
  }

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
    }))
  }

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      items: newItems.length > 0 ? newItems : [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
    }))
  }

  const calculateLineAmount = (qty, rate) => {
    const q = parseFloat(qty) || 0
    const r = parseFloat(rate) || 0
    return q * r
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((total, item) => {
      return total + calculateLineAmount(item.qty, item.rate)
    }, 0)
  }

  const getTotalQty = () => {
    return formData.items.reduce((total, item) => total + (parseFloat(item.qty) || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.supplier_id) {
      setError('Please select a supplier')
      return
    }
    
    if (!formData.order_date) {
      setError('Please enter order date')
      return
    }

    if (!formData.expected_date) {
      setError('Please enter expected delivery date')
      return
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item')
      return
    }

    const invalidItems = formData.items.filter(item => !item.item_code || !item.qty || !item.rate)
    if (invalidItems.length > 0) {
      setError('Please fill in item code, quantity, and rate for all items')
      return
    }

    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      
      const submitData = {
        supplier_id: formData.supplier_id,
        order_date: formData.order_date,
        expected_date: formData.expected_date,
        currency: formData.currency,
        tax_template_id: formData.tax_template_id || null,
        items: formData.items.map(item => ({
          item_code: item.item_code,
          qty: parseFloat(item.qty),
          uom: item.uom,
          rate: parseFloat(item.rate),
          schedule_date: item.schedule_date || formData.expected_date
        })),
        subtotal: calculateSubtotal(),
        total_value: calculateSubtotal()
      }

      await axios.post(`${apiUrl}/purchase-orders`, submitData)
      
      onSuccess?.()
      onClose()
      
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        supplier_id: '',
        order_date: today,
        expected_date: '',
        currency: 'INR',
        tax_template_id: '',
        items: [{ item_code: '', qty: '', rate: '', schedule_date: '', uom: '' }]
      })
      setSupplierDetails(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create purchase order')
    } finally {
      setLoading(false)
    }
  }

  const renderLoadingState = () => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
      <p style={{ marginTop: '12px', color: '#666', fontSize: '0.95rem' }}>Loading suppliers and items...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )

  if (dataLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="📋 Create New Purchase Order" size="2xl">
        {renderLoadingState()}
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📋 Create New Purchase Order" size="2xl">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '24px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Information Section */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '16px', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
            📌 Basic Information
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '0.9rem' }}>
                Supplier *
              </label>
              <select
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleSupplierChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  backgroundColor: '#fff',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%231e293b' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  paddingRight: '32px',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '0.9rem' }}>
                Order Date *
              </label>
              <input
                type="date"
                name="order_date"
                value={formData.order_date}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '0.9rem' }}>
                Expected Delivery *
              </label>
              <input
                type="date"
                name="expected_date"
                value={formData.expected_date}
                onChange={handleInputChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {supplierDetails && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem'
            }}>
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span style={{ color: '#047857', fontWeight: 500 }}>
                {supplierDetails.name} • GSTIN: {supplierDetails.gstin || 'N/A'} • Lead time: {supplierDetails.lead_time_days || 7} days
              </span>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ marginTop: 0, marginBottom: 0, fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
              📦 Purchase Order Items *
            </h4>
            <button
              type="button"
              onClick={handleAddItem}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#dbeafe',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e40af',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#bfdbfe'
                e.target.style.borderColor = '#1e40af'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dbeafe'
                e.target.style.borderColor = '#3b82f6'
              }}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', backgroundColor: '#f1f5f9' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Item Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Qty</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>UOM</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Rate</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Amount</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={item.item_code}
                        onChange={(e) => handleItemChange(index, 'item_code', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          backgroundColor: '#fff'
                        }}
                      >
                        <option value="">Select Item</option>
                        {allItems.map(it => (
                          <option key={it.item_code} value={it.item_code}>
                            {it.item_code} - {it.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="text"
                        value={item.uom}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          backgroundColor: '#f1f5f9',
                          color: '#64748b'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        required
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px', backgroundColor: '#f0fdf4', fontWeight: 600, color: '#166534' }}>
                      ₹{calculateLineAmount(item.qty, item.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length === 1}
                        style={{
                          padding: '6px',
                          backgroundColor: formData.items.length === 1 ? '#f3f4f6' : '#fee2e2',
                          border: '1px solid ' + (formData.items.length === 1 ? '#ddd' : '#fecaca'),
                          borderRadius: '4px',
                          cursor: formData.items.length === 1 ? 'not-allowed' : 'pointer',
                          color: formData.items.length === 1 ? '#999' : '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: formData.items.length === 1 ? 0.5 : 1,
                          transition: 'all 0.2s',
                          margin: '0 auto'
                        }}
                        onMouseEnter={(e) => {
                          if (formData.items.length > 1) {
                            e.target.style.backgroundColor = '#fecaca'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.items.length > 1) {
                            e.target.style.backgroundColor = '#fee2e2'
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Items Summary */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px'
          }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>Total Items</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                {formData.items.length}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>Total Quantity</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                {getTotalQty().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', fontWeight: 500 }}>Subtotal</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                ₹{calculateSubtotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Tax & Currency Section */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '16px', fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
            💰 Tax & Currency
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '0.9rem' }}>
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  backgroundColor: '#fff'
                }}
              >
                <option value="INR">INR (Indian Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#1e293b', fontSize: '0.9rem' }}>
                Tax Template
              </label>
              <select
                name="tax_template_id"
                value={formData.tax_template_id}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  backgroundColor: '#fff'
                }}
              >
                <option value="">No Tax Template</option>
                {taxTemplates.map(tax => (
                  <option key={tax.template_id} value={tax.template_id}>
                    {tax.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary & Actions */}
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '2px solid #10b981',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#047857', marginBottom: '4px', fontWeight: 500 }}>Subtotal Amount</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
                ₹{calculateSubtotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: '#047857', marginBottom: '4px', fontWeight: 500 }}>Total Amount</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
                ₹{calculateSubtotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#047857', margin: 0 }}>
            ✓ Ready to create this purchase order
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e5e7eb'
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f3f4f6'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 24px',
              backgroundColor: loading ? '#d1d5db' : '#10b981',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#fff',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.backgroundColor = '#059669'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.backgroundColor = '#10b981'
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></span>
                Creating...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Create Purchase Order
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  )
}
