import { useState } from 'react'
import { grnRequestsAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  X, 
  AlertCircle, 
  CheckCircle, 
  ShieldCheck, 
  ClipboardCheck, 
  Package, 
  FileText, 
  Warehouse,
  Info,
  History,
  CheckCircle2,
  Trash2,
  RefreshCw
} from 'lucide-react'

export default function ItemInspectionModal({ item, grnId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
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

      const response = await grnRequestsAPI.inspectItem(grnId, payload)

      if (response.data.success) {
        onSuccess && onSuccess()
        onClose && onClose()
      } else {
        setError(response.data.error || 'Failed to save inspection')
      }
    } catch (err) {
      console.error('Inspection error:', err)
      setError(err.response?.data?.error || err.message || 'Error saving inspection')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = (e) => {
    e.preventDefault()
    if (acceptedQty <= 0) {
      setError('Please enter accepted quantity')
      return
    }
    if (!allChecksPassed) {
      setError('All QC checks must pass to accept the item')
      return
    }
    submitInspection('accepted')
  }

  const handlePartialAccept = (e) => {
    e.preventDefault()
    if (acceptedQty + rejectedQty !== item.received_qty) {
      setError(`Accepted (${acceptedQty}) + Rejected (${rejectedQty}) must equal Received (${item.received_qty})`)
      return
    }
    submitInspection('partially_accepted')
  }

  const handleReject = (e) => {
    e.preventDefault()
    if (!notes.trim()) {
      setError('Please provide reason for rejection')
      return
    }
    submitInspection('rejected')
  }

  const qcItems = [
    { key: 'visual_inspection', label: 'Visual Inspection', description: 'Item checked for visual defects' },
    { key: 'quantity_check', label: 'Quantity Check', description: `Quantity matches: PO ${item.po_qty} vs Received ${item.received_qty}` },
    { key: 'packaging_condition', label: 'Packaging Condition', description: 'Packaging is in good condition' },
    { key: 'documentation', label: 'Documentation', description: 'All documents complete and match' }
  ]

  const footer = (
    <div className="flex gap-3 w-full justify-end">
      <Button variant="secondary" onClick={onClose} disabled={loading}>
        Cancel
      </Button>

      {acceptedQty > 0 && rejectedQty > 0 && (
        <Button
          variant="warning"
          onClick={handlePartialAccept}
          loading={loading}
          className="flex items-center gap-2"
        >
          <History size={16} />
          Partially Accept
        </Button>
      )}

      {acceptedQty > 0 && rejectedQty === 0 && (
        <Button
          variant="success"
          onClick={handleAccept}
          loading={loading}
          disabled={!allChecksPassed}
          className="flex items-center gap-2"
        >
          <CheckCircle2 size={16} />
          Accept All
        </Button>
      )}

      {rejectedQty > 0 && acceptedQty === 0 && (
        <Button
          variant="danger"
          onClick={handleReject}
          loading={loading}
          className="flex items-center gap-2"
        >
          <Trash2 size={16} />
          Reject Item
        </Button>
      )}
    </div>
  )

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Inspect Item: ${item.item_code}`}
      size="3xl"
      footer={footer}
    >
      <div className="space-y-6">
        {error && <Alert type="danger">{error}</Alert>}

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Package size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">PO Qty</span>
            </div>
            <div className="text-xl font-bold text-blue-700">{item.po_qty}</div>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <ClipboardCheck size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Received</span>
            </div>
            <div className="text-xl font-bold text-orange-700">{item.received_qty}</div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-100">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Accepted</span>
            </div>
            <div className="text-xl font-bold text-green-700">{acceptedQty}</div>
          </div>

          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertCircle size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
            </div>
            <div className="text-xl font-bold text-red-700">{rejectedQty}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Details & QC */}
          <div className="space-y-6">
            <section className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <h4 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                <Info size={16} className="text-neutral-500" />
                Item Information
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500">Item Name</span>
                  <span className="text-sm font-medium text-neutral-900">{item.item_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500">Batch Number</span>
                  <Badge variant="secondary">{item.batch_no || 'No Batch'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500">Warehouse</span>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Warehouse size={14} className="text-neutral-400" />
                    {item.warehouse_name}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                  <span className="text-xs text-neutral-500">Variance</span>
                  <span className={`text-sm font-bold ${item.received_qty - item.po_qty >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.received_qty - item.po_qty > 0 ? '+' : ''}{item.received_qty - item.po_qty}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-white p-4 rounded-xl border border-neutral-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-500" />
                  Quality Assurance
                </h4>
                <Badge variant={allChecksPassed ? 'success' : 'warning'}>
                  {totalChecked}/4 Passed
                </Badge>
              </div>
              <div className="space-y-2">
                {qcItems.map((qc) => (
                  <label 
                    key={qc.key} 
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      qcChecksPassed[qc.key] 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={qcChecksPassed[qc.key]}
                        onChange={() => handleQCCheck(qc.key)}
                        className="w-4 h-4 text-green-600 border-neutral-300 rounded focus:ring-green-500"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{qc.label}</p>
                      <p className="text-xs text-neutral-500">{qc.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Quantities & Notes */}
          <div className="space-y-6">
            <section className="bg-white p-4 rounded-xl border border-neutral-200">
              <h4 className="text-sm font-bold text-neutral-800 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-neutral-500" />
                Quantity Breakdown
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">
                    Accepted Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.received_qty}
                    value={acceptedQty}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0)
                      const max = item.received_qty || 0
                      const finalVal = Math.min(val, max)
                      setAcceptedQty(finalVal)
                      setRejectedQty(max - finalVal)
                    }}
                    className="w-full px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-900 font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">
                    Rejected Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.received_qty}
                    value={rejectedQty}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0)
                      const max = item.received_qty || 0
                      const finalVal = Math.min(val, max)
                      setRejectedQty(finalVal)
                      setAcceptedQty(max - finalVal)
                    }}
                    className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-900 font-bold focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                
                <div className={`mt-4 p-3 rounded-lg border flex items-center justify-between ${
                  acceptedQty + rejectedQty === item.received_qty 
                    ? 'bg-neutral-50 border-neutral-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <span className="text-sm font-medium text-neutral-600">Total Accounted</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-neutral-900">{acceptedQty + rejectedQty}</span>
                    {acceptedQty + rejectedQty === item.received_qty ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                    ) : (
                      <AlertCircle size={18} className="text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <label className="block text-sm font-bold text-neutral-800 mb-2">
                Inspection Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any defects, discrepancies, or observations..."
                rows={4}
                className="w-full p-3 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              />
            </section>
          </div>
        </div>
      </div>
    </Modal>
  )
}
