import { useState } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { CheckCircle, AlertCircle, XCircle, ClipboardCheck } from 'lucide-react'

export default function QCApprovalModal({ grn, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sendBackReason, setSendBackReason] = useState('')
  const [showSendBackForm, setShowSendBackForm] = useState(false)

  const getQCStatusColor = (qcChecks) => {
    if (!qcChecks) return 'warning'
    const checks = typeof qcChecks === 'string' ? JSON.parse(qcChecks) : qcChecks
    const passedCount = Object.values(checks).filter(Boolean).length
    return passedCount === 4 ? 'success' : passedCount >= 2 ? 'warning' : 'danger'
  }

  const getQCStatusText = (qcChecks) => {
    if (!qcChecks) return 'Not Checked'
    const checks = typeof qcChecks === 'string' ? JSON.parse(qcChecks) : qcChecks
    const passedCount = Object.values(checks).filter(Boolean).length
    return `${passedCount}/4 Passed`
  }

  const getQCStatusIcon = (qcChecks) => {
    if (!qcChecks) return <AlertCircle size={16} />
    const checks = typeof qcChecks === 'string' ? JSON.parse(qcChecks) : qcChecks
    const passedCount = Object.values(checks).filter(Boolean).length
    if (passedCount === 4) return <CheckCircle size={16} />
    if (passedCount >= 2) return <AlertCircle size={16} />
    return <XCircle size={16} />
  }

  const acceptedItems = grn.items?.filter(item => item.item_status === 'accepted' || item.item_status === 'partially_accepted') || []
  const rejectedItems = grn.items?.filter(item => item.item_status === 'rejected') || []
  const totalAccepted = acceptedItems.reduce((sum, item) => sum + (item.accepted_qty || 0), 0)
  const totalRejected = rejectedItems.reduce((sum, item) => sum + (item.rejected_qty || 0), 0)
  const itemsWithQCPass = acceptedItems.filter(item => {
    const checks = typeof item.qc_checks === 'string' ? JSON.parse(item.qc_checks) : item.qc_checks
    if (!checks) return false
    const passedCount = Object.values(checks).filter(Boolean).length
    return passedCount === 4
  })

  const canApprove = itemsWithQCPass.length === acceptedItems.length && acceptedItems.length > 0

  const handleApproveQC = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/grn-requests/${grn.id}/qc-approve`
      )

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to approve QC')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error approving QC')
    } finally {
      setLoading(false)
    }
  }

  const handleSendBack = async () => {
    if (!sendBackReason.trim()) {
      setError('Please provide reason for sending back')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/grn-requests/${grn.id}/send-back`,
        { reason: sendBackReason }
      )

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to send back GRN')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error sending back GRN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Quality Control Approval"
      size="2xl"
      footer={
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!showSendBackForm && (
            <>
              <Button
                variant="danger"
                onClick={() => setShowSendBackForm(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <XCircle size={16} />
                Send Back
              </Button>
              <Button
                variant="success"
                onClick={handleApproveQC}
                loading={loading}
                disabled={!canApprove}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle size={16} />
                Approve for Inventory
              </Button>
            </>
          )}
          {showSendBackForm && (
            <>
              <Button variant="secondary" onClick={() => setShowSendBackForm(false)}>
                Keep Reviewing
              </Button>
              <Button
                variant="danger"
                onClick={handleSendBack}
                loading={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Confirm Send Back
              </Button>
            </>
          )}
        </div>
      }
    >
      {error && <Alert type="danger" className="mb-4">{error}</Alert>}

      {showSendBackForm ? (
        <div style={{ padding: '16px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#991b1b' }}>Send Back for Revision</h3>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '8px' }}>
            Reason for Sending Back
          </label>
          <textarea
            value={sendBackReason}
            onChange={(e) => setSendBackReason(e.target.value)}
            placeholder="Provide reason why this GRN needs to be revised (e.g., failed QC checks, quality issues, incorrect quantities, etc.)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '10px',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontFamily: 'system-ui',
              fontSize: '0.9rem'
            }}
          />
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
            GRN will return to pending status for revision and re-inspection.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>Total Items</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#16a34a' }}>{grn.items?.length || 0}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>Accepted</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#16a34a' }}>{acceptedItems.length}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>Rejected</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#991b1b' }}>{rejectedItems.length}</p>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>QC Pass</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#0284c7' }}>{itemsWithQCPass.length}/{acceptedItems.length}</p>
            </div>
          </div>

          {/* Status Alert */}
          {!canApprove && acceptedItems.length > 0 && (
            <Alert type="warning" className="mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>Not all accepted items passed QC checks. Review failed items below.</span>
              </div>
            </Alert>
          )}

          {rejectedItems.length > 0 && (
            <Alert type="danger" className="mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} />
                <span>{rejectedItems.length} item(s) were rejected during inspection.</span>
              </div>
            </Alert>
          )}

          {canApprove && (
            <Alert type="success" className="mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} />
                <span>All items passed QC checks. Ready for inventory approval.</span>
              </div>
            </Alert>
          )}

          {/* Accepted Items with QC Status */}
          {acceptedItems.length > 0 && (
            <div style={{
              backgroundColor: '#fafafa',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '0.95rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck size={16} />
                Inspected Items ({acceptedItems.length})
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Item Code</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Received</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Accepted</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>QC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptedItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#1f2937' }}>{item.item_code}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{item.received_qty}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{item.accepted_qty}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: getQCStatusColor(item.qc_checks) === 'success' ? '#d1fae5' : getQCStatusColor(item.qc_checks) === 'warning' ? '#fef3c7' : '#fee2e2',
                            color: getQCStatusColor(item.qc_checks) === 'success' ? '#065f46' : getQCStatusColor(item.qc_checks) === 'warning' ? '#92400e' : '#991b1b'
                          }}>
                            {getQCStatusIcon(item.qc_checks)}
                            {getQCStatusText(item.qc_checks)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rejected Items */}
          {rejectedItems.length > 0 && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '0.95rem', color: '#991b1b' }}>Rejected Items ({rejectedItems.length})</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fee2e2' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #fecaca', fontSize: '0.85rem', fontWeight: 600 }}>Item Code</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #fecaca', fontSize: '0.85rem', fontWeight: 600 }}>Received</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #fecaca', fontSize: '0.85rem', fontWeight: 600 }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #fecaca' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#991b1b' }}>{item.item_code}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{item.received_qty}</td>
                        <td style={{ padding: '10px', color: '#666', fontSize: '0.85rem' }}>{item.notes || 'No reason provided'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval Confirmation */}
          {canApprove && (
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#e0f2fe',
              borderRadius: '6px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle size={20} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ margin: 0, marginBottom: '4px', fontWeight: 600, color: '#0284c7' }}>Ready for Inventory Approval</p>
                <p style={{ fontSize: '0.85rem', color: '#0c4a6e', margin: 0 }}>
                  {acceptedItems.length} item(s) passed all QC checks. Once approved, items will be sent to inventory for storage.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
