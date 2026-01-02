import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { ArrowDown, ArrowUp } from 'lucide-react'

export default function StockMovementModal({ onClose, onSuccess, initialItem = null }) {
  const [formData, setFormData] = useState({
    item_code: initialItem?.item_code || '',
    warehouse_id: initialItem?.warehouse_id || '',
    movement_type: initialItem?.movement_type || 'OUT',
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
      setFormData(prev => ({
        ...prev,
        item_code: initialItem.item_code || '',
        warehouse_id: String(initialItem.warehouse_id || ''),
        movement_type: initialItem.movement_type || 'OUT'
      }))
    }
  }, [initialItem])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setFormError(null)
  }

  const validateForm = () => {
    if (!formData.item_code) {
      setFormError('Please select an item')
      return false
    }
    if (!formData.warehouse_id) {
      setFormError('Please select a warehouse')
      return false
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
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/stock/movements`,
        {
          item_code: formData.item_code,
          warehouse_id: parseInt(formData.warehouse_id),
          movement_type: formData.movement_type,
          quantity: parseFloat(formData.quantity),
          reference_type: formData.reference_type,
          reference_name: formData.reference_name,
          notes: formData.notes
        }
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Movement Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Movement Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, movement_type: 'IN' }))}
              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
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
              onClick={() => setFormData(prev => ({ ...prev, movement_type: 'OUT' }))}
              className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
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
          </div>
        </div>

        {/* Item Selection */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Item *
          </label>
          <select
            name="item_code"
            value={formData.item_code}
            onChange={handleChange}
            disabled={!!initialItem}
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
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
        <div>
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Warehouse *
          </label>
          <select
            name="warehouse_id"
            value={formData.warehouse_id}
            onChange={handleChange}
            disabled={!!initialItem}
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            <option value="">Select Warehouse</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.warehouse_name} ({wh.warehouse_code})
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            step="0.01"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            placeholder="0.00"
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Reference Type */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Reference Type
          </label>
          <select
            name="reference_type"
            value={formData.reference_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Reference Name (Optional)
          </label>
          <input
            type="text"
            name="reference_name"
            value={formData.reference_name}
            onChange={handleChange}
            placeholder="e.g., PO-2024-001, PRD-2024-005"
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any additional notes or remarks..."
            rows="3"
            className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> This movement will be created with "Pending" status. An authorized user must approve it before the inventory is updated.
          </p>
        </div>
      </form>
    </Modal>
  )
}
