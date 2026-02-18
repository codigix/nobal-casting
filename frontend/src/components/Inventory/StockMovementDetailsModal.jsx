import React from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Badge from '../Badge/Badge'
import { 
  ArrowDown, ArrowUp, RefreshCw, CheckCircle, Clock, 
  XCircle, User, Calendar, FileText, Package, ArrowRight,
  Database, Tag, Info
} from 'lucide-react'

export default function StockMovementDetailsModal({ movement, onClose }) {
  if (!movement) return null

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
      Approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
      Completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
      Cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle }
    }
    return configs[status] || { label: status, color: 'bg-neutral-100 text-neutral-700 border-neutral-200', icon: Info }
  }

  const config = getStatusConfig(movement.status)
  const StatusIcon = config.icon

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Stock Movement Details"
      size="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xs border border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Transaction #</span>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white tracking-wider">{movement.transaction_no}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Status</span>
            <Badge className={`${config.color} flex items-center gap-1.5 w-fit border text-[10px]`}>
              <StatusIcon size={12} />
              {config.label.toUpperCase()}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Movement Type</span>
            <div className="flex items-center gap-1.5">
              {movement.movement_type === 'IN' ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1 text-[10px]">
                  <ArrowDown size={12} /> IN
                </Badge>
              ) : movement.movement_type === 'OUT' ? (
                <Badge className="bg-rose-100 text-rose-700 border-rose-200 flex items-center gap-1 text-[10px]">
                  <ArrowUp size={12} /> OUT
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 text-[10px]">
                  <RefreshCw size={12} /> TRANSFER
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Date</span>
            <span className="text-sm text-neutral-900 dark:text-white">{new Date(movement.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Item & Quantity */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xs">
                <Package size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Item Details</span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-white">{movement.item_code}</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">{movement.item_name}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xs">
                <Tag size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Quantity & Purpose</span>
                <span className="text-lg font-bold text-neutral-900 dark:text-white">{parseFloat(movement.quantity).toFixed(2)} Units</span>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">Purpose: {movement.purpose}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Warehouse & Reference */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xs">
                <Database size={18} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Warehouse Details</span>
                {movement.movement_type === 'TRANSFER' ? (
                  <div className="flex flex-col gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-500 font-medium">FROM</span>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-white">{movement.source_warehouse_name}</span>
                    </div>
                    <div className="flex justify-center">
                      <ArrowDown size={14} className="text-neutral-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">TO</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{movement.target_warehouse_name}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{movement.warehouse_name}</span>
                )}
              </div>
            </div>

            {(movement.reference_type || movement.reference_name) && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xs">
                  <FileText size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">Reference</span>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{movement.reference_type || 'Manual'}</span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">{movement.reference_name || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Audit Info */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full">
              <User size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500 font-medium">CREATED BY</span>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{movement.created_by_user || 'System'}</span>
            </div>
          </div>
          {movement.approved_by_user && (
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full">
                <CheckCircle size={14} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 font-medium">APPROVED BY</span>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{movement.approved_by_user}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {movement.notes && (
          <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-xs border-l-4 border-blue-500">
            <span className="text-[10px] text-neutral-500 font-medium block mb-1">NOTES / REMARKS</span>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 italic">"{movement.notes}"</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
