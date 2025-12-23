import React, { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import Modal from '../Modal'

export default function ViewSalesOrderModal({ isOpen, orderId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder()
    }
  }, [isOpen, orderId])

  const fetchOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${orderId}`)
      const data = await res.json()
      if (data.success) {
        setOrder(data.data)
      } else {
        setError(data.error || 'Failed to fetch order')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      setError('Error fetching order details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return '#fbbf24'
      case 'confirmed':
        return '#3b82f6'
      case 'dispatched':
        return '#3b82f6'
      case 'invoiced':
        return '#10b981'
      case 'cancelled':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  if (!order && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="📦 View Sales Order" size="lg">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p>Loading order details...</p>
        </div>
      </Modal>
    )
  }

  if (!order) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 View Sales Order" size="lg">
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

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
              Order ID
            </label>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
              {order.sales_order_id}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
              Status
            </label>
            <div style={{
              display: 'inline-block',
              background: getStatusColor(order.status),
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'capitalize'
            }}>
              {order.status}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
              Customer
            </label>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
              {order.customer_name || 'N/A'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
              Order Amount
            </label>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>
              ₹{parseFloat(order.order_amount || order.total_value || 0).toFixed(2)}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
              Delivery Date
            </label>
            <p style={{ fontSize: '1rem', color: '#1f2937' }}>
              {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
              Quotation ID
            </label>
            <p style={{ fontSize: '1rem', color: '#1f2937' }}>
              {order.quotation_id || 'N/A'}
            </p>
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>
              Order Items & Specifications
            </h3>
            <div>
              {order.items.map((item, idx) => {
                const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0)
                return (
                  <div key={idx} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                          Product
                        </label>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>
                          {item.item_name || item.item_code || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                          Qty
                        </label>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>
                          {item.qty || 0}
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                          Size
                        </label>
                        <p style={{ fontSize: '0.95rem', color: '#374151' }}>
                          {item.size || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                          Color
                        </label>
                        <p style={{ fontSize: '0.95rem', color: '#374151' }}>
                          {item.color || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                          Material
                        </label>
                        <p style={{ fontSize: '0.95rem', color: '#374151' }}>
                          {item.specifications || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px', fontWeight: 600 }}>
                          Rate (₹)
                        </label>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1f2937' }}>
                          ₹{parseFloat(item.rate || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {item.special_requirements && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '6px', fontWeight: 600 }}>
                          Special Requirements
                        </label>
                        <p style={{
                          fontSize: '0.9rem',
                          color: '#374151',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          backgroundColor: '#f3f4f6',
                          padding: '10px',
                          borderRadius: '4px'
                        }}>
                          {item.special_requirements}
                        </p>
                      </div>
                    )}
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
                        {item.qty} × ₹{parseFloat(item.rate || 0).toFixed(2)}
                      </p>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                        ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Order Summary Section */}
        {order.items && order.items.length > 0 && (
          <div style={{ marginTop: '24px', backgroundColor: '#f0f8ff', border: '2px solid #0ea5e9', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#1976d2' }}>Order Summary</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#666' }}>Subtotal:</span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>₹{parseFloat(order.subtotal || 0).toFixed(2)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#666' }}>
                      Discount ({order.discount_type === 'percentage' ? order.discount_value + '%' : '₹'}):
                    </span>
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>-₹{parseFloat(order.discount_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
                  <span style={{ color: '#666' }}>After Discount:</span>
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>₹{(parseFloat(order.subtotal || 0) - parseFloat(order.discount_amount || 0)).toFixed(2)}</span>
                </div>
              </div>
              <div>
                {order.tax_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#666' }}>Tax ({order.tax_rate}%):</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>+₹{parseFloat(order.tax_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '2px solid #0ea5e9', fontWeight: 700 }}>
                  <span style={{ color: '#1f2937' }}>Grand Total:</span>
                  <span style={{ color: '#0ea5e9', fontSize: '1.1rem' }}>₹{parseFloat(order.total_value || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {order.order_terms && (
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px', fontWeight: 600 }}>
              Terms & Conditions
            </label>
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '0.95rem',
              color: '#374151',
              lineHeight: '1.5'
            }}>
              {order.order_terms}
            </div>
          </div>
        )}

        {order.created_at && (
          <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#9ca3af' }}>
            Created on {new Date(order.created_at).toLocaleDateString()}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
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
          Close
        </button>
      </div>
    </Modal>
  )
}