import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { X } from 'lucide-react'
import '../Modal.css'

export default function CreateGRNRequestModal({ purchaseReceipt, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState([])

  useEffect(() => {
    if (purchaseReceipt && purchaseReceipt.items) {
      setSelectedItems(purchaseReceipt.items.map(item => ({
        ...item,
        received_qty: item.received_qty || item.qty || 0
      })))
    }
  }, [purchaseReceipt])

  const handleCreateGRN = async (e) => {
    e.preventDefault()
    
    if (selectedItems.length === 0) {
      setError('Please select at least one item')
      return
    }

    setLoading(true)
    try {
      const grnData = {
        grn_no: purchaseReceipt.grn_no,
        po_no: purchaseReceipt.po_no,
        supplier_id: purchaseReceipt.supplier_id,
        supplier_name: purchaseReceipt.supplier_name,
        receipt_date: purchaseReceipt.receipt_date,
        items: selectedItems.map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          po_qty: item.po_qty || item.qty,
          received_qty: item.received_qty,
          batch_no: item.batch_no,
          warehouse_name: item.warehouse_name
        })),
        notes
      }

      const response = await axios.post('/api/grn-requests', grnData)
      
      if (response.data.success) {
        setError(null)
        onSuccess && onSuccess(response.data.data)
      } else {
        setError(response.data.error || 'Failed to create GRN request')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create GRN request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>Create GRN Request</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleCreateGRN}>
          <div className="form-group">
            <label><strong>GRN Number:</strong> {purchaseReceipt?.grn_no}</label>
          </div>

          <div className="form-group">
            <label><strong>PO Number:</strong> {purchaseReceipt?.po_no}</label>
          </div>

          <div className="form-group">
            <label><strong>Supplier:</strong> {purchaseReceipt?.supplier_name}</label>
          </div>

          <div className="form-group">
            <label><strong>Receipt Date:</strong> {purchaseReceipt?.receipt_date ? new Date(purchaseReceipt.receipt_date).toLocaleDateString() : '-'}</label>
          </div>

          <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Items to Send for Inspection</h4>
          
          {selectedItems.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item Code</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item Name</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{item.item_code}</td>
                    <td style={{ padding: '8px' }}>{item.item_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{item.received_qty}</td>
                    <td style={{ padding: '8px' }}>{item.warehouse_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for the inspection team..."
              style={{ minHeight: '80px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" loading={loading}>Create GRN Request</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
