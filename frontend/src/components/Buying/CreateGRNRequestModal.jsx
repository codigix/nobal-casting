import React, { useState, useEffect } from 'react'
import api, { grnRequestsAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  X, FileText, User, Calendar, ClipboardList, 
  Package, ArrowRight, Info, Warehouse, CheckCircle2,
  RefreshCw, Hash, ClipboardCheck
} from 'lucide-react'

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

  const handleCreateGRN = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const grnData = {
        grn_no: purchaseReceipt.grn_no,
        po_no: purchaseReceipt.po_no || null,
        material_request_id: purchaseReceipt.material_request_id || null,
        department: purchaseReceipt.department || null,
        purpose: purchaseReceipt.purpose || null,
        supplier_id: purchaseReceipt.supplier_id || null,
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

      await grnRequestsAPI.create(grnData)
      onSuccess && onSuccess()
      onClose && onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create GRN request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create GRN Request"
      size="5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateGRN} 
            disabled={loading}
            className="flex items-center gap-2 px-8"
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Submit for Inspection
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {error && <Alert type="danger">{error}</Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Summary Panel */}
          <div className="lg:col-span-1 space-y-2">
            <section className="bg-neutral-50 rounded border border-neutral-200 p-2 space-y-2">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
                <div className="p-2 bg-blue-600 rounded  text-white">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xs  text-neutral-800 ">Receipt Overview</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Source document summary</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white rounded  border border-neutral-100  ">
                  <span className="text-[10px]  text-neutral-400   block mb-1">GRN Number</span>
                  <div className="text-sm  text-neutral-900 font-mono">{purchaseReceipt?.grn_no}</div>
                </div>

                <div className="p-3 bg-white rounded  border border-neutral-100  ">
                  <span className="text-[10px]  text-neutral-400   block mb-1">Source PO</span>
                  <div className="text-sm  text-neutral-700">
                    {purchaseReceipt?.po_no || <span className="text-neutral-400 italic font-normal">No Reference</span>}
                  </div>
                </div>

                <div className="p-3 bg-white rounded  border border-neutral-100  ">
                  <span className="text-[10px]  text-neutral-400   block mb-1">Supplier</span>
                  <div className="text-sm  text-neutral-900 truncate" title={purchaseReceipt?.supplier_name}>
                    {purchaseReceipt?.supplier_name}
                  </div>
                </div>

                <div className="p-3 bg-white rounded  border border-neutral-100  ">
                  <span className="text-[10px]  text-neutral-400   block mb-1">Date Received</span>
                  <div className="text-sm  text-neutral-700">
                    {purchaseReceipt?.receipt_date ? new Date(purchaseReceipt.receipt_date).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>
            </section>

            <div className="bg-blue-50 border border-blue-100 rounded  p-4 flex gap-3">
              <div className="text-blue-500 shrink-0">
                <Info size={18} />
              </div>
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                Submitting this request will notify the Quality Control team. Items will remain in <strong>Pending Inspection</strong> status until approved.
              </p>
            </div>
          </div>

          {/* Right: Items Table & Notes */}
          <div className="lg:col-span-2 space-y-2">
            <div className="bg-white rounded  border border-neutral-200   overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded ">
                    <Package size={16} />
                  </div>
                  <h3 className="text-xs  text-neutral-800 ">Inspection Queue</h3>
                </div>
                <Badge variant="blue" className="px-2.5 py-1 text-[10px]">
                  {selectedItems.length} Items Total
                </Badge>
              </div>

              <div className="p-0">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="p-2  text-[10px]  text-neutral-400  tracking-wider">Item Details</th>
                      <th className="p-2  text-[10px]  text-neutral-400  tracking-wider text-center">Received</th>
                      <th className="p-2  text-[10px]  text-neutral-400  tracking-wider">Warehouse</th>
                      <th className="p-2  text-[10px]  text-neutral-400  tracking-wider">Batch Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="p-2 ">
                          <div className="flex flex-col">
                            <span className="text-xs  text-neutral-800">{item.item_code}</span>
                            <span className="text-[10px] text-neutral-500 font-medium italic truncate max-w-[200px]">{item.item_name}</span>
                          </div>
                        </td>
                        <td className="p-2  text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded  text-xs  bg-blue-50 text-blue-700 border border-blue-100">
                            {item.received_qty}
                          </span>
                        </td>
                        <td className="p-2 ">
                          <div className="flex items-center gap-1.5 text-xs  text-neutral-700">
                            <Warehouse size={12} className="text-neutral-400" />
                            {item.warehouse_name}
                          </div>
                        </td>
                        <td className="p-2 ">
                          {item.batch_no ? (
                            <Badge variant="neutral" className="font-mono text-[10px]">{item.batch_no}</Badge>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">No Batch ID</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px]  text-neutral-500  flex items-center gap-1.5 ml-1">
                <FileText size={12} /> Special Inspection Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                placeholder="Add any specific instructions for the QC team (e.g., check for moisture, verification of certificates, etc.)..."
                className="w-full p-4 border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all resize-none  "
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
