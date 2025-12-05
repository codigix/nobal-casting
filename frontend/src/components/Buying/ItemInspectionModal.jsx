import { useState } from 'react'
import axios from 'axios'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { X, AlertCircle, CheckCircle } from 'lucide-react'
import '../../styles/Modal.css'

export default function ItemInspectionModal({ item, grnId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(item.item_status || 'pending')
  const [acceptedQty, setAcceptedQty] = useState(item.received_qty || 0)
  const [rejectedQty, setRejectedQty] = useState(0)
  const [notes, setNotes] = useState(item.notes || '')
  const [qcChecksPassed, setQcChecksPassed] = useState({
    visual_inspection: false,
    quantity_check: false,
    packaging_condition: false,
    documentation: false
  })

  const handleQCCheck = (key) => {
    setQcChecksPassed(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const totalChecked = Object.values(qcChecksPassed).filter(Boolean).length
  const allChecksPassed = totalChecked === 4

  const handleAccept = async (e) => {
    e.preventDefault()
    
    if (acceptedQty <= 0) {
      setError('Please enter accepted quantity')
      return
    }

    if (!allChecksPassed) {
      setError('All QC checks must pass to accept the item')
      return
    }

    await submitInspection('accepted')
  }

  const handlePartialAccept = async (e) => {
    e.preventDefault()

    if (acceptedQty + rejectedQty !== item.received_qty) {
      setError(`Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal Received (${item.received_qty})`)
      return
    }

    await submitInspection('partially_accepted')
  }

  const handleReject = async (e) => {
    e.preventDefault()

    if (!notes.trim()) {
      setError('Please provide reason for rejection')
      return
    }

    await submitInspection('rejected')
  }

  const submitInspection = async (inspectionStatus) => {
    setLoading(true)
    setError(null)

    try {
      const payload = {
        itemId: item.id,
        status: inspectionStatus,
        notes,
        accepted_qty: inspectionStatus !== 'rejected' ? acceptedQty : 0,
        rejected_qty: inspectionStatus !== 'rejected' ? rejectedQty : item.received_qty,
        qc_checks: qcChecksPassed
      }

      const response = await axios.post(
        `http://localhost:5000/api/grn-requests/${grnId}/items/inspect`,
        payload
      )

      if (response.data.success) {
        onSuccess && onSuccess()
        onClose && onClose()
      } else {
        setError(response.data.error || 'Failed to save inspection')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving inspection')
    } finally {
      setLoading(false)
    }
  }

  const qcItems = [
    { key: 'visual_inspection', label: 'Visual Inspection', description: 'Item checked for visual defects' },
    { key: 'quantity_check', label: 'Quantity Check', description: `Quantity matches: PO ${item.po_qty} vs Received ${item.received_qty}` },
    { key: 'packaging_condition', label: 'Packaging Condition', description: 'Packaging is in good condition' },
    { key: 'documentation', label: 'Documentation', description: 'All documents complete and match' }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>Inspect Item: {item.item_code}</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '4px' }}>{item.item_name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}

        <form>
          {/* Item Details */}
          <Card className="mb-6">
            <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Item Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Item Code</p>
                <p style={{ fontWeight: 600 }}>{item.item_code}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Batch Number</p>
                <p style={{ fontWeight: 600 }}>{item.batch_no || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>PO Quantity</p>
                <p style={{ fontWeight: 600, color: '#0284c7' }}>{item.po_qty}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Received Quantity</p>
                <p style={{ fontWeight: 600, color: '#ea580c' }}>{item.received_qty}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Warehouse</p>
                <p style={{ fontWeight: 600 }}>{item.warehouse_name}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Quantity Variance</p>
                <p style={{
                  fontWeight: 600,
                  color: item.po_qty === item.received_qty ? '#16a34a' : '#dc2626'
                }}>
                  {item.received_qty - item.po_qty > 0 ? '+' : ''}{item.received_qty - item.po_qty}
                </p>
              </div>
            </div>
          </Card>

          {/* QC Checks */}
          <Card className="mb-6">
            <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Quality Checks</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
              {qcItems.map((qc) => (
                <label key={qc.key} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  backgroundColor: qcChecksPassed[qc.key] ? '#f0fdf4' : '#fafafa'
                }}>
                  <input
                    type="checkbox"
                    checked={qcChecksPassed[qc.key]}
                    onChange={() => handleQCCheck(qc.key)}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '2px' }}>{qc.label}</p>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>{qc.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#e0f2fe', borderRadius: '4px', fontSize: '0.9rem' }}>
              QC Checks: {totalChecked}/4 passed
            </div>
          </Card>

          {/* Quantity Breakdown */}
          <Card className="mb-6">
            <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Quantity Breakdown</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                  Accepted Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  max={item.received_qty}
                  value={acceptedQty}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setAcceptedQty(Math.min(val, item.received_qty))
                    if (val + rejectedQty > item.received_qty) {
                      setRejectedQty(item.received_qty - val)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#f0fdf4'
                  }}
                />
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Max: {item.received_qty}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                  Rejected Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  max={item.received_qty}
                  value={rejectedQty}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    setRejectedQty(Math.min(val, item.received_qty))
                    if (acceptedQty + val > item.received_qty) {
                      setAcceptedQty(item.received_qty - val)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fee2e2'
                  }}
                />
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>Max: {item.received_qty}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                  Total
                </label>
                <div style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600
                }}>
                  {acceptedQty + rejectedQty}
                </div>
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  {acceptedQty + rejectedQty === item.received_qty ? '✓ Balanced' : '✗ Unbalanced'}
                </p>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card className="mb-6">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
              Inspection Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any defects, discrepancies, or observations..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'system-ui',
                fontSize: '0.9rem'
              }}
            />
          </Card>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            {acceptedQty > 0 && rejectedQty > 0 && (
              <Button
                variant="warning"
                type="button"
                onClick={handlePartialAccept}
                loading={loading}
                className="flex items-center gap-2"
              >
                <AlertCircle size={16} />
                Partially Accept
              </Button>
            )}

            {acceptedQty > 0 && rejectedQty === 0 && (
              <Button
                variant="success"
                type="button"
                onClick={handleAccept}
                loading={loading}
                disabled={!allChecksPassed}
                className="flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Accept All
              </Button>
            )}

            {rejectedQty > 0 && acceptedQty === 0 && (
              <Button
                variant="danger"
                type="button"
                onClick={handleReject}
                loading={loading}
                className="flex items-center gap-2"
              >
                Reject Item
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div style={{
      padding: '16px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      backgroundColor: '#fafafa'
    }} className={className}>
      {children}
    </div>
  )
}
