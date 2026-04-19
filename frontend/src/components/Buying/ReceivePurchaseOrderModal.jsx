import React, { useState, useEffect } from 'react'
import api, { 
  purchaseOrdersAPI, 
  stockAPI
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { 
  Package, Truck, Calendar, 
  RefreshCw, Warehouse, ClipboardList, 
  CheckCircle2, Trash2
} from 'lucide-react'

export default function ReceivePurchaseOrderModal({ isOpen, onClose, onSuccess, poNo, purchaseOrder }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])

  const [formData, setFormData] = useState({
    po_no: poNo || '',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      initModal()
    }
  }, [isOpen, poNo, purchaseOrder])

  const initModal = async () => {
    setLoading(true)
    setError(null)
    try {
      const whRes = await stockAPI.warehouses()
      const warehousesList = whRes.data.data || []
      setWarehouses(warehousesList)

      let targetPO = purchaseOrder
      if (!targetPO && poNo) {
        const detailRes = await api.get(`/purchase-orders/${poNo}`)
        if (detailRes.data.success) targetPO = detailRes.data.data
      }

      if (targetPO) {
        setFormData(prev => ({
          ...prev,
          po_no: targetPO.po_no,
          notes: `Direct receipt for PO ${targetPO.po_no}`
        }))

        const receiveItems = targetPO.items.map(item => {
          const pending = (item.qty || 0) - (item.received_qty || 0)
          return {
            item_code: item.item_code,
            item_name: item.item_name,
            qty: item.qty || 0,
            received_qty: item.received_qty || 0,
            accepted_qty: pending > 0 ? pending : 0,
            warehouse_code: warehousesList[0]?.id || warehousesList[0]?.warehouse_code || 'ACCEPTED',
            uom: item.uom || item.item_uom || ''
          }
        })
        setItems(receiveItems)
      }
    } catch (err) {
      console.error('Error initializing receipt modal:', err)
      setError('Failed to load required data')
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async () => {
    const itemsToReceive = items.filter(i => parseFloat(i.accepted_qty) > 0)
    
    if (itemsToReceive.length === 0) {
      setError('Please specify quantity to receive for at least one item')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = {
        items: itemsToReceive,
        receipt_date: formData.receipt_date,
        notes: formData.notes
      }
      
      await api.put(`/purchase-orders/${formData.po_no}/receive`, payload)
      onSuccess && onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update received quantities')
    } finally {
      setLoading(false)
    }
  }

  const totalQty = items.reduce((sum, i) => sum + (parseFloat(i.accepted_qty) || 0), 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Receive Items: ${formData.po_no}`}
      size="5xl"
      footer={
        <div className="flex gap-3 justify-between items-center w-full px-4">
          <div className="flex gap-6 items-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400">Items to Receive</span>
              <span className="text-xs text-neutral-800">{totalQty.toLocaleString()} Units</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={loading || totalQty <= 0}
              className="px-8 shadow-blue-100 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm Receipt & Update Stock
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="danger">{error}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 flex items-center gap-1">
              <Calendar size={12} /> Receipt Date
            </label>
            <input 
              type="date" 
              value={formData.receipt_date}
              onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
              className="w-full p-2 bg-white border border-neutral-200 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-neutral-500 flex items-center gap-1">
              <Truck size={12} /> Receipt Notes
            </label>
            <input 
              type="text" 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Internal notes..."
              className="w-full p-2 bg-white border border-neutral-200 rounded text-sm outline-none focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>
        </div>

        <div className="bg-white rounded border border-neutral-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="p-3 font-medium text-neutral-500">Item Details</th>
                <th className="p-3 font-medium text-neutral-500 text-center">Ordered</th>
                <th className="p-3 font-medium text-neutral-500 text-center">Received</th>
                <th className="p-3 font-medium text-neutral-500 text-center">Warehouse</th>
                <th className="p-3 font-medium text-neutral-500 text-center w-32">Receive Now</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((item, idx) => {
                const pending = item.qty - item.received_qty
                return (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <p className="font-medium text-neutral-800">{item.item_code}</p>
                      <p className="text-[10px] text-neutral-500 truncate max-w-[200px]">{item.item_name}</p>
                    </td>
                    <td className="p-3 text-center">
                      <p>{item.qty} {item.uom}</p>
                    </td>
                    <td className="p-3 text-center">
                      <p className="text-emerald-600">{item.received_qty} {item.uom}</p>
                      <p className="text-[9px] text-neutral-400">Pending: {pending}</p>
                    </td>
                    <td className="p-3">
                      <select
                        value={item.warehouse_code}
                        onChange={(e) => handleItemChange(idx, 'warehouse_code', e.target.value)}
                        className="w-full p-1.5 bg-white border border-neutral-200 rounded text-[11px]"
                      >
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.warehouse_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input 
                        type="number"
                        value={item.accepted_qty}
                        onChange={(e) => handleItemChange(idx, 'accepted_qty', e.target.value)}
                        className="w-full p-1.5 border border-indigo-200 rounded text-center text-xs font-bold text-indigo-600 outline-none focus:border-indigo-500"
                        min="0"
                        max={pending}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
