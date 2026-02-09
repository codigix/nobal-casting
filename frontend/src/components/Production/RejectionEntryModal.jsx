import React, { useState, useEffect } from 'react'
import { Trash2, CheckCircle2 } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import { useToast } from '../ToastContainer'

export default function RejectionEntryModal({ isOpen, onClose, jobCardId, jobCardData }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [rejectionReasons] = useState([
    'Size/Dimension Error',
    'Surface Finish Poor',
    'Material Defect',
    'Machining Error',
    'Assembly Issue',
    'Quality Check Failed',
    'Damage in Handling',
    'Other'
  ])
  const [rejections, setRejections] = useState([])

  const [formData, setFormData] = useState({
    reason: '',
    rejected_qty: 0,
    scrap_qty: 0,
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchRejections()
    }
  }, [isOpen, jobCardId])

  const fetchRejections = async () => {
    try {
      const response = await productionService.getRejections({ job_card_id: jobCardId })
      setRejections(response.data || [])
    } catch (err) {
      console.error('Failed to fetch rejections:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'rejected_qty' || name === 'scrap_qty') ? parseFloat(value) || 0 : value
    }))
  }

  const handleAddRejection = async (e) => {
    e.preventDefault()
    
    if (!formData.reason || (formData.rejected_qty <= 0 && formData.scrap_qty <= 0)) {
      toast.addToast('Please select a reason and enter quantity', 'error')
      return
    }

    try {
      setLoading(true)
      const payload = {
        job_card_id: jobCardId,
        rejection_reason: formData.reason,
        rejected_qty: formData.rejected_qty,
        scrap_qty: formData.scrap_qty,
        notes: formData.notes
      }

      await productionService.createRejection(payload)
      toast.addToast('Rejection entry recorded', 'success')
      
      setFormData({
        reason: '',
        rejected_qty: 0,
        scrap_qty: 0,
        notes: ''
      })
      
      fetchRejections()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add rejection', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRejection = async (rejectionId) => {
    if (!window.confirm('Delete this rejection entry?')) return
    try {
      await productionService.deleteRejection(rejectionId)
      toast.addToast('Rejection entry deleted', 'success')
      fetchRejections()
    } catch (err) {
      toast.addToast('Failed to delete rejection', 'error')
    }
  }

  const handleApproveRejection = async (rejectionId) => {
    try {
      setLoading(true)
      await productionService.approveRejection(rejectionId)
      toast.addToast('Quality inspection approved', 'success')
      fetchRejections()
    } catch (err) {
      toast.addToast('Failed to approve inspection', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalRejectedQty = rejections.reduce((sum, r) => sum + (r.rejected_qty || 0), 0)
  const totalScrapQty = rejections.reduce((sum, r) => sum + (r.scrap_qty || 0), 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rejection Entry" size="lg">
      <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
        {jobCardData && (
          <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
            <strong>Job Card:</strong> {jobCardData.job_card_id} | <strong>Item:</strong> {jobCardData.item_name} | <strong>Qty:</strong> {jobCardData.planned_quantity}
          </div>
        )}

        <form onSubmit={handleAddRejection} style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1rem' }}>Record Rejection</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Reason *</label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              >
                <option value="">Select reason</option>
                {rejectionReasons.map((reason, idx) => (
                  <option key={idx} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Rejected Qty</label>
              <input
                type="number"
                name="rejected_qty"
                value={formData.rejected_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Scrap Qty</label>
              <input
                type="number"
                name="scrap_qty"
                value={formData.scrap_qty}
                onChange={handleChange}
                step="0.01"
                min="0"
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '5px' }}>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px', fontFamily: 'monospace' }}
              placeholder="Additional details about the rejection..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
          >
            {loading ? 'Recording...' : 'Record Rejection'}
          </button>
        </form>

        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', gap: '20px' }}>
          <div><strong>Total Rejected:</strong> {totalRejectedQty.toFixed(2)} units</div>
          <div><strong>Total Scrap:</strong> {totalScrapQty.toFixed(2)} units</div>
        </div>

        <h3 style={{ marginBottom: '15px', fontSize: '1rem' }}>Rejection History ({rejections.length})</h3>
        
        {rejections.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Reason</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Rej Qty</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Scrap Qty</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Notes</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rejections.map(rejection => (
                  <tr key={rejection.rejection_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px' }}>
                      {rejection.status === 'Approved' ? (
                        <span style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>APPROVED</span>
                      ) : (
                        <span style={{ color: '#d97706', backgroundColor: '#fffbeb', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>PENDING</span>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>{rejection.rejection_reason}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>{rejection.rejected_qty}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#f97316' }}>{rejection.scrap_qty || 0}</td>
                    <td style={{ padding: '10px', fontSize: '0.85rem' }}>{rejection.notes || '-'}</td>
                    <td style={{ padding: '10px', fontSize: '0.85rem' }}>{rejection.created_at ? new Date(rejection.created_at).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        {rejection.status !== 'Approved' && (
                          <button
                            onClick={() => handleApproveRejection(rejection.rejection_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteRejection(rejection.rejection_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            No rejections recorded
          </div>
        )}
      </div>
    </Modal>
  )
}
