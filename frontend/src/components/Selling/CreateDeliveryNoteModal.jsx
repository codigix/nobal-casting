import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'

export default function CreateDeliveryNoteModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [formData, setFormData] = useState({
    sales_order_id: '',
    customer_name: '',
    delivery_date: '',
    total_qty: '',
    driver_name: '',
    vehicle_no: '',
    remarks: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchSalesOrders()
    }
  }, [isOpen])

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data?.filter(o => o.status === 'confirmed') || [])
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const handleOrderChange = (e) => {
    const orderId = e.target.value
    const order = orders.find(o => o.sales_order_id === orderId)
    setFormData(prev => ({
      ...prev,
      sales_order_id: orderId,
      customer_name: order?.customer_name || ''
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.sales_order_id || !formData.delivery_date || !formData.total_qty) {
        throw new Error('Please fill in all required fields')
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/delivery-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_order_id: formData.sales_order_id,
          customer_name: formData.customer_name,
          delivery_date: formData.delivery_date,
          total_qty: parseInt(formData.total_qty),
          driver_name: formData.driver_name,
          vehicle_no: formData.vehicle_no,
          remarks: formData.remarks,
          status: 'draft'
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create delivery note')
      }

      setFormData({
        sales_order_id: '',
        customer_name: '',
        delivery_date: '',
        total_qty: '',
        driver_name: '',
        vehicle_no: '',
        remarks: ''
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create delivery note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🚚 Create Delivery Note" size="lg">
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
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Sales Order *
            </label>
            <select
              name="sales_order_id"
              value={formData.sales_order_id}
              onChange={handleOrderChange}
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
              <option value="">Select Sales Order</option>
              {orders.map(order => (
                <option key={order.sales_order_id} value={order.sales_order_id}>
                  {order.sales_order_id} - {order.customer_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Delivery Date *
            </label>
            <input
              type="date"
              name="delivery_date"
              value={formData.delivery_date}
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

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Total Quantity (Units) *
            </label>
            <input
              type="number"
              name="total_qty"
              placeholder="0"
              value={formData.total_qty}
              onChange={handleInputChange}
              min="1"
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

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Driver Name
            </label>
            <input
              type="text"
              name="driver_name"
              placeholder="Driver name..."
              value={formData.driver_name}
              onChange={handleInputChange}
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

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Vehicle Number
            </label>
            <input
              type="text"
              name="vehicle_no"
              placeholder="Vehicle number..."
              value={formData.vehicle_no}
              onChange={handleInputChange}
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

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Remarks
            </label>
            <textarea
              name="remarks"
              placeholder="Additional remarks..."
              value={formData.remarks}
              onChange={handleInputChange}
              rows="3"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

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
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: 600,
              opacity: loading ? 0.65 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Creating...' : '✓ Create Delivery Note'}
          </button>
        </div>
      </form>
    </Modal>
  )
}