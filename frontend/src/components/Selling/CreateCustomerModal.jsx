import React, { useState } from 'react'
import api, { customersAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  User, Mail, Phone, MapPin, Building, 
  CreditCard, CheckCircle2, UserPlus, Info, 
  ShieldCheck, Globe, Briefcase
} from 'lucide-react'

export default function CreateCustomerModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [customerId, setCustomerId] = useState('')
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    gst_no: '',
    address: '',
    shipping_address: '',
    credit_limit: '',
    customer_type: 'other',
    status: 'active'
  })

  const generateCustomerId = async (name) => {
    if (!name || name.length < 3) return ''
    const prefix = name.slice(0, 3).toUpperCase()
    try {
      const res = await customersAPI.list()
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
    if (name === 'customer_name') {
      handleNameChange(value)
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setError(null)
  }

  const handleNameChange = async (value) => {
    setFormData(prev => ({ ...prev, customer_name: value }))
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
      if (!formData.customer_name || !formData.email || !formData.phone) {
        throw new Error('Please fill in all required fields')
      }

      const res = await customersAPI.create({
        ...formData,
        customer_id: customerId
      })

      if (res.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(res.data.error || 'Failed to create customer')
      }
    } catch (err) {
      setError(err.message || 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Add New Customer" 
      size="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <User size={18} className="text-blue-500" />
              Basic Information
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    required
                    placeholder="Acme Corp"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Customer ID (Generated)
                </label>
                <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded  text-sm font-mono text-blue-600">
                  {customerId || 'Awaiting name...'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Customer Type
                  </label>
                  <select
                    name="customer_type"
                    value={formData.customer_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="other">Standard</option>
                    <option value="tata">Corporate (TATA)</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <Phone size={18} className="text-blue-500" />
              Contact Details
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="billing@customer.com"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="+91-XXXXXXXXXX"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  GST Number
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    name="gst_no"
                    value={formData.gst_no}
                    onChange={handleInputChange}
                    placeholder="22ABCDE1234F1Z5"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address Info */}
          <div className="md:col-span-2 space-y-4 pt-2">
            <div className="flex items-center gap-2 text-slate-800 font-semibold border-b border-slate-100 pb-2">
              <MapPin size={18} className="text-blue-500" />
              Address Information
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Billing Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  placeholder="Official registered address..."
                />
              </div>
              <div>
                <label className="block text-xs  text-slate-500  tracking-wider mb-1">
                  Shipping Address
                </label>
                <textarea
                  name="shipping_address"
                  value={formData.shipping_address}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  placeholder="Where goods should be delivered..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            Create Customer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
