import { useState, useEffect, useMemo } from 'react'
import { 
  X, Package, Calendar, Info, AlertCircle, CheckCircle2, List, User, 
  Trash2, Plus, Truck, ArrowRight, ShieldCheck, HelpCircle, Save, Send,
  ClipboardCheck, UserCheck, MapPin, Gauge
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'
import SearchableSelect from '../SearchableSelect'
import DataTable from '../Table/DataTable'

export default function SubcontractReceiptModal({ isOpen, onClose, jobCard, onReceiptSuccess }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [outwardChallans, setOutwardChallans] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [employees, setEmployees] = useState([])
  const [releaseItems, setReleaseItems] = useState([])
  
  const [formData, setFormData] = useState({
    challan_no: `IC-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
    challan_date: new Date().toISOString().split('T')[0],
    vendor_id: '',
    vendor_name: '',
    operation: '',
    outward_challan_id: '',
    work_order_id: '',
    job_card_id: '',
    vendor_warehouse_id: '',
    source_warehouse_id: '',
    destination_warehouse_id: 'WIP - Work In Progress',
    grn_no: '',
    vehicle_number: '',
    received_by: '',
    expected_return_date: '',
    actual_return_date: new Date().toISOString().split('T')[0],
    remarks: '',
    inspection_by: 'QC Team',
    inspection_date: new Date().toISOString().split('T')[0],
    quality_status: 'Accepted',
    rate_type: 'Per Unit',
    rate: 50.00,
    total_cost: 0,
    quantity_received: 0,
    quantity_accepted: 0,
    quantity_rejected: 0
  })

  useEffect(() => {
    if (isOpen && jobCard) {
      const initialOutwardId = jobCard.outward_challan_id || ''
      setFormData(prev => ({
        ...prev,
        vendor_id: jobCard.vendor_id || '',
        vendor_name: jobCard.vendor_name || '',
        operation: jobCard.operation || '',
        work_order_id: jobCard.work_order_id || '',
        job_card_id: jobCard.job_card_id || '',
        outward_challan_id: initialOutwardId,
        vendor_warehouse_id: jobCard.vendor_name ? `${jobCard.vendor_name} - Vendor WH` : '',
        source_warehouse_id: jobCard.vendor_name ? `${jobCard.vendor_name} - Vendor WH` : '',
        expected_return_date: jobCard.expected_return_date ? new Date(jobCard.expected_return_date).toISOString().split('T')[0] : '',
        rate: parseFloat(jobCard.vendor_rate_per_unit || jobCard.rate || 50.00)
      }))
      
      fetchOutwardChallans(jobCard.job_card_id)
      fetchWarehouses()
      fetchEmployees()

      if (initialOutwardId) {
        handleOutwardChallanChange(initialOutwardId)
      }
    }
  }, [isOpen, jobCard])

  // Auto-calculate total cost and item totals
  useEffect(() => {
    // For subcontracting with multiple components, we usually track production by the set qty (max of items)
    // rather than the sum of all components, to avoid exceeding job card quantity limits.
    const sumReceived = releaseItems.reduce((sum, i) => sum + (parseFloat(i.received_qty) || 0), 0)
    const sumAccepted = releaseItems.reduce((sum, i) => sum + (parseFloat(i.accepted_qty) || 0), 0)
    const sumRejected = releaseItems.reduce((sum, i) => sum + (parseFloat(i.rejected_qty) || 0), 0)
    
    // Normalized quantities for Job Card progress (usually the max of components)
    const normalizedReceived = releaseItems.length > 0 ? Math.max(...releaseItems.map(i => parseFloat(i.received_qty) || 0)) : 0
    const normalizedAccepted = releaseItems.length > 0 ? Math.max(...releaseItems.map(i => parseFloat(i.accepted_qty) || 0)) : 0
    const normalizedRejected = releaseItems.length > 0 ? Math.max(...releaseItems.map(i => parseFloat(i.rejected_qty) || 0)) : 0

    const cost = sumAccepted * (parseFloat(formData.rate) || 0)
    
    setFormData(prev => ({ 
      ...prev, 
      total_cost: cost,
      quantity_received: normalizedReceived,
      quantity_accepted: normalizedAccepted,
      quantity_rejected: normalizedRejected
    }))
  }, [releaseItems, formData.rate])

  const fetchOutwardChallans = async (jcId) => {
    try {
      const res = await productionService.getOutwardChallans(jcId)
      if (res.success) {
        setOutwardChallans((res.data || []).map(c => ({ 
          value: c.id, 
          label: c.challan_number,
          date: c.challan_date,
          dispatch_qty: c.dispatch_quantity,
          vendor_name: c.vendor_name,
          vendor_warehouse_id: c.vendor_warehouse_id,
          source_warehouse_id: c.source_warehouse_id,
          work_order_id: c.work_order_id,
          operation: c.operation,
          rate: c.rate,
          rate_type: c.rate_type
        })))
      }
    } catch (err) {
      console.error('Failed to fetch outward challans')
    }
  }

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

  const fetchEmployees = async () => {
    try {
      const res = await productionService.getEmployees()
      if (res.success) {
        setEmployees((res.data || []).map(e => ({ 
          value: `${e.first_name} ${e.last_name}`, 
          label: `${e.first_name} ${e.last_name}` 
        })))
      }
    } catch (err) {
      console.error('Failed to fetch employees')
    }
  }

  const handleOutwardChallanChange = async (val) => {
    const selected = outwardChallans.find(c => c.value === val)
    setFormData(prev => ({ 
      ...prev, 
      outward_challan_id: val,
      vendor_name: selected?.vendor_name || prev.vendor_name,
      vendor_warehouse_id: selected?.vendor_warehouse_id || prev.vendor_warehouse_id,
      source_warehouse_id: selected?.source_warehouse_id || prev.source_warehouse_id,
      work_order_id: selected?.work_order_id || prev.work_order_id,
      operation: selected?.operation || prev.operation,
      rate: selected?.rate || 0,
      rate_type: selected?.rate_type || 'Per Unit'
    }))
    
    if (val) {
      try {
        const res = await productionService.getOutwardChallanItems(val)
        if (res.success) {
          setReleaseItems((res.data || []).map(i => ({
            ...i,
            id: Math.random().toString(36).substr(2, 9),
            item_name: i.item_name || i.item_code,
            dispatched_qty: i.release_qty,
            received_qty: i.release_qty,
            accepted_qty: i.release_qty,
            rejected_qty: 0,
            remarks: 'OK'
          })))
        }
      } catch (err) {
        toast.addToast('Failed to fetch challan items', 'error')
      }
    }
  }

  const handleUpdateItem = (id, field, value) => {
    setReleaseItems(prev => prev.map(item => {
      if (item.id === id) {
        let finalValue = value
        if (['received_qty', 'accepted_qty', 'rejected_qty', 'dispatched_qty'].includes(field)) {
          finalValue = parseFloat(value) || 0
        }
        
        const updatedItem = { ...item, [field]: finalValue }
        
        // Auto-calculate logic per row
        if (field === 'received_qty') {
          updatedItem.accepted_qty = finalValue
          updatedItem.rejected_qty = 0
        } else if (field === 'accepted_qty') {
          updatedItem.rejected_qty = Math.max(0, updatedItem.received_qty - finalValue)
        } else if (field === 'rejected_qty') {
          updatedItem.accepted_qty = Math.max(0, updatedItem.received_qty - finalValue)
        }
        return updatedItem
      }
      return item
    }))
  }

  const handleAddItem = () => {
    setReleaseItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      item_code: '',
      item_name: '',
      batch_no: '',
      dispatched_qty: 0,
      received_qty: 0,
      accepted_qty: 0,
      rejected_qty: 0,
      uom: 'Nos',
      remarks: ''
    }])
  }

  const handleRemoveItem = (id) => {
    setReleaseItems(prev => prev.filter(i => i.id !== id))
  }

  const receiptColumns = useMemo(() => [
    {
      key: 'index',
      label: '#',
      render: (_, __, idx) => idx + 1,
      className: 'text-center text-xs  text-slate-400 w-12'
    },
    {
      key: 'item_code',
      label: 'Item Code',
      render: (value, row) => (
        <input 
          type="text" 
          className="w-full bg-transparent text-xs text-slate-700 outline-none" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'item_code', e.target.value)}
          placeholder="Item Code"
        />
      )
    },
    {
      key: 'item_name',
      label: 'Item Name',
      render: (value, row) => (
        <input 
          type="text" 
          className="w-full bg-transparent text-[11px] text-slate-600 outline-none" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'item_name', e.target.value)}
          placeholder="Item Name"
        />
      )
    },
    {
      key: 'batch_no',
      label: 'Batch No.',
      render: (value, row) => (
        <input 
          type="text" 
          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'batch_no', e.target.value)} 
        />
      )
    },
    {
      key: 'dispatched_qty',
      label: 'Dispatched Qty (Nos)',
      className: 'text-center',
      render: (value, row) => (
        <input 
          type="number" 
          className="w-full bg-transparent text-xs text-center text-slate-500 outline-none" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'dispatched_qty', e.target.value)}
        />
      )
    },
    {
      key: 'received_qty',
      label: 'Received Qty (Nos) *',
      className: 'text-center',
      render: (value, row) => (
        <input 
          type="number" 
          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-center  text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'received_qty', e.target.value)} 
        />
      )
    },
    {
      key: 'accepted_qty',
      label: 'Accepted Qty (Nos)',
      className: 'text-center',
      render: (value, row) => (
        <input 
          type="number" 
          className="w-full px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs text-center  text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'accepted_qty', e.target.value)} 
        />
      )
    },
    {
      key: 'rejected_qty',
      label: 'Rejected Qty (Nos)',
      className: 'text-center',
      render: (value, row) => (
        <input 
          type="number" 
          className="w-full px-2 py-1 bg-rose-50 border border-rose-200 rounded text-xs text-center  text-rose-700 outline-none focus:ring-2 focus:ring-rose-500" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'rejected_qty', e.target.value)} 
        />
      )
    },
    {
      key: 'uom',
      label: 'UOM',
      className: 'text-[11px] text-slate-500 font-medium'
    },
    {
      key: 'remarks',
      label: 'Remarks',
      render: (value, row) => (
        <input 
          type="text" 
          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none" 
          value={value} 
          onChange={e => handleUpdateItem(row.id, 'remarks', e.target.value)} 
        />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      className: 'text-right',
      render: (value, row) => renderReceiptActions(row)
    }
  ], [releaseItems]);

  const renderReceiptActions = (row) => (
    <button 
      type="button"
      onClick={() => handleRemoveItem(row.id)}
      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
    >
      <Trash2 size={15} />
    </button>
  );

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validations = getValidations()
    const hasErrors = Object.values(validations).some(v => v.status === 'error')
    
    if (hasErrors) {
      toast.addToast('Please fix required validation errors before submitting', 'error')
      return
    }

    try {
      setLoading(true)
      await productionService.createInwardChallan({
        ...formData,
        items: releaseItems
      })

      toast.addToast(`Inward challan created successfully`, 'success')
      onReceiptSuccess()
      onClose()
    } catch (err) {
      toast.addToast(err.message || 'Failed to create inward challan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getValidations = () => {
    const itemsValid = releaseItems.length > 0
    const qtyCheck = releaseItems.every(i => i.received_qty <= i.dispatched_qty)
    const partialCheck = releaseItems.some(i => i.received_qty < i.dispatched_qty)
    
    return {
      vendor: { label: 'Vendor is selected', status: formData.vendor_id ? 'success' : 'pending' },
      outward: { label: 'Related Outward Challan is selected', status: formData.outward_challan_id ? 'success' : 'pending' },
      items: { label: 'Items added', status: itemsValid ? 'success' : 'pending' },
      qtyPositive: { label: 'Received quantity is greater than 0', status: formData.quantity_received > 0 ? 'success' : 'pending' },
      qtyDispatched: { 
        label: 'Qty received cannot exceed dispatched qty', 
        status: qtyCheck ? 'success' : 'error',
        errors: releaseItems.filter(i => i.received_qty > i.dispatched_qty).map((i, idx) => `Item ${idx+1}: Max dispatched is ${i.dispatched_qty} ${i.uom}`)
      },
      partial: {
        label: '1 item is partially received',
        status: partialCheck ? 'warning' : 'success',
        errors: releaseItems.filter(i => i.received_qty < i.dispatched_qty).map(i => `Item: ${i.item_code} (${i.received_qty} of ${i.dispatched_qty} ${i.uom})`)
      }
    }
  }

  if (!isOpen) return null

  const selectedOC = outwardChallans.find(c => c.value === formData.outward_challan_id)
  const validations = getValidations()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-slate-50 rounded w-full max-w-5xl overflow-hidden flex flex-col h-[95vh] shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="p-2 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-blue-600 mb-0.5">
               <span className="text-xs   ">Manufacturing</span>
               <ArrowRight size={12} />
               <span className="text-xs   ">Inward Challan</span>
               <ArrowRight size={12} />
               <span className="text-xs    text-slate-400">Create</span>
            </div>
            <h1 className="text-xl  text-slate-800 flex items-center gap-3">
               <Truck className="text-blue-600" size={28} />
               Create Inward Challan
            </h1>
            <p className="text-xs text-slate-500">Receive materials back from vendor after subcontracting / outsourcing operation</p>
          </div>
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 p-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors text-xs font-medium">
                <HelpCircle size={15} />
                Help
             </button>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Main Form Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            
            {/* Section 1: Challan Details */}
            <div className="">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs ">1</div>
                <h3 className="text-lg  text-slate-800">Challan Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Challan No. <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.challan_no} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Challan Date <span className="text-red-500">*</span></label>
                  <input type="date" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 transition-all outline-none" value={formData.challan_date} onChange={e => setFormData(prev => ({...prev, challan_date: e.target.value}))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Vendor <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.vendor_name} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Operation <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.operation} readOnly />
                </div>

                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Related Outward Challan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none" value={formData.outward_challan_id} onChange={e => handleOutwardChallanChange(e.target.value)}>
                      <option value="">Select Outward Challan</option>
                      {outwardChallans.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {selectedOC && (
                      <p className="mt-1 text-[10px] text-emerald-600 ">OC Date: {new Date(selectedOC.date).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Work Order</label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.work_order_id} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Job Card</label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.job_card_id} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Vendor Warehouse</label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.vendor_warehouse_id} readOnly />
                </div>

                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Source (From)</label>
                  <input type="text" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.source_warehouse_id} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Destination Warehouse <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.destination_warehouse_id} onChange={e => setFormData(prev => ({...prev, destination_warehouse_id: e.target.value}))}>
                    {warehouses.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">GRN / Gate Entry No.</label>
                  <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.grn_no} onChange={e => setFormData(prev => ({...prev, grn_no: e.target.value}))} placeholder="GE-00056" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Vehicle No.</label>
                  <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none " value={formData.vehicle_number} onChange={e => setFormData(prev => ({...prev, vehicle_number: e.target.value}))} placeholder="MH12 AB 1234" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Received By <span className="text-red-500">*</span></label>
                  <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.received_by} onChange={e => setFormData(prev => ({...prev, received_by: e.target.value}))}>
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Expected Return Date</label>
                  <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs" value={formData.expected_return_date} readOnly />
                </div>
                <div className="space-y-1">
                  <label className="text-xs  text-slate-500  ">Actual Return Date</label>
                  <input type="date" className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none" value={formData.actual_return_date} onChange={e => setFormData(prev => ({...prev, actual_return_date: e.target.value}))} />
                </div>
                <div className="space-y-1">
                   <div className="flex justify-between items-center">
                      <label className="text-xs  text-slate-500  ">Remarks</label>
                      <span className="text-[10px] text-slate-400 font-medium">{formData.remarks.length} / 250</span>
                   </div>
                   <textarea className="w-full p-2 bg-white border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none h-10 resize-none" value={formData.remarks} onChange={e => setFormData(prev => ({...prev, remarks: e.target.value.slice(0, 250)}))} placeholder="Received after shot blasting process." />
                </div>
              </div>
            </div>

            {/* Section 2: Items Received */}
            <div className="">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs ">2</div>
                  <h3 className="text-lg  text-slate-800">Items Received</h3>
                </div>
                <button 
                  type="button" 
                  onClick={handleAddItem}
                  className="flex items-center gap-2 p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-all text-xs  border border-blue-100"
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto rounded border border-slate-100">
                <DataTable
                  columns={receiptColumns}
                  data={releaseItems}
                  renderActions={renderReceiptActions}
                  disablePagination={true}
                  sortable={false}
                />
              </div>
              
              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-600">
                       <CheckCircle2 size={15} className="text-slate-400" />
                       <span className="text-xs ">Total Dispatched Qty: {releaseItems.reduce((sum, i) => sum + (parseFloat(i.dispatched_qty) || 0), 0)} Nos</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                       <ClipboardCheck size={15} className="text-emerald-500" />
                       <span className="text-xs ">Total Received Qty: {formData.quantity_received} Nos</span>
                    </div>
                 </div>
                 <span className="text-xs  text-emerald-700">Total Accepted Qty: {formData.quantity_accepted} Nos</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
               {/* Section 3: Quality / Inspection */}
               <div className="bg-white p-2 rounded border border-slate-200  space-y-2">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs ">3</div>
                    <h3 className="text-md  text-slate-800">Quality / Inspection</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs  text-slate-500  ">Inspection By</label>
                      <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none" value={formData.inspection_by} onChange={e => setFormData(prev => ({...prev, inspection_by: e.target.value}))} placeholder="QC Team" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs  text-slate-500  ">Inspection Date</label>
                      <input type="date" className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none" value={formData.inspection_date} onChange={e => setFormData(prev => ({...prev, inspection_date: e.target.value}))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs  text-slate-500  ">Quality Status</label>
                      <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none" value={formData.quality_status} onChange={e => setFormData(prev => ({...prev, quality_status: e.target.value}))}>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Partial">Partial</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs  text-slate-500  ">QC Remarks</label>
                      <span className="text-[10px] text-slate-400 font-medium">{formData.notes?.length || 0} / 200</span>
                    </div>
                    <textarea 
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none h-10 resize-none" 
                      placeholder="Quality check completed and accepted." 
                      value={formData.notes || ''}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value.slice(0, 200) }))}
                    />
                  </div>
               </div>

               {/* Section 4: Cost Details */}
               <div className="bg-white p-2 rounded border border-slate-200  space-y-2">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs ">4</div>
                    <h3 className="text-md  text-slate-800">Cost Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs  text-slate-500  ">Rate Type <span className="text-red-500">*</span></label>
                      <select className="w-full p-2 bg-white border border-slate-200 rounded text-xs outline-none" value={formData.rate_type} onChange={e => setFormData(prev => ({...prev, rate_type: e.target.value}))}>
                        <option value="Per Unit">Per Unit</option>
                        <option value="Fixed">Fixed</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs  text-slate-500  ">Rate (₹) <span className="text-red-500">*</span></label>
                      <input type="number" className="w-full p-2 bg-white border border-slate-200 rounded text-xs  outline-none focus:ring-2 focus:ring-blue-500" value={formData.rate} onChange={e => setFormData(prev => ({...prev, rate: parseFloat(e.target.value) || 0}))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs  text-slate-500  ">Total Cost (₹)</label>
                      <input type="number" className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs  text-blue-700 outline-none" value={formData.total_cost} readOnly />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">Total Cost = Accepted Qty × Rate</p>
               </div>
            </div>
          </div>

          {/* Right Sidebar - Info & Validations */}
          <div className="w-[320px] bg-white border-l border-slate-200 p-6 space-y-8 overflow-y-auto overflow-x-hidden">
             
             {/* Validations Checklist */}
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800  border-b border-slate-100 pb-2">
                   <ShieldCheck size={15} className="text-blue-600" />
                   <h4 className="text-xs">Validations</h4>
                </div>
                <div className="space-y-3">
                   {Object.entries(validations).map(([key, v]) => (
                     <div key={key} className="flex flex-col gap-1.5">
                        <div className="flex items-start gap-3 group">
                           <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${
                              v.status === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 
                              v.status === 'error' ? 'bg-red-100 border-red-200 text-red-600' : 
                              v.status === 'warning' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                              'bg-slate-50 border-slate-200 text-slate-300'
                           }`}>
                              {v.status === 'success' ? <CheckCircle2 size={12} strokeWidth={3} /> : 
                               v.status === 'warning' ? <AlertCircle size={12} strokeWidth={3} /> :
                               <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                           </div>
                           <span className={`text-[11px] font-medium leading-tight ${
                             v.status === 'success' ? 'text-emerald-700' : 
                             v.status === 'warning' ? 'text-amber-700' :
                             'text-slate-500'
                           }`}>{v.label}</span>
                        </div>
                        {v.errors && (v.status === 'error' || v.status === 'warning') && (
                          <div className="ml-7 space-y-1">
                             {v.errors.map((err, i) => (
                               <p key={i} className={`text-[10px] flex items-center gap-1 ${v.status === 'error' ? 'text-red-500' : 'text-amber-600'}`}>
                                  <AlertCircle size={10} />
                                  {err}
                               </p>
                             ))}
                          </div>
                        )}
                     </div>
                   ))}
                </div>
             </div>

             {/* Summary Section */}
             <div className="space-y-4 bg-blue-50/50 p-4 rounded border border-blue-100/50">
                <div className="flex items-center gap-2 text-blue-800  border-b border-blue-200/50 pb-2">
                   <Package size={15} />
                   <h4 className="text-xs">Summary</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total Items</span>
                      <span className=" text-slate-700">{releaseItems.length}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total Received Qty</span>
                      <span className=" text-blue-700">{formData.quantity_received} Nos</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Accepted Qty</span>
                      <span className=" text-emerald-700">{formData.quantity_accepted} Nos</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Rejected Qty</span>
                      <span className=" text-rose-600">{formData.quantity_rejected} Nos</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total Cost</span>
                      <span className=" text-slate-800">₹ {formData.total_cost.toLocaleString()}</span>
                   </div>
                   <div className="pt-2 border-t border-blue-200/50 space-y-2">
                      <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] text-slate-400  ">Vendor</span>
                         <span className="text-[11px]  text-slate-700 line-clamp-1">{formData.vendor_name}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] text-slate-400  ">utward Challan</span>
                         <span className="text-[11px]  text-blue-600">{selectedOC?.label || 'Not selected'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] text-slate-400  ">Outward Date</span>
                         <span className="text-[11px]  text-slate-700">{selectedOC ? new Date(selectedOC.date).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Business Rules Section */}
             <div className="space-y-4 bg-amber-50/50 p-4 rounded border border-amber-100/50">
                <div className="flex items-center gap-2 text-amber-800  border-b border-amber-200/50 pb-2">
                   <Info size={15} />
                   <h4 className="text-xs">Business Rules</h4>
                </div>
                <ul className="space-y-2 list-disc list-outside ml-3.5">
                   <li className="text-[10px] text-amber-800 leading-normal">Inward challan must be against an outward challan.</li>
                   <li className="text-[10px] text-amber-800 leading-normal">Received quantity cannot exceed dispatched quantity.</li>
                   <li className="text-[10px] text-amber-800 leading-normal">At least one item is required.</li>
                   <li className="text-[10px] text-amber-800 leading-normal">Actual return date cannot be before outward date.</li>
                </ul>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-2 bg-white border-t border-slate-200 flex justify-end items-center gap-4">
           <span className="mr-auto text-xs text-slate-400 font-medium">
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
              Submit Inward Challan
           </button>
        </div>
      </div>
    </div>
  )
}
