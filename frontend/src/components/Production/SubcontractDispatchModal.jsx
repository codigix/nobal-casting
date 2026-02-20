import { useState, useEffect } from 'react'
import { X, Package, Calendar, Info, AlertCircle, CheckCircle2, List, User, Trash2, Plus } from 'lucide-react'
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
    expected_return_date: '',
    notes: '',
    release_quantity: 0
  })

  useEffect(() => {
    if (isOpen && jobCard) {
      setFormData({
        job_card_id: jobCard.job_card_id,
        vendor_id: jobCard.vendor_id || '',
        vendor_name: jobCard.vendor_name || '',
        expected_return_date: '',
        notes: '',
        release_quantity: jobCard.planned_quantity || 0
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
        
        // Filter items by operation and set initial release items
        const opItems = (res.data.items || []).filter(item => 
          !item.operation || item.operation === jobCard.operation
        ).map(item => ({
          ...item,
          release_qty: ((parseFloat(item.required_qty) / parseFloat(res.data.quantity)) * parseFloat(jobCard.planned_quantity))
        }))
        
        setReleaseItems(opItems)
      }
    } catch (err) {
      toast.addToast('Failed to fetch work order details', 'error')
    } finally {
      setLoading(false)
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

    try {
      setLoading(true)
      
      // 1. Create Outward Challan Record
      const challanRes = await productionService.createOutwardChallan({
        job_card_id: formData.job_card_id,
        vendor_id: formData.vendor_id,
        vendor_name: formData.vendor_name,
        expected_return_date: formData.expected_return_date,
        notes: formData.notes,
        dispatch_quantity: formData.release_quantity,
        items: releaseItems
      })

      const challanId = challanRes.data?.id || challanRes.id

      // 2. Perform Stock Dispatch (Subcontract WIP movement)
      await productionService.dispatchToVendor(formData.job_card_id, {
        items: releaseItems,
        outward_challan_id: challanId
      })

      toast.addToast('Job card dispatched and outward challan created', 'success')
      onDispatchSuccess()
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to dispatch job card', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

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
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-2">
            {/* Operation Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded  border border-slate-100">
                <p className="text-[10px]  tracking-wider  text-slate-400 mb-1">Operation</p>
                <p className="text-sm font-semibold text-slate-700">{jobCard?.operation}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded  border border-slate-100">
                <p className="text-[10px]  tracking-wider  text-slate-400 mb-1">Quantity</p>
                <p className="text-sm font-semibold text-slate-700">{jobCard?.planned_quantity} {workOrder?.uom || 'units'}</p>
              </div>
            </div>

            {/* Vendor Info */}
            <div className="p-4 bg-amber-50 rounded  border border-amber-100 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
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
                      <th className="px-4 py-2 text-[10px] ">Item Code</th>
                      <th className="px-4 py-2 text-right text-[10px] ">Required Qty</th>
                      <th className="px-4 py-2 text-right text-[10px] ">Release Qty</th>
                      <th className="px-4 py-2 text-center text-[10px]  w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {releaseItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 group">
                        <td className="px-4 py-2">
                          {item.is_manual ? (
                            <SearchableSelect
                              placeholder="Select Item..."
                              options={items}
                              value={item.item_code}
                              onChange={(val) => handleUpdateItem(idx, 'item_code', val)}
                              containerClassName="h-8 text-[11px]"
                            />
                          ) : (
                            <span className="font-medium text-gray-700">{item.item_code}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">
                          {item.is_manual ? (
                            <input
                              type="number"
                              className="w-20 p-1 bg-white border border-gray-200 rounded text-right outline-none focus:border-indigo-500"
                              value={item.required_qty}
                              onChange={(e) => handleUpdateItem(idx, 'required_qty', e.target.value)}
                            />
                          ) : (
                            <span>{item.required_qty} {item.uom}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
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
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
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

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs  text-gray-700 flex items-center gap-1">
                  <Calendar size={14} className="text-gray-400" />
                  Expected Return Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.expected_return_date}
                  onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs  text-gray-700">Dispatch Quantity</label>
                <div className="relative">
                  <input
                    type="number"
                    disabled
                    className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded  text-sm text-gray-500 cursor-not-allowed"
                    value={formData.release_quantity}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]  text-gray-500-400 ">
                    {workOrder?.uom || 'Units'}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs  text-gray-700">Dispatch Notes</label>
                <textarea
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded  text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none h-20"
                  placeholder="Any specific instructions for the vendor..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm  text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 p-2  bg-indigo-600 text-white rounded  text-sm  hover:bg-indigo-700 transition-all  shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
