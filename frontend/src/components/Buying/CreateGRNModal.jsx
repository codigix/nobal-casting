import React, { useState, useEffect } from 'react'
import api, { 
  purchaseOrdersAPI, 
  stockAPI, 
  suppliersAPI, 
  itemsAPI,
  grnRequestsAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, Trash2, Package, FileText, Truck, Calendar, 
  AlertCircle, Search, ArrowRight, Info, ChevronRight,
  ClipboardList, RefreshCw, Warehouse, CheckCircle2, User,
  Hash, Calculator
} from 'lucide-react'

export default function CreateGRNModal({ isOpen, onClose, onSuccess, initialPoNo, purchaseOrder }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])

  const [formData, setFormData] = useState({
    grn_no: '',
    po_no: '',
    mr_id: '',
    department: '',
    purpose: '',
    supplier_id: '',
    supplier_name: '',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [grnItems, setGrnItems] = useState([])

  useEffect(() => {
    if (isOpen) {
      initModal()
    }
  }, [isOpen, initialPoNo, purchaseOrder])

  const initModal = async () => {
    setLoading(true)
    setError(null)
    try {
      const [whRes, supRes, itemsRes, poListRes] = await Promise.all([
        stockAPI.warehouses(),
        suppliersAPI.list(),
        itemsAPI.list(),
        api.get('/purchase-orders?status=submitted,to_receive,partially_received')
      ])

      const warehousesList = whRes.data.data || []
      setWarehouses(warehousesList)
      setSuppliers(supRes.data.data || [])
      setItems(itemsRes.data.data || [])
      setPurchaseOrders(poListRes.data.data || [])

      const grnNoRes = await api.get('/grn-requests/generate-grn-no')
      const nextGrnNo = grnNoRes.data.success ? grnNoRes.data.data.grn_no : ''

      let targetPO = purchaseOrder
      if (!targetPO && initialPoNo) {
        const detailRes = await purchaseOrdersAPI.get(initialPoNo)
        if (detailRes.data.success) targetPO = detailRes.data.data
      }

      if (targetPO) {
        populateFromPO(targetPO, nextGrnNo, warehousesList)
      } else {
        setFormData(prev => ({ ...prev, grn_no: nextGrnNo }))
        setGrnItems([{ 
          item_code: '', 
          item_name: '', 
          po_qty: 0, 
          received_qty: 0, 
          rate: 0, 
          batch_no: '', 
          warehouse_name: warehousesList[0]?.warehouse_name || '', 
          uom: '', 
          current_stock: 0 
        }])
      }
    } catch (err) {
      console.error('Error initializing GRN modal:', err)
      setError('Failed to load required data')
    } finally {
      setLoading(false)
    }
  }

  const populateFromPO = (po, grnNo, whList) => {
    const defaultWarehouse = whList.length > 0 ? whList[0].warehouse_name : ''
    setFormData({
      grn_no: grnNo,
      po_no: po.po_no,
      mr_id: po.mr_id || '',
      department: po.department || '',
      purpose: po.purpose || '',
      supplier_id: po.supplier_id,
      supplier_name: po.supplier_name || '',
      receipt_date: new Date().toISOString().split('T')[0],
      notes: ''
    })

    if (po.items && po.items.length > 0) {
      const newItems = po.items.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        po_qty: item.qty || item.quantity || 0,
        received_qty: item.qty || item.quantity || 0,
        rate: item.rate || 0,
        batch_no: '',
        warehouse_name: defaultWarehouse,
        uom: item.uom || '',
        current_stock: 0
      }))
      setGrnItems(newItems)
    }
  }

  const handlePOSelect = async (poNo) => {
    if (!poNo) return
    setLoading(true)
    try {
      const res = await purchaseOrdersAPI.get(poNo)
      if (res.data.success) {
        populateFromPO(res.data.data, formData.grn_no, warehouses)
      }
    } catch (err) {
      setError('Failed to fetch PO details')
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...grnItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setGrnItems(newItems)
  }

  const handleAddItem = () => {
    setGrnItems([
      ...grnItems,
      { item_code: '', item_name: '', po_qty: 0, received_qty: 0, rate: 0, batch_no: '', warehouse_name: warehouses[0]?.warehouse_name || '', uom: '', current_stock: 0 }
    ])
  }

  const handleRemoveItem = (index) => {
    if (grnItems.length > 1) {
      setGrnItems(grnItems.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    if (!formData.grn_no || !formData.supplier_name) {
      setError('Please fill in GRN Number and Supplier')
      return
    }

    if (grnItems.length === 0 || !grnItems[0].item_code) {
      setError('Please add at least one item')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        material_request_id: formData.mr_id,
        items: grnItems.filter(i => i.item_code)
      }
      await grnRequestsAPI.create(payload)
      onSuccess && onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create GRN request')
    } finally {
      setLoading(false)
    }
  }

  const totalQty = grnItems.reduce((sum, i) => sum + (parseFloat(i.received_qty) || 0), 0)
  const totalValue = grnItems.reduce((sum, i) => sum + ((parseFloat(i.received_qty) || 0) * (parseFloat(i.rate) || 0)), 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create GRN Request"
      size="full"
      footer={
        <div className="flex gap-3 justify-between items-center w-full px-4">
          <div className="flex gap-6 items-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Quantity</span>
              <span className="text-sm font-black text-neutral-800">{totalQty.toLocaleString()} Units</span>
            </div>
            <div className="h-8 w-px bg-neutral-200" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Valuation</span>
              <span className="text-sm font-black text-blue-600">₹{totalValue.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-8 shadow-lg shadow-blue-100 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Create GRN Request
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {error && <Alert type="danger">{error}</Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-neutral-50 rounded-2xl border border-neutral-200 p-5 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-tight">Receipt Context</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Link source and set date</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                    <Hash size={12} /> GRN Number
                  </label>
                  <input 
                    type="text" 
                    value={formData.grn_no} 
                    readOnly 
                    className="w-full p-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                    <FileText size={12} /> Purchase Order
                  </label>
                  <select
                    value={formData.po_no}
                    onChange={(e) => handlePOSelect(e.target.value)}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="">Select PO (Optional)</option>
                    {purchaseOrders.map(po => (
                      <option key={po.po_no} value={po.po_no}>{po.po_no} - {po.supplier_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                    <Calendar size={12} /> Receipt Date
                  </label>
                  <input 
                    type="date" 
                    value={formData.receipt_date}
                    onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
                <div className="p-2 bg-neutral-100 rounded-lg text-neutral-600">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-tight">Supplier Info</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Verified supplier details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Selected Supplier</span>
                  <p className="text-sm font-black text-neutral-800 truncate">{formData.supplier_name || 'No Supplier Linked'}</p>
                  <p className="text-[10px] text-neutral-500 font-medium">ID: {formData.supplier_id || 'N/A'}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                    <Truck size={12} /> Transporter Notes
                  </label>
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="4"
                    placeholder="Add delivery note, vehicle number, etc..."
                    className="w-full p-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Main Content: Items Table */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-800 uppercase tracking-tight">Receipt Items</h3>
                    <p className="text-[10px] text-neutral-500 font-medium">Verify received quantities against PO</p>
                  </div>
                </div>
                <button 
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-50/50 border-b border-neutral-100">
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider w-[30%]">Item Details</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider text-center">Warehouse</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider text-center">PO Qty</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider text-center">Received</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider text-right">Rate</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {grnItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <select
                            value={item.item_code}
                            onChange={(e) => {
                              const selectedItem = items.find(i => i.item_code === e.target.value)
                              handleItemChange(idx, 'item_code', e.target.value)
                              handleItemChange(idx, 'item_name', selectedItem?.item_name || selectedItem?.name || '')
                              handleItemChange(idx, 'uom', selectedItem?.uom || '')
                              handleItemChange(idx, 'rate', selectedItem?.valuation_rate || selectedItem?.rate || 0)
                            }}
                            className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none"
                          >
                            <option value="">Select Item</option>
                            {items.map(i => (
                              <option key={i.item_code} value={i.item_code}>{i.item_code} - {i.item_name || i.name}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-[10px] text-neutral-500 truncate max-w-[200px]">{item.item_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={item.warehouse_name}
                            onChange={(e) => handleItemChange(idx, 'warehouse_name', e.target.value)}
                            className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/10 outline-none"
                          >
                            <option value="">Select WH</option>
                            {warehouses.map(w => (
                              <option key={w.id} value={w.warehouse_name}>{w.warehouse_name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-bold text-neutral-400">{item.po_qty}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            value={item.received_qty}
                            onChange={(e) => handleItemChange(idx, 'received_qty', parseFloat(e.target.value) || 0)}
                            className="w-20 p-2 bg-white border border-neutral-200 rounded-lg text-sm font-black text-center focus:ring-2 focus:ring-blue-500/10 outline-none"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-24 p-2 bg-white border border-neutral-200 rounded-lg text-sm font-bold text-right focus:ring-2 focus:ring-blue-500/10 outline-none"
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-neutral-800">₹{((item.received_qty || 0) * (item.rate || 0)).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleRemoveItem(idx)}
                            className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {grnItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center px-10">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4 border border-neutral-100">
                    <ClipboardList size={32} className="text-neutral-300" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-800 mb-1">No Items Added</h4>
                  <p className="text-xs text-neutral-500">Click the 'Add Line Item' button or select a PO to begin.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
