import React, { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../Modal'
import api from '../../services/api'

export default function CreateCustomerModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gst_no: '',
    billing_address: '',
    shipping_address: '',
    credit_limit: '',
    customer_type: 'other',
    status: 'active'
  })

  const generateCustomerId = async (name) => {
    if (!name || name.length < 3) return ''
    
    const prefix = name.slice(0, 3).toUpperCase()
    
    try {
      const res = await api.get('/customers')
      const existingCustomers = res.data.data || []
      
      const prefixedIds = existingCustomers
        .filter(c => c.customer_id && c.customer_id.startsWith(prefix))
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
    
    if (name === 'name') {
      handleNameChange(value)
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    setError(null)
  }

  const handleNameChange = async (value) => {
    setFormData(prev => ({
      ...prev,
      name: value
    }))
    
    if (value.length >= 3) {
      const newId = await generateCustomerId(value)
      setCustomerId(newId)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.name || !formData.email || !formData.phone) {
        throw new Error('Please fill in all required fields')
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      const res = await api.post('/customers', {
        customer_id: customerId,
        customer_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.billing_address,
        customer_type: formData.customer_type,
        status: formData.status
      })

      if (!res.status || res.status >= 400) {
        throw new Error(res.data?.error || 'Failed to create customer')
      }

      setCustomerId('')
      setFormData({
        name: '',
        email: '',
        phone: '',
        gst_no: '',
        billing_address: '',
        shipping_address: '',
        credit_limit: '',
        customer_type: 'other',
        status: 'active'
      })
      
      localStorage.setItem('customersUpdatedAt', new Date().getTime().toString())
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👤 Create New Customer" size="lg">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-300 rounded-xs text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Customer Name *
            </label>
            <input
              type="text"
              name="name"
              placeholder="Full company/customer name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Customer ID * <span className="text-gray-500 font-normal">(Auto-generated)</span>
            </label>
            <input
              type="text"
              readOnly
              value={customerId}
              placeholder="Will auto-generate..."
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Email *
            </label>
            <input
              type="email"
              name="email"
              placeholder="customer@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              placeholder="+91-XXXXXXXXXX"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              GST Number
            </label>
            <input
              type="text"
              name="gst_no"
              placeholder="22ABCDE1234F1Z5"
              value={formData.gst_no}
              onChange={handleInputChange}
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Customer Type *
            </label>
            <select
              name="customer_type"
              value={formData.customer_type}
              onChange={handleInputChange}
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="tata">TATA</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Credit Limit (₹)
            </label>
            <input
              type="number"
              name="credit_limit"
              placeholder="0.00"
              value={formData.credit_limit}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block  text-gray-900 mb-2 text-xs">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block  text-gray-900 mb-2 text-xs">
              Billing Address
            </label>
            <textarea
              name="billing_address"
              placeholder="Street, City, State, ZIP..."
              value={formData.billing_address}
              onChange={handleInputChange}
              rows="2"
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs resize-vertical focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block  text-gray-900 mb-2 text-xs">
              Shipping Address
            </label>
            <textarea
              name="shipping_address"
              placeholder="Street, City, State, ZIP..."
              value={formData.shipping_address}
              onChange={handleInputChange}
              rows="2"
              className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs resize-vertical focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="p-6  py-2 bg-gray-100 border border-gray-300 rounded-xs text-gray-700 cursor-pointer text-xs font-medium hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="p-6  py-2 bg-gradient-to-r from-green-500 to-green-600 text-white border-none rounded-xs cursor-pointer text-xs   hover:from-green-600 hover:to-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : '✓ Create Customer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
