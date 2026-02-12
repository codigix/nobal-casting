import { useState, useEffect } from 'react'
import { X, Package, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, FileText } from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

export default function SubcontractReceiptModal({ isOpen, onClose, jobCard, onReceiptSuccess }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    received_qty: 0,
    accepted_qty: 0,
    rejected_qty: 0,
    notes: ''
  })

  useEffect(() => {
    if (isOpen && jobCard) {
      const remaining = parseFloat(jobCard.sent_qty || 0) - parseFloat(jobCard.received_qty || 0)
      setFormData({
        received_qty: remaining,
        accepted_qty: remaining,
        rejected_qty: 0,
        notes: ''
      })
    }
  }, [isOpen, jobCard])

  const handleQtyChange = (field, value) => {
    const val = parseFloat(value) || 0
    let newData = { ...formData, [field]: val }

    if (field === 'received_qty') {
      newData.accepted_qty = val
      newData.rejected_qty = 0
    } else if (field === 'accepted_qty') {
      newData.rejected_qty = Math.max(0, newData.received_qty - val)
    } else if (field === 'rejected_qty') {
      newData.accepted_qty = Math.max(0, newData.received_qty - val)
    }

    setFormData(newData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.received_qty <= 0) {
      toast.addToast('Received quantity must be greater than 0', 'error')
      return
    }

    if (formData.accepted_qty + formData.rejected_qty !== formData.received_qty) {
      toast.addToast('Accepted + Rejected quantity must equal Received quantity', 'error')
      return
    }

    const remaining = parseFloat(jobCard.sent_qty || 0) - parseFloat(jobCard.received_qty || 0)
    if (formData.received_qty > remaining + 0.0001) {
      toast.addToast(`Cannot receive more than remaining sent quantity (${remaining})`, 'error')
      return
    }

    try {
      setLoading(true)
      
      // 1. Create Inward Challan Record
      await productionService.createInwardChallan({
        job_card_id: jobCard.job_card_id,
        outward_challan_id: jobCard.outward_challan_id,
        vendor_id: jobCard.vendor_id,
        vendor_name: jobCard.vendor_name,
        quantity_received: formData.received_qty,
        quantity_accepted: formData.accepted_qty,
        quantity_rejected: formData.rejected_qty,
        notes: formData.notes
      })

      // 2. Perform Stock Receipt (movement from Subcontract WIP to Target/Scrap)
      await productionService.receiveFromVendor(jobCard.job_card_id, {
        received_qty: formData.received_qty,
        accepted_qty: formData.accepted_qty,
        rejected_qty: formData.rejected_qty
      })

      toast.addToast('Subcontract receipt recorded successfully', 'success')
      onReceiptSuccess()
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to record receipt', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const remaining = parseFloat(jobCard?.sent_qty || 0) - parseFloat(jobCard?.received_qty || 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Inward Challan</h2>
              <p className="text-xs text-gray-500">Receive from {jobCard?.vendor_name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Context Info */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Dispatched</p>
                <p className="text-sm font-bold text-slate-700">{jobCard?.sent_qty} units</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Pending Receipt</p>
                <p className="text-sm font-bold text-indigo-600">{remaining} units</p>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Quantity Received</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  value={formData.received_qty}
                  onChange={(e) => handleQtyChange('received_qty', e.target.value)}
                  max={remaining}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck size={14} />
                    Accepted Qty
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    value={formData.accepted_qty}
                    onChange={(e) => handleQtyChange('accepted_qty', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-rose-700 flex items-center gap-1">
                    <ShieldAlert size={14} />
                    Rejected Qty
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-sm font-bold text-rose-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
                    value={formData.rejected_qty}
                    onChange={(e) => handleQtyChange('rejected_qty', e.target.value)}
                  />
                </div>
              </div>

              {formData.rejected_qty > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Rejected quantities will be moved to the <strong>Scrap Warehouse</strong> and will not be available for the next operation.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <FileText size={14} className="text-gray-400" />
                  Receipt Notes
                </label>
                <textarea
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none h-20"
                  placeholder="Notes about quality or delivery..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Update Next Operation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
