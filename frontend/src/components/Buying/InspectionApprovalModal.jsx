import { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { X, CheckCircle, XCircle } from 'lucide-react'
import '../../styles/Modal.css'

export default function InspectionApprovalModal({ grn, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [approvalStatus, setApprovalStatus] = useState('approve') // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('')
  const [warehouseAssignments, setWarehouseAssignments] = useState({})
  const [warehouses, setWarehouses] = useState([])

  // Fetch warehouses on mount
  useEffect(() => {
    fetchWarehouses()
    // Initialize warehouse assignments from existing items
    if (grn.items) {
      const assignments = {}
      grn.items.forEach(item => {
        if (item.accepted_qty > 0) {
          assignments[item.id] = item.warehouse_name || 'Main Warehouse'
        }
      })
      setWarehouseAssignments(assignments)
    }
  }, [grn])

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/stock/warehouses')
      const data = await res.json()
      if (data.success) {
        setWarehouses(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const getAcceptedItems = () => {
    return grn.items?.filter(item => item.accepted_qty > 0) || []
  }

  const handleApprove = async (e) => {
    e.preventDefault()

    const acceptedItems = getAcceptedItems()
    if (acceptedItems.length === 0) {
      setError('No items accepted for approval')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const approvedItems = acceptedItems.map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        accepted_qty: item.accepted_qty,
        rejected_qty: item.rejected_qty || 0,
        warehouse: warehouseAssignments[item.id] || item.warehouse_name
      }))

      const response = await axios.post(
        `http://localhost:5000/api/grn-requests/${grn.id}/send-to-inventory`,
        { approvedItems, warehouseAssignments }
      )

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to send to inventory')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error approving GRN')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (e) => {
    e.preventDefault()

    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        `http://localhost:5000/api/grn-requests/${grn.id}/reject`,
        { reason: rejectionReason }
      )

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to reject GRN')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error rejecting GRN')
    } finally {
      setLoading(false)
    }
  }

  const acceptedItems = getAcceptedItems()
  const totalAccepted = acceptedItems.reduce((sum, item) => sum + (item.accepted_qty || 0), 0)
  const totalRejected = grn.items?.reduce((sum, item) => sum + (item.rejected_qty || 0), 0) || 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2>GRN Inspection Approval</h2>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '4px' }}>GRN #{grn.grn_no} - Send to Inventory Department</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}

        <form>
          {/* Approval Type Selection */}
          <div className="mb-6">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '12px' }}>
              Action
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '2px solid' + (approvalStatus === 'approve' ? ' #0284c7' : ' #ddd'),
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: approvalStatus === 'approve' ? '#e0f2fe' : '#fafafa'
              }}>
                <input
                  type="radio"
                  value="approve"
                  checked={approvalStatus === 'approve'}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                />
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '2px' }}>Approve & Send to Inventory</p>
                  <p style={{ fontSize: '0.85rem', color: '#666' }}>Send to inventory department for storage approval</p>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '2px solid' + (approvalStatus === 'reject' ? ' #dc2626' : ' #ddd'),
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: approvalStatus === 'reject' ? '#fee2e2' : '#fafafa'
              }}>
                <input
                  type="radio"
                  value="reject"
                  checked={approvalStatus === 'reject'}
                  onChange={(e) => setApprovalStatus(e.target.value)}
                />
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '2px' }}>Reject GRN</p>
                  <p style={{ fontSize: '0.85rem', color: '#666' }}>Send GRN back to supplier</p>
                </div>
              </label>
            </div>
          </div>

          {approvalStatus === 'approve' ? (
            <>
              {/* Inspection Summary */}
              <Card className="mb-6">
                <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Inspection Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Total Items</p>
                    <p style={{ fontWeight: 600, fontSize: '1.5rem', color: '#16a34a' }}>
                      {grn.items?.length || 0}
                    </p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Accepted Qty</p>
                    <p style={{ fontWeight: 600, fontSize: '1.5rem', color: '#16a34a' }}>
                      {totalAccepted}
                    </p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>Rejected Qty</p>
                    <p style={{ fontWeight: 600, fontSize: '1.5rem', color: '#991b1b' }}>
                      {totalRejected}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Items to be Sent */}
              <Card className="mb-6">
                <h4 style={{ fontWeight: 600, marginBottom: '12px' }}>Items for Inventory Storage</h4>
                {acceptedItems.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead style={{ backgroundColor: '#f5f5f5' }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Item</th>
                          <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Accepted Qty</th>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Store Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptedItems.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '10px' }}>
                              <div>
                                <p style={{ fontWeight: 600 }}>{item.item_code}</p>
                                <p style={{ fontSize: '0.85rem', color: '#666' }}>{item.item_name}</p>
                              </div>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>
                              {item.accepted_qty}
                            </td>
                            <td style={{ padding: '10px' }}>
                              <select
                                value={warehouseAssignments[item.id] || ''}
                                onChange={(e) => setWarehouseAssignments(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#666', padding: '12px' }}>No items accepted for storage</p>
                )}
              </Card>

              {/* Additional Notes */}
              <Card className="mb-6">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                  Approval Notes (Optional)
                </label>
                <textarea
                  placeholder="Add any notes for the inventory team..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'system-ui',
                    fontSize: '0.9rem'
                  }}
                />
              </Card>
            </>
          ) : (
            <>
              {/* Rejection Reason */}
              <Card className="mb-6">
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this GRN is being rejected..."
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

              {/* Rejection Warning */}
              <Card className="mb-6">
                <div style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
                  <XCircle size={20} style={{ color: '#991b1b', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>GRN will be rejected</p>
                    <p style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                      All items will be returned to the supplier. The supplier will be notified of this rejection.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            {approvalStatus === 'approve' ? (
              <Button
                variant="success"
                type="button"
                onClick={handleApprove}
                loading={loading}
                className="flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Send to Inventory Department
              </Button>
            ) : (
              <Button
                variant="danger"
                type="button"
                onClick={handleReject}
                loading={loading}
                className="flex items-center gap-2"
              >
                <XCircle size={16} />
                Reject GRN
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
