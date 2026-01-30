import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { 
  Save, X, ChevronDown, ChevronUp, AlertCircle, 
  Factory, ChevronRight, Info, Shield, CheckCircle2,
  Settings, Activity, Calendar, MapPin, Gauge,
  ArrowLeft, Monitor, ClipboardCheck
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

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
  const toast = useToast()
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!id)
  const [fieldErrors, setFieldErrors] = useState({})
  
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
    is_active: true,
    workstation_type: ''
  })

  const [departments, setDepartments] = useState([])
  const equipmentTypes = [
    'CNC Machine', 'Assembly Line', 'Welding Station', 'Drilling Machine',
    'Lathe Machine', 'Grinding Machine', 'Inspection Station',
    'Packing Station', 'Testing Equipment', 'Other'
  ]
  const maintenanceFrequencies = [
    'Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly',
    'Semi-annually', 'Annually', 'As needed'
  ]

  useEffect(() => {
    fetchDepartments()
    if (id) {
      if (location.state?.workstation) {
        setFormData(prev => ({ ...prev, ...location.state.workstation }))
        setInitialLoading(false)
      } else {
        fetchWorkstationDetails(id)
      }
    }
  }, [id])

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
      setInitialLoading(true)
      const response = await productionService.getWorkstationDetails(wsId)
      if (response.success) {
        setFormData(prev => ({ ...prev, ...(response.data || response) }))
      } else {
        toast.addToast('Failed to load workstation details', 'error')
      }
    } catch (err) {
      toast.addToast('Error loading workstation', 'error')
    } finally {
      setInitialLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name?.trim()) errors.name = 'Required'
    if (!formData.workstation_name?.trim()) errors.workstation_name = 'Required'
    if (formData.capacity_utilization < 0 || formData.capacity_utilization > 100) errors.capacity_utilization = 'Range 0-100'
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.addToast('Please fix the errors in the form', 'warning')
      return
    }

    setLoading(true)
    try {
      const response = id 
        ? await productionService.updateWorkstation(id, formData)
        : await productionService.createWorkstation(formData)

      if (response.success) {
        toast.addToast(`Workstation ${id ? 'updated' : 'registered'} successfully`, 'success')
        navigate('/manufacturing/workstations')
      } else {
        toast.addToast(response.message || 'Failed to save workstation', 'error')
      }
    } catch (err) {
      toast.addToast('An error occurred during saving', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 ">Loading workstation details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/manufacturing/workstations')}
              className="p-2 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all "
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl   text-slate-900 tracking-tight">
                {id ? 'Edit Workstation' : 'New Workstation'}
              </h1>
              <p className="text-xs text-slate-500 font-medium text-xs">
                {id ? `Configuring ${formData.workstation_name || id}` : 'Register a new manufacturing asset'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/manufacturing/workstations')}
              className="p-6  py-2.5 rounded text-xs  text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 .5 rounded  text-xs shadow-lg shadow-indigo-200 transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              {id ? 'Update Asset' : 'Register Asset'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Identity Section */}
            <div className="bg-white rounded border border-slate-200  overflow-hidden">
              <div className="p-2  bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Factory size={18} className="text-indigo-600" />
                <h3 className="text-xs  text-slate-900 ">Identity & Localization</h3>
              </div>
              <div className="p-3 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs  text-slate-500 ">Workstation ID</label>
                      {fieldErrors.name && <span className="text-xs  text-rose-500  ">Required</span>}
                    </div>
                    <input 
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={id}
                      placeholder="e.g. WS-001"
                      className={`w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700 ${id ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs  text-slate-500 ">Display Name</label>
                      {fieldErrors.workstation_name && <span className="text-xs  text-rose-500  ">Required</span>}
                    </div>
                    <input 
                      type="text"
                      name="workstation_name"
                      value={formData.workstation_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Precision Assembly Line"
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Building / Area</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g. Shop Floor - Zone A"
                        className="w-full pl-11 pr-4 py-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Responsible Dept</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs  text-slate-700 cursor-pointer"
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.name || d} value={d.name || d}>{d.name || d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specs Section */}
            <div className="bg-white rounded border border-slate-200  overflow-hidden">
              <div className="p-2  bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Gauge size={18} className="text-indigo-600" />
                <h3 className="text-xs  text-slate-900 ">Technical Specifications</h3>
              </div>
              <div className="p-3 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Equipment Class</label>
                    <select
                      name="workstation_type"
                      value={formData.workstation_type}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs  text-slate-700 cursor-pointer"
                    >
                      <option value="">Select Class</option>
                      {equipmentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Equipment Code</label>
                    <input 
                      type="text"
                      name="equipment_code"
                      value={formData.equipment_code}
                      onChange={handleInputChange}
                      placeholder="Asset Tag / Serial No."
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Units / Hour</label>
                    <input 
                      type="number"
                      name="capacity_per_hour"
                      value={formData.capacity_per_hour}
                      onChange={handleInputChange}
                      min="0"
                      step="0.1"
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs  text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Target Utilization %</label>
                    <input 
                      type="number"
                      name="capacity_utilization"
                      value={formData.capacity_utilization}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs  text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs  text-slate-500  ml-1">Technical Description</label>
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Provide technical specs, machine capabilities, or safety guidelines..."
                    className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            {/* Status Card */}
            <div className="bg-white rounded border border-slate-200  p-3 space-y-6">
              <h3 className="text-xs  text-slate-900  border-b border-slate-50 pb-4">Operational Status</h3>
              
              <label className="flex items-start gap-4 p-4 rounded bg-slate-50/50 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                <div className="mt-1">
                  <input 
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <span className={`block text-xs   transition-colors ${formData.is_active ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {formData.is_active ? 'Active Node' : 'Inactive / Maintenance'}
                  </span>
                  <span className="text-xs  text-slate-400 font-medium text-xs leading-relaxed">
                    Determines if work orders can be scheduled to this asset.
                  </span>
                </div>
              </label>
            </div>

            {/* Maintenance Schedule */}
            <div className="bg-white rounded border border-slate-200  p-3 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
                <ClipboardCheck size={18} className="text-indigo-600" />
                <h3 className="text-xs  text-slate-900 ">Maintenance</h3>
              </div>
              
              <div className="space-y-4">
                <div className=".5">
                  <label className="text-xs  text-slate-400  px-1">Schedule Frequency</label>
                  <select
                    name="maintenance_schedule"
                    value={formData.maintenance_schedule}
                    onChange={handleInputChange}
                    className="w-full p-2.5 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 text-xs  text-slate-700 cursor-pointer"
                  >
                    {maintenanceFrequencies.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className=".5">
                  <label className="text-xs  text-slate-400  px-1">Last Sync Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="date"
                      name="last_maintenance_date"
                      value={formData.last_maintenance_date}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-2.5 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 text-xs  text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex flex-col gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white p-2  rounded  text-xs shadow-lg shadow-indigo-200"
              >
                <Save size={18} /> {id ? 'Update' : 'Register'} Asset
              </button>
              <button
                type="button"
                onClick={() => navigate('/manufacturing/workstations')}
                className="w-full p-6  py-2 rounded text-xs  text-slate-600 bg-white border border-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
