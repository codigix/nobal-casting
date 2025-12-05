import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'

export default function CreateSalesOrderModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    total_value: '',
    delivery_date: '',
    terms_conditions: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
    }
  }, [isOpen])

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/customers`)
      const data = await res.json()
      if (data.success) {
        setCustomers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
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

  const handleCustomerChange = (e) => {
    const customerId = e.target.value
    const customer = customers.find(c => c.customer_id === customerId)
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || ''
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.customer_id || !formData.total_value || !formData.delivery_date) {
        throw new Error('Please fill in all required fields')
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          customer_name: formData.customer_name,
          total_value: parseFloat(formData.total_value),
          delivery_date: formData.delivery_date,
          terms_conditions: formData.terms_conditions,
          status: 'draft'
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sales order')
      }

      setFormData({
        customer_id: '',
        customer_name: '',
        total_value: '',
        delivery_date: '',
        terms_conditions: ''
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create sales order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📦 Create New Sales Order" size="lg">
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
              Customer *
            </label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleCustomerChange}
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
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Order Amount (₹) *
            </label>
            <input
              type="number"
              name="total_value"
              placeholder="0.00"
              value={formData.total_value}
              onChange={handleInputChange}
              step="0.01"
              min="0"
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
              Terms & Conditions
            </label>
            <input
              type="text"
              name="terms_conditions"
              placeholder="Payment terms, delivery conditions..."
              value={formData.terms_conditions}
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
            {loading ? 'Creating...' : '✓ Create Sales Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}