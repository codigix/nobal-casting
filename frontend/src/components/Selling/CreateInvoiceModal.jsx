import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deliveryNotes, setDeliveryNotes] = useState([])
  const [formData, setFormData] = useState({
    delivery_note_id: '',
    customer_name: '',
    invoice_date: '',
    total_value: '',
    due_date: '',
    tax_rate: '18',
    invoice_type: 'standard'
  })

  useEffect(() => {
    if (isOpen) {
      fetchDeliveryNotes()
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, invoice_date: today }))
    }
  }, [isOpen])

  const fetchDeliveryNotes = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/delivery-notes`)
      const data = await res.json()
      if (data.success) {
        setDeliveryNotes(data.data?.filter(d => d.status === 'delivered') || [])
      }
    } catch (error) {
      console.error('Error fetching delivery notes:', error)
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

  const handleDeliveryNoteChange = (e) => {
    const noteId = e.target.value
    const note = deliveryNotes.find(n => n.delivery_note_id === noteId)
    setFormData(prev => ({
      ...prev,
      delivery_note_id: noteId,
      customer_name: note?.customer_name || ''
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.delivery_note_id || !formData.invoice_date || !formData.total_value || !formData.due_date) {
        throw new Error('Please fill in all required fields')
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_note_id: formData.delivery_note_id,
          customer_name: formData.customer_name,
          invoice_date: formData.invoice_date,
          total_value: parseFloat(formData.total_value),
          due_date: formData.due_date,
          tax_rate: parseFloat(formData.tax_rate),
          invoice_type: formData.invoice_type,
          status: 'draft',
          payment_status: 'unpaid',
          amount_paid: 0
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invoice')
      }

      setFormData({
        delivery_note_id: '',
        customer_name: '',
        invoice_date: '',
        total_value: '',
        due_date: '',
        tax_rate: '18',
        invoice_type: 'standard'
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📃 Create New Invoice" size="lg">
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
              Delivery Note *
            </label>
            <select
              name="delivery_note_id"
              value={formData.delivery_note_id}
              onChange={handleDeliveryNoteChange}
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
              <option value="">Select Delivery Note</option>
              {deliveryNotes.map(note => (
                <option key={note.delivery_note_id} value={note.delivery_note_id}>
                  {note.delivery_note_id} - {note.customer_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Invoice Date *
            </label>
            <input
              type="date"
              name="invoice_date"
              value={formData.invoice_date}
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
              Invoice Amount (₹) *
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
              Due Date *
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
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
              Tax Rate (%)
            </label>
            <select
              name="tax_rate"
              value={formData.tax_rate}
              onChange={handleInputChange}
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
              <option value="0">0% (Exempt)</option>
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18">18%</option>
              <option value="28">28%</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Invoice Type
            </label>
            <select
              name="invoice_type"
              value={formData.invoice_type}
              onChange={handleInputChange}
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
              <option value="standard">Standard</option>
              <option value="advance">Advance Payment</option>
              <option value="credit">Credit</option>
            </select>
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
            {loading ? 'Creating...' : '✓ Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}