import { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { CheckCircle, XCircle, Info, MapPin, ClipboardCheck, ArrowRightLeft, FileText } from 'lucide-react'
import { grnRequestsAPI, stockAPI } from '../../services/api'

export default function InspectionApprovalModal({ grn, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [approvalStatus, setApprovalStatus] = useState('approve') // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('')
  const [warehouseAssignments, setWarehouseAssignments] = useState({})
  const [warehouses, setWarehouses] = useState([])

  useEffect(() => {
    fetchWarehouses()
    if (grn?.items) {
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
      const response = await stockAPI.warehouses()
      setWarehouses(response.data.data || [])
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const getAcceptedItems = () => {
    return grn.items?.filter(item => item.accepted_qty > 0) || []
  }

  const handleApprove = async () => {
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

      const response = await grnRequestsAPI.sendToInventory(grn.id, { 
        approvedItems, 
        warehouseAssignments 
      })

      if (response.data.success) {
        onSuccess?.(response.data.data)
        onClose()
      } else {
        setError(response.data.error || 'Failed to send to inventory')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error approving GRN')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await grnRequestsAPI.reject(grn.id, { 
        reason: rejectionReason 
      })

      if (response.data.success) {
        onSuccess?.(response.data.data)
        onClose()
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="GRN Inspection Approval"
      size="4xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {approvalStatus === 'approve' ? (
            <Button 
              variant="success" 
              onClick={handleApprove} 
              loading={loading}
              disabled={acceptedItems.length === 0}
            >
              <CheckCircle size={16} className="mr-2" />
              Approve & Store Stock
            </Button>
          ) : (
            <Button 
              variant="danger" 
              onClick={handleReject} 
              loading={loading}
              disabled={!rejectionReason.trim()}
            >
              <XCircle size={16} className="mr-2" />
              Confirm Rejection
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-800">Final Verification</h3>
            <p className="text-sm text-neutral-500">
              GRN <span className="font-mono text-primary-600">#{grn.grn_no}</span> • Please confirm the inspection outcome and assign storage locations.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="danger">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        {/* Action Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setApprovalStatus('approve')}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              approvalStatus === 'approve' 
              ? 'border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-50' 
              : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <div className={`p-2 rounded-lg ${approvalStatus === 'approve' ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className={`font-bold ${approvalStatus === 'approve' ? 'text-emerald-900' : 'text-neutral-900'}`}>Approve & Store</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">Allocate accepted items to warehouses and update stock.</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${approvalStatus === 'approve' ? 'border-emerald-500 bg-emerald-500' : 'border-neutral-300'}`}>
              {approvalStatus === 'approve' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setApprovalStatus('reject')}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              approvalStatus === 'reject' 
              ? 'border-red-500 bg-red-50/50 ring-4 ring-red-50' 
              : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <div className={`p-2 rounded-lg ${approvalStatus === 'reject' ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
              <XCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className={`font-bold ${approvalStatus === 'reject' ? 'text-red-900' : 'text-neutral-900'}`}>Full Rejection</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">Mark the entire GRN as rejected and return items to supplier.</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${approvalStatus === 'reject' ? 'border-red-500 bg-red-500' : 'border-neutral-300'}`}>
              {approvalStatus === 'reject' && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        {approvalStatus === 'approve' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-neutral-200 p-4 rounded-xl flex items-center gap-4">
                <div className="p-2.5 bg-neutral-100 rounded-lg text-neutral-600">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Items</p>
                  <p className="text-xl font-bold text-neutral-800">{grn.items?.length || 0}</p>
                </div>
              </div>
              
              <div className="bg-white border border-emerald-100 p-4 rounded-xl flex items-center gap-4 shadow-sm shadow-emerald-50">
                <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Accepted Qty</p>
                  <p className="text-xl font-bold text-emerald-700">{totalAccepted}</p>
                </div>
              </div>

              <div className="bg-white border border-red-100 p-4 rounded-xl flex items-center gap-4 shadow-sm shadow-red-50">
                <div className="p-2.5 bg-red-50 rounded-lg text-red-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Rejected Qty</p>
                  <p className="text-xl font-bold text-red-700">{totalRejected}</p>
                </div>
              </div>
            </div>

            {/* Allocation Table */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="p-2  bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="font-semibold text-neutral-800 flex items-center gap-2">
                  <MapPin size={16} className="text-primary-600" />
                  Warehouse Allocation
                </h3>
                <Badge variant="primary">{acceptedItems.length} Items to Assign</Badge>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200">
                    <tr>
                      <th className="p-2  font-semibold">Item Details</th>
                      <th className="p-2  font-semibold text-center w-32">Accepted Qty</th>
                      <th className="p-2  font-semibold w-56 text-right">Target Warehouse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {acceptedItems.length > 0 ? (
                      acceptedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="p-2 ">
                            <div className="font-medium text-neutral-900">{item.item_code}</div>
                            <div className="text-[10px] text-neutral-500 uppercase truncate max-w-[200px]">{item.item_name}</div>
                          </td>
                          <td className="p-2  text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              {item.accepted_qty}
                            </span>
                          </td>
                          <td className="p-2 ">
                            <div className="flex justify-end">
                              <select
                                value={warehouseAssignments[item.id] || ''}
                                onChange={(e) => setWarehouseAssignments(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                className="w-full max-w-[200px] h-9 px-3 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 outline-none"
                              >
                                <option value="">Select Warehouse</option>
                                {warehouses.map(wh => (
                                  <option key={wh.id} value={wh.warehouse_name}>
                                    {wh.warehouse_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-12 text-center text-neutral-400 italic">
                          No items accepted for storage.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <FileText size={16} className="text-red-500" />
                Reason for Rejection *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain the reason for rejecting this entire GRN..."
                className="w-full min-h-[120px] p-4 bg-white border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>

            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 items-start">
              <Info size={18} className="text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-bold">Full Rejection Protocol</p>
                <p className="mt-1 opacity-90">This will mark all items in this GRN as rejected. The status will be updated, and the procurement team will be notified to handle returns.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
