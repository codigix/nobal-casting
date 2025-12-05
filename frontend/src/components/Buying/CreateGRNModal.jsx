import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import { AlertCircle, CheckCircle, Plus, Trash2, Loader } from 'lucide-react'

export default function CreateGRNModal({ isOpen, onClose, onSuccess, poNo }) {
  const [formData, setFormData] = useState({
    po_no: poNo || '',
    receipt_date: new Date().toISOString().split('T')[0],
    items: [],
    warehouse_name: 'Main Warehouse',
    notes: ''
  })

  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData()
    }
  }, [isOpen])

  useEffect(() => {
    if (poNo && selectedPO?.po_no !== poNo) {
      setFormData(prev => ({ ...prev, po_no: poNo }))
    }
  }, [poNo])

  useEffect(() => {
    if (warehouses.length > 0 && !formData.warehouse_name) {
      setFormData(prev => ({ ...prev, warehouse_name: warehouses[0].name }))
    }
  }, [warehouses])

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      setError(null)
      const apiUrl = import.meta.env.VITE_API_URL

      const [posRes, warehouseRes] = await Promise.all([
        axios.get(`${apiUrl}/purchase-orders?limit=1000`),
        axios.get(`${apiUrl}/stock/warehouses`)
      ])

      const allPOs = posRes.data.data || []
      const receivablePOs = allPOs.filter(po => 
        ['submitted', 'to_receive', 'partially_received'].includes(po.status)
      )
      setPurchaseOrders(receivablePOs)
      
      let warehousesList = warehouseRes.data.data || []
      if (!warehousesList || warehousesList.length === 0) {
        warehousesList = [{ warehouse_code: 'Main', name: 'Main Warehouse' }]
      }
      setWarehouses(warehousesList)
    } catch (err) {
      console.error('Failed to fetch required data:', err)
      setWarehouses([{ warehouse_code: 'Main', name: 'Main Warehouse' }])
      setError('Warning: Using default warehouse. Please check inventory department for available warehouses.')
    } finally {
      setDataLoading(false)
    }
  }

  const handlePOChange = async (e) => {
    const poNo = e.target.value

    if (!poNo) {
      setFormData(prev => ({
        ...prev,
        po_no: '',
        items: []
      }))
      setSelectedPO(null)
      return
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await axios.get(`${apiUrl}/purchase-orders/${poNo}`)
      const po = response.data.data

      setSelectedPO(po)
      setFormData(prev => ({
        ...prev,
        po_no: poNo,
        items: (po.items || []).map(item => ({
          item_code: item.item_code,
          item_name: item.item_name || '',
          ordered_qty: parseFloat(item.qty) || 0,
          received_qty: '',
          batch_no: '',
          remarks: '',
          id: Date.now() + Math.random()
        }))
      }))
      setError(null)
    } catch (err) {
      console.error('Failed to fetch PO details:', err)
      setError('Failed to load PO items')
      setFormData(prev => ({ ...prev, po_no: '', items: [] }))
      setSelectedPO(null)
    }
  }

  const handleItemChange = (idx, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: field === 'received_qty' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }
    setFormData(prev => ({ ...formData, items: updatedItems }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        item_code: '',
        item_name: '',
        ordered_qty: 0,
        received_qty: '',
        batch_no: '',
        remarks: '',
        id: Date.now() + Math.random()
      }]
    }))
  }

  const handleRemoveItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }))
  }

  const getTotalReceivedQty = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.received_qty) || 0), 0)
  }

  const validateForm = () => {
    if (!formData.po_no) return 'Please select a Purchase Order'
    if (!formData.receipt_date) return 'Receipt date is required'
    if (!formData.warehouse_name) return 'Please select a Destination Warehouse'
    if (formData.items.length === 0) return 'Please add at least one item'

    const invalidItems = formData.items.filter(item => !item.item_code || item.received_qty === '')
    if (invalidItems.length > 0) return 'All items must have quantity received'

    const negativeQtyItems = formData.items.filter(item => parseFloat(item.received_qty) < 0)
    if (negativeQtyItems.length > 0) return 'Received quantity cannot be negative'

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      const grnNo = `GRN-${Date.now()}`

      const submitData = {
        grn_no: grnNo,
        po_no: formData.po_no,
        supplier_id: selectedPO?.supplier_id || null,
        supplier_name: selectedPO?.supplier_name || '',
        receipt_date: formData.receipt_date,
        notes: formData.notes,
        items: formData.items.map(({ id, ordered_qty, remarks, ...item }) => ({
          ...item,
          po_qty: parseFloat(ordered_qty) || 0,
          received_qty: parseFloat(item.received_qty) || 0,
          warehouse_name: formData.warehouse_name
        }))
      }

      await axios.post(`${apiUrl}/grn-requests`, submitData)

      setFormData({
        po_no: '',
        receipt_date: new Date().toISOString().split('T')[0],
        items: [],
        warehouse_name: 'Main Warehouse',
        notes: ''
      })
      setSelectedPO(null)

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create GRN')
      console.error('GRN Creation Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Create Goods Receipt Note (GRN)" size="xl">
      {dataLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#666' }}>Loading data...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📌 Basic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333', fontSize: '0.9rem' }}>
                  Purchase Order *
                </label>
                <select
                  value={formData.po_no}
                  onChange={handlePOChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="">Select Purchase Order</option>
                  {purchaseOrders.map(po => (
                    <option key={po.po_no} value={po.po_no}>
                      {po.po_no} - {po.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333', fontSize: '0.9rem' }}>
                  Receipt Date *
                </label>
                <input
                  type="date"
                  name="receipt_date"
                  value={formData.receipt_date}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {selectedPO && (
              <div style={{
                backgroundColor: '#e0f2fe',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '16px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <CheckCircle size={20} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0284c7', fontSize: '0.95rem' }}>
                      {selectedPO.supplier_name}
                    </div>
                    {selectedPO.gstin && (
                      <div style={{ color: '#0c4a6e', fontSize: '0.85rem', marginTop: '4px' }}>
                        GSTIN: {selectedPO.gstin}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #bae6fd' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0c4a6e', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Order Date
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0c4a6e', fontWeight: 500 }}>
                      {selectedPO.order_date ? new Date(selectedPO.order_date).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0c4a6e', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Expected Delivery
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0c4a6e', fontWeight: 500 }}>
                      {selectedPO.expected_date ? new Date(selectedPO.expected_date).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0c4a6e', textTransform: 'uppercase', marginBottom: '4px' }}>
                      PO Value
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0c4a6e', fontWeight: 500 }}>
                      ₹{parseFloat(selectedPO.total_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0c4a6e', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Status
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#0c4a6e', fontWeight: 500 }}>
                      {selectedPO.status?.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Warehouse */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏭 Destination Warehouse
            </h3>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333', fontSize: '0.9rem' }}>
                Select Warehouse *
              </label>
              {warehouses.length === 0 ? (
                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: '#dc2626',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <AlertCircle size={18} />
                  <span>No warehouses available. Please check with inventory department.</span>
                </div>
              ) : (
                <select
                  name="warehouse_name"
                  value={formData.warehouse_name}
                  onChange={handleInputChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    backgroundColor: '#fff'
                  }}
                >
                  <option value="">-- Select Destination Warehouse --</option>
                  {warehouses.map(wh => (
                    <option key={wh.warehouse_code || wh.name} value={wh.name}>
                      📦 {wh.name}
                    </option>
                  ))}
                </select>
              )}
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '6px' }}>
                The warehouse where received goods will be stored
              </p>
            </div>
          </div>

          {/* Section 3: Received Items */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📦 Received Items *
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#e0f2fe',
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#0284c7',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bae6fd'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
              >
                <Plus size={16} /> Add Item
              </button>
            </div>

            {!formData.po_no ? (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '12px 16px',
                color: '#92400e',
                fontSize: '0.9rem'
              }}>
                📌 Select a Purchase Order to auto-populate items
              </div>
            ) : formData.items.length === 0 ? (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                padding: '12px 16px',
                color: '#92400e',
                fontSize: '0.9rem'
              }}>
                📌 No items in selected PO or loading items...
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                {formData.items.map((item, idx) => (
                  <div key={item.id} style={{
                    padding: '16px',
                    borderBottom: idx < formData.items.length - 1 ? '1px solid #e5e7eb' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                    gap: '12px',
                    alignItems: 'end'
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', color: '#666' }}>
                        Item Code
                      </label>
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        color: '#374151'
                      }}>
                        <strong>{item.item_code}</strong>
                        {item.item_name && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>{item.item_name}</div>}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', color: '#666' }}>
                        Ordered
                      </label>
                      <div style={{
                        padding: '8px 10px',
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        color: '#374151',
                        textAlign: 'center',
                        fontWeight: 500
                      }}>
                        {item.ordered_qty}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', color: '#666' }}>
                        Received *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(idx, 'received_qty', e.target.value)}
                        step="0.01"
                        min="0"
                        required
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', color: '#666' }}>
                        Batch No
                      </label>
                      <input
                        type="text"
                        placeholder="Batch..."
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(idx, 'batch_no', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px', color: '#666' }}>
                        Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="Notes..."
                        value={item.remarks}
                        onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={formData.items.length === 1}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        cursor: formData.items.length === 1 ? 'not-allowed' : 'pointer',
                        opacity: formData.items.length === 1 ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                      title={formData.items.length === 1 ? 'At least one item required' : 'Remove item'}
                    >
                      <Trash2 size={16} color="#dc2626" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {formData.items.length > 0 && (
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ color: '#666' }}>Total Items:</span>
                  <span style={{ fontWeight: 600, color: '#0284c7', marginLeft: '8px' }}>{formData.items.length}</span>
                </div>
                <div>
                  <span style={{ color: '#666' }}>Total Qty Received:</span>
                  <span style={{ fontWeight: 600, color: '#0284c7', marginLeft: '8px' }}>{getTotalReceivedQty().toFixed(2)} units</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333', fontSize: '0.9rem' }}>
              📝 Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any additional notes or observations..."
              rows="3"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: 600,
                opacity: loading ? 0.65 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Creating GRN...' : '✓ Create GRN'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
