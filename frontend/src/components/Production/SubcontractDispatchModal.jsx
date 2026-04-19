import { useState, useEffect } from 'react'
import { X, Package, Calendar, Info, AlertCircle, CheckCircle2, List, User, Trash2, Plus, Truck } from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'
import SearchableSelect from '../SearchableSelect'

export default function SubcontractDispatchModal({ isOpen, onClose, jobCard, onDispatchSuccess }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [workOrder, setWorkOrder] = useState(null)
  const [vendors, setVendors] = useState([])
  const [items, setItems] = useState([])
  const [releaseItems, setReleaseItems] = useState([])
  const [formData, setFormData] = useState({
    job_card_id: '',
    vendor_id: '',
    vendor_name: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    transporter_name: '',
    vehicle_number: '',
    eway_bill_no: '',
    notes: '',
    release_quantity: 0
  })

  useEffect(() => {
    if (isOpen && jobCard) {
      const plannedQty = jobCard.max_allowed_quantity !== undefined ? parseFloat(jobCard.max_allowed_quantity) : (jobCard.planned_quantity || 0)
      const remainingToDispatch = Math.max(0, plannedQty - (jobCard.total_dispatched || 0))
      setFormData({
        job_card_id: jobCard.job_card_id,
        vendor_id: jobCard.vendor_id || '',
        vendor_name: jobCard.vendor_name || '',
        dispatch_date: new Date().toISOString().split('T')[0],
        expected_return_date: '',
        transporter_name: '',
        vehicle_number: '',
        eway_bill_no: '',
        notes: '',
        release_quantity: remainingToDispatch
      })
      fetchWorkOrderDetails(jobCard.work_order_id)
      fetchVendors()
      fetchItems()
    }
  }, [isOpen, jobCard])

  const fetchItems = async () => {
    try {
      const res = await productionService.getItems()
      if (res.success) {
        const itemOptions = (res.data || []).map(i => ({
          value: i.item_code,
          label: `${i.item_code} - ${i.name || ''}`,
          uom: i.uom
        }))
        setItems(itemOptions)
      }
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchWorkOrderDetails = async (woId) => {
    try {
      setLoading(true)
      const res = await productionService.getWorkOrder(woId)
      if (res.success) {
        setWorkOrder(res.data)
        
        const plannedQty = jobCard.max_allowed_quantity !== undefined ? parseFloat(jobCard.max_allowed_quantity) : (jobCard.planned_quantity || 0)
        const remainingToDispatch = Math.max(0, plannedQty - (jobCard.total_dispatched || 0))

        // Filter items by operation and set initial release items
        let opItems = (res.data.items || []).filter(item => 
          !item.operation || item.operation === jobCard.operation
        ).map(item => ({
          ...item,
          release_qty: ((parseFloat(item.required_qty) / parseFloat(res.data.quantity)) * remainingToDispatch)
        }))

        // If no items found for this operation, look for raw materials or previous stage WIP
        if (opItems.length === 0) {
          const ops = res.data.operations || []
          const currentOpIdx = ops.findIndex(o => o.operation === jobCard.operation)
          
          if (currentOpIdx > 0) {
            // Suggest previous operation's output as the input (WIP)
            opItems = [{
              item_code: res.data.item_code,
              item_name: res.data.item_name || res.data.item_code,
              required_qty: res.data.quantity,
              release_qty: remainingToDispatch,
              uom: res.data.uom || 'pcs',
              is_wip: true,
              operation: ops[currentOpIdx - 1].operation
            }]
          } else {
            // For the first operation, fetch all raw materials linked to the work order
            opItems = (res.data.items || []).map(item => ({
              ...item,
              release_qty: ((parseFloat(item.required_qty) / parseFloat(res.data.quantity)) * remainingToDispatch)
            }))
          }
        }
        
        setReleaseItems(opItems)
      }
    } catch (err) {
      toast.addToast('Failed to fetch work order details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDispatchQuantityChange = (qty) => {
    const newQty = parseFloat(qty) || 0
    setFormData(prev => ({ ...prev, release_quantity: newQty }))
    
    // Proportional update for raw materials
    if (workOrder && workOrder.quantity > 0) {
      setReleaseItems(prev => prev.map(item => {
        if (item.is_manual) return item
        return {
          ...item,
          release_qty: ((parseFloat(item.required_qty) / parseFloat(workOrder.quantity)) * newQty)
        }
      }))
    }
  }

  const handleAddItem = () => {
    setReleaseItems(prev => [...prev, {
      item_code: '',
      required_qty: 0,
      release_qty: 0,
      uom: '',
      is_manual: true
    }])
  }

  const handleUpdateItem = (idx, field, value) => {
    const updated = [...releaseItems]
    let finalValue = value
    
    if (field === 'required_qty' || field === 'release_qty') {
      finalValue = parseFloat(value) || 0
    }
    
    updated[idx] = { ...updated[idx], [field]: finalValue }
    
    // If selecting an item from the dropdown
    if (field === 'item_code') {
      const selectedItem = items.find(i => i.value === value)
      if (selectedItem) {
        updated[idx].uom = selectedItem.uom
      }
    }
    
    setReleaseItems(updated)
  }

  const handleDeleteItem = (idx) => {
    setReleaseItems(prev => prev.filter((_, i) => i !== idx))
  }

  const fetchVendors = async () => {
    try {
      const res = await productionService.getVendors()
      if (res.success) {
        const vendorOptions = (res.data || []).map(v => ({
          value: v.supplier_id,
          label: v.name || v.supplier_id
        }))
        setVendors(vendorOptions)
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err)
    }
  }

  const handleVendorChange = (vendorId) => {
    const selectedVendor = vendors.find(v => v.value === vendorId)
    setFormData(prev => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: selectedVendor ? selectedVendor.label : ''
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.expected_return_date) {
      toast.addToast('Please select an expected return date', 'error')
      return
    }

    if (!formData.release_quantity || formData.release_quantity <= 0) {
      toast.addToast('Dispatch quantity must be greater than zero', 'error')
      return
    }

    const totalPlanned = jobCard.max_allowed_quantity !== undefined ? parseFloat(jobCard.max_allowed_quantity) : (jobCard.planned_quantity || 0)
    const remainingToDispatch = Math.max(0, totalPlanned - (jobCard.total_dispatched || 0))
    const tolerance = 0.001
    if (formData.release_quantity > remainingToDispatch + tolerance) {
      toast.addToast(`Cannot dispatch more than remaining available (${remainingToDispatch.toFixed(2)})`, 'error')
      return
    }

    // Validate items
    if (releaseItems.length > 0) {
      for (const item of releaseItems) {
        if (!item.item_code) {
          toast.addToast('All material release items must have an item code', 'error')
          return
        }
        if (!item.release_qty || item.release_qty <= 0) {
          toast.addToast(`Item ${item.item_code} must have a release quantity greater than zero`, 'error')
          return
        }
      }
    }

    try {
      setLoading(true)
      
      // 1. Create Outward Challan Record
      // In the updated backend, createOutwardChallan automatically triggers handleSubcontractDispatch
      // which handles incremental sent_qty and stock movement to Subcontract WIP
      await productionService.createOutwardChallan({
        job_card_id: formData.job_card_id,
        vendor_id: formData.vendor_id,
        vendor_name: formData.vendor_name,
        dispatch_date: formData.dispatch_date,
        expected_return_date: formData.expected_return_date,
        transporter_name: formData.transporter_name,
        vehicle_number: formData.vehicle_number,
        eway_bill_no: formData.eway_bill_no,
        notes: formData.notes,
        dispatch_quantity: formData.release_quantity,
        items: releaseItems
      })

      toast.addToast(`Outward challan created for ${formData.release_quantity} units`, 'success')
      onDispatchSuccess()
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to dispatch job card', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const alreadyDispatched = parseFloat(jobCard?.total_dispatched || 0)
  const totalPlanned = jobCard?.max_allowed_quantity !== undefined ? parseFloat(jobCard.max_allowed_quantity) : parseFloat(jobCard?.planned_quantity || 0)
  const remainingToDispatch = Math.max(0, totalPlanned - alreadyDispatched)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded   w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded ">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg  text-gray-900">Outward Challan</h2>
              <p className="text-xs text-gray-500">Dispatch Job Card {jobCard?.job_card_id} to Vendor</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded  transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-2">
            {/* Quantity Info Bar */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded mb-4">
               <div className="flex-1 text-center border-r border-slate-200">
                  <p className="text-[10px] text-slate-400">Planned Total</p>
                  <p className="text-sm font-bold text-slate-700">{totalPlanned.toFixed(2)}</p>
               </div>
               <div className="flex-1 text-center border-r border-slate-200">
                  <p className="text-[10px] text-slate-400">Already Dispatched</p>
                  <p className="text-sm font-bold text-indigo-600">{alreadyDispatched.toFixed(2)}</p>
               </div>
               <div className="flex-1 text-center">
                  <p className="text-[10px] text-slate-400">Available to Dispatch</p>
                  <p className="text-sm font-bold text-emerald-600">{remainingToDispatch.toFixed(2)}</p>
               </div>
            </div>

            {/* Operation Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded  border border-slate-100">
                <p className="text-[10px]  tracking-wider  text-slate-400 mb-1">Operation</p>
                <p className="text-sm font-semibold text-slate-700">{jobCard?.operation}</p>
              </div>
              <div className="p-4 bg-indigo-50/30 rounded  border border-indigo-100/50">
                <p className="text-[10px]  tracking-wider  text-indigo-400 mb-1">Dispatch Quantity</p>
                <div className="flex items-center gap-2">
                   <input
                     type="number"
                     className="w-full bg-transparent text-sm font-bold text-indigo-700 outline-none"
                     value={formData.release_quantity}
                     onChange={(e) => handleDispatchQuantityChange(e.target.value)}
                     max={remainingToDispatch}
                   />
                   <span className="text-xs text-indigo-400">{workOrder?.uom || 'units'}</span>
                </div>
              </div>
            </div>

            {/* Vendor Info */}
            <div className="p-4 bg-amber-50 rounded  border border-amber-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded ">
                  <User size={16} />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-900">Assign Vendor</p>
                  <p className="text-[10px] text-amber-600">Select the vendor for this outsourced operation</p>
                </div>
              </div>
              
              <SearchableSelect
                placeholder="Search and select vendor..."
                options={vendors}
                value={formData.vendor_id}
                onChange={handleVendorChange}
                containerClassName="bg-white border-amber-200"
              />
            </div>

            {/* Material Release List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                  <List size={18} className="text-gray-400" />
                  <h3 className="text-sm ">Required Material Release</h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded  text-[11px]  hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              </div>
              
              <div className="border border-gray-100 rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="p-2  text-[10px] ">Item Code</th>
                      <th className="p-2  text-right text-[10px] ">Required Qty</th>
                      <th className="p-2  text-right text-[10px] ">Release Qty</th>
                      <th className="p-2  text-center text-[10px]  w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {releaseItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 group">
                        <td className="p-2 ">
                          <SearchableSelect
                            placeholder="Select Item..."
                            options={items}
                            value={item.item_code}
                            onChange={(val) => handleUpdateItem(idx, 'item_code', val)}
                            containerClassName="h-8 text-[11px]"
                          />
                        </td>
                        <td className="p-2  text-right text-gray-500">
                          <input
                            type="number"
                            className="w-20 p-1 bg-white border border-gray-200 rounded text-right outline-none focus:border-indigo-500"
                            value={item.required_qty}
                            onChange={(e) => handleUpdateItem(idx, 'required_qty', e.target.value)}
                          />
                        </td>
                        <td className="p-2  text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              className="w-24 p-1 bg-indigo-50/50 border border-indigo-100 rounded text-right  text-indigo-600 outline-none focus:ring-1 focus:ring-indigo-500"
                              value={item.release_qty}
                              onChange={(e) => handleUpdateItem(idx, 'release_qty', e.target.value)}
                            />
                            <span className="text-[10px] text-gray-400 font-medium  w-8">{item.uom}</span>
                          </div>
                        </td>
                        <td className="p-2  text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!releaseItems || releaseItems.length === 0) && (
                      <tr>
                        <td colSpan="4" className="px-4 py-6 text-center text-gray-400 italic">
                          <div className="flex flex-col items-center gap-2">
                            <Info size={24} className="text-gray-200" />
                            <p>No raw materials linked to this operation</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  Dispatch Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.dispatch_date}
                  onChange={(e) => setFormData({...formData, dispatch_date: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  Expected Return Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.expected_return_date}
                  onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})}
                  min={formData.dispatch_date}
                />
              </div>
            </div>

            {/* Transport Details */}
            <div className="p-4 bg-indigo-50/20 rounded border border-indigo-100/50 space-y-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <Truck size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Transport & Logistics</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Transporter Name</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-white border border-indigo-100 rounded text-sm focus:border-indigo-500 outline-none"
                    placeholder="e.g. Blue Dart"
                    value={formData.transporter_name}
                    onChange={(e) => setFormData({...formData, transporter_name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Vehicle Number</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-white border border-indigo-100 rounded text-sm focus:border-indigo-500 outline-none"
                    placeholder="GJ-01-XX-0000"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({...formData, vehicle_number: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-gray-500">E-Way Bill No.</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-white border border-indigo-100 rounded text-sm focus:border-indigo-500 outline-none"
                    placeholder="12-digit number"
                    value={formData.eway_bill_no}
                    onChange={(e) => setFormData({...formData, eway_bill_no: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Dispatch Notes</label>
              <textarea
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none h-20"
                placeholder="Any specific instructions for the vendor..."
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2  text-sm  text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 p-2  bg-indigo-600 text-white rounded  text-sm  hover:bg-indigo-700 transition-all  shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded  animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Create Outward Challan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
