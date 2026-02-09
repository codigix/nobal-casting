import { useState } from 'react'
import { grnRequestsAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  ClipboardCheck, 
  Info, 
  ArrowLeft, 
  ShieldCheck, 
  X,
  History,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

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
    if (!qcChecks) return <AlertCircle className="w-4 h-4" />
    const checks = typeof qcChecks === 'string' ? JSON.parse(qcChecks) : qcChecks
    const passedCount = Object.values(checks).filter(Boolean).length
    if (passedCount === 4) return <ShieldCheck className="w-4 h-4" />
    if (passedCount >= 2) return <AlertTriangle className="w-4 h-4" />
    return <XCircle className="w-4 h-4" />
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
      const response = await grnRequestsAPI.qcApprove(grn.id)

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
      const response = await grnRequestsAPI.sendBack(grn.id, { reason: sendBackReason })

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
      title=""
      size="2xl"
      footer={
        <div className="flex gap-3 justify-end w-full px-4 py-2 bg-white border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="font-bold px-6">
            Cancel
          </Button>
          {!showSendBackForm && (
            <div className="flex gap-3">
              <Button
                variant="danger"
                onClick={() => setShowSendBackForm(true)}
                className="flex items-center gap-2 px-6 font-bold shadow-lg shadow-rose-100"
              >
                <History className="w-4 h-4" />
                Send Back for Revision
              </Button>
              <Button
                variant="success"
                onClick={handleApproveQC}
                loading={loading}
                disabled={!canApprove}
                className="flex items-center gap-2 px-8 font-bold shadow-lg shadow-emerald-100"
              >
                <ShieldCheck className="w-4 h-4" />
                Final QC Approval
              </Button>
            </div>
          )}
          {showSendBackForm && (
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowSendBackForm(false)} className="font-bold text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Review
              </Button>
              <Button
                variant="danger"
                onClick={handleSendBack}
                loading={loading}
                className="flex items-center gap-2 px-8 font-bold shadow-lg shadow-rose-100"
              >
                Confirm Send Back
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-col h-full bg-white">
        {/* Modern Header Section */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-20 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 leading-tight">Quality Control Approval</h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5 flex items-center gap-2">
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />
                GRN <span className="text-indigo-600 font-bold">#{grn.grn_no}</span> • Final verification before storage
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <Alert type="danger" icon={<AlertCircle className="w-5 h-5" />}>{error}</Alert>
            </div>
          )}

          {showSendBackForm ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 text-rose-800">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black">Revision Required</h3>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Returning GRN to inspection phase</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-rose-900 uppercase tracking-widest px-1">
                    Reason for Rejection <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={sendBackReason}
                    onChange={(e) => setSendBackReason(e.target.value)}
                    placeholder="Clearly explain the QC failures or required revisions..."
                    className="w-full min-h-[120px] p-4 bg-white border border-rose-200 rounded-xl text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all resize-none shadow-inner"
                  />
                </div>
                
                <p className="text-xs text-rose-600 font-medium bg-white/50 p-3 rounded-lg flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  This action will notify the inspection team and move this record back to the "Inspection Pending" status for corrective actions.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Items</p>
                  <p className="text-xl font-black text-emerald-900">{grn.items?.length || 0}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Accepted</p>
                  <p className="text-xl font-black text-emerald-900">{acceptedItems.length}</p>
                </div>
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Rejected</p>
                  <p className="text-xl font-black text-rose-900">{rejectedItems.length}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">QC Pass Rate</p>
                  <div className="flex items-end gap-1.5">
                    <p className="text-xl font-black text-indigo-900">{itemsWithQCPass.length}/{acceptedItems.length}</p>
                    <p className="text-[10px] font-bold text-indigo-500 mb-1 leading-none uppercase">Items</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Status Alerts */}
              <div className="space-y-3">
                {!canApprove && acceptedItems.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-amber-900 leading-none mb-1">Action Required: QC Failures Detected</p>
                      <p className="text-xs font-medium text-amber-700">Not all accepted items passed standard quality protocols. Review individual item statuses below.</p>
                    </div>
                  </div>
                )}

                {rejectedItems.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-rose-900 leading-none mb-1">Inspection Results: Rejections Present</p>
                      <p className="text-xs font-medium text-rose-700">{rejectedItems.length} item(s) were flagged as non-compliant and rejected by inspectors.</p>
                    </div>
                  </div>
                )}

                {canApprove && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-emerald-900 leading-none mb-1">Compliance Verified: Ready for Entry</p>
                      <p className="text-xs font-medium text-emerald-700">All accepted items have successfully passed 100% of quality control checkpoints.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspected Items Table */}
              {acceptedItems.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                      Standard Compliance Review
                    </h4>
                    <Badge variant="emerald" className="px-3 py-1 text-[10px] font-black uppercase">
                      {acceptedItems.length} Passed Inspection
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="px-6 py-4 text-left font-bold text-gray-400 uppercase tracking-widest text-[10px]">Item Identification</th>
                          <th className="px-6 py-4 text-center font-bold text-gray-400 uppercase tracking-widest text-[10px]">Recv. Qty</th>
                          <th className="px-6 py-4 text-center font-bold text-gray-400 uppercase tracking-widest text-[10px]">Accp. Qty</th>
                          <th className="px-6 py-4 text-right font-bold text-gray-400 uppercase tracking-widest text-[10px]">QC Protocol Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {acceptedItems.map((item) => {
                          const statusColor = getQCStatusColor(item.qc_checks);
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-black text-gray-900">{item.item_code}</td>
                              <td className="px-6 py-4 text-center font-medium text-gray-500">{item.received_qty}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                                  {item.accepted_qty}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-end">
                                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border ${
                                    statusColor === 'success' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : statusColor === 'warning' 
                                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {getQCStatusIcon(item.qc_checks)}
                                    {getQCStatusText(item.qc_checks)}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rejected Items Table */}
              {rejectedItems.length > 0 && (
                <div className="bg-rose-50/30 border border-rose-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-rose-50 border-b border-rose-100">
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest">Flagged Rejections</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-transparent border-b border-rose-100">
                          <th className="px-6 py-3 text-left font-bold text-rose-400 uppercase tracking-widest text-[10px]">Item Code</th>
                          <th className="px-6 py-3 text-center font-bold text-rose-400 uppercase tracking-widest text-[10px]">Qty</th>
                          <th className="px-6 py-3 text-left font-bold text-rose-400 uppercase tracking-widest text-[10px]">Reason for Non-Compliance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100/50">
                        {rejectedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-rose-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-rose-900">{item.item_code}</td>
                            <td className="px-6 py-4 text-center font-bold text-rose-700">{item.received_qty}</td>
                            <td className="px-6 py-4 text-xs font-medium text-rose-600 italic">
                              {item.notes || 'Detailed non-compliance report missing'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
