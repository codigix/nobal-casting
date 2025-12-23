import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Save, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

const fieldDescriptions = {
  name: 'Unique identifier for the workstation (e.g., WS-001, ASSEMBLY-A1)',
  workstation_name: 'Display name of the workstation',
  location: 'Physical location or building reference',
  capacity_per_hour: 'Maximum units that can be processed per hour',
  capacity_utilization: 'Target percentage of capacity to maintain',
  equipment_type: 'Category of equipment (e.g., CNC Machine, Assembly Line, Welding Station)',
  description: 'Detailed description of the workstation, equipment, and specifications',
  maintenance_schedule: 'Maintenance frequency (e.g., Weekly, Monthly, Quarterly)',
  last_maintenance_date: 'Date of last scheduled maintenance',
  assigned_operators: 'Comma-separated list of operator names or IDs',
  department: 'Department responsible for this workstation',
  equipment_code: 'Reference code for associated equipment',
  is_active: 'Whether this workstation is currently operational'
}

export default function WorkstationForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    capacity: true,
    equipment: true,
    maintenance: true,
    operations: false,
    details: false
  })

  const [formData, setFormData] = useState({
    name: '',
    workstation_name: '',
    description: '',
    location: '',
    capacity_per_hour: 0,
    capacity_utilization: 80,
    equipment_type: '',
    equipment_code: '',
    maintenance_schedule: 'Monthly',
    last_maintenance_date: '',
    assigned_operators: '',
    department: '',
    is_active: true
  })

  const [departments, setDepartments] = useState([])
  const [equipmentTypes] = useState([
    'CNC Machine',
    'Assembly Line',
    'Welding Station',
    'Drilling Machine',
    'Lathe Machine',
    'Grinding Machine',
    'Inspection Station',
    'Packing Station',
    'Testing Equipment',
    'Other'
  ])
  const [maintenanceFrequencies] = useState([
    'Daily',
    'Weekly',
    'Bi-weekly',
    'Monthly',
    'Quarterly',
    'Semi-annually',
    'Annually',
    'As needed'
  ])

  useEffect(() => {
    fetchDepartments()
    if (id && location.state?.workstation) {
      setFormData(location.state.workstation)
    } else if (id) {
      fetchWorkstationDetails(id)
    }
  }, [id, location])

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/material-requests/departments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setDepartments(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const fetchWorkstationDetails = async (wsId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations/${wsId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, ...(data.data || data) }))
      }
    } catch (err) {
      setError('Failed to load workstation details')
      console.error(err)
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.name?.trim()) {
      errors.name = 'Workstation ID is required'
    }
    if (!formData.workstation_name?.trim()) {
      errors.workstation_name = 'Workstation Name is required'
    }
    if (formData.capacity_per_hour < 0) {
      errors.capacity_per_hour = 'Capacity cannot be negative'
    }
    if (formData.capacity_utilization < 0 || formData.capacity_utilization > 100) {
      errors.capacity_utilization = 'Utilization must be between 0-100%'
    }
    if (formData.last_maintenance_date && new Date(formData.last_maintenance_date) > new Date()) {
      errors.last_maintenance_date = 'Maintenance date cannot be in the future'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? checked 
        : (name === 'capacity_per_hour' || name === 'capacity_utilization' 
          ? Math.max(0, parseFloat(value) || 0) 
          : value)
    }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }))
    }
    setError(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        id ? `${import.meta.env.VITE_API_URL}/production/workstations/${id}` : `${import.meta.env.VITE_API_URL}/production/workstations`,
        {
          method: id ? 'PUT' : 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      )

      if (response.ok) {
        setSuccess('Workstation saved successfully! Redirecting...')
        setTimeout(() => navigate('/manufacturing/workstations'), 1500)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save workstation')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const FormSection = ({ title, section, children, icon }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-3">
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="w-full p-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex items-center justify-between hover:from-gray-100 hover:to-gray-150 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-xs font-semibold  text-gray-900">{title}</h3>
        </div>
        {expandedSections[section] ? (
          <ChevronUp size={18} className="text-gray-600" />
        ) : (
          <ChevronDown size={18} className="text-gray-600" />
        )}
      </button>
      {expandedSections[section] && (
        <div className="p-4 space-y-4">{children}</div>
      )}
    </div>
  )

  const FormField = ({ label, name, type = 'text', required, options, ...props }) => (
    <div className="form-group">
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {fieldDescriptions[name] && (
        <p className="text-xs text-gray-500 mb-1.5">{fieldDescriptions[name]}</p>
      )}
      {options ? (
        <select
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            fieldErrors[name] ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={id && name === 'name'}
          {...props}
        >
          <option value="">Select {label}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name={name}
            checked={formData[name]}
            onChange={handleInputChange}
            className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
            {...props}
          />
          <span className="text-xs text-gray-700">Active</span>
        </label>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={5}
          className={`w-full px-3 py-2 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-vertical ${
            fieldErrors[name] ? 'border-red-500' : 'border-gray-300'
          }`}
          {...props}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            fieldErrors[name] ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={id && name === 'name'}
          {...props}
        />
      )}
      {fieldErrors[name] && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={12} /> {fieldErrors[name]}
        </p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className="">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                🏭
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {id ? 'Edit Workstation' : 'Create Workstation'}
                </h1>
                <p className="text-xs text-gray-600 mt-0.5">
                  {id ? 'Update workstation details and settings' : 'Set up a new manufacturing workstation'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 pl-4 bg-red-50 border-l-4 border-red-400 rounded text-xs text-red-800 flex gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3 p-3 pl-4 bg-green-50 border-l-4 border-green-400 rounded text-xs text-green-800 flex gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Basic Information */}
          <FormSection title="Basic Information" section="basic" icon="📋">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Workstation ID"
                name="name"
                required
                placeholder="e.g., WS-001"
              />
              <FormField
                label="Workstation Name"
                name="workstation_name"
                required
                placeholder="e.g., Assembly Line 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Location"
                name="location"
                placeholder="e.g., Building A, Floor 2"
              />
              <FormField
                label="Department"
                name="department"
                options={departments.map(d => d.name || d)}
              />
            </div>
          </FormSection>

          {/* Capacity & Performance */}
          <FormSection title="Capacity & Performance" section="capacity" icon="⚙️">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Capacity (units/hour)"
                name="capacity_per_hour"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
              />
              <FormField
                label="Target Utilization (%)"
                name="capacity_utilization"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="80"
              />
            </div>
          </FormSection>

          {/* Equipment Information */}
          <FormSection title="Equipment Information" section="equipment" icon="🔧">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Equipment Type"
                name="equipment_type"
                options={equipmentTypes}
              />
              <FormField
                label="Equipment Code/Reference"
                name="equipment_code"
                placeholder="e.g., EQ-12345"
              />
            </div>
          </FormSection>

          {/* Maintenance Schedule */}
          <FormSection title="Maintenance Schedule" section="maintenance" icon="🛠️">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Maintenance Frequency"
                name="maintenance_schedule"
                options={maintenanceFrequencies}
              />
              <FormField
                label="Last Maintenance Date"
                name="last_maintenance_date"
                type="date"
              />
            </div>
          </FormSection>

          {/* Operations & Assignment */}
          <FormSection title="Operations & Assignment" section="operations" icon="👥">
            <FormField
              label="Assigned Operators"
              name="assigned_operators"
              placeholder="Comma-separated operator names or IDs (e.g., OP-001, OP-002)"
            />
          </FormSection>

          {/* Details & Notes */}
          <FormSection title="Details & Notes" section="details" icon="📝">
            <FormField
              label="Description"
              name="description"
              type="textarea"
              placeholder="Detailed description of the workstation, equipment specifications, capabilities, safety procedures, etc."
            />
            <FormField
              label="Active Status"
              name="is_active"
              type="checkbox"
            />
          </FormSection>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 bg-white rounded-lg p-4 -mx-3 -mb-3">
            <button
              type="button"
              onClick={() => navigate('/manufacturing/workstations')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg text-xs font-semibold hover:from-cyan-600 hover:to-cyan-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save size={16} /> {loading ? 'Saving...' : 'Save Workstation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
