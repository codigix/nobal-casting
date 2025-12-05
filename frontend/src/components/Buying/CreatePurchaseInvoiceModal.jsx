import React, { useState, useEffect } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'
import Modal from '../Modal'

export default function CreatePurchaseInvoiceModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [grns, setGrns] = useState([])
  const [selectedGrn, setSelectedGrn] = useState(null)
  const [loadingGrn, setLoadingGrn] = useState(false)
  const [formData, setFormData] = useState({
    grn_no: '',
    po_no: '',
    supplier_name: '',
    supplier_id: '',
    invoice_date: '',
    due_date: '',
    net_amount: '',
    tax_rate: '18',
    tax_amount: '0',
    gross_amount: '0',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchAcceptedGRNs()
      // Set today's date as default
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, invoice_date: today }))
    }
  }, [isOpen])

  const fetchAcceptedGRNs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-receipts`)
      const data = await res.json()
      if (data.success) {
        // Filter for accepted GRNs that don't have invoices yet
        setGrns(data.data?.filter(grn => grn.status === 'accepted') || [])
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error)
    }
  }

  const fetchGRNDetails = async (grnNo) => {
    setLoadingGrn(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-receipts/${grnNo}`)
      const data = await res.json()
      if (data.success) {
        setSelectedGrn(data.data)
      }
    } catch (error) {
      console.error('Error fetching GRN details:', error)
    } finally {
      setLoadingGrn(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)

    // Auto-calculate tax and gross amount
    if (name === 'net_amount' || name === 'tax_rate') {
      const netAmount = name === 'net_amount' ? parseFloat(value) || 0 : parseFloat(formData.net_amount) || 0
      const taxRate = name === 'tax_rate' ? parseFloat(value) || 0 : parseFloat(formData.tax_rate) || 0
      const taxAmount = (netAmount * taxRate) / 100
      const grossAmount = netAmount + taxAmount
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        tax_amount: taxAmount.toFixed(2),
        gross_amount: grossAmount.toFixed(2)
      }))
    }
  }

  const handleGRNChange = async (e) => {
    const grnNo = e.target.value
    const grn = grns.find(g => g.grn_no === grnNo)
    
    setFormData(prev => ({
      ...prev,
      grn_no: grnNo,
      po_no: grn?.po_no || '',
      supplier_name: grn?.supplier_name || '',
      supplier_id: grn?.supplier_id || ''
    }))
    setError(null)
    
    // Fetch GRN details with items
    if (grnNo) {
      await fetchGRNDetails(grnNo)
    } else {
      setSelectedGrn(null)
    }
  }

  const calculateTotalFromItems = () => {
    if (!selectedGrn?.items || selectedGrn.items.length === 0) return 0
    return selectedGrn.items.reduce((sum, item) => {
      return sum + ((item.received_qty || 0) * (item.rate || 0))
    }, 0)
  }

  const handlePrefillFromGRN = () => {
    if (!selectedGrn?.items) return
    
    const netAmount = calculateTotalFromItems()
    const taxRate = parseFloat(formData.tax_rate) || 18
    const taxAmount = (netAmount * taxRate) / 100
    const grossAmount = netAmount + taxAmount

    setFormData(prev => ({
      ...prev,
      net_amount: netAmount.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      gross_amount: grossAmount.toFixed(2)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.grn_no || !formData.invoice_date || !formData.net_amount || !formData.due_date) {
        throw new Error('Please fill in all required fields')
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grn_no: formData.grn_no,
          po_no: formData.po_no,
          supplier_name: formData.supplier_name,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          net_amount: parseFloat(formData.net_amount),
          tax_rate: parseFloat(formData.tax_rate),
          tax_amount: parseFloat(formData.tax_amount),
          gross_amount: parseFloat(formData.gross_amount),
          notes: formData.notes || null,
          status: 'draft',
          payment_status: 'unpaid'
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create purchase invoice')
      }

      // Reset form
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        grn_no: '',
        po_no: '',
        supplier_name: '',
        invoice_date: today,
        due_date: '',
        net_amount: '',
        tax_rate: '18',
        tax_amount: '0',
        gross_amount: '0',
        notes: ''
      })
      
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create purchase invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📋 Create Purchase Invoice" size="lg">
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

        {/* GRN and PO Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              GRN Number *
            </label>
            <select
              name="grn_no"
              value={formData.grn_no}
              onChange={handleGRNChange}
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
              <option value="">Select GRN</option>
              {grns.map(grn => (
                <option key={grn.grn_no} value={grn.grn_no}>
                  {grn.grn_no} - {grn.supplier_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
              PO Number (Auto-populated)
            </label>
            <input
              type="text"
              value={formData.po_no}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                backgroundColor: '#f3f4f6',
                cursor: 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
              Supplier (Auto-populated)
            </label>
            <input
              type="text"
              value={formData.supplier_name}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                backgroundColor: '#f3f4f6',
                cursor: 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
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
        </div>

        {/* GRN Items Display */}
        {selectedGrn && (
          <div style={{ 
            backgroundColor: '#f9fafb', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '20px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                📦 GRN Items ({selectedGrn.items?.length || 0})
              </h4>
              <button
                type="button"
                onClick={handlePrefillFromGRN}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#dbeafe',
                  border: '1px solid #0284c7',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#0284c7',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#bfdbfe'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#dbeafe'}
              >
                💡 Prefill Amount
              </button>
            </div>
            
            {loadingGrn ? (
              <p style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center', padding: '20px' }}>
                Loading items...
              </p>
            ) : selectedGrn.items && selectedGrn.items.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.85rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item Code</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Received Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Warehouse</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Batch No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGrn.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px', color: '#374151' }}>{item.item_code}</td>
                        <td style={{ padding: '8px', color: '#374151' }}>{item.received_qty || 0}</td>
                        <td style={{ padding: '8px', color: '#374151' }}>{item.warehouse_code || '-'}</td>
                        <td style={{ padding: '8px', color: '#374151' }}>{item.batch_no || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: '#999', textAlign: 'center', padding: '20px' }}>
                No items in this GRN
              </p>
            )}
          </div>
        )}

        {/* Invoice Amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
              Net Amount (₹) *
            </label>
            <input
              type="number"
              name="net_amount"
              placeholder="0.00"
              value={formData.net_amount}
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
              Tax Rate (%) *
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
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
              Tax Amount (₹) (Auto-calculated)
            </label>
            <input
              type="text"
              value={`₹${parseFloat(formData.tax_amount || 0).toFixed(2)}`}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                backgroundColor: '#f3f4f6',
                cursor: 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Due Date and Gross Amount */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
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
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#666' }}>
              Gross Amount (₹) (Auto-calculated)
            </label>
            <input
              type="text"
              value={`₹${parseFloat(formData.gross_amount || 0).toFixed(2)}`}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                backgroundColor: '#f3f4f6',
                cursor: 'not-allowed',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: '#333' }}>
            Notes
          </label>
          <textarea
            name="notes"
            placeholder="Additional invoice notes..."
            value={formData.notes}
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

        {/* Summary Card */}
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534' }}>
            <strong>📊 Invoice Summary:</strong> Net ₹{parseFloat(formData.net_amount || 0).toFixed(2)} + Tax ₹{parseFloat(formData.tax_amount || 0).toFixed(2)} = <strong>Total ₹{parseFloat(formData.gross_amount || 0).toFixed(2)}</strong>
          </p>
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
            {loading ? 'Creating Invoice...' : '✓ Create Invoice'}
          </button>
        </div>
      </form>
    </Modal>
  )
}