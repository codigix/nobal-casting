import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { ArrowDown, ArrowUp } from 'lucide-react'

export default function StockMovementModal({ onClose, onSuccess, initialItem = null }) {
  const [formData, setFormData] = useState({
    item_code: initialItem?.item_code || '',
    source_warehouse_id: initialItem?.source_warehouse_id || '',
    target_warehouse_id: initialItem?.target_warehouse_id || '',
    warehouse_id: initialItem?.warehouse_id || '',
    movement_type: initialItem?.movement_type || 'OUT',
    purpose: initialItem?.purpose || '',
    quantity: '',
    reference_type: 'Manual',
    reference_name: '',
    notes: ''
  })
  const [items, setItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchItems()
    fetchWarehouses()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/items`)
      if (response.data.success) {
        setItems(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/stock/warehouses`)
      if (response.data.success) {
        setWarehouses(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  useEffect(() => {
    if (initialItem) {
      const newData = {
        item_code: initialItem.item_code || '',
        movement_type: initialItem.movement_type || 'OUT'
      }
      
      if (initialItem.movement_type === 'TRANSFER') {
        newData.source_warehouse_id = String(initialItem.source_warehouse_id || '')
        newData.target_warehouse_id = String(initialItem.target_warehouse_id || '')
      } else {
        newData.warehouse_id = String(initialItem.warehouse_id || '')
      }
      
      setFormData(prev => ({
        ...prev,
        ...newData
      }))
    }
  }, [initialItem])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Auto-set movement type and reference based on purpose for common tasks
    if (name === 'purpose') {
      let movementType = formData.movement_type;
      let referenceType = formData.reference_type;
      
      if (value === 'Production Issue' || value === 'Material Issue' || value === 'Sales Issue') {
        movementType = 'OUT';
        if (value === 'Production Issue') referenceType = 'Production Request';
        if (value === 'Sales Issue') referenceType = 'Sales Order';
      } else if (value === 'Material Receipt' || value === 'Purchase Receipt') {
        movementType = 'IN';
        if (value === 'Purchase Receipt') referenceType = 'Manual'; // Or could be Purchase Order if we had it
      } else if (value === 'Internal Transfer' || value === 'Production Transfer') {
        movementType = 'TRANSFER';
        if (value === 'Production Transfer') referenceType = 'Production Request';
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        movement_type: movementType,
        reference_type: referenceType
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    
    setFormError(null)
  }

  const validateForm = () => {
    if (!formData.item_code) {
      setFormError('Please select an item')
      return false
    }

    if (!formData.purpose) {
      setFormError('Please select a purpose for this movement')
      return false
    }
    
    if (formData.movement_type === 'TRANSFER') {
      if (!formData.source_warehouse_id) {
        setFormError('Please select a source warehouse')
        return false
      }
      if (!formData.target_warehouse_id) {
        setFormError('Please select a target warehouse')
        return false
      }
      if (formData.source_warehouse_id === formData.target_warehouse_id) {
        setFormError('Source and target warehouses must be different')
        return false
      }
    } else {
      if (!formData.warehouse_id) {
        setFormError('Please select a warehouse')
        return false
      }
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setFormError('Please enter a valid quantity')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const payload = {
        item_code: formData.item_code,
        movement_type: formData.movement_type,
        purpose: formData.purpose,
        quantity: parseFloat(formData.quantity),
        reference_type: formData.reference_type,
        reference_name: formData.reference_name,
        notes: formData.notes
      }

      if (formData.movement_type === 'TRANSFER') {
        payload.source_warehouse_id = parseInt(formData.source_warehouse_id)
        payload.target_warehouse_id = parseInt(formData.target_warehouse_id)
      } else {
        payload.warehouse_id = parseInt(formData.warehouse_id)
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/stock/movements`,
        payload
      )

      if (response.data.success) {
        onSuccess()
      } else {
        setError(response.data.error || 'Failed to create movement')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create stock movement')
    } finally {
      setLoading(false)
    }
  }

  const selectedItem = items.find(i => i.item_code === formData.item_code)

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create Stock Movement"
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            Create Movement
          </Button>
        </div>
      }
    >
      {error && <Alert type="danger" className="mb-4">{error}</Alert>}
      {formError && <Alert type="warning" className="mb-4">{formError}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Purpose Selection */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Movement Purpose *
          </label>
          <select
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white dark:bg-neutral-800"
          >
            <option value="">Select Purpose</option>
            <optgroup label="Production">
              <option value="Production Issue">Send to Production (Issue)</option>
              <option value="Production Transfer">Transfer to Production Warehouse</option>
            </optgroup>
            <optgroup label="Procurement & Sales">
              <option value="Purchase Receipt">Purchase Receipt (Material IN)</option>
              <option value="Material Receipt">General Material Receipt</option>
              <option value="Sales Issue">Sales Delivery (OUT)</option>
            </optgroup>
            <optgroup label="Internal">
              <option value="Internal Transfer">Warehouse Transfer</option>
              <option value="Material Issue">General Material Issue</option>
              <option value="Stock Adjustment">Inventory Adjustment</option>
              <option value="Other">Other</option>
            </optgroup>
          </select>
          <p className="text-[10px] text-neutral-500 mt-1">
            Selecting a purpose will automatically suggest the best movement type below.
          </p>
        </div>

        {/* Movement Type Selection */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Movement Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, movement_type: 'IN', warehouse_id: '' }))}
              className={`p-2 rounded-sm border-2 transition-all flex items-center gap-3 ${
                formData.movement_type === 'IN'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-green-500'
              }`}
            >
              <ArrowDown size={20} className="text-green-600" />
              <div className="text-left">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Stock IN</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Add to inventory</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, movement_type: 'OUT', warehouse_id: '' }))}
              className={`p-2 rounded-sm border-2 transition-all flex items-center gap-3 ${
                formData.movement_type === 'OUT'
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-red-500'
              }`}
            >
              <ArrowUp size={20} className="text-red-600" />
              <div className="text-left">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Stock OUT</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Remove from inventory</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, movement_type: 'TRANSFER', source_warehouse_id: '', target_warehouse_id: '' }))}
              className={`p-2 rounded-sm border-2 transition-all flex items-center gap-3 ${
                formData.movement_type === 'TRANSFER'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-500'
              }`}
            >
              <ArrowDown size={20} className="text-blue-600" style={{ transform: 'rotate(-90deg)' }} />
              <div className="text-left">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">Transfer</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Move between warehouses</p>
              </div>
            </button>
          </div>
        </div>

        {/* Item Selection */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Item *
          </label>
          <select
            name="item_code"
            value={formData.item_code}
            onChange={handleChange}
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="">Select Item</option>
            {items.map(item => (
              <option key={item.item_code} value={item.item_code}>
                {item.item_code} - {item.name}
              </option>
            ))}
          </select>
          {selectedItem && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2">
              UOM: {selectedItem.uom}
            </p>
          )}
        </div>

        {/* Warehouse Selection */}
        {formData.movement_type === 'TRANSFER' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Source Warehouse *
              </label>
              <select
                name="source_warehouse_id"
                value={formData.source_warehouse_id}
                onChange={handleChange}
                className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="">Select Source Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.warehouse_name} ({wh.warehouse_code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Target Warehouse *
              </label>
              <select
                name="target_warehouse_id"
                value={formData.target_warehouse_id}
                onChange={handleChange}
                className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="">Select Target Warehouse</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.warehouse_name} ({wh.warehouse_code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Warehouse *
            </label>
            <select
              name="warehouse_id"
              value={formData.warehouse_id}
              onChange={handleChange}
              className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.warehouse_name} ({wh.warehouse_code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            step="0.01"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="0.00"
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Reference Type */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Reference Type
          </label>
          <select
            name="reference_type"
            value={formData.reference_type}
            onChange={handleChange}
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="Manual">Manual</option>
            <option value="Production Request">Production Request</option>
            <option value="Sales Order">Sales Order</option>
            <option value="Transfer">Material Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Reference Name */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Reference Name (Optional)
          </label>
          <input
            type="text"
            name="reference_name"
            value={formData.reference_name}
            onChange={handleChange}
            placeholder="e.g., PO-2024-001, PRD-2024-005"
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any additional notes or remarks..."
            rows="3"
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xs p-2">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> This movement will be created with "Pending" status. An authorized user must approve it before the inventory is updated.
          </p>
        </div>
      </form>
    </Modal>
  )
}
