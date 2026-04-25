import { useState, useEffect, useMemo } from 'react'
import { 
  X, Package, Calendar, Info, AlertCircle, CheckCircle2, List, User, 
  Trash2, Plus, Truck, ArrowRight, ShieldCheck, HelpCircle, Save, Send
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'
import SearchableSelect from '../SearchableSelect'
import DataTable from '../Table/DataTable'

export default function SubcontractDispatchModal({ isOpen, onClose, jobCard, onDispatchSuccess }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [workOrder, setWorkOrder] = useState(null)
  const [vendors, setVendors] = useState([])
  const [items, setItems] = useState([])
  const [releaseItems, setReleaseItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  
  const [formData, setFormData] = useState({
    challan_no: `OC-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
    job_card_id: '',
    vendor_id: '',
    vendor_name: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    expected_return_date: '',
    dispatch_type: 'Partial',
    status: 'DRAFT',
    work_order_id: '',
    source_warehouse_id: 'WIP - Work In Progress',
    vendor_warehouse_id: '',
    reference_no: '',
    remarks: '',
    rate_type: 'Per Unit',
    rate: 50.00,
    total_cost: 0,
    transporter_name: '',
    vehicle_number: '',
    driver_name: '',
    contact_no: '',
    release_quantity: 0
  })

  useEffect(() => {
    if (isOpen && jobCard) {
      const plannedQty = jobCard.max_allowed_quantity !== undefined ? parseFloat(jobCard.max_allowed_quantity) : (jobCard.planned_quantity || 0)
      const remainingToDispatch = Math.max(0, plannedQty - (jobCard.total_dispatched || 0))
      
      setFormData(prev => ({
        ...prev,
        job_card_id: jobCard.job_card_id,
        work_order_id: jobCard.work_order_id,
        vendor_id: jobCard.vendor_id || '',
        vendor_name: jobCard.vendor_name || '',
        release_quantity: remainingToDispatch,
        vendor_warehouse_id: jobCard.vendor_name ? `${jobCard.vendor_name} - Vendor WH` : ''
      }))
      
      fetchWorkOrderDetails(jobCard.work_order_id)
      fetchVendors()
      fetchItems()
      fetchWarehouses()
    }
  }, [isOpen, jobCard])

  // Auto-calculate total cost
  useEffect(() => {
    const total = (parseFloat(formData.release_quantity) || 0) * (parseFloat(formData.rate) || 0)
    setFormData(prev => ({ ...prev, total_cost: total }))
  }, [formData.release_quantity, formData.rate])

  const fetchWarehouses = async () => {
    try {
      const res = await productionService.getWarehouses()
      if (res.success) {
        setWarehouses((res.data || []).map(w => ({ value: w.name, label: w.name })))
      }
    } catch (err) {
      console.error('Failed to fetch warehouses')
    }
  }

  const fetchItems = async () => {
    try {
      const res = await productionService.getItems()
      if (res.success) {
        const itemOptions = (res.data || []).map(i => ({
          value: i.item_code,
          label: `${i.item_code} - ${i.name || ''}`,
          uom: i.uom,
          name: i.name
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

        // Initial items from Work Order
        let opItems = (res.data.items || []).filter(item => 
          !item.operation || item.operation === jobCard.operation
        ).map(item => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          item_name: item.item_name || item.name,
          batch_no: 'BATCH-001',
          available_qty: 100, // Mock available qty
          release_qty: ((parseFloat(item.required_qty) / parseFloat(res.data.quantity)) * remainingToDispatch)
        }))

        if (opItems.length === 0) {
           opItems = [{
              id: Math.random().toString(36).substr(2, 9),
              item_code: res.data.item_code,
              item_name: res.data.item_name || res.data.item_code,
              batch_no: 'BATCH-001',
              available_qty: 100,
              required_qty: res.data.quantity,
              release_qty: remainingToDispatch,
              uom: res.data.uom || 'pcs'
            }]
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
    
    if (workOrder && workOrder.quantity > 0) {
      setReleaseItems(prev => prev.map(item => ({
        ...item,
        release_qty: ((parseFloat(item.required_qty) / parseFloat(workOrder.quantity)) * newQty)
      })))
    }
  }

  const handleAddItem = () => {
    setReleaseItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      item_code: '',
      item_name: '',
      batch_no: '',
      available_qty: 0,
      required_qty: 0,
      release_qty: 0,
      uom: '',
      is_manual: true
    }])
  }

  const handleUpdateItem = (id, field, value) => {
    setReleaseItems(prev => prev.map(item => {
      if (item.id === id) {
        let finalValue = value
        if (['required_qty', 'release_qty', 'available_qty'].includes(field)) {
          finalValue = parseFloat(value) || 0
        }
        
        const updatedItem = { ...item, [field]: finalValue }
        
        if (field === 'item_code') {
          const selectedItem = items.find(i => i.value === value)
          if (selectedItem) {
            updatedItem.uom = selectedItem.uom
            updatedItem.item_name = selectedItem.name
          }
        }
        return updatedItem
      }
      return item
    }))
  }

  const handleDeleteItem = (id) => {
    setReleaseItems(prev => prev.filter(item => item.id !== id))
  }

  const dispatchColumns = useMemo(() => [
    {
      key: 'index',
      label: '#',
      render: (_, __, idx) => idx + 1,
      className: 'text-center text-xs font-bold text-slate-400 w-12'
    },
    {
      key: 'item_code',
      label: 'Item Code',
      render: (value, row) => (
        <div className="min-w-[200px]">
          <SearchableSelect
            options={items}
            value={value}
            onChange={val => handleUpdateItem(row.id, 'item_code', val)}
            containerClassName="border-slate-200 shadow-none bg-white text-xs"
          />
        </div>
      )
    },
    {
      key: 'item_name',
      label: 'Item Name',
      render: (value) => (
        <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 font-medium outline-none" value={value} readOnly />
      )
    },
    {
      key: 'batch_no',
      label: 'Batch No.',
      render: (value, row) => (
        <input 
          type="text" 
          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:border-blue-500 transition-colors" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'batch_no', e.target.value)} 
        />
      ),
      className: 'w-32'
    },
    {
      key: 'available_qty',
      label: 'Available Qty (Nos)',
      className: 'text-center w-36',
      render: (value) => (
        <div className="bg-slate-100 p-2 rounded text-xs text-slate-600 border border-slate-200">{value}</div>
      )
    },
    {
      key: 'release_qty',
      label: 'Dispatch Qty (Nos) *',
      className: 'text-center w-36',
      render: (value, row) => (
        <input 
          type="number" 
          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-center text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'release_qty', e.target.value)} 
        />
      )
    },
    {
      key: 'uom',
      label: 'UOM',
      className: 'text-xs text-slate-500 w-20'
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (value, row) => renderDispatchActions(row)
    }
  ], [items, releaseItems]);

  const renderDispatchActions = (row) => (
    <button onClick={() => handleDeleteItem(row.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
      <Trash2 size={16} />
    </button>
  );

  const fetchVendors = async () => {
    try {
      const res = await productionService.getVendors()
      if (res.success) {
        setVendors((res.data || []).map(v => ({
          value: v.supplier_id,
          label: v.name || v.supplier_id
        })))
      }
    } catch (err) {
      console.error('Failed to fetch vendors')
    }
  }

  const handleVendorChange = (vendorId) => {
    const selectedVendor = vendors.find(v => v.value === vendorId)
    setFormData(prev => ({
      ...prev,
      vendor_id: vendorId,
      vendor_name: selectedVendor ? selectedVendor.label : '',
      vendor_warehouse_id: selectedVendor ? `${selectedVendor.label} - Vendor WH` : ''
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validations = getValidations()
    const allValid = Object.values(validations).every(v => v.status === 'success')
    
    if (!allValid) {
      toast.addToast('Please fix validation errors before submitting', 'error')
      return
    }

    try {
      setLoading(true)
      await productionService.createOutwardChallan({
        ...formData,
        dispatch_quantity: formData.release_quantity,
        items: releaseItems,
        transporter_name: formData.transporter_name,
        vehicle_number: formData.vehicle_number
      })

      toast.addToast(`Outward challan created successfully`, 'success')
      onDispatchSuccess()
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to dispatch job card', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getValidations = () => {
    const itemsValid = releaseItems.length > 0 && releaseItems.every(i => i.item_code && i.release_qty > 0)
    const qtyCheck = releaseItems.every(i => i.release_qty <= i.available_qty)
    
    return {
      vendor: { label: 'Vendor is selected', status: formData.vendor_id ? 'success' : 'pending' },
      operation: { label: 'Operation is selected', status: jobCard?.operation ? 'success' : 'pending' },
      workOrder: { label: 'Work Order is selected', status: formData.work_order_id ? 'success' : 'pending' },
      warehouse: { label: 'Source Warehouse is selected', status: formData.source_warehouse_id ? 'success' : 'pending' },
      items: { label: 'At least one item is added', status: releaseItems.length > 0 ? 'success' : 'pending' },
      qtyPositive: { label: 'Dispatch quantity is greater than 0', status: formData.release_quantity > 0 ? 'success' : 'pending' },
      qtyAvailable: { 
        label: 'Dispatch quantity cannot exceed available quantity', 
        status: qtyCheck ? 'success' : 'error',
        errors: releaseItems.filter(i => i.release_qty > i.available_qty).map((i, idx) => `Item ${idx+1}: Max available is ${i.available_qty} ${i.uom}`)
      }
    }
  }

  if (!isOpen) return null

  const totalDispatchQty = releaseItems.reduce((sum, i) => sum + (parseFloat(i.release_qty) || 0), 0)
  const totalAvailableQty = releaseItems.reduce((sum, i) => sum + (parseFloat(i.available_qty) || 0), 0)
  const validations = getValidations()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-slate-50 rounded w-full max-w-5xl overflow-hidden flex flex-col h-[90vh]  border border-slate-200">
        
        {/* Header */}
        <div className="p-2 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-blue-600 mb-0.5">
               <span className="text-xs   ">Manufacturing</span>
               <ArrowRight size={12} />
               <span className="text-xs   ">Outward Challan</span>
               <ArrowRight size={12} />
               <span className="text-xs    text-slate-400">Create</span>
            </div>
            <h1 className="text-xl  text-slate-800">Create Outward Challan</h1>
            <p className="text-xs text-slate-500">Dispatch materials to vendor for subcontracting / outsourcing operation</p>
          </div>
          <div className="flex items-center gap-2">
             <button className="flex items-center gap-2 p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors text-xs ">
                <HelpCircle size={15} />
                Help
             </button>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={15} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Main Form Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            
            {/* Section 1: Challan Details */}
            <div className="">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">1</div>
                <h3 className="text-base font-semibold text-slate-800">Challan Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Challan No. <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" value={formData.challan_no} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Challan Date <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="date" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.dispatch_date} onChange={e => setFormData(prev => ({...prev, dispatch_date: e.target.value}))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Dispatch Type <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none" value={formData.dispatch_type} onChange={e => setFormData(prev => ({...prev, dispatch_type: e.target.value}))}>
                    <option value="Partial">Partial</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Status</label>
                  <div className="w-full flex items-center">
                    <span className="p-2 w-full bg-slate-100 text-slate-600 rounded text-xs  border border-slate-200  ">{formData.status}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Vendor <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.vendor_id} onChange={e => handleVendorChange(e.target.value)}>
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Operation <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={jobCard?.operation || ''} disabled>
                    <option value={jobCard?.operation || ''}>{jobCard?.operation || 'Select Operation'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Work Order <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.work_order_id} disabled>
                    <option value={formData.work_order_id}>{formData.work_order_id}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Job Card</label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.job_card_id} disabled>
                    <option value={formData.job_card_id}>{formData.job_card_id}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Source Warehouse <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.source_warehouse_id} onChange={e => setFormData(prev => ({...prev, source_warehouse_id: e.target.value}))}>
                    {warehouses.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Vendor Warehouse</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.vendor_warehouse_id} disabled>
                    <option value={formData.vendor_warehouse_id}>{formData.vendor_warehouse_id || 'Select Vendor WH'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Expected Return Date <span className="text-red-500">*</span></label>
                  <input type="date" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.expected_return_date} onChange={e => setFormData(prev => ({...prev, expected_return_date: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500  ">Reference (PO / Contract)</label>
                  <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.reference_no} onChange={e => setFormData(prev => ({...prev, reference_no: e.target.value}))} placeholder="PO-00456" />
                </div>
              </div>
              
             
            </div>

            {/* Section 2: Items to Dispatch */}
            <div className="">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">2</div>
                  <h3 className="text-base font-semibold text-slate-800">Items to Dispatch</h3>
                </div>
                <button type="button" onClick={handleAddItem} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-all text-xs  border border-blue-100  tracking-wide">
                  <Plus size={14} />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto rounded border border-slate-100">
                <DataTable
                  columns={dispatchColumns}
                  data={releaseItems}
                  renderActions={renderDispatchActions}
                  disablePagination={true}
                  sortable={false}
                />
              </div>
              
              <div className="flex items-center justify-between p-2 bg-emerald-50/50 border border-emerald-100 rounded">
                 <div className="flex items-center gap-2.5 text-emerald-700  text-xs  tracking-wide">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Total Dispatch Qty: {totalDispatchQty} Nos</span>
                 </div>
                 <span className="text-xs  text-emerald-600/70  ">Total Available Qty: {totalAvailableQty} Nos</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
               {/* Section 3: Cost Details */}
               <div className="bg-white p-2 rounded border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">3</div>
                    <h3 className="text-base font-semibold text-slate-800">Cost Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Rate Type <span className="text-red-500">*</span></label>
                      <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.rate_type} onChange={e => setFormData(prev => ({...prev, rate_type: e.target.value}))}>
                        <option value="Per Unit">Per Unit</option>
                        <option value="Fixed">Fixed</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Rate (₹) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs">₹</span>
                        <input type="number" className="w-full pl-7 p-2 bg-white border border-slate-200 rounded text-xs  focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.rate} onChange={e => setFormData(prev => ({...prev, rate: parseFloat(e.target.value) || 0}))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Total Cost (₹)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-blue-400 text-xs">₹</span>
                        <input type="text" className="w-full pl-7 p-2 bg-blue-50 border border-blue-100 rounded text-xs  text-blue-700 outline-none" value={formData.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} readOnly />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium italic">
                    <Info size={12} />
                    <span>Total Cost = Dispatch Qty × Rate</span>
                  </div>
               </div>

               {/* Section 4: Logistics Details */}
               <div className="bg-white p-2 rounded border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">4</div>
                    <h3 className="text-base font-semibold text-slate-800">Logistics Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Transporter</label>
                      <div className="relative">
                        <Truck size={14} className="absolute left-3 top-2.5 text-slate-300" />
                        <input type="text" className="w-full pl-9 p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.transporter_name} onChange={e => setFormData(prev => ({...prev, transporter_name: e.target.value}))} placeholder="Shree Transport" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Vehicle No.</label>
                      <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-xs  focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:font-normal " value={formData.vehicle_number} onChange={e => setFormData(prev => ({...prev, vehicle_number: e.target.value}))} placeholder="MH12 AB 1234" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Driver Name</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3 top-2.5 text-slate-300" />
                        <input type="text" className="w-full pl-9 p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.driver_name} onChange={e => setFormData(prev => ({...prev, driver_name: e.target.value}))} placeholder="Ramesh Yadav" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-500  ">Contact No.</label>
                      <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={formData.contact_no} onChange={e => setFormData(prev => ({...prev, contact_no: e.target.value}))} placeholder="9876543210" />
                    </div>
                  </div>
               </div>
            </div>
             <div className="">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-500  ">Remarks</label>
                  <span className="text-xs text-slate-400 font-medium">{formData.remarks.length} / 250</span>
                </div>
                <textarea 
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-300" 
                  value={formData.remarks} 
                  onChange={e => setFormData(prev => ({...prev, remarks: e.target.value.slice(0, 250)}))} 
                  placeholder="Please process on priority basis." 
                />
              </div>
          </div>

          {/* Right Sidebar - Info & Validations */}
          <div className="w-[340px] bg-slate-50 border-l border-slate-200 p-2 space-y-2 overflow-y-auto overflow-x-hidden shadow-inner">
             
             {/* Validations Checklist */}
             <div className="bg-white p-2 rounded border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-3">
                   <ShieldCheck size={18} className="text-blue-600" />
                   <h4 className="text-xs   ">Validations</h4>
                </div>
                <div className="space-y-2">
                   {Object.entries(validations).map(([key, v]) => (
                     <div key={key} className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 group">
                           <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                              v.status === 'success' ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-100' : 
                              v.status === 'error' ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-100' : 
                              'bg-white border-slate-200 text-slate-200'
                           }`}>
                              {v.status === 'success' ? <CheckCircle2 size={12} strokeWidth={4} /> : 
                               v.status === 'error' ? <X size={12} strokeWidth={4} /> : 
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                           </div>
                           <span className={`text-xs  leading-tight   ${
                             v.status === 'success' ? 'text-emerald-700' : 
                             v.status === 'error' ? 'text-red-600' : 
                             'text-slate-400'
                           }`}>{v.label}</span>
                        </div>
                        {v.errors && v.status === 'error' && (
                          <div className="ml-8 space-y-1.5 border-l-2 border-red-100 pl-3 py-1">
                             {v.errors.map((err, i) => (
                               <p key={i} className="text-xs  text-red-500 flex items-start gap-1.5">
                                  <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                                  <span>{err}</span>
                               </p>
                             ))}
                          </div>
                        )}
                     </div>
                   ))}
                </div>
             </div>

             {/* Summary Section */}
             <div className="space-y-2 bg-blue-600 p-2 rounded border border-blue-500 shadow-lg shadow-blue-100">
                <div className="flex items-center gap-2 text-white border-b border-blue-400/50 pb-3">
                   <Package size={18} />
                   <h4 className="text-xs  text-white ">Summary</h4>
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-xs  text-blue-100">
                      <span className="  opacity-70 text-xs">Total Items</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-white">{releaseItems.length}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs  text-blue-100">
                      <span className="  opacity-70 text-xs">Total Dispatch Qty</span>
                      <span className="text-lg text-white">{totalDispatchQty} <span className="text-xs opacity-70">Nos</span></span>
                   </div>
                   <div className="flex justify-between items-center text-xs  text-blue-100">
                      <span className="  opacity-70 text-xs">Total Cost</span>
                      <span className="text-lg text-white">₹ {formData.total_cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                   </div>
                   <div className="pt-4 border-t border-blue-400/50 space-y-3">
                      <div className="flex flex-col gap-1">
                         <span className="text-xs text-blue-200   ">Source Warehouse</span>
                         <span className="text-xs  text-white truncate">{formData.source_warehouse_id}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                         <span className="text-xs text-blue-200   ">Vendor</span>
                         <span className="text-xs  text-white truncate">{formData.vendor_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-xs text-blue-200   ">Expected Return</span>
                         <span className="text-xs  text-white">{formData.expected_return_date ? new Date(formData.expected_return_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Business Rules Section */}
             <div className="space-y-2 bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800 border-b border-amber-200/50 pb-3">
                   <Info size={18} />
                   <h4 className="text-xs   ">Business Rules</h4>
                </div>
                <ul className="space-y-3">
                   {[
                     "Dispatch quantity must be less than or equal to available quantity.",
                     "At least one item is required.",
                     "Dispatch type is mandatory.",
                     "Expected return date must be today or a future date."
                   ].map((rule, idx) => (
                     <li key={idx} className="flex gap-2.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                       <span className="text-xs  text-amber-800/80 leading-normal  ">{rule}</span>
                     </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-2 bg-white border-t border-slate-200 flex justify-end items-center gap-2">
           <span className="mr-auto text-xs text-slate-400 ">
             <span className="text-red-500 ">*</span> Mandatory Fields
           </span>
           <button onClick={onClose} className="p-2 text-slate-600  hover:bg-slate-100 rounded transition-all text-xs">
             Cancel
           </button>
           <button type="button" onClick={() => toast.addToast('Draft saved successfully', 'info')} className="flex items-center gap-2 p-2 bg-white text-blue-600 border border-blue-600 rounded  hover:bg-blue-50 transition-all text-xs group">
              <Save size={15} className="group-hover:scale-110 transition-transform" />
              Save as Draft
           </button>
           <button onClick={handleSubmit} className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded  hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all text-xs disabled:opacity-50 group" disabled={loading}>
              <Send size={15} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              Submit Challan
           </button>
        </div>
      </div>
    </div>
  )
}
