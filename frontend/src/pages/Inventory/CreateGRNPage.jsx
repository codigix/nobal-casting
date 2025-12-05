import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react'
import './Inventory.css'

export default function CreateGRNPage({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])

  const [formData, setFormData] = useState({
    grn_no: '',
    po_no: '',
    supplier_id: '',
    supplier_name: '',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [grnItems, setGrnItems] = useState([
    { item_code: '', item_name: '', po_qty: 0, received_qty: 0, batch_no: '', warehouse_name: '' }
  ])

  useEffect(() => {
    fetchPurchaseOrders()
    fetchWarehouses()
    fetchItems()
    generateGRNNo()
  }, [])

  const generateGRNNo = async () => {
    try {
      const date = new Date()
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
      const randomNo = Math.floor(Math.random() * 10000)
      const grnNo = `GRN-${dateStr}-${String(randomNo).padStart(4, '0')}`
      setFormData(prev => ({ ...prev, grn_no: grnNo }))
    } catch (err) {
      console.error('Error generating GRN number:', err)
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get('/api/purchase-orders?status=submitted')
      setPurchaseOrders(response.data.data || [])
    } catch (err) {
      console.error('Error fetching purchase orders:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items')
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  const handlePOSelect = (poNo) => {
    const selectedPO = purchaseOrders.find(po => po.po_no === poNo)
    if (selectedPO) {
      setFormData(prev => ({
        ...prev,
        po_no: selectedPO.po_no,
        supplier_id: selectedPO.supplier_id,
        supplier_name: selectedPO.supplier_name || ''
      }))

      if (selectedPO.items && selectedPO.items.length > 0) {
        const newItems = selectedPO.items.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          po_qty: item.qty || item.quantity,
          received_qty: item.qty || item.quantity,
          batch_no: '',
          warehouse_name: warehouses.length > 0 ? warehouses[0].warehouse_name : ''
        }))
        setGrnItems(newItems)
      }
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...grnItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setGrnItems(newItems)
  }

  const handleAddItem = () => {
    setGrnItems([
      ...grnItems,
      { item_code: '', item_name: '', po_qty: 0, received_qty: 0, batch_no: '', warehouse_name: warehouses.length > 0 ? warehouses[0].warehouse_name : '' }
    ])
  }

  const handleRemoveItem = (index) => {
    if (grnItems.length > 1) {
      setGrnItems(grnItems.filter((_, i) => i !== index))
    }
  }

  const handleItemCodeSelect = (index, itemCode) => {
    const selectedItem = items.find(item => item.item_code === itemCode)
    if (selectedItem) {
      const newItems = [...grnItems]
      newItems[index] = {
        ...newItems[index],
        item_code: selectedItem.item_code,
        item_name: selectedItem.name || selectedItem.item_name
      }
      setGrnItems(newItems)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.grn_no || !formData.po_no) {
      setError('Please fill in GRN Number and PO Number')
      return
    }

    if (grnItems.length === 0 || !grnItems.some(item => item.item_code)) {
      setError('Please add at least one item')
      return
    }

    setLoading(true)
    try {
      const payload = {
        grn_no: formData.grn_no,
        po_no: formData.po_no,
        supplier_id: formData.supplier_id,
        supplier_name: formData.supplier_name,
        receipt_date: formData.receipt_date,
        items: grnItems.filter(item => item.item_code),
        notes: formData.notes
      }

      const response = await axios.post('/api/grn-requests', payload)

      if (response.data.success) {
        setError(null)
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to create GRN request')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create GRN request')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Back Button */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333'
          }}
        >
          <ArrowLeft size={18} /> Back to GRN Management
        </button>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
          <Package size={32} style={{ display: 'inline', marginRight: '12px' }} />
          Create New GRN Request
        </h1>
        <p style={{ color: '#666', fontSize: '1rem' }}>Enter goods receipt details and items</p>
      </div>

      {error && <Alert type="danger" style={{ marginBottom: '20px' }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {/* GRN Header Section */}
        <Card title="GRN Information" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                GRN Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.grn_no}
                onChange={(e) => setFormData({ ...formData, grn_no: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
                placeholder="Auto-generated"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                Receipt Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.receipt_date}
                onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
        </Card>

        {/* Purchase Order Section */}
        <Card title="Purchase Order Details" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                Purchase Order <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.po_no}
                onChange={(e) => handlePOSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">Select Purchase Order</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.po_no}>
                    {po.po_no} - {po.supplier_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '6px', color: '#333' }}>
                Supplier
              </label>
              <input
                type="text"
                value={formData.supplier_name}
                readOnly
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  backgroundColor: '#f9f9f9'
                }}
              />
            </div>
          </div>
        </Card>

        {/* Items Section */}
        <Card title="Receipt Items" style={{ marginBottom: '20px' }}>
          <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ backgroundColor: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', minWidth: '150px' }}>Item Code</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', minWidth: '180px' }}>Item Name</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', width: '80px' }}>PO Qty</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', width: '100px' }}>Received Qty</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', width: '120px' }}>Batch No</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', minWidth: '140px' }}>Warehouse</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', width: '50px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {grnItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>
                      <select
                        value={item.item_code}
                        onChange={(e) => handleItemCodeSelect(index, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="">Select Item</option>
                        {items.map(itemOption => (
                          <option key={itemOption.id} value={itemOption.item_code}>
                            {itemOption.item_code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="text"
                        value={item.item_name}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: '#f9f9f9',
                          fontSize: '0.9rem'
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={item.po_qty}
                        onChange={(e) => handleItemChange(index, 'po_qty', parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontSize: '0.9rem'
                        }}
                        min="0"
                      />
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(index, 'received_qty', parseFloat(e.target.value) || 0)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontSize: '0.9rem'
                        }}
                        min="0"
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="text"
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(index, 'batch_no', e.target.value)}
                        placeholder="Batch #"
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <select
                        value={item.warehouse_name}
                        onChange={(e) => handleItemChange(index, 'warehouse_name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="">Select Warehouse</option>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.warehouse_name}>
                            {wh.warehouse_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={grnItems.length === 1}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: grnItems.length === 1 ? '#ccc' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: grnItems.length === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            <Plus size={18} /> Add Item
          </button>
        </Card>

        {/* Notes Section */}
        <Card title="Additional Notes" style={{ marginBottom: '20px' }}>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any additional notes for this GRN request..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontFamily: 'Arial'
            }}
          />
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            Create GRN Request
          </Button>
        </div>
      </form>
    </div>
  )
}
