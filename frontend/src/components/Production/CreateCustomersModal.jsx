import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  CheckCircle2, 
  Building2, 
  Info,
  ShieldCheck,
  Smartphone,
  Navigation
} from 'lucide-react'
import api from '../../services/api'
import Modal from '../Modal'

const SectionLabel = ({ icon: Icon, label, color = 'blue' }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100'
  }
  
  return (
    <div className="flex items-center gap-2 mb-4 mt-2">
      <div className={`p-1.5 rounded border ${colorMap[color]}`}>
        <Icon size={14} />
      </div>
      <span className="text-xs   text-slate-500 ">{label}</span>
      <div className="h-px bg-slate-100 flex-1 ml-2"></div>
    </div>
  )
}

const FormField = ({ label, children, required, error, hint }) => (
  <div className=".5">
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-700 text-xs">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {hint && <span className="text-[9px] font-medium text-slate-400 italic">{hint}</span>}
    </div>
    {children}
    {error && <p className="text-xs  font-medium text-rose-500 flex items-center gap-1"><AlertCircle size={10} /> {error}</p>}
  </div>
)

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

  const inputClasses = "w-full p-2  py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingId ? 'Modify Customer Profile' : 'Register New Customer'} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded flex items-start gap-3 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />
            <p className="text-xs  text-rose-900 leading-relaxed">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {/* General Information */}
          <section>
            <SectionLabel icon={Info} label="Core Identity" color="blue" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Full Legal Name" required>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    name="customer_name" 
                    value={formData.customer_name} 
                    onChange={handleInputChange} 
                    placeholder="e.g. Acme Corporation" 
                    className={`${inputClasses} pl-9`}
                    required 
                  />
                </div>
              </FormField>

              <FormField label="Customer System ID" hint="Auto-generated based on name">
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    name="customer_id" 
                    value={formData.customer_id} 
                    readOnly
                    placeholder="Pending name input..." 
                    className={`${inputClasses} pl-9 bg-slate-100/50 cursor-not-allowed text-slate-500`}
                  />
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField label="Account Type" required>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select 
                    name="customer_type" 
                    value={formData.customer_type} 
                    onChange={handleInputChange} 
                    className={`${inputClasses} pl-9 appearance-none cursor-pointer`}
                    required
                  >
                    <option value="other">General / Other Client</option>
                    <option value="tata">TATA Strategic Account</option>
                  </select>
                </div>
              </FormField>

              <FormField label="Status" required>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select 
                    name="status" 
                    value={formData.status} 
                    onChange={handleInputChange} 
                    className={`${inputClasses} pl-9 appearance-none cursor-pointer`}
                    required
                  >
                    <option value="active">Active Relationship</option>
                    <option value="inactive">On Hold / Inactive</option>
                    <option value="pending">Under Review / Pending</option>
                  </select>
                </div>
              </FormField>
            </div>
          </section>

          {/* Contact Details */}
          <section>
            <SectionLabel icon={Smartphone} label="Communication" color="purple" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Corporate Email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleInputChange} 
                    placeholder="contact@company.com" 
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </FormField>

              <FormField label="Primary Phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleInputChange} 
                    placeholder="+91 XXXXX XXXXX" 
                    className={`${inputClasses} pl-9`}
                  />
                </div>
              </FormField>
            </div>
          </section>

          {/* Location Details */}
          <section>
            <SectionLabel icon={Navigation} label="Localization" color="amber" />
            <div className="space-y-2">
              <FormField label="HQ Registered Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                  <textarea 
                    name="address" 
                    value={formData.address} 
                    onChange={handleInputChange} 
                    placeholder="Enter full business address" 
                    rows="2"
                    className={`${inputClasses} pl-9 pt-2 resize-none`}
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FormField label="City">
                  <input 
                    type="text" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleInputChange} 
                    placeholder="City" 
                    className={inputClasses}
                  />
                </FormField>
                <FormField label="State">
                  <input 
                    type="text" 
                    name="state" 
                    value={formData.state} 
                    onChange={handleInputChange} 
                    placeholder="State" 
                    className={inputClasses}
                  />
                </FormField>
                <FormField label="Zip Code">
                  <input 
                    type="text" 
                    name="postal_code" 
                    value={formData.postal_code} 
                    onChange={handleInputChange} 
                    placeholder="000000" 
                    className={inputClasses}
                  />
                </FormField>
                <FormField label="Country">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      name="country" 
                      value={formData.country} 
                      onChange={handleInputChange} 
                      placeholder="Country" 
                      className={`${inputClasses} pl-9`}
                    />
                  </div>
                </FormField>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onClose} 
            className="p-6  py-2  text-xs  text-slate-600 hover:bg-slate-50 rounded transition-all"
          >
            Discard Changes
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="flex items-center gap-2 p-2 .5 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed  transition-all text-xs "
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {editingId ? 'Save Profile' : 'Finalize Registration'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
