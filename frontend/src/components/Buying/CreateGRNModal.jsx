import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
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

      const newItems = [...grnItems]
      if (newItems[index]) {
        newItems[index].current_stock = stock
        setGrnItems(newItems)
      }
    } catch (err) {
      console.error('Error fetching stock:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses()
      fetchSuppliers()
      fetchItems()
      generateGRNNo()
      
      if (purchaseOrder) {
        handlePOSelect(purchaseOrder.po_no, [purchaseOrder])
      } else if (initialPoNo) {
        fetchPurchaseOrders().then((pos) => {
          handlePOSelect(initialPoNo, pos)
        })
      } else {
        fetchPurchaseOrders()
      }
    }
  }, [isOpen, initialPoNo, purchaseOrder])

  const generateGRNNo = async () => {
    try {
      const response = await api.get('/grn-requests/generate-grn-no')
      if (response.data.success) {
        setFormData(prev => ({ ...prev, grn_no: response.data.data.grn_no }))
      } else {
        console.error('Error generating GRN number:', response.data.error)
      }
    } catch (err) {
      console.error('Error generating GRN number:', err)
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      // Fetch POs that are submitted, to_receive or partially_received
      const response = await api.get('/purchase-orders?status=submitted,to_receive,partially_received')
      const pos = response.data.data || []
      setPurchaseOrders(pos)
      return pos
    } catch (err) {
      console.error('Error fetching purchase orders:', err)
      return []
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

  const handlePOSelect = (poNo, pos = purchaseOrders) => {
    const selectedPO = pos.find(po => po.po_no === poNo)
    if (selectedPO) {
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
        const defaultWarehouse = warehouses && warehouses.length > 0 ? warehouses[0].warehouse_name : ''
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
          if (item.item_code && item.warehouse_name) {
            fetchItemStock(item.item_code, item.warehouse_name, idx)
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
        po_no: formData.po_no || '',
        material_request_id: formData.mr_id || '',
        department: formData.department || '',
        purpose: formData.purpose || '',
        supplier_id: formData.supplier_id,
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
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xsp-2 mb-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="m-0 mb-0.5 text-lg  text-white">Create New GRN Request</h2>
              <p className="m-0 text-xs opacity-90 text-gray-300">Register received goods and manage inventory</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded px-2.5 py-1.5 text-xs font-semibold font-mono whitespace-nowrap">
              {formData.grn_no}
            </div>
          </div>
        </div>

        {error && <Alert type="danger" className="mb-3">{error}</Alert>}

        {/* Two Column Layout for Form Sections */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* GRN Header Section */}
          <div className="bg-white border border-gray-200 rounded-xs p-3.5 ">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-indigo-500" />
              <h3 className="m-0 text-xs font-semibold text-gray-900">GRN Information</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500  tracking-wide">
                  GRN Number
                </label>
                <input
                  type="text"
                  value={formData.grn_no}
                  readOnly
                  className="w-full px-2 py-2 border border-gray-200 rounded text-xs bg-gray-50 font-medium text-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500  tracking-wide">
                  Receipt Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.receipt_date}
                  onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                  className="w-full px-2 py-2 border border-gray-200 rounded text-xs text-gray-700"
                />
              </div>
            </div>
          </div>

          {/* Supplier Section */}
          <div className="bg-white border border-gray-200 rounded-xs p-3.5 ">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={16} className="text-indigo-500" />
              <h3 className="m-0 text-xs font-semibold text-gray-900">Supplier Information</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500  tracking-wide">
                  Select Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-200 rounded text-xs text-gray-700 bg-white"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-500  tracking-wide">
                  Purchase Order (Optional)
                </label>
                <select
                  value={formData.po_no}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-200 rounded text-xs text-gray-700 bg-white"
                >
                  <option value="">-- No PO / Manual Entry --</option>
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.po_no}>
                      {po.po_no} - {po.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white border border-gray-200 rounded-xs p-3.5 mb-4 ">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-indigo-500" />
            <h3 className="m-0 text-xs font-semibold text-gray-900">Received Items</h3>
            <span className="ml-auto text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">
              {grnItems.filter(i => i.item_code).length} item(s)
            </span>
          </div>
          
          <div className=" mb-3 rounded border border-gray-200 max-h-96 overflow-y-auto">
            <table className="w-full border-collapse border border-gray-200 text-xs" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2.5 py-2.5 text-left border border-gray-200 font-semibold text-gray-500">Item Code</th>
                  <th className="px-2.5 py-2.5 text-left border border-gray-200 font-semibold text-gray-500">Item Name</th>
                  <th className="px-2.5 py-2.5 text-center border border-gray-200 font-semibold text-gray-500">Stock</th>
                  <th className="px-2.5 py-2.5 text-center border border-gray-200 font-semibold text-gray-500">PO Qty</th>
                  <th className="px-2.5 py-2.5 text-center border border-gray-200 font-semibold text-gray-500">Received Qty</th>
                  <th className="px-2.5 py-2.5 text-center border border-gray-200 font-semibold text-gray-500">Rate</th>
                  <th className="px-2.5 py-2.5 text-center border border-gray-200 font-semibold text-gray-500">UOM</th>
                  <th className="px-2.5 py-2.5 text-left border border-gray-200 font-semibold text-gray-500">Batch</th>
                  <th className="px-2.5 py-2.5 text-left border border-gray-200 font-semibold text-gray-500">Warehouse</th>
                  <th className="px-2.5 py-2.5 text-center border border-gray-200 font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {grnItems.map((item, index) => (
                  <tr key={index} className="bg-white border-b border-gray-200">
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <select
                        value={item.item_code}
                        onChange={(e) => handleItemCodeSelect(index, e.target.value)}
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-gray-700"
                      >
                        <option value="">Select Item</option>
                        {items.map(itemOption => (
                          <option key={itemOption.id} value={itemOption.item_code}>
                            {itemOption.item_code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <input
                        type="text"
                        value={item.item_name}
                        readOnly
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs bg-gray-50 text-gray-500"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <input
                        type="number"
                        value={item.current_stock}
                        readOnly
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-center text-xs bg-blue-50 text-blue-600 font-semibold"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <input
                        type="number"
                        value={item.po_qty}
                        readOnly
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-center text-xs bg-gray-50 text-gray-500"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <input
                        type="number"
                        value={item.received_qty}
                        onChange={(e) => handleItemChange(index, 'received_qty', parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-center text-xs text-gray-700 font-bold"
                        min="0"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-center text-xs text-gray-700"
                        min="0"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200 text-center">
                      <input
                        type="text"
                        value={item.uom}
                        readOnly
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-center text-xs bg-gray-50 text-gray-500"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <input
                        type="text"
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(index, 'batch_no', e.target.value)}
                        placeholder="Batch #"
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-gray-700"
                      />
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200">
                      <select
                        value={item.warehouse_name}
                        onChange={(e) => handleItemChange(index, 'warehouse_name', e.target.value)}
                        className="w-full px-1.5 py-1 border border-gray-200 rounded text-xs text-gray-700"
                      >
                        <option value="">Select</option>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.warehouse_name}>
                            {wh.warehouse_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2.5 py-2.5 border border-gray-200 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        disabled={grnItems.length === 1}
                        className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium mx-auto transition ${
                          grnItems.length === 1
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer'
                        }`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 p-2 .5 py-2.5 bg-indigo-500 text-white rounded text-xs font-semibold hover:bg-indigo-600 transition-colors"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Notes Section */}
        <div className="bg-white border border-gray-200 rounded-xs p-3.5 ">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertCircle size={16} className="text-indigo-500" />
            <h3 className="m-0 text-xs font-semibold text-gray-900">Additional Notes</h3>
          </div>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any additional notes for this GRN request..."
            className="w-full min-h-16 px-2 py-2 border border-gray-200 rounded text-xs text-gray-700 resize-vertical"
          />
        </div>
      </div>
    </Modal>
  )
}
