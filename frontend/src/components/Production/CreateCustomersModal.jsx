import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import api from '../../services/api'
import Modal from '../Modal'

export default function CreateCustomersModal({ isOpen, onClose, onSuccess, editingId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    customer_type: 'other',
    status: 'active'
  })

  useEffect(() => {
    if (isOpen) {
      if (editingId) {
        fetchCustomerDetails(editingId)
      } else {
        resetForm()
      }
    }
  }, [isOpen, editingId])

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      customer_type: 'other',
      status: 'active'
    })
    setError(null)
  }

  const fetchCustomerDetails = async (id) => {
    try {
      const response = await api.get(`/customers/${id}`)
      setFormData(response.data.data)
    } catch (err) {
      setError('Failed to load customer details')
    }
  }

  const generateCustomerId = async (name) => {
    if (!name || name.length < 3) return ''
    
    const prefix = name.slice(0, 3).toUpperCase()
    
    try {
      const response = await api.get('/customers')
      const existingCustomers = response.data.data || []
      
      const prefixedIds = existingCustomers
        .filter(c => c.customer_id.startsWith(prefix))
        .map(c => {
          const match = c.customer_id.match(/-(\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
      
      const nextNumber = (Math.max(...prefixedIds, 0) + 1).toString().padStart(3, '0')
      return `${prefix}-${nextNumber}`
    } catch (err) {
      return `${prefix}-001`
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'customer_name' && !editingId) {
      handleCustomerNameChange(value)
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    setError(null)
  }

  const handleCustomerNameChange = async (value) => {
    setFormData(prev => ({
      ...prev,
      customer_name: value
    }))
    
    if (value.length >= 3) {
      const newId = await generateCustomerId(value)
      setFormData(prev => ({
        ...prev,
        customer_id: newId
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.customer_id || !formData.customer_name) {
        throw new Error('Please fill all required fields')
      }

      if (editingId) {
        await api.put(`/customers/${editingId}`, formData)
      } else {
        await api.post('/customers', formData)
      }

      resetForm()
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingId ? '✏️ Edit Customer' : '➕ Create Customer'} size="lg">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-300 rounded text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Customer ID * <span className="text-gray-500 font-normal">(Auto-generated)</span></label>
            <input 
              type="text" 
              name="customer_id" 
              value={formData.customer_id} 
              readOnly
              placeholder={editingId ? "N/A" : "Will auto-generate..."} 
              className={`w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50 ${editingId ? 'opacity-60' : ''}`}
              required 
            />
          </div>
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Customer Name *</label>
            <input 
              type="text" 
              name="customer_name" 
              value={formData.customer_name} 
              onChange={handleInputChange} 
              placeholder="Enter customer name" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Customer Type *</label>
            <select 
              name="customer_type" 
              value={formData.customer_type} 
              onChange={handleInputChange} 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="tata">TATA</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Email</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange} 
              placeholder="Enter email" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Phone</label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleInputChange} 
              placeholder="Enter phone number" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">City</label>
            <input 
              type="text" 
              name="city" 
              value={formData.city} 
              onChange={handleInputChange} 
              placeholder="Enter city" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Address</label>
            <input 
              type="text" 
              name="address" 
              value={formData.address} 
              onChange={handleInputChange} 
              placeholder="Enter address" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">State</label>
            <input 
              type="text" 
              name="state" 
              value={formData.state} 
              onChange={handleInputChange} 
              placeholder="Enter state" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Postal Code</label>
            <input 
              type="text" 
              name="postal_code" 
              value={formData.postal_code} 
              onChange={handleInputChange} 
              placeholder="Enter postal code" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Country</label>
            <input 
              type="text" 
              name="country" 
              value={formData.country} 
              onChange={handleInputChange} 
              placeholder="Enter country" 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1.5 text-xs text-gray-900">Status</label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleInputChange} 
              className="w-full px-2 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded bg-gray-100 text-gray-700 cursor-pointer text-xs font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-4 py-2 bg-amber-500 text-white border-none rounded cursor-pointer text-xs font-semibold hover:bg-amber-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : editingId ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
