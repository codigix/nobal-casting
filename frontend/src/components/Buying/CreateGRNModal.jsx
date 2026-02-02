import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { Plus, Trash2, Package, FileText, Truck, Calendar, AlertCircle } from 'lucide-react'

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

  const [grnItems, setGrnItems] = useState([
    { item_code: '', item_name: '', po_qty: 0, received_qty: 0, rate: 0, batch_no: '', warehouse_name: '', uom: '', current_stock: 0 }
  ])

  const fetchItemStock = async (itemCode, warehouseName, index) => {
    if (!itemCode || !warehouseName) return

    try {
      const response = await api.get('/stock/stock-balance', {
        params: { item_code: itemCode, warehouse_name: warehouseName }
      })
      
      let stock = 0
      const data = response.data.data || response.data
      if (Array.isArray(data)) {
        const warehouseStock = data.find(s => s.warehouse_name === warehouseName || s.warehouse === warehouseName)
        stock = warehouseStock ? (warehouseStock.available_qty || warehouseStock.qty || 0) : 0
      } else if (data && typeof data === 'object') {
        stock = data.available_qty || data.qty || 0
      }

      setGrnItems(prev => {
        const updated = [...prev]
        if (updated[index]) {
          updated[index] = { ...updated[index], current_stock: stock }
        }
        return updated
      })
    } catch (err) {
      console.error('Error fetching stock:', err)
    }
  }

  useEffect(() => {
    const initModal = async () => {
      if (isOpen) {
        setLoading(true)
        setError(null)
        try {
          // Fetch all dependencies in parallel for efficiency
          const [whRes, supRes, itemsRes, poListRes] = await Promise.all([
            api.get('/stock/warehouses'),
            api.get('/suppliers'),
            api.get('/items'),
            api.get('/purchase-orders?status=submitted,to_receive,partially_received')
          ])

          const warehousesList = whRes.data.data || []
          const suppliersList = supRes.data.data || []
          const itemsList = itemsRes.data.data || []
          const posList = poListRes.data.data || []
          
          setWarehouses(warehousesList)
          setSuppliers(suppliersList)
          setItems(itemsList)
          setPurchaseOrders(posList)

          // Generate GRN Number
          const grnNoRes = await api.get('/grn-requests/generate-grn-no')
          const nextGrnNo = grnNoRes.data.success ? grnNoRes.data.data.grn_no : ''

          // Handle initial PO if provided
          let targetPO = purchaseOrder
          
          // If only initialPoNo is provided, or if purchaseOrder doesn't have items, fetch details
          if (!targetPO && initialPoNo) {
            const detailRes = await api.get(`/purchase-orders/${initialPoNo}`)
            if (detailRes.data.success) {
              targetPO = detailRes.data.data
            }
          } else if (targetPO && (!targetPO.items || targetPO.items.length === 0)) {
            const detailRes = await api.get(`/purchase-orders/${targetPO.po_no}`)
            if (detailRes.data.success) {
              targetPO = detailRes.data.data
            }
          }

          if (targetPO) {
            const defaultWarehouse = warehousesList.length > 0 ? warehousesList[0].warehouse_name : ''
            
            setFormData({
              grn_no: nextGrnNo,
              po_no: targetPO.po_no,
              mr_id: targetPO.mr_id || '',
              department: targetPO.department || '',
              purpose: targetPO.purpose || '',
              supplier_id: targetPO.supplier_id,
              supplier_name: targetPO.supplier_name || '',
              receipt_date: new Date().toISOString().split('T')[0],
              notes: ''
            })

            if (targetPO.items && targetPO.items.length > 0) {
              const newItems = targetPO.items.map(item => ({
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
              
              // Fetch stock for all items
              newItems.forEach((item, idx) => {
                if (item.item_code && defaultWarehouse) {
                  // We can't use fetchItemStock here directly as it relies on state which isn't updated yet
                  // but we can inline the logic or wait for next tick
                  fetchItemStockAfterInit(item.item_code, defaultWarehouse, idx, newItems)
                }
              })
            }
          } else {
            setFormData(prev => ({ ...prev, grn_no: nextGrnNo }))
          }
        } catch (err) {
          console.error('Error initializing GRN modal:', err)
          setError('Failed to load required data. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    }
    initModal()
  }, [isOpen, initialPoNo, purchaseOrder])

  const fetchItemStockAfterInit = async (itemCode, warehouseName, index, currentItems) => {
    try {
      const response = await api.get('/stock/stock-balance', {
        params: { item_code: itemCode, warehouse_name: warehouseName }
      })
      
      let stock = 0
      const data = response.data.data || response.data
      if (Array.isArray(data)) {
        const warehouseStock = data.find(s => s.warehouse_name === warehouseName || s.warehouse === warehouseName)
        stock = warehouseStock ? (warehouseStock.available_qty || warehouseStock.qty || 0) : 0
      } else if (data && typeof data === 'object') {
        stock = data.available_qty || data.qty || 0
      }

      setGrnItems(prev => {
        const updated = [...prev]
        if (updated[index]) {
          updated[index] = { ...updated[index], current_stock: stock }
        }
        return updated
      })
    } catch (err) {
      console.error('Error fetching stock:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      const warehousesList = response.data.data || []
      setWarehouses(warehousesList)
      
      if (warehousesList.length > 0 && grnItems.length > 0) {
        const defaultWarehouseName = warehousesList[0].warehouse_name
        const updatedItems = grnItems.map(item => ({
          ...item,
          warehouse_name: item.warehouse_name || defaultWarehouseName
        }))
        setGrnItems(updatedItems)
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers')
      setSuppliers(response.data.data || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get('/items')
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  const handlePOSelect = async (poNo, pos = purchaseOrders) => {
    if (!poNo) {
      setFormData(prev => ({
        ...prev,
        po_no: '',
        mr_id: '',
        department: '',
        purpose: '',
        supplier_id: '',
        supplier_name: ''
      }))
      const defaultWarehouse = warehouses.length > 0 ? warehouses[0].warehouse_name : ''
      setGrnItems([
        { item_code: '', item_name: '', po_qty: 0, received_qty: 0, rate: 0, batch_no: '', warehouse_name: defaultWarehouse, uom: '', current_stock: 0 }
      ])
      return
    }

    let selectedPO = pos.find(po => po.po_no === poNo)

    if (selectedPO && (!selectedPO.items || selectedPO.items.length === 0)) {
      setLoading(true)
      try {
        const response = await api.get(`/purchase-orders/${poNo}`)
        if (response.data.success) {
          selectedPO = response.data.data
        }
      } catch (err) {
        console.error('Error fetching PO details:', err)
      } finally {
        setLoading(false)
      }
    }

    if (selectedPO) {
      const defaultWarehouse = warehouses.length > 0 ? warehouses[0].warehouse_name : ''
      setFormData(prev => ({
        ...prev,
        po_no: selectedPO.po_no,
        mr_id: selectedPO.mr_id || '',
        department: selectedPO.department || '',
        purpose: selectedPO.purpose || '',
        supplier_id: selectedPO.supplier_id,
        supplier_name: selectedPO.supplier_name || ''
      }))

      if (selectedPO.items && selectedPO.items.length > 0) {
        const newItems = selectedPO.items.map(item => ({
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
        
        // Fetch stock for all items
        newItems.forEach((item, idx) => {
          if (item.item_code && defaultWarehouse) {
            fetchItemStock(item.item_code, defaultWarehouse, idx)
          }
        })
      }
    }
  }

  const handleSupplierChange = (supplierId) => {
    const selectedSupplier = suppliers.find(s => s.supplier_id === supplierId)
    if (selectedSupplier) {
      setFormData(prev => ({
        ...prev,
        supplier_id: selectedSupplier.supplier_id,
        supplier_name: selectedSupplier.name || ''
      }))
    }
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...grnItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setGrnItems(newItems)

    if (field === 'warehouse_name' && newItems[index].item_code) {
      fetchItemStock(newItems[index].item_code, value, index)
    }
  }

  const handleAddItem = () => {
    const defaultWarehouse = warehouses && warehouses.length > 0 ? warehouses[0].warehouse_name : ''
    setGrnItems([
      ...grnItems,
      { item_code: '', item_name: '', po_qty: 0, received_qty: 0, rate: 0, batch_no: '', warehouse_name: defaultWarehouse, uom: '', current_stock: 0 }
    ])
  }

  const handleRemoveItem = (index) => {
    if (grnItems.length > 1) {
      setGrnItems(grnItems.filter((_, i) => i !== index))
    }
  }

  const handleItemCodeSelect = (index, itemCode) => {
    const selectedItem = items.find(item => item.item_code === itemCode)
    if (selectedItem) {
      const newItems = [...grnItems]
      newItems[index] = {
        ...newItems[index],
        item_code: selectedItem.item_code,
        item_name: selectedItem.name || selectedItem.item_name,
        uom: selectedItem.uom || '',
        rate: selectedItem.valuation_rate || selectedItem.rate || 0,
        current_stock: 0
      }
      setGrnItems(newItems)
      
      if (newItems[index].warehouse_name) {
        fetchItemStock(itemCode, newItems[index].warehouse_name, index)
      }
    }
  }

  const handleSubmit = async () => {
    if (!formData.grn_no || !formData.supplier_name) {
      setError('Please fill in GRN Number and Supplier Name')
      return
    }

    if (grnItems.length === 0 || !grnItems.some(item => item.item_code)) {
      setError('Please add at least one item')
      return
    }

    const allItemsValid = grnItems.every(item => {
      if (!item.item_code) return true
      return item.received_qty > 0 && item.warehouse_name
    })

    if (!allItemsValid) {
      setError('Please ensure all items have received quantity and warehouse assigned')
      return
    }

    setLoading(true)
    try {
      const payload = {
        grn_no: formData.grn_no,
        po_no: formData.po_no || null,
        material_request_id: formData.mr_id || null,
        department: formData.department || null,
        purpose: formData.purpose || null,
        supplier_id: formData.supplier_id || null,
        supplier_name: formData.supplier_name,
        receipt_date: formData.receipt_date,
        items: grnItems.filter(item => item.item_code),
        notes: formData.notes
      }

      const response = await api.post('/grn-requests', payload)

      if (response.data.success || response.status === 200 || response.status === 201) {
        setError(null)
        onSuccess && onSuccess(response.data.data)
        onClose()
      } else {
        setError(response.data.error || 'Failed to create GRN request')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create GRN request')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="full"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmit} loading={loading}>
            Create GRN Request
          </Button>
        </div>
      }
    >
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto px-1">
        {/* Modern Header Section */}
        <div className="bg-white border-b border-slate-200  p-2 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl  text-slate-800 m-0">Create GRN Request</h2>
              <p className="text-xs text-slate-500 m-0">Register received goods from Purchase Orders</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px]  text-slate-400  tracking-wider mb-1">GRN Reference</span>
            <div className="bg-indigo-600 text-white px-3 py-1 rounded  font-mono text-xs   shadow-indigo-200">
              {formData.grn_no}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2">
            <Alert type="danger" icon={<AlertCircle size={18} />}>{error}</Alert>
          </div>
        )}

        {/* Main Grid Layout - Changed to more vertical friendly layout */}
        <div className="space-y-6 mb-6">
          {/* Top Row: Basic Info & Supplier in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="bg-white rounded border border-slate-200 ">
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                <h3 className="text-xs text-slate-700 m-0">Receipt Details</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs  text-slate-500  mb-1.5">
                    Receipt Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={formData.receipt_date}
                      onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs  text-slate-500  mb-1.5">
                    Purchase Order Reference
                  </label>
                  <select
                    value={formData.po_no}
                    onChange={(e) => handlePOSelect(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none"
                  >
                    <option value="">-- No PO / Manual Entry --</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id || po.po_no} value={po.po_no}>
                        {po.po_no} ({po.supplier_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 ">
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Truck size={16} className="text-indigo-500" />
                <h3 className="text-xs text-slate-700 m-0">Supplier Information</h3>
              </div>
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-xs  text-slate-500  mb-1.5">
                    Supplier Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.supplier_id && (
                  <div className="flex-1 p-2.5 bg-indigo-50 rounded-lg flex items-center gap-2.5 text-indigo-700 border border-indigo-100">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-indigo-600   shrink-0">
                      <Truck size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs  m-0 leading-none mb-1">Active Supplier</p>
                      <p className="text-[10px] m-0 opacity-80 truncate">{formData.supplier_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Items Table Full Width */}
          <div className="w-full">
            <div className="bg-white rounded border border-slate-200  flex flex-col">
              <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-indigo-500" />
                  <h3 className="text-xs text-slate-700 m-0">Received Items Breakdown</h3>
                </div>
                <Badge variant="ghost" color="indigo" className="px-2.5 py-1 text-[10px]   tracking-wider">
                  {grnItems.filter(i => i.item_code).length} Items Selected
                </Badge>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="p-2 text-left  text-slate-500  tracking-wider w-[180px]">Item</th>
                      <th className="p-2 text-center  text-slate-500  tracking-wider">Stock</th>
                      <th className="p-2 text-center  text-slate-500  tracking-wider">PO Qty</th>
                      <th className="p-2 text-center  text-slate-500  tracking-wider w-[100px]">Received</th>
                      <th className="p-2 text-center  text-slate-500  tracking-wider w-[100px]">Rate</th>
                      <th className="p-2 text-left  text-slate-500  tracking-wider min-w-[150px]">Warehouse</th>
                      <th className="p-2 text-center  text-slate-500  tracking-wider w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grnItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-2 ">
                          <select
                            value={item.item_code}
                            onChange={(e) => handleItemCodeSelect(index, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded  text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          >
                            <option value="">Select Item</option>
                            {items.map(itemOption => (
                              <option key={itemOption.id || itemOption.item_code} value={itemOption.item_code}>
                                {itemOption.item_code} - {itemOption.name || itemOption.item_name}
                              </option>
                            ))}
                          </select>
                          {item.item_name && <p className="mt-1 text-[10px] text-slate-400 font-medium truncate px-1">{item.item_name}</p>}
                        </td>
                        <td className="p-2 text-center">
                          <div className="inline-flex flex-col">
                            <span className={`text-[11px]  ${item.current_stock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {item.current_stock.toLocaleString()}
                            </span>
                            <span className="text-[9px] text-slate-400   tracking-tighter">On Hand</span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-[11px]  text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.po_qty} {item.uom}
                          </span>
                        </td>
                        <td className="p-2 ">
                          <input
                            type="number"
                            value={item.received_qty}
                            onChange={(e) => handleItemChange(index, 'received_qty', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded  text-center text-xs  text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            min="0"
                          />
                        </td>
                        <td className="p-2 ">
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 ">₹</span>
                            <input
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full pl-4 pr-1 py-1.5 border border-slate-200 rounded  text-center text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                              min="0"
                            />
                          </div>
                        </td>
                        <td className="p-2 ">
                          <select
                            value={item.warehouse_name}
                            onChange={(e) => handleItemChange(index, 'warehouse_name', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded  text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                          >
                            <option value="">Select Warehouse</option>
                            {warehouses.map(wh => (
                              <option key={wh.id || wh.warehouse_name} value={wh.warehouse_name}>
                                {wh.warehouse_name}
                              </option>
                            ))}
                          </select>
                          <input 
                            type="text"
                            placeholder="Batch No (Opt)"
                            value={item.batch_no}
                            onChange={(e) => handleItemChange(index, 'batch_no', e.target.value)}
                            className="mt-1.5 w-full px-2 py-1 border border-slate-100 rounded text-[10px] italic text-slate-500 focus:border-indigo-300 outline-none"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={grnItems.length === 1}
                            className={`p-1.5 rounded-lg transition-all ${
                              grnItems.length === 1
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Table Footer for Totals */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan="3" className="p-2 text-right  text-slate-500  tracking-wider">
                        Total Summary
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex flex-col">
                          <span className="text-xs  text-indigo-600">
                            {grnItems.reduce((sum, i) => sum + (parseFloat(i.received_qty) || 0), 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 ">Total Qty</span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex flex-col">
                          <span className="text-xs  text-slate-700">
                            ₹{grnItems.reduce((sum, i) => sum + ((parseFloat(i.received_qty) || 0) * (parseFloat(i.rate) || 0)), 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] text-slate-400 ">Total Value</span>
                        </div>
                      </td>
                      <td colSpan="2" className="p-2 "></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="p-4 bg-slate-50/50 border-t border-slate-100 mt-auto">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-2 p-2  bg-white border border-slate-200 text-slate-600 rounded-lg text-xs  hover:bg-slate-50 hover:border-slate-300 transition-all   active:scale-95"
                >
                  <Plus size={14} className="text-indigo-500" />
                  Add Manual Item
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section Full Width */}
        
      </div>
    </Modal>
  )
}
