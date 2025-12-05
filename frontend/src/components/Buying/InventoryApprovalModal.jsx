import { useState } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function InventoryApprovalModal({ grn, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleApprove = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/grn-requests/${grn.id}/inventory-approve`
      )

      if (response.data.success) {
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to approve GRN')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error approving GRN')
    } finally {
      setLoading(false)
    }
  }

  const acceptedItems = grn.items?.filter(item => item.accepted_qty > 0) || []
  const totalAccepted = acceptedItems.reduce((sum, item) => sum + (item.accepted_qty || 0), 0)
  const totalRejected = grn.items?.reduce((sum, item) => sum + (item.rejected_qty || 0), 0) || 0

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="📦 Inventory Storage Approval" 
      size="2xl"
      footer={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="success"
            onClick={handleApprove}
            loading={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <CheckCircle size={16} />
            Approve & Store in Inventory
          </Button>
        </div>
      }
    >
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* GRN Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>PO Number</p>
          <p style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.95rem' }}>{grn.po_no}</p>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>Supplier</p>
          <p style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.95rem' }}>{grn.supplier_name}</p>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>Accepted Qty</p>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#16a34a' }}>{totalAccepted}</p>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
          <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', fontWeight: 500 }}>Rejected Qty</p>
          <p style={{ fontWeight: 600, fontSize: '1.1rem', color: '#991b1b' }}>{totalRejected}</p>
        </div>
      </div>

      {/* Items to be Stored */}
      <div style={{
        backgroundColor: '#fafafa',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>Items for Storage</h4>
        {acceptedItems.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ backgroundColor: '#f5f5f5' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Item Code</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Item Name</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Accepted</th>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Warehouse</th>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontSize: '0.85rem', fontWeight: 600 }}>Batch No</th>
                </tr>
              </thead>
              <tbody>
                {acceptedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 600, color: '#1f2937' }}>{item.item_code}</td>
                    <td style={{ padding: '10px', fontSize: '0.85rem', color: '#666' }}>{item.item_name}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>
                      {item.accepted_qty}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                        {item.warehouse_name}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>{item.batch_no || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#666', padding: '12px', margin: 0 }}>No items accepted for storage</p>
        )}
      </div>

      {/* Approval Confirmation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#e0f2fe',
        borderRadius: '6px',
        alignItems: 'flex-start',
        marginBottom: '20px'
      }}>
        <CheckCircle size={20} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <p style={{ margin: 0, marginBottom: '4px', fontWeight: 600, color: '#0284c7' }}>Ready to Store in Warehouse</p>
          <p style={{ fontSize: '0.85rem', color: '#0c4a6e', margin: 0 }}>
            {acceptedItems.length} item{acceptedItems.length !== 1 ? 's' : ''} will be stored in assigned warehouse{acceptedItems.length !== 1 ? 's' : ''} and stock entries will be created automatically.
          </p>
        </div>
      </div>
    </Modal>
  )
}
